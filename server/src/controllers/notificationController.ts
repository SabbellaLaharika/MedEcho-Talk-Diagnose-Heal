import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUserNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
        res.json(notification);
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ message: 'Server error updating notification' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error updating notifications:', error);
        res.status(500).json({ message: 'Server error updating notifications' });
    }
};
