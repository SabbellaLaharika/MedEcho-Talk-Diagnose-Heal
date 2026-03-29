
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { sendEmail } from './emailService';
import { getPatientAppointmentTemplate, getDoctorAppointmentTemplate } from './emailTemplates';
import { translationService } from './translationService';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();
const sentReminders = new Set<string>();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Keeps the ML Service and Database warm by pinging them every 10 minutes.
 * This prevents Render Free Tier and Neon Free Tier from spinning down.
 */
const startKeepAlive = () => {
    setInterval(async () => {
        try {
            console.log('💓 Keep-Alive: Pinging services to prevent sleep...');
            
            // 1. Ping ML Service
            axios.get(`${ML_SERVICE_URL}/ping`).catch(() => {});
            
            // 2. Ping Database (Run a simple query)
            await prisma.$queryRaw`SELECT 1`;
            
            console.log('✅ Keep-Alive: ML Service and Database are awake.');
        } catch (error: any) {
            console.warn('⚠️ Keep-Alive Ping Failed:', error.message);
        }
    }, 10 * 60 * 1000); // Every 10 minutes
};

export const startReminderService = () => {
    console.log('⏰ Reminder Service started (checking every 60 seconds)...');
    
    // Start the keep-alive background task
    startKeepAlive();
    
    // Cleanup sentReminders every 24 hours to prevent memory leak
    setInterval(() => sentReminders.clear(), 24 * 60 * 60 * 1000);

    setInterval(async () => {
        try {
            const now = new Date();
            
            // Find all pending and confirmed appointments
            const appointments = await prisma.appointment.findMany({
                where: {
                    status: { in: ['PENDING', 'CONFIRMED'] }
                },
                include: {
                    doctor: true,
                    patient: true
                }
            });

            for (const apt of appointments) {
                if (!apt.time) continue;

                // Parse appointment time and match with date
                const [h, m] = apt.time.split(':').map(Number);
                const aptFullDate = new Date(apt.date);
                aptFullDate.setHours(h, m, 0, 0);

                const diffMin = (aptFullDate.getTime() - now.getTime()) / (1000 * 60);

                // If within 9-11 minutes and not yet sent in this session
                if (diffMin > 9 && diffMin <= 11 && !sentReminders.has(apt.id)) {
                    console.log(`🚀 Sending 10-minute reminder for Appointment ${apt.id}`);
                    
                    const jitsiLink = `https://meet.jit.si/MedEcho-Apt-${apt.id.replace(/-/g, '')}`;
                    const pLang = apt.patient.preferredLanguage || 'en';
                    const dLang = apt.doctor.preferredLanguage || 'en';

                    // Translate and Send to Patient
                    if (apt.patient.email) {
                        const subj = await translationService.translate('Reminder: Your appointment starts in 10 minutes!', pLang);
                        const msg = await translationService.translate(`Reminder: Your consultation with Dr. ${apt.doctor.name} is starting in 10 minutes. Please join the room.`, pLang);
                        
                        await sendEmail({
                            to: apt.patient.email,
                            subject: subj,
                            text: msg,
                            html: getPatientAppointmentTemplate({
                                patientName: apt.patient.name,
                                doctorName: apt.doctor.name,
                                date: aptFullDate.toDateString(),
                                time: apt.time,
                                header: 'Appointment Reminder',
                                greeting: `Hello ${apt.patient.name},`,
                                message: msg,
                                docLabel: 'Doctor:',
                                dateLabel: 'Date:',
                                timeLabel: 'Time:',
                                footer: 'Please be ready in the virtual waiting room.',
                                btn: 'View Dashboard',
                                meetingLink: jitsiLink,
                                appointmentId: apt.id
                            })
                        });
                    }

                    // Translate and Send to Doctor
                    if (apt.doctor.email) {
                        const subj = await translationService.translate('Reminder: Appointment with ' + apt.patient.name + ' in 10 min!', dLang);
                        const msg = await translationService.translate(`Upcoming appointment with ${apt.patient.name} is starting in 10 minutes.`, dLang);

                        await sendEmail({
                            to: apt.doctor.email,
                            subject: subj,
                            text: msg,
                            html: getDoctorAppointmentTemplate({
                                doctorName: apt.doctor.name,
                                patientName: apt.patient.name,
                                date: aptFullDate.toDateString(),
                                time: apt.time,
                                header: 'Consultation Alert',
                                greeting: `Hello Dr. ${apt.doctor.name},`,
                                message: msg,
                                patLabel: 'Patient:',
                                dateLabel: 'Date:',
                                timeLabel: 'Time:',
                                btn: 'Open Dashboard',
                                meetingLink: jitsiLink,
                                appointmentId: apt.id
                            })
                        });
                    }

                    // --- NEW: In-App & Browser Notifications ---
                    await notificationService.sendNotification({
                        userId: apt.patient.id,
                        title: 'Appointment Reminder',
                        message: `Your consultation with Dr. ${apt.doctor.name} starts in 10 minutes!`,
                        type: 'REMINDER',
                        role: 'PATIENT',
                        metadata: { appointmentId: apt.id, jitsiLink }
                    });

                    await notificationService.sendNotification({
                        userId: apt.doctor.id,
                        title: 'Consultation Alert',
                        message: `Upcoming appointment with ${apt.patient.name} starts in 10 minutes.`,
                        type: 'REMINDER',
                        role: 'DOCTOR',
                        metadata: { appointmentId: apt.id, jitsiLink }
                    });

                    sentReminders.add(apt.id);
                }
            }
        } catch (error) {
            console.error('Error in Reminder Service:', error);
        }
    }, 60 * 1000); // Check every minute
};
