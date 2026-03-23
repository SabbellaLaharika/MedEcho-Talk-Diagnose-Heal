import express from 'express';
import { createReport, getPatientReports, getReportById, sendPatientReportsToDoctor, getDoctorReports, updateReportDoctor, generateReportFromCall } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createReport);
router.post('/analyze-transcript', protect, generateReportFromCall);
router.post('/patient/:patientId/send/:appointmentId', protect, sendPatientReportsToDoctor);
router.get('/patient/:patientId', protect, getPatientReports);
router.get('/doctor/:doctorId', protect, getDoctorReports);
router.get('/:id', protect, getReportById);
router.put('/:id/doctor', protect, updateReportDoctor);

export default router;
