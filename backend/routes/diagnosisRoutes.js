const express = require('express');
const router = express.Router();
const { createDiagnosis, getMyDiagnoses, getDiagnosisById, getAllDiagnoses } = require('../controllers/diagnosisController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createDiagnosis);
router.get('/my-reports', protect, getMyDiagnoses);
router.get('/all', protect, getAllDiagnoses);
router.get('/:id', protect, getDiagnosisById);

module.exports = router;
