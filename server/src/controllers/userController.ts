import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all doctors
export const getDoctors = async (req: Request, res: Response) => {
    try {
        const doctors = await prisma.user.findMany({
            where: { role: 'DOCTOR' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                specialization: true,
                contact: true,
                isAvailable: true,
                preferredLanguage: true,
            }
        });
        res.json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching doctors' });
    }
};

// Get User Profile
export const getProfile = async (req: Request, res: Response) => {
    try {
        // Assuming user ID is attached to req by auth middleware (to be implemented)
        // For now, expect ID in params or query for testing
        const userId = req.params.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                patientReports: true,
                patientAppointments: true,
                doctorAppointments: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { passwordHash, ...userData } = user;
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update User Profile (Vitals, Contact, etc.)
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { name, contact, specialization, preferredLanguage, isAvailable } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                contact,
                specialization,
                preferredLanguage,
                ...(isAvailable !== undefined && { isAvailable })
            }
        });

        const { passwordHash, ...userData } = updatedUser;
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
