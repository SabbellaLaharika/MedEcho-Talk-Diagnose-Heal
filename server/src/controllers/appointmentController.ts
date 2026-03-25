
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translationService } from '../services/translationService';
import { sendEmail } from '../services/emailService';
import { getPatientAppointmentTemplate, getDoctorAppointmentTemplate } from '../services/emailTemplates';

const prisma = new PrismaClient();

// Create Appointment
export const createAppointment = async (req: Request, res: Response) => {
    try {
        const { doctorId, patientId, date, time, type } = req.body;

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

        const appointment = await prisma.appointment.create({
            data: {
                doctorId,
                patientId,
                date: appointmentDate,
                time: time || null,
                type: type || 'VIRTUAL',
                status: 'PENDING'
            },
            include: {
                doctor: { select: { name: true, username: true, specialization: true, contact: true, email: true, preferredLanguage: true } },
                patient: { select: { name: true, username: true, email: true, preferredLanguage: true } }
            }
        });

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
                    appointmentId: appointment.id
                })
            });
        }

        res.status(201).json(appointment);
    } catch (error) {
        console.error(error);
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

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                doctor: { select: { id: true, name: true, username: true, specialization: true, contact: true } },
                patient: { select: { id: true, name: true, username: true } }
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
            data: { status }
        });

        res.json(updated);
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
                patient: { select: { id: true, name: true, email: true } }, 
                doctor: { select: { id: true, name: true, email: true } } 
            }
        });

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        const isPatient = initiatorId === appointment.patientId;
        const targetUserId = isPatient ? appointment.doctorId : appointment.patientId;
        const targetEmail = isPatient ? appointment.doctor.email : appointment.patient.email;
        const initiatorName = isPatient ? appointment.patient.name : appointment.doctor.name;

        // Create notification for the receiver
        await prisma.notification.create({
            data: {
                userId: targetUserId,
                title: callType === 'VIDEO' ? 'Incoming Video Call' : 'Incoming Voice Call',
                message: `${initiatorName} is starting the ${callType === 'VIDEO' ? 'video' : 'voice'} consultation for your appointment.`
            }
        });

        // Send Email Alert
        if (targetEmail) {
            console.log(`📧 Resolved call recipient: ${targetEmail}`);
            const { getCallInviteTemplate } = require('../services/emailTemplates');
            await sendEmail({
                to: targetEmail,
                subject: 'MedEcho: Call Invitation',
                text: `${initiatorName} is waiting for you in the consultation room. Please login to MedEcho to join the call.`,
                html: getCallInviteTemplate({
                    recipientName: isPatient ? appointment.doctor.name : appointment.patient.name,
                    callerName: initiatorName,
                    appointmentId: appointment.id,
                    btn: 'Join Call on MedEcho'
                })
            });
        }

        res.json({ message: 'Call started' });
    } catch (error) {
        console.error('Error starting call:', error);
        res.status(500).json({ message: 'Server error starting call' });
    }
};

export const getDoctorAppointmentsByStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await prisma.appointment.update({
            where: { id },
            data: { status }
        });

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating appointment' });
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting appointment' });
    }
};
