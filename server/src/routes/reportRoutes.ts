import express from 'express';
import multer from 'multer';
import { createReport, getPatientReports, getReportById, sendPatientReportsToDoctor, getDoctorReports, updateReportDoctor, generateReportFromCall, uploadReport } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

router.post('/', protect, createReport);
router.post('/upload', protect, upload.single('file'), uploadReport);
router.post('/analyze-transcript', protect, generateReportFromCall);
router.post('/patient/:patientId/send/:appointmentId', protect, sendPatientReportsToDoctor);
router.get('/patient/:patientId', protect, getPatientReports);
router.get('/doctor/:doctorId', protect, getDoctorReports);
router.get('/:id', protect, getReportById);
router.put('/:id/doctor', protect, updateReportDoctor);

export default router;
