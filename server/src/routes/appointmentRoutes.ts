import express from 'express';
import { createAppointment, getAppointments, updateAppointmentStatus, deleteAppointment, startCall, getDoctorBookedSlots } from '../controllers/appointmentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createAppointment);
router.get('/doctor/:doctorId/booked', getDoctorBookedSlots);
router.get('/:userId', protect, getAppointments);
router.put('/:id', protect, updateAppointmentStatus);
router.post('/:id/start-call', protect, startCall);
router.delete('/:id', protect, deleteAppointment);

export default router;
