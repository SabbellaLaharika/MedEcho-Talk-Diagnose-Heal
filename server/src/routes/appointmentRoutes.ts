import express from 'express';
import { createAppointment, getAppointments, updateAppointmentStatus, deleteAppointment } from '../controllers/appointmentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createAppointment);
router.get('/:userId', protect, getAppointments);
router.put('/:id', protect, updateAppointmentStatus);
router.delete('/:id', protect, deleteAppointment);

export default router;
