import express from 'express';
import { getSchedule, saveSchedule, getBlockedSlots, blockSlot, unblockSlot } from '../controllers/scheduleController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/:doctorId', getSchedule);
router.put('/:doctorId', protect, saveSchedule);
router.get('/:doctorId/blocked', getBlockedSlots);
router.post('/:doctorId/blocked', protect, blockSlot);
router.delete('/:doctorId/blocked/:id', protect, unblockSlot);

export default router;
