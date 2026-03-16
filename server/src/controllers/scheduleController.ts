import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get doctor's weekly schedule
export const getSchedule = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const schedules = await prisma.doctorSchedule.findMany({
            where: { doctorId },
            orderBy: { dayIndex: 'asc' }
        });

        // If no schedule exists, return defaults (Mon-Fri 9-18)
        if (schedules.length === 0) {
            const defaults = Array.from({ length: 7 }, (_, i) => ({
                dayIndex: i,
                startTime: '09:00',
                endTime: '18:00',
                isActive: i >= 1 && i <= 5
            }));
            return res.json(defaults);
        }

        res.json(schedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching schedule' });
    }
};

// Save/update full weekly schedule
export const saveSchedule = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const { days } = req.body; // Array of { dayIndex, startTime, endTime, isActive }

        // Start a transaction: Clear all old schedule for this doctor and add new ones
        await prisma.$transaction([
            prisma.doctorSchedule.deleteMany({ where: { doctorId } }),
            prisma.doctorSchedule.createMany({
                data: days.map((day: any) => ({
                    doctorId,
                    dayIndex: day.dayIndex,
                    startTime: day.startTime,
                    endTime: day.endTime,
                    isActive: day.isActive
                }))
            })
        ]);

        const updated = await prisma.doctorSchedule.findMany({ where: { doctorId }, orderBy: { dayIndex: 'asc' } });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error saving schedule' });
    }
};

// Get blocked slots for a doctor
export const getBlockedSlots = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const blocked = await prisma.blockedSlot.findMany({
            where: { doctorId },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        });
        res.json(blocked);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching blocked slots' });
    }
};

// Block a specific slot
export const blockSlot = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const { date, startTime, endTime, reason } = req.body;

        const blocked = await prisma.blockedSlot.create({
            data: { doctorId, date, startTime, endTime, reason }
        });

        res.status(201).json(blocked);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Server error blocking slot' });
    }
};

// Unblock a slot
export const unblockSlot = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.blockedSlot.delete({ where: { id } });
        res.json({ message: 'Slot unblocked' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error unblocking slot' });
    }
};
