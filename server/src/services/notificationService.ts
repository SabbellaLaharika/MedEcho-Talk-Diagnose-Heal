import prisma from '../lib/prisma';
import webpush from 'web-push';

// Configuration for Web Push (VAPID)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BFpoWP42ayomI-t62kJUIJNW84ZUUYO3DL8gA5r6jIo1J8V4W2XuUyCsUXgGdOW_pf8qgbAY30-dhQbiZj2UTZE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'CkWIzLaqkf-rDfrPgMeI-Zg8ASvnLvZFcNry-26AMcU';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:slaharisvrsslsmr712@gmail.com';

try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Web Push (VAPID) initialized successfully.');
} catch (err) {
    console.error('❌ Web Push Initialization failed:', err);
}

// Lazy getter to avoid circular dependency with index.ts
const getIo = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../index').io;
};

export const notificationService = {
    /**
     * Sends a notification to a specific user via database, real-time socket, and Web Push.
     */
    sendNotification: async (params: {
        userId: string;
        title: string;
        message: string;
        type?: string;
        role: 'PATIENT' | 'DOCTOR';
        metadata?: any;
    }) => {
        const start = Date.now();
        try {
            // 1. Persist in database
            const notification = await prisma.notification.create({
                data: {
                    userId: params.userId,
                    title: params.title,
                    message: params.message,
                    type: params.type || 'INFO',
                    metadata: params.metadata,
                    isRead: false
                }
            });

            const notificationPayload = {
                id: notification.id,
                userId: notification.userId,
                title: notification.title,
                message: notification.message,
                type: params.type || 'ALERT',
                timestamp: notification.createdAt,
                isRead: notification.isRead,
                metadata: params.metadata
            };

            // 2. Emit via Socket.io in real time
            try {
                const io = getIo();
                if (io) {
                    const room = `${params.role}:${params.userId}`;
                    io.to(room).emit('notification', notificationPayload);
                    console.log(`[Notification] Sent to socket ${room}: ${params.title}`);
                }
            } catch (socketErr) {
                console.error('[Notification] Socket emit failed:', socketErr);
            }

            // 3. Send via Web Push (for background notifications)
            try {
                const subscriptions = await (prisma as any).pushSubscription.findMany({
                    where: { userId: params.userId }
                });

                if (subscriptions.length > 0) {
                    console.log(`[Push] Found ${subscriptions.length} active subscriptions for user ${params.userId.slice(-6)}`);
                    const pushPayload = JSON.stringify({
                        type: 'SHOW_NOTIFICATION',
                        payload: {
                            title: params.title,
                            body: params.message,
                            data: notificationPayload
                        }
                    });

                    // Send to all registered devices for this user
                    const pushResults = await Promise.allSettled(
                        subscriptions.map((sub: any) => 
                            webpush.sendNotification({
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            }, pushPayload, {
                                TTL: 24 * 60 * 60,
                                urgency: 'high',
                                topic: 'medecho-alerts'
                            })
                        )
                    );

                    // Optional: Clean up failed/expired subscriptions
                    const expiredEndpoints = pushResults
                        .map((res: any, i: number) => {
                            if (res.status === 'rejected') {
                                const statusCode = res.reason?.statusCode;
                                console.error(`[Push] Delivery failed for device ${subscriptions[i].endpoint.slice(-10)}:`, statusCode || res.reason?.message || res.reason);
                                
                                if (statusCode === 404 || statusCode === 410) {
                                    return subscriptions[i].endpoint;
                                }
                            } else {
                                console.log(`[Push] Delivery successful to device ${subscriptions[i].endpoint.slice(-10)}`);
                            }
                            return null;
                        })
                        .filter(Boolean);
                    
                    if (expiredEndpoints.length > 0) {
                        await (prisma as any).pushSubscription.deleteMany({
                            where: { endpoint: { in: expiredEndpoints as string[] } }
                        });
                        console.log(`[Push] Cleaned up ${expiredEndpoints.length} dead endpoints.`);
                    }
                } else {
                    console.log(`[Push] No push subscriptions found for user ${params.userId.slice(-6)}. Background alerts will not be delivered.`);
                }
            } catch (pushErr) {
                console.error('[Notification] Web Push delivery failed:', pushErr);
            }

            return notification;
        } catch (error) {
            console.error(`[Notification] Failed in ${Date.now() - start}ms:`, error);
            throw error;
        }
    },

    /**
     * Broadcasts an event to ALL connected clients.
     */
    broadcast: (event: string, payload: any) => {
        try {
            const io = getIo();
            if (io) {
                io.emit(event, payload);
                console.log(`[Notification] Broadcasted ${event} to all clients.`);
            }
        } catch (err) {
            console.error('[Notification] Broadcast failed:', err);
        }
    }
};
