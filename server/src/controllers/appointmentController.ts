
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
                doctor: { select: { name: true, specialization: true, contact: true, email: true, preferredLanguage: true } },
                patient: { select: { name: true, email: true, preferredLanguage: true } }
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

        // Create In-App Notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: patientId,
                    title: pTitle,
                    message: pMsg
                },
                {
                    userId: doctorId,
                    title: dTitle,
                    message: dMsg
                }
            ]
        });

        // Send Email Notifications
        if (appointment.patient.email) {
            sendEmail({
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
                    btn: pBtn
                })
            });
        }

        if (appointment.doctor.email) {
            sendEmail({
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
                    btn: dBtn
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
                doctor: { select: { name: true, specialization: true, contact: true } },
                patient: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Localize based on requester's language
        const lang = requestingUser?.preferredLanguage;
        if (lang && lang !== 'en') {
            const translatedAppointments = await Promise.all(appointments.map(async (apt: any) => {
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

        res.json(appointments);
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
