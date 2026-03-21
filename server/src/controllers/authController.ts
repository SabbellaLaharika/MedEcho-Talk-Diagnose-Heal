import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role, preferredLanguage } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role: role || 'PATIENT',
                preferredLanguage: preferredLanguage || 'en',
            },
        });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, {
            expiresIn: '1d',
        });

        const { passwordHash, ...userWithoutPassword } = user;
        res.status(201).json({ token, user: userWithoutPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, {
            expiresIn: '1d',
        });

        const { passwordHash, ...userWithoutPassword } = user;
        res.json({ token, user: userWithoutPassword });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { id, name, contact, avatar, gender, dob, bloodGroup, address, preferredLanguage, vitalBp, vitalWeight, vitalGlucose, vitalTemperature } = req.body;

        const user = await (prisma.user as any).update({
            where: { id },
            data: {
                name,
                contact,
                avatar,
                gender,
                bloodGroup,
                address,
                preferredLanguage,
                dob: dob ? new Date(dob) : null,
                // Vitals — null means "deleted/cleared", undefined means "not changed"
                ...(vitalBp !== undefined && { vitalBp: vitalBp || null }),
                ...(vitalWeight !== undefined && { vitalWeight: vitalWeight || null }),
                ...(vitalGlucose !== undefined && { vitalGlucose: vitalGlucose || null }),
                ...(vitalTemperature !== undefined && { vitalTemperature: vitalTemperature || null }),
            }
        });

        const { passwordHash, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error: any) {
        console.error("Update error:", error);
        res.status(500).json({ message: 'Server error updating profile', error: error.message });
    }
};
