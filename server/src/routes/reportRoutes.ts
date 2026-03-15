import express from 'express';
import { createReport, getPatientReports, getReportById } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', protect, createReport);
router.get('/patient/:patientId', protect, getPatientReports);
router.get('/:id', protect, getReportById);

export default router;
