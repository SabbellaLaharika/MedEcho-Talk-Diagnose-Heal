import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translationService } from '../services/translationService';
import { sendEmail } from '../services/emailService';
import { getMedicalReportTemplate } from '../services/emailTemplates';
import axios from 'axios';
import Tesseract from 'tesseract.js';
const pdf = require('pdf-parse');

const prisma = new PrismaClient();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Generate report from call transcript using ML service
export const generateReportFromCall = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "No transcript provided" });

        const { data } = await axios.post(`${ML_SERVICE_URL}/analyze`, { text });
        res.json(data);
    } catch (error: any) {
        console.error("ML Analysis Proxy Error:", error.message);
        res.status(500).json({ message: "Failed to analyze transcript" });
    }
};

// Create Medical Report
export const createReport = async (req: Request, res: Response) => {
    try {
        const { patientId, doctorId, diagnosis, confidenceScore, preventions, chatTranscript, summary, symptoms, history, vitals, medications } = req.body;

        console.log("Creating report with payload:", { patientId, diagnosis, hasMedications: !!medications });

        if (!patientId || !diagnosis) {
            return res.status(400).json({ message: 'Missing required fields: patientId and diagnosis' });
        }

        const report = await (prisma.report as any).create({
            data: {
                patientId,
                doctorId: doctorId || null,
                diagnosis,
                confidenceScore: parseFloat(String(confidenceScore)) || 0,
                precautions: preventions || [],
                chatTranscript: chatTranscript || {},
                summary: summary || '',
                symptoms: symptoms || [],
                medications: medications || [],
                history: history || {},
                vitals: vitals || {}
            },
            include: {
                patient: { select: { name: true, email: true, preferredLanguage: true } },
                doctor: { select: { name: true } }
            }
        });

        // Email report asynchronously
        if (report.patient?.email) {
            const lang = report.patient.preferredLanguage || 'en';
            try {
                const [rSubject, rHeader, rBtn] = await Promise.all([
                    translationService.translate('Your Medical Report - MedEcho', lang),
                    translationService.translate('Medical Report', lang),
                    translationService.translate('View Full Report', lang)
                ]);

                sendEmail({
                    to: report.patient.email,
                    subject: rSubject,
                    text: `Your medical report has been generated. Diagnosis: ${report.diagnosis}`,
                    html: getMedicalReportTemplate({
                        patientName: report.patient.name,
                        doctorName: report.doctor?.name || 'AI Assistant',
                        date: new Date().toLocaleDateString(),
                        diagnosis: report.diagnosis,
                        precautions: report.precautions || [],
                        headerTitle: rHeader,
                        btn: rBtn
                    })
                });
            } catch (emailErr) {
                console.error("Non-blocking error sending report email:", emailErr);
            }
        }

        console.log("Report created successfully:", report.id);
        res.status(201).json(report);
    } catch (error: any) {
        console.error("Error creating report:", error);
        res.status(500).json({ message: 'Server error creating report', error: error.message });
    }
};

export const updateReportDoctor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { doctorId } = req.body;
        
        const report = await prisma.report.update({
            where: { id },
            data: { doctorId },
            include: { doctor: { select: { name: true } } }
        });
        
        res.json(report);
    } catch (error) {
        console.error("Error updating report doctor:", error);
        res.status(500).json({ error: "Failed to update report doctor assignment" });
    }
};

// Get Reports for a Patient (Localized)
export const getPatientReports = async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;
        
        // Fetch user to get preferred language
        const user = await prisma.user.findUnique({
            where: { id: patientId },
            select: { preferredLanguage: true }
        });

        const reports = await prisma.report.findMany({
            where: { patientId },
            include: {
                patient: { select: { name: true } },
                doctor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching reports' });
    }
};

// Get Report by ID (Localized)
export const getReportById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const report = await prisma.report.findUnique({
            where: { id },
            include: {
                patient: { select: { name: true, email: true, preferredLanguage: true } },
                doctor: { select: { name: true } }
            }
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching report' });
    }
};

// Send all patient reports to appointment doctor by assigning doctorId
export const sendPatientReportsToDoctor = async (req: Request, res: Response) => {
    try {
        const { patientId, appointmentId } = req.params;

        const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
        if (!appointment || appointment.patientId !== patientId) {
            return res.status(404).json({ message: 'Appointment not found for this patient' });
        }

        const doctorId = appointment.doctorId;
        if (!doctorId) {
            return res.status(400).json({ message: 'Appointment has no assigned doctor' });
        }

        await prisma.report.updateMany({ where: { patientId }, data: { doctorId } });

        const updatedReports = await prisma.report.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
        res.json({ message: 'All patient reports sent to doctor', doctorId, reports: updatedReports });
    } catch (error: any) {
        console.error('Error sending reports:', error);
        res.status(500).json({ message: 'Server error sharing reports', error: error.message });
    }
};

// Get all reports assigned to a doctor
export const getDoctorReports = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const reports = await prisma.report.findMany({
            where: { doctorId },
            include: {
                patient: { select: { name: true } },
                doctor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching doctor reports' });
    }
};
// Upload an external report (PDF/Image)
export const uploadReport = async (req: Request, res: Response) => {
    try {
        const file = (req as any).file;
        const { patientId, diagnosis, notes } = req.body;

        if (!patientId) {
            return res.status(400).json({ message: 'patientId is required' });
        }

        // If no file, just create text-based record
        let fileUrl: string | undefined;
        let fileName: string | undefined;
        let extractedText = '';

        if (file) {
            // Store file as base64 data URL to keep it self-contained (no S3 needed)
            const base64 = file.buffer.toString('base64');
            fileUrl = `data:${file.mimetype};base64,${base64}`;
            fileName = file.originalname;

            // OCR Extraction for uploaded images
            if (file.mimetype.startsWith('image/')) {
                try {
                    console.log(`Starting OCR text extraction for: ${fileName}...`);
                    const result = await Tesseract.recognize(file.buffer, 'eng');
                    if (result && result.data && result.data.text) {
                        extractedText = result.data.text.trim();
                        console.log(`Successfully extracted ${extractedText.length} characters using OCR.`);
                    }
                } catch (ocrErr) {
                    console.error("OCR Extraction failed to parse image:", ocrErr);
                }
            } else if (file.mimetype === 'application/pdf') {
                try {
                    console.log(`Starting PDF text extraction for: ${fileName}...`);
                    const data = await pdf(file.buffer);
                    if (data && data.text) {
                        extractedText = data.text.trim();
                        console.log(`Successfully extracted ${extractedText.length} characters from PDF.`);
                    }
                } catch (pdfErr) {
                    console.error("PDF extraction failed:", pdfErr);
                }
            }
        }

        // --- NEW: AI Analysis for Uploaded Reports ---
        let aiAnalysis: any = {};
        if (extractedText) {
            try {
                console.log("Analyzing extracted report text via ML Service...");
                const { data } = await axios.post(`${ML_SERVICE_URL}/analyze`, { text: extractedText });
                aiAnalysis = data;
            } catch (analyzeErr) {
                console.warn("AI Report Analysis failed, falling back to basic metadata:", analyzeErr);
            }
        }

        const report = await (prisma.report as any).create({
            data: {
                patientId,
                diagnosis: aiAnalysis.condition || diagnosis || (fileName ? `Uploaded: ${fileName}` : 'External Report'),
                confidenceScore: parseFloat(aiAnalysis.confidence) || 0,
                precautions: aiAnalysis.suggestions || [],
                chatTranscript: {},
                summary: aiAnalysis.summary || (extractedText 
                    ? `${notes ? notes + '\n\n' : ''}--- OCR EXTRACTED TEXT ---\n${extractedText}` 
                    : (notes || 'Manually uploaded report')),
                symptoms: aiAnalysis.symptoms_extracted || [],
                medications: aiAnalysis.medications || [],
                history: {},
                vitals: {},
                reportType: 'UPLOADED',
                fileUrl: fileUrl || null,
                fileName: fileName || null,
            },
            include: {
                patient: { select: { name: true } },
                doctor: { select: { name: true } }
            }
        });

        res.status(201).json(report);
    } catch (error: any) {
        console.error('Upload Report Error:', error);
        res.status(500).json({ message: 'Server error uploading report', error: error.message });
    }
};
