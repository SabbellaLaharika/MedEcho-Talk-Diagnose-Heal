
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translationService } from '../services/translationService';

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
                doctor: { select: { name: true, specialization: true, contact: true } },
                patient: { select: { name: true } }
            }
        });

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
