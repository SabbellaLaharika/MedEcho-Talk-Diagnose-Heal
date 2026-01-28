const express = require('express');
const { getUserAppointments } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/my-appointments').get(protect, getUserAppointments);

module.exports = router;

