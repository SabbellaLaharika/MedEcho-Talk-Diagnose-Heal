
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translationService } from '../services/translationService';
import NodeCache from 'node-cache';

const prisma = new PrismaClient();
const apiCache = new NodeCache({ stdTTL: 600, checkperiod: 120 }); // Cache for 10 minutes

// Get all doctors (Localized based on requesting user's preference if provided, or defaults)
export const getDoctors = async (req: Request, res: Response) => {
    try {
        const { lang } = req.query; // Optional lang query param
        const cacheKey = `doctors_${lang || 'en'}`;

        // 1. Check Cache
        if (apiCache.has(cacheKey)) {
            console.log("Serving doctors from fast memory cache");
            return res.json(apiCache.get(cacheKey));
        }

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
                username: true,
            }
        });

        // Deduplicate doctor entries by normalized name (handles seeded duplicates)
        const uniqueDoctors = new Map<string, any>();
        for (const doctor of doctors) {
            const key = (doctor.name || '').trim().toLowerCase();
            if (!uniqueDoctors.has(key)) {
                uniqueDoctors.set(key, doctor);
            }
        }
        const dedupedDoctors = Array.from(uniqueDoctors.values());

        if (lang && typeof lang === 'string' && lang !== 'en') {
            const translatedDoctors = await translationService.translateArray(
                dedupedDoctors,
                ['name', 'specialization'],
                lang
            );
            apiCache.set(cacheKey, translatedDoctors); // 2. Save translated to Cache
            return res.json(translatedDoctors);
        }

        apiCache.set(cacheKey, dedupedDoctors); // 2. Save to Cache
        res.json(dedupedDoctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching doctors' });
    }
};

// Get User Profile
export const getProfile = async (req: Request, res: Response) => {
    try {
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
