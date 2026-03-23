import express from 'express';
import { getUserNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';

const router = express.Router();

router.get('/:userId', getUserNotifications);
router.put('/:id/read', markAsRead);
router.put('/user/:userId/read-all', markAllAsRead);

export default router;
