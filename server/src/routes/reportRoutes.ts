import express from 'express';
import { createReport, getPatientReports, getReportById, sendPatientReportsToDoctor, getDoctorReports } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createReport);
router.post('/patient/:patientId/send/:appointmentId', protect, sendPatientReportsToDoctor);
router.get('/patient/:patientId', protect, getPatientReports);
router.get('/doctor/:doctorId', protect, getDoctorReports);
router.get('/:id', protect, getReportById);

export default router;
