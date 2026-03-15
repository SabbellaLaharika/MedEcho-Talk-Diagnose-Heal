const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Save a new diagnosis report
// @route   POST /api/diagnosis
// @access  Private (Patient/Doctor)
const createDiagnosis = async (req, res) => {
    try {
        const { symptoms, disease, confidence, history } = req.body;
        // User ID comes from auth middleware
        const patientId = req.user.id;

        if (!symptoms || !disease) {
            return res.status(400).json({ message: 'Symptoms and Disease are required' });
        }

        const diagnosis = await prisma.diagnosis.create({
            data: {
                patientId,
                symptoms: Array.isArray(symptoms) ? symptoms.join(', ') : symptoms,
                disease,
                confidence,
                history: JSON.stringify(history || {}), // Store Q&A as JSON string
            }
        });

        res.status(201).json(diagnosis);
    } catch (error) {
        console.error('Error saving diagnosis:', error);
        res.status(500).json({ message: 'Server Error saving diagnosis' });
    }
};

// @desc    Get all diagnoses for the logged-in patient
// @route   GET /api/diagnosis/my-reports
// @access  Private (Patient)
const getMyDiagnoses = async (req, res) => {
    try {
        const reports = await prisma.diagnosis.findMany({
            where: {
                patientId: req.user.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching diagnoses:', error);
        res.status(500).json({ message: 'Server Error fetching reports' });
    }
};

// @desc    Get diagnosis by ID
// @route   GET /api/diagnosis/:id
// @access  Private
const getDiagnosisById = async (req, res) => {
    try {
        const report = await prisma.diagnosis.findUnique({
            where: { id: req.params.id },
            include: { patient: { select: { name: true, age: true, gender: true } } }
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Check permissions: Patient owns it OR User is Doctor/Admin
        if (report.patientId !== req.user.id && req.user.role === 'patient') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching diagnosis:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all diagnoses (Doctor/Admin only)
// @route   GET /api/diagnosis/all
// @access  Private (Doctor/Admin)
const getAllDiagnoses = async (req, res) => {
    try {
        // Enforce role
        if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const reports = await prisma.diagnosis.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                patient: {
                    select: { name: true, age: true, gender: true }
                }
            }
        });
        res.json(reports);
    } catch (error) {
        console.error('Error fetching all diagnoses:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createDiagnosis,
    getMyDiagnoses,
    getDiagnosisById,
    getAllDiagnoses
};
