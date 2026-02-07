const express = require('express');
const { getAllDepartments } = require('../controllers/departmentController');

const router = express.Router();

router.get('/', getAllDepartments);

module.exports = router;
