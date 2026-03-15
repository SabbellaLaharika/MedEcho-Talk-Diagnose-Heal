const express = require('express');
const { getUserAppointments, createAppointment, updateAppointmentStatus } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my-appointments', protect, getUserAppointments);
router.post('/', protect, createAppointment);
router.put('/:id/status', protect, updateAppointmentStatus);

module.exports = router;