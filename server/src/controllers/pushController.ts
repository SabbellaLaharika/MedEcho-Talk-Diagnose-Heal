import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const subscribe = async (req: Request, res: Response) => {
    try {
        const { userId, subscription } = req.body;

        if (!userId || !subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Missing userId or subscription details' });
        }

        // Extract key components of the subscription
        const { endpoint, keys } = subscription;
        if (!keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ message: 'Invalid subscription notification keys' });
        }

        // Upsert the subscription (one endpoint per device)
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                userId,
                p256dh: keys.p256dh,
                auth: keys.auth
            },
            create: {
                userId,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            }
        });

        res.status(201).json({ message: 'Push subscription registered successfully' });
    } catch (error: any) {
        console.error('[Push Subscribe] Error:', error);
        res.status(500).json({ message: 'Failed to subscribe to push notifications', error: error.message });
    }
};

export const unsubscribe = async (req: Request, res: Response) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ message: 'Endpoint is required' });

        await prisma.pushSubscription.deleteMany({
            where: { endpoint }
        });

        res.json({ message: 'Push subscription removed successfully' });
    } catch (error: any) {
        console.error('[Push Unsubscribe] Error:', error);
        res.status(500).json({ message: 'Failed to unsubscribe', error: error.message });
    }
};

export const testPush = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const { notificationService } = require('../services/notificationService');
        
        // Find user to get their role
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        await notificationService.sendNotification({
            userId,
            title: 'MedEcho System Test',
            message: 'Your background notification system is working correctly!',
            role: user.role,
            type: 'TEST_PUSH'
        });

        res.json({ message: 'Test notification sent' });
    } catch (error: any) {
        console.error('[Push Test] Error:', error);
        res.status(500).json({ message: 'Failed to send test push', error: error.message });
    }
};
