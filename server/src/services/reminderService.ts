import prisma from '../lib/prisma';
import { MedicationUnit } from '@prisma/client';
import { notificationService } from './notificationService';
import { localizer } from './localizer';

export interface MedicationInput {
  name: string;
  dosage: string;
  unit: MedicationUnit;
  times: string[];
  days: number;
}

export const createRemindersFromMedications = async (
  userId: string,
  reportId?: string | null,
  medications: MedicationInput[] = [],
  timezoneOffset?: number
) => {
  const reminderPromises = medications.map((med) => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (med.days || 0));

    return prisma.reminder.create({
      data: {
        userId,
        reportId,
        medicationName: typeof med.name === 'object' ? (med.name as any).name || (med.name as any).text || 'Medication' : med.name,
        dosage: med.dosage,
        unit: med.unit,
        remindTimes: med.times,
        startDate,
        endDate,
        isActive: true,
        timezoneOffset: (timezoneOffset !== undefined ? timezoneOffset : -330) as any
      },
    });
  });

  return Promise.all(reminderPromises);
};

export const getActiveReminders = async (userId: string) => {
  const now = new Date();
  return prisma.reminder.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getAllUserReminders = async (userId: string) => {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

export const deleteReminder = async (id: string, userId: string) => {
  return prisma.reminder.delete({
    where: { id, userId }
  });
};

export const toggleReminder = async (id: string, userId: string, isActive: boolean) => {
  return prisma.reminder.update({
    where: { id, userId },
    data: { isActive }
  });
};

// In-memory cache to prevent duplicate alerts in the same session
const notifiedAppointments = new Set<string>();
const notifiedReminders = new Set<string>(); // Format: "reminderId:HH:mm"
let nextCheckTimeout: NodeJS.Timeout | null = null;
let lastCheckTime: number = Date.now();

/**
 * Background worker to check and send reminders.
 */
export const startReminderService = () => {
  console.log('🚀 Medical Reminder & Appointment Alert Service started (Windowed Check mode).');
  runCheck();
};

/**
 * Forces an immediate check of the database.
 */
export const forceCheck = () => {
    if (nextCheckTimeout) {
        clearTimeout(nextCheckTimeout);
        runCheck();
    }
};

const runCheck = async () => {
  const DEFAULT_POLL_INTERVAL = 15 * 60 * 1000; // 15 mins (Max sleep time)
  const MIN_POLL_INTERVAL = 45 * 1000;          // 45s (Resolution)
  
  let nextSleepTime = DEFAULT_POLL_INTERVAL;

  try {
    const now = new Date();
    const nowTimestamp = now.getTime();
    
    // Clean up caches periodically to prevent memory leaks
    if (now.getUTCMinutes() === 0) {
      notifiedAppointments.clear();
      if (now.getUTCHours() === 0) notifiedReminders.clear();
    }

    // --- 1. HANDLE MEDICAL REMINDERS ---
    const activeReminders = await prisma.reminder.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [ { endDate: null }, { endDate: { gte: now } } ]
      },
      include: { user: { select: { name: true, preferredLanguage: true } } }
    });

    const triggeringReminders = activeReminders.filter((r: any) => {
      if (!Array.isArray(r.remindTimes)) return false;
      
      const offset = r.timezoneOffset !== undefined ? r.timezoneOffset : -330;
      let isTriggering = false;

      r.remindTimes.forEach((time: string) => {
        const [h, m] = time.split(':').map(Number);
        
        // Calculate the absolute UTC timestamp for this reminder's occurrence today
        // Base it on the user's local time perspective
        const eventLocal = new Date(nowTimestamp - (offset * 60000));
        eventLocal.setUTCHours(h, m, 0, 0);
        
        // The actual UTC time this event corresponds to
        const eventUtcTimestamp = eventLocal.getTime() + (offset * 60000);
        
        // Calculate diff for sleep optimization
        let diff = eventUtcTimestamp - nowTimestamp;
        if (diff < 0) diff += 24 * 60 * 60 * 1000; // Next one is tomorrow
        nextSleepTime = Math.min(nextSleepTime, diff);

        /**
         * WINDOWED TRIGGER LOGIC:
         * Trigger if the scheduled time falls between our last check and now.
         * We allow a 5-minute 'catch-up' window for missed reminders (e.g. server restart).
         */
        const catchupWindow = 5 * 60 * 1000; 
        const lowerBound = Math.max(lastCheckTime - 10000, eventUtcTimestamp - catchupWindow);
        const upperBound = nowTimestamp + 5000; // Slight buffer for current minute

        if (eventUtcTimestamp >= lowerBound && eventUtcTimestamp <= upperBound) {
          if (!notifiedReminders.has(`${r.id}:${time}`)) {
            isTriggering = true;
            notifiedReminders.add(`${r.id}:${time}`);
          }
        }
      });
      
      return isTriggering;
    });

    if (triggeringReminders.length > 0) {
      await Promise.all(triggeringReminders.map((r: any) => {
        const lang = r.user?.preferredLanguage || 'en';
        return notificationService.sendNotification({
          userId: r.userId,
          title: localizer.t('en', 'medicalRemindersHeader'),
          message: localizer.t('en', 'medicationReminderBody', {
            medicine: r.medicationName,
            dosage: r.dosage,
            unit: r.unit.toLowerCase()
          }),
          role: 'PATIENT',
          type: 'REMINDER',
          metadata: { reminderId: r.id, reportId: r.reportId }
        });
      }));
    }

    // --- 2. HANDLE APPOINTMENT REMINDERS (15 MINS BEFORE) ---
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1) } // Check since yesterday to be safe
      },
      include: { 
          patient: { select: { id: true, name: true, preferredLanguage: true } },
          doctor: { select: { id: true, name: true, preferredLanguage: true } }
      }
    });

    const triggeringAppointments = upcomingAppointments.filter((apt: any) => {
      if (!apt.time || notifiedAppointments.has(apt.id)) return false;
      
      const [h, m] = apt.time.split(':').map(Number);
      const d = new Date(apt.date);
      // Scheduled time in UTC
      const offset = apt.timezoneOffset !== undefined ? apt.timezoneOffset : -330;
      const scheduledUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, 0) + (offset * 60000);
      const alertTime = scheduledUtc - (15 * 60 * 1000);
      
      let diff = alertTime - nowTimestamp;
      if (diff > 0) nextSleepTime = Math.min(nextSleepTime, diff);
      
      // Trigger if alertTime falls in our check window
      return alertTime >= lastCheckTime - 10000 && alertTime <= nowTimestamp + 5000;
    });

    if (triggeringAppointments.length > 0) {
       // ... (rest of appointment logic)
      await Promise.all(triggeringAppointments.flatMap((apt: any) => {
        notifiedAppointments.add(apt.id);
        const pLang = apt.patient?.preferredLanguage || 'en';
        const dLang = apt.doctor?.preferredLanguage || 'en';
        return [
          notificationService.sendNotification({
            userId: apt.patientId,
            title: localizer.t('en', 'appointmentReminderTitle') || 'Upcoming Appointment',
            message: localizer.t('en', 'appointmentReminderBody', { time: apt.time, name: apt.doctor.name }),
            role: 'PATIENT', type: 'APPOINTMENT', metadata: { appointmentId: apt.id }
          }),
          notificationService.sendNotification({
            userId: apt.doctorId,
            title: localizer.t('en', 'appointmentReminderTitle') || 'Upcoming Appointment',
            message: localizer.t('en', 'appointmentReminderBodyDoc', { time: apt.time, name: apt.patient.name }),
            role: 'DOCTOR', type: 'APPOINTMENT', metadata: { appointmentId: apt.id }
          })
        ];
      }));
    }

    lastCheckTime = nowTimestamp;
  } catch (err) {
    console.error('[Reminders] Background service error:', err);
  } finally {
    const finalWait = Math.max(MIN_POLL_INTERVAL, Math.min(DEFAULT_POLL_INTERVAL, nextSleepTime));
    if (finalWait > 120000) {
        console.log(`[Reminders] Next DB check in ${Math.round(finalWait/60000)} minutes.`);
    }
    nextCheckTimeout = setTimeout(runCheck, finalWait);
  }
};

