
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { translationService } from '../services/translationService';
import { sendEmail } from '../services/emailService';
import { getPatientAppointmentTemplate, getDoctorAppointmentTemplate, getCallInviteTemplate } from '../services/emailTemplates';
import { notificationService } from '../services/notificationService';
import * as reminderService from '../services/reminderService';

// Create Appointment
export const createAppointment = async (req: Request, res: Response) => {
    try {
        const { doctorId, patientId, date, time, type, timezoneOffset } = req.body;

        if (!doctorId || !patientId || !date) {
            return res.status(400).json({ message: 'doctorId, patientId, and date are required' });
        }

        const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
        const patient = await prisma.user.findUnique({ where: { id: patientId } });

        if (!doctor || doctor.role !== 'DOCTOR') {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        if (!patient || patient.role !== 'PATIENT') {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const appointmentDate = new Date(date);

        // --- 1. PREVENT BOOKING IN THE PAST ---
        const now = new Date();
        const bookingDateObj = new Date(date);
        if (time) {
            const [h, m] = time.split(':').map(Number);
            bookingDateObj.setHours(h, m, 0, 0);
        } else {
            // If no time, only compare the date portion
            bookingDateObj.setHours(23, 59, 59, 999);
        }

        if (bookingDateObj < now) {
            return res.status(400).json({ message: 'Cannot book appointments for past dates or times' });
        }

        // Prevent duplicate bookings: same doctor + date + time + not cancelled
        if (time) {
            const existing = await prisma.appointment.findFirst({
                where: {
                    doctorId,
                    date: appointmentDate,
                    time,
                    status: { not: 'CANCELLED' }
                }
            });
            if (existing) {
                return res.status(409).json({ message: 'This time slot is already booked' });
            }
        }

        // --- 3. PLATFORM-WIDE ONE-APPOINTMENT RULE ---
        const existingActive = await prisma.appointment.findFirst({
            where: {
                patientId,
                status: { in: ['PENDING', 'CONFIRMED'] }
            }
        });
        if (existingActive) {
            return res.status(409).json({ message: 'You already have an active appointment scheduled. Please complete or cancel it before booking a new one.' });
        }

        const appointment = await (prisma.appointment.create({
            data: {
                doctorId,
                patientId,
                date: appointmentDate,
                time: time || null,
                type: type || 'VIRTUAL',
                status: 'PENDING',
                timezoneOffset: timezoneOffset !== undefined ? timezoneOffset : -330
            } as any,
            include: {
                doctor: { select: { name: true, username: true, specialization: true, contact: true, email: true, preferredLanguage: true } },
                patient: { select: { name: true, username: true, email: true, preferredLanguage: true } }
            }
        }) as any);

        const jitsiLink = `https://meet.jit.si/MedEcho-Apt-${appointment.id.replace(/-/g, '')}`;

        const patientLang = appointment.patient.preferredLanguage || 'en';
        const doctorLang = appointment.doctor.preferredLanguage || 'en';

        // Patient Translations
        const [pTitle, pMsg, pSubj, pHeader, pGreeting, pDocLbl, pDateLbl, pTimeLbl, pFooter, pBtn] = await Promise.all([
            translationService.translate('Appointment Booked', patientLang),
            translationService.translate(`Your appointment with Dr. ${appointment.doctor.name} is confirmed for ${appointmentDate.toDateString()} at ${time || 'TBD'}.`, patientLang),
            translationService.translate(`Appointment Confirmed with Dr. ${appointment.doctor.name}`, patientLang),
            translationService.translate('Appointment Confirmation', patientLang),
            translationService.translate(`Hello ${appointment.patient.name},`, patientLang),
            translationService.translate('Doctor:', patientLang),
            translationService.translate('Date:', patientLang),
            translationService.translate('Time:', patientLang),
            translationService.translate('Please ensure you join the virtual meeting room or arrive at the clinic 5 minutes before the scheduled time.', patientLang),
            translationService.translate('View Dashboard', patientLang)
        ]);

        // Doctor Translations
        const [dTitle, dMsg, dSubj, dHeader, dGreeting, dPatLbl, dDateLbl, dTimeLbl, dBtn] = await Promise.all([
            translationService.translate('New Appointment', doctorLang),
            translationService.translate(`New appointment booked by ${appointment.patient.name} for ${appointmentDate.toDateString()} at ${time || 'TBD'}.`, doctorLang),
            translationService.translate(`New Appointment with ${appointment.patient.name}`, doctorLang),
            translationService.translate('New Appointment Alert', doctorLang),
            translationService.translate(`Hello Dr. ${appointment.doctor.name},`, doctorLang),
            translationService.translate('Patient:', doctorLang),
            translationService.translate('Date:', doctorLang),
            translationService.translate('Time:', doctorLang),
            translationService.translate('View Schedule', doctorLang)
        ]);

        const { getPatientAppointmentTemplate, getDoctorAppointmentTemplate } = require('../services/emailTemplates');

        // Send Email Notifications
        if (appointment.patient.email) {
            console.log(`📧 Resolved patient recipient: ${appointment.patient.email} (Lang: ${patientLang})`);
            await sendEmail({
                to: appointment.patient.email,
                subject: pSubj,
                text: pMsg,
                html: getPatientAppointmentTemplate({
                    patientName: appointment.patient.name,
                    doctorName: appointment.doctor.name,
                    date: appointmentDate.toDateString(),
                    time: time || 'TBD',
                    header: pHeader,
                    greeting: pGreeting,
                    message: pMsg,
                    docLabel: pDocLbl,
                    dateLabel: pDateLbl,
                    timeLabel: pTimeLbl,
                    footer: pFooter,
                    btn: pBtn,
                    meetingLink: jitsiLink,
                    appointmentId: appointment.id
                })
            });
        }

        if (appointment.doctor.email) {
            console.log(`📧 Resolved doctor recipient: ${appointment.doctor.email} (Lang: ${doctorLang})`);
            await sendEmail({
                to: appointment.doctor.email,
                subject: dSubj,
                text: dMsg,
                html: getDoctorAppointmentTemplate({
                    doctorName: appointment.doctor.name,
                    patientName: appointment.patient.name,
                    date: appointmentDate.toDateString(),
                    time: time || 'TBD',
                    header: dHeader,
                    greeting: dGreeting,
                    message: dMsg,
                    patLabel: dPatLbl,
                    dateLabel: dDateLbl,
                    timeLabel: dTimeLbl,
                    btn: dBtn,
                    meetingLink: jitsiLink,
                    appointmentId: appointment.id
                })
            });
        }

        // Add In-App UI Notifications
        await prisma.notification.create({
            data: {
                userId: patientId,
                title: 'Appointment Booked',
                message: `Your appointment with Dr. ${appointment.doctor.name} is confirmed for ${appointmentDate.toDateString()} at ${time || 'TBD'}.`
            }
        });

        await prisma.notification.create({
            data: {
                userId: doctorId,
                title: 'New Appointment',
                message: `New appointment booked by ${appointment.patient.name} for ${appointmentDate.toDateString()} at ${time || 'TBD'}.`
            }
        });
        
        // --- 4. REAL-TIME SLOT SYNC ---
        // Notify ALL connected clients that this slot is now taken
        notificationService.broadcast('appointment_booked', { 
            doctorId, 
            time, 
            date: appointmentDate.toISOString() 
        });

        res.status(201).json(appointment);
        reminderService.forceCheck(); // Wake up worker to include new appointment in schedule
    } catch (error) {
        console.error("Appointment creation error:", error);
        res.status(500).json({ message: 'Server error creating appointment' });
    }
};

// Get Appointments (Localized)
export const getAppointments = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const role = req.query.role as string; // 'DOCTOR' or 'PATIENT'

        let whereClause = {};
        if (role === 'DOCTOR') {
            whereClause = { doctorId: userId };
        } else {
            whereClause = { patientId: userId };
        }

        // Fetch user to get preferred language
        const requestingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferredLanguage: true }
        });

        // --- ROBUST LAZY SYNC: Auto-expire all past appointments ---
        const now = new Date();
        
        // Fetch ALL pending/confirmed appointments to evaluate their specific UTC expiry
        const activeAppointments = await prisma.appointment.findMany({
            where: {
                status: { in: ['PENDING', 'CONFIRMED'] }
            }
        });

        for (const apt of activeAppointments) {
            if (apt.time) {
                const [h, m] = apt.time.split(':').map(Number);
                const scheduledTime = new Date(apt.date);
                scheduledTime.setUTCHours(h, m, 0, 0); 

                const offset = apt.timezoneOffset; // Uses default from schema if not set
                const scheduledTimeUtc = new Date(scheduledTime.getTime() + (offset * 60000));
                
                // Buffer: 30 minutes grace period
                const expiryTime = new Date(scheduledTimeUtc.getTime() + (30 * 60 * 1000));

                if (expiryTime < now) {
                    console.log(`[Auto-Expire] Cleanup: Expiring appointment ${apt.id} (${apt.time}) after buffer.`);
                    await prisma.appointment.update({
                        where: { id: apt.id },
                        data: { status: 'EXPIRED' as any }
                    });

                    // Notify relevant parties in real-time
                    notificationService.broadcast('appointment_completed', { 
                        id: apt.id,
                        status: 'EXPIRED',
                        patientId: apt.patientId,
                        doctorId: apt.doctorId
                    });
                }
            }
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                doctor: { select: { id: true, name: true, username: true, specialization: true, contact: true } },
                patient: { select: { id: true, name: true, username: true, contact: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Ensure doctorName and patientName are ALWAYS available at top level for frontend
        const enhancedAppointments = appointments.map((apt: any) => ({
            ...apt,
            doctorName: apt.doctorName || apt.doctor?.name || 'Doctor',
            patientName: apt.patientName || apt.patient?.name || 'Patient'
        }));

        // Localize based on requester's language
        const lang = requestingUser?.preferredLanguage;
        if (lang && lang !== 'en') {
            const translatedAppointments = await Promise.all(enhancedAppointments.map(async (apt: any) => {
                const updatedApt = { ...apt };

                // If I am a patient, I want to see doctor details translated
                if (role !== 'DOCTOR' && updatedApt.doctor) {
                    updatedApt.doctor = await translationService.translateObject(
                        updatedApt.doctor,
                        ['name', 'specialization'],
                        lang
                    );
                    updatedApt.doctorName = updatedApt.doctor.name;
                }

                // If I am a doctor, I want to see patient name translated (maybe)
                if (role === 'DOCTOR' && updatedApt.patient) {
                    updatedApt.patient = await translationService.translateObject(
                        updatedApt.patient,
                        ['name'],
                        lang
                    );
                    updatedApt.patientName = updatedApt.patient.name;
                }

                return updatedApt;
            }));

            return res.json(translatedAppointments);
        }

        res.json(enhancedAppointments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching appointments' });
    }
};

// Update Appointment Status
export const updateAppointmentStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await prisma.appointment.update({
            where: { id },
            data: { status },
            include: {
                doctor: { select: { name: true, preferredLanguage: true } },
                patient: { select: { id: true, name: true, email: true, preferredLanguage: true } }
            }
        }) as any;

        // --- CANCELLATION NOTIFICATION ---
        if (status === 'CANCELLED') {
            const patientLang = updated.patient.preferredLanguage || 'en';
            // Store DB notifications in English; frontend handles translation
            const notifTitle = 'Appointment Cancelled';
            const notifMsg = `Your appointment with Dr. ${updated.doctor.name} has been cancelled.`;

            const [emailSubj, btnText] = await Promise.all([
                translationService.translate('cancellationNoticeSubj', patientLang),
                translationService.translate('bookNewSlot', patientLang)
            ]);

            // 1. In-App Notification (English only for DB)
            await notificationService.sendNotification({
                userId: updated.patientId,
                title: notifTitle,
                message: notifMsg,
                role: 'PATIENT',
                type: 'ALERT'
            });

            // 2. Email Notification (Still localized)
            if (updated.patient.email) {
                const translatedMsg = await translationService.translate('appointmentCancelledBody', patientLang, { name: updated.doctor.name });
                const translatedTitle = await translationService.translate('appointmentCancelled', patientLang);
                await sendEmail({
                    to: updated.patient.email,
                    subject: emailSubj,
                    text: translatedMsg,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #e11d48;">${translatedTitle}</h2>
                            <p>${translatedMsg}</p>
                            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">
                                ${btnText}
                            </a>
                        </div>
                    `
                });
            }
        }

        res.json(updated);
        reminderService.forceCheck(); // Wake up worker to recalculate
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating appointment' });
    }
};

export const startCall = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { initiatorId, callType } = req.body;

        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                patient: { select: { id: true, name: true, email: true, role: true, preferredLanguage: true } },
                doctor: { select: { id: true, name: true, email: true, role: true, preferredLanguage: true, specialization: true } }
            }
        }) as any;

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        // --- TIME GUARD: Allow only 15 min before appointment (Restriction for PATIENTS ONLY) ---
        if (appointment.date && appointment.time && initiatorId === appointment.patientId) {
            const [h, m] = appointment.time.split(':').map(Number);
            const scheduledAt = new Date(appointment.date);
            scheduledAt.setHours(h, m, 0, 0);

            const offset = (appointment as any).timezoneOffset || -330;
            const scheduledAtUtc = new Date(scheduledAt.getTime() + (offset * 60000));

            const now = new Date();
            const diffMs = scheduledAtUtc.getTime() - now.getTime();

            // Block if more than 15 minutes before scheduled time
            if (diffMs > 15 * 60 * 1000) {
                const minutesLeft = Math.ceil((diffMs - (15 * 60 * 1000)) / 60000);
                return res.status(403).json({
                    message: `Consultation room is not open yet. Please wait another ${minutesLeft} minute(s). You can join 15 minutes before the scheduled time.`
                });
            }
        }

        const isPatient = initiatorId === appointment.patientId;
        const target = isPatient ? appointment.doctor : appointment.patient;
        const initiatorName = isPatient ? appointment.patient.name : appointment.doctor.name;
        const targetRole = isPatient ? 'DOCTOR' : 'PATIENT';

        // Standardized Room Name (Must match VideoConsultation.tsx exactly)
        const roomNameHash = appointment.id.replace(/-/g, '').substring(0, 16).toUpperCase();
        const jitsiRoomName = `MedEcho-Consult-${roomNameHash}`;
        const jitsiLink = `https://meet.element.io/${jitsiRoomName}#config.prejoinPageEnabled=false&config.enableLobby=false`;

        // Store in English only in DB; UI TranslatedText handles display
        const notifTitle = callType === 'VIDEO' ? 'Incoming Video Call' : 'Incoming Voice Call';
        const notifMsg = `${initiatorName} is starting the ${callType === 'VIDEO' ? 'video' : 'voice'} consultation. Click to join.`;

        // Localize for Email only
        const targetLang = (target as any).preferredLanguage || 'en';
        const [emailSubj, btnText] = await Promise.all([
            translationService.translate('MedEcho: Call Invitation', targetLang),
            translationService.translate('Join Meeting Now', targetLang)
        ]);

        const doctorObj = appointment.doctor as any;
        const metadata = {
            appointmentId: appointment.id,
            jitsiLink,
            callType,
            initiatorName: initiatorName,
            initiatorId: initiatorId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            doctorName: doctorObj.name,
            patientName: (appointment.patient as any).name,
            doctorSpecialization: doctorObj['specialization'] || 'Medical Specialist'
        };

        // Real-time notification with full metadata
        await notificationService.sendNotification({
            userId: target.id,
            title: notifTitle,
            message: notifMsg,
            type: 'CALL',
            role: targetRole,
            metadata
        });

        // Send Email Alert with Jitsi link
        if (target.email) {
            console.log(`📧 Sending call invite to: ${target.email} (Lang: ${targetLang})`);
            await sendEmail({
                to: target.email,
                subject: emailSubj,
                text: `${initiatorName} is waiting for you. Join: ${jitsiLink}`,
                html: getCallInviteTemplate({
                    recipientName: target.name,
                    callerName: initiatorName,
                    appointmentId: appointment.id,
                    meetingLink: jitsiLink,
                    btn: btnText
                })
            });
        }

        res.json({ message: 'Call started', jitsiLink });
    } catch (error) {
        res.status(500).json({ message: 'Error starting call', error });
    }
};

export const nudgeCall = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { initiatorId } = req.body;

    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: { patient: true, doctor: true }
        });

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        const isPatient = initiatorId === appointment.patientId;
        const target = isPatient ? appointment.doctor : appointment.patient;
        const initiatorName = isPatient ? appointment.patient.name : appointment.doctor.name;
        const targetRole = isPatient ? 'DOCTOR' : 'PATIENT';

        // Store in English for DB
        const nudgeTitle = 'Call Reminder';
        const nudgeMsg = `${initiatorName}: Waiting for you to join the session`;

        // Send Urgent Notification
        await notificationService.sendNotification({
            userId: target.id,
            title: nudgeTitle,
            message: `${initiatorName}: ${nudgeMsg}`,
            type: 'CALL_NUDGE',
            role: targetRole,
            metadata: { appointmentId: appointment.id }
        });

        res.json({ message: 'Nudge sent successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending nudge', error });
    }
};

export const getDoctorAppointmentsByStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await prisma.appointment.update({
            where: { id },
            data: { status },
            include: {
                doctor: { select: { name: true, preferredLanguage: true } },
                patient: { select: { id: true, name: true, email: true, preferredLanguage: true } }
            }
        }) as any;

        // --- CANCELLATION NOTIFICATION ---
        if (status === 'CANCELLED') {
            const patientLang = updated.patient.preferredLanguage || 'en';
            // Store DB notifications in English
            const notifTitle = 'Appointment Cancelled';
            const notifMsg = `Your appointment with Dr. ${updated.doctor.name} has been cancelled.`;

            const [emailSubj, btnText] = await Promise.all([
                translationService.translate('cancellationNoticeSubj', patientLang),
                translationService.translate('bookNewSlot', patientLang)
            ]);

            // 1. In-App Notification (English only)
            await notificationService.sendNotification({
                userId: updated.patientId,
                title: notifTitle,
                message: notifMsg,
                role: 'PATIENT',
                type: 'ALERT'
            });

            // 2. Email Notification (Localized)
            if (updated.patient.email) {
                const translatedMsg = await translationService.translate('appointmentCancelledBody', patientLang, { name: updated.doctor.name });
                const translatedTitle = await translationService.translate('appointmentCancelled', patientLang);
                await sendEmail({
                    to: updated.patient.email,
                    subject: emailSubj,
                    text: translatedMsg,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #e11d48;">${translatedTitle}</h2>
                            <p>${translatedMsg}</p>
                            <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">
                                ${btnText}
                            </a>
                        </div>
                    `
                });
            }
        }

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating appointment' });
    }
};

// Get all booked time slots for a doctor (accessible by all patients, no auth)
export const getDoctorBookedSlots = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;

        const where: any = {
            doctorId,
            status: { not: 'CANCELLED' }
        };

        if (date) {
            const start = new Date(date as string);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date as string);
            end.setHours(23, 59, 59, 999);
            where.date = { gte: start, lte: end };
        }

        const appointments = await prisma.appointment.findMany({
            where,
            select: { time: true, date: true, status: true }
        });

        res.json(appointments);
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        res.status(500).json({ message: 'Server error fetching booked slots' });
    }
};

// Delete Appointment
export const deleteAppointment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.appointment.delete({
            where: { id }
        });

        res.json({ message: 'Appointment removed' });
        reminderService.forceCheck(); // Wake up worker to recalculate
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting appointment' });
    }
};
