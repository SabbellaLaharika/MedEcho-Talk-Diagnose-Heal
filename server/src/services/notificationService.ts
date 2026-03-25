import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lazy getter to avoid circular dependency with index.ts
// index.ts -> routes -> controller -> notificationService -> index.ts (CIRCULAR)
// Instead, we require io lazily at call time, after the module has fully loaded.
const getIo = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../index').io;
};

export const notificationService = {
    /**
     * Sends a notification to a specific user via database and real-time socket.
     */
    sendNotification: async (params: {
        userId: string;
        title: string;
        message: string;
        type?: string;
        role: 'PATIENT' | 'DOCTOR';
        metadata?: any;
    }) => {
        try {
            // 1. Persist in database
            const notification = await prisma.notification.create({
                data: {
                    userId: params.userId,
                    title: params.title,
                    message: params.message,
                    isRead: false
                }
            });

            // 2. Emit via Socket.io in real time
            try {
                const io = getIo();
                const room = `${params.role}:${params.userId}`;
                io.to(room).emit('notification', {
                    id: notification.id,
                    userId: notification.userId,
                    title: notification.title,
                    message: notification.message,
                    type: params.type || 'ALERT',
                    timestamp: notification.createdAt,
                    isRead: notification.isRead,
                    metadata: params.metadata
                });
                console.log(`[Notification] Sent to ${room}: ${params.title}`);
            } catch (socketErr) {
                // Socket error should never prevent the DB notification from succeeding
                console.error('[Notification] Socket emit failed (non-fatal):', socketErr);
            }

            return notification;
        } catch (error) {
            console.error('[Notification] Failed to create notification:', error);
            throw error;
        }
    }
};
