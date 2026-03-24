import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../services/emailService';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role, preferredLanguage } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // --- Sequential Username Generation ---
        const userRole = role || 'PATIENT';
        const prefix = userRole === 'DOCTOR' ? 'D' : (userRole === 'PATIENT' ? 'P' : 'A');
        const padLen = userRole === 'PATIENT' ? 5 : 3;

        const latestUser = await prisma.user.findFirst({
            where: { username: { startsWith: prefix } },
            orderBy: { username: 'desc' },
            select: { username: true }
        });

        let newNum = 1;
        if (latestUser && latestUser.username) {
            const currentNumStr = latestUser.username.substring(1);
            const parsed = parseInt(currentNumStr);
            if (!isNaN(parsed)) {
                newNum = parsed + 1;
            }
        }
        const username = `${prefix}${newNum.toString().padStart(padLen, '0')}`;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash: hashedPassword,
                name,
                role: userRole as any,
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

        // Allow login via email or username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: email }
                ]
            }
        });

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

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await (prisma.user as any).update({
            where: { email },
            data: { otp, otpExpiry }
        });

        await sendEmail({
            to: email,
            subject: 'MedEcho - Password Reset OTP',
            text: `Your OTP for password reset is ${otp}. It expires in 15 minutes.`,
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                <h2>Password Reset</h2>
                <p>You requested a password reset. Use the OTP below to set a new password:</p>
                <h1 style="letter-spacing: 5px; color: #2563eb; background: #e0e7ff; padding: 10px; border-radius: 8px; display: inline-block;">${otp}</h1>
                <p>This code will expire in 15 minutes.</p>
            </div>
            `
        });

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user: any = await prisma.user.findUnique({ where: { email } });
        if (!user || user.otp !== otp || !user.otpExpiry) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date(user.otpExpiry) < new Date()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await (prisma.user as any).update({
            where: { email },
            data: {
                passwordHash: hashedPassword,
                otp: null,
                otpExpiry: null
            }
        });

        res.json({ message: 'Password reset completely successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
