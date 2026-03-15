import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create Appointment
export const createAppointment = async (req: Request, res: Response) => {
    try {
        const { doctorId, patientId, date, time, type } = req.body;

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
                doctor: { select: { name: true, specialization: true } },
                patient: { select: { name: true } }
            }
        });

        res.status(201).json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating appointment' });
    }
};

// Get Appointments (for a user)
export const getAppointments = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId;
        const role = req.query.role as string; // 'doctor' or 'patient'

        let whereClause = {};
        if (role === 'DOCTOR') {
            whereClause = { doctorId: userId };
        } else {
            whereClause = { patientId: userId };
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                doctor: { select: { name: true, specialization: true } },
                patient: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

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
        const { status } = req.body; // CONFIRMED, CANCELLED, COMPLETED

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

