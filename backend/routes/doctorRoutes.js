const express = require('express');
const { getAllDoctors, getDoctorById, getDoctorsByDepartment } = require('../controllers/doctorController');

const router = express.Router();

router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/department/:departmentId', getDoctorsByDepartment);

module.exports = router;
