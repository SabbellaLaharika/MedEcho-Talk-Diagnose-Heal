const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Public
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await prisma.doctor.findMany({
            include: {
                department: true
            }
        });
        res.json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res) => {
    try {
        const doctor = await prisma.doctor.findUnique({
            where: { id: req.params.id },
            include: {
                department: true
            }
        });

        if (doctor) {
            res.json(doctor);
        } else {
            res.status(404).json({ message: 'Doctor not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get doctors by department
// @route   GET /api/doctors/department/:departmentId
// @access  Public
const getDoctorsByDepartment = async (req, res) => {
    try {
        const doctors = await prisma.doctor.findMany({
            where: { departmentId: req.params.departmentId },
            include: {
                department: true
            }
        });
        res.json(doctors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAllDoctors,
    getDoctorById,
    getDoctorsByDepartment
};
