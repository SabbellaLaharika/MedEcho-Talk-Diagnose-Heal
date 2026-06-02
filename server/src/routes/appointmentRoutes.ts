import express from 'express';
import { createAppointment, getAppointments, updateAppointmentStatus, deleteAppointment, startCall, getDoctorBookedSlots, nudgeCall } from '../controllers/appointmentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createAppointment);
router.get('/doctor/:doctorId/booked', getDoctorBookedSlots);
router.get('/:userId', protect, getAppointments);
router.put('/:id', protect, updateAppointmentStatus);
router.post('/:id/start-call', protect, startCall);
router.post('/:id/nudge', protect, nudgeCall);
router.delete('/:id', protect, deleteAppointment);

export default router;
