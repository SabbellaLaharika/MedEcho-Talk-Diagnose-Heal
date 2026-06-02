import express from 'express';
import { protect } from '../middleware/authMiddleware';
import * as reminderController from '../controllers/reminderController';

const router = express.Router();

router.get('/', protect, reminderController.getUserReminders);
router.get('/user/:userId', protect, reminderController.getUserReminders);
router.post('/', protect, reminderController.createManualReminder);
router.delete('/:id', protect, reminderController.deleteReminder);
router.patch('/:id/toggle', protect, reminderController.toggleReminder);

export default router;
