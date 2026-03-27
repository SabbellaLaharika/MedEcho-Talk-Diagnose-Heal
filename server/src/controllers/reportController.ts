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
                vitals: vitals || {},
                reportType: 'AI'
            },
            include: {
                patient: { select: { name: true, username: true, email: true, preferredLanguage: true } },
                doctor: { select: { name: true, username: true } }
            }
        });

        // Email report asynchronously
        if (report.patient?.email) {
            const lang = report.patient.preferredLanguage || 'en';
            console.log(`📧 Resolved report recipient: ${report.patient.email} (Lang: ${lang})`);
            try {
                const [rSubject, rHeader, rBtn] = await Promise.all([
                    translationService.translate('Your Medical Report - MedEcho', lang),
                    translationService.translate('Medical Report', lang),
                    translationService.translate('View Full Report', lang)
                ]);

                await sendEmail({
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

        // Create UI Notification
        await prisma.notification.create({
            data: {
                userId: patientId,
                title: 'New Medical Report',
                message: `Dr. ${report.doctor?.name || 'AI Assistant'} has generated a new report for your consultation on ${report.diagnosis}.`
            }
        });

        console.log("Report and Notification created successfully:", report.id);
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
                patient: { select: { name: true, username: true } },
                doctor: { select: { name: true, username: true } }
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
                patient: { select: { name: true, username: true, email: true, preferredLanguage: true } },
                doctor: { select: { name: true, username: true } }
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
                patient: { select: { name: true, username: true } },
                doctor: { select: { name: true, username: true } }
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
        const { patientId, diagnosis, notes, reportType, doctorId } = req.body;

        if (!patientId) {
            return res.status(400).json({ message: 'patientId is required' });
        }

        let fileUrl: string | undefined;
        let fileName: string | undefined;
        let extractedText = '';
        let extractionMethod = 'none';

        if (file) {
            // Store file as base64 data URL (self-contained, no S3 needed)
            const base64 = file.buffer.toString('base64');
            fileUrl = `data:${file.mimetype};base64,${base64}`;
            fileName = file.originalname;

            // ── STEP 1: Try Python ML Service extraction (higher quality) ──
            try {
                console.log(`[Upload] Trying Python /extract-text for: ${fileName}...`);
                const { data: pyResult } = await axios.post(
                    `${ML_SERVICE_URL}/extract-text`,
                    { file_base64: base64, mime_type: file.mimetype },
                    { timeout: 30000 }
                );
                if (pyResult?.success && pyResult?.text) {
                    extractedText = pyResult.text;
                    extractionMethod = `python-${pyResult.method}`;
                    console.log(`[Upload] Python extracted ${pyResult.char_count} chars via ${pyResult.method}.`);
                }
            } catch (pyErr: any) {
                console.warn('[Upload] Python extraction unavailable, falling back to Node.js:', pyErr.message);
            }

            // ── STEP 2: Fallback — Node.js extraction (Tesseract.js / pdf-parse) ──
            if (!extractedText) {
                if (file.mimetype.startsWith('image/')) {
                    try {
                        console.log(`[Upload] Node OCR fallback for: ${fileName}...`);
                        const result = await Tesseract.recognize(file.buffer, 'eng');
                        if (result?.data?.text) {
                            extractedText = result.data.text.trim();
                            extractionMethod = 'node-ocr';
                            console.log(`[Upload] Node OCR extracted ${extractedText.length} chars.`);
                        }
                    } catch (ocrErr) {
                        console.error('[Upload] Node OCR failed:', ocrErr);
                    }
                } else if (file.mimetype === 'application/pdf') {
                    try {
                        console.log(`[Upload] Node PDF fallback for: ${fileName}...`);
                        const data = await pdf(file.buffer);
                        if (data?.text) {
                            extractedText = data.text.trim();
                            extractionMethod = 'node-pdf';
                            console.log(`[Upload] Node PDF extracted ${extractedText.length} chars.`);
                        }
                    } catch (pdfErr) {
                        console.error('[Upload] Node PDF extraction failed:', pdfErr);
                    }
                }
            }
        }

        // ── STEP 3: AI Analysis on extracted text (if any) ──────────────
        let aiAnalysis: any = {};
        if (extractedText) {
            try {
                console.log('[Upload] Sending extracted text to ML /analyze...');
                const { data } = await axios.post(`${ML_SERVICE_URL}/analyze`, { text: extractedText });
                aiAnalysis = data;
            } catch (analyzeErr) {
                console.warn('[Upload] AI analysis failed, using raw extracted text:', analyzeErr);
            }
        }

        // Build the summary: AI summary preferred, then clean extracted text, then notes
        const summaryParts: string[] = [];
        if (notes) summaryParts.push(notes);
        if (aiAnalysis.summary) {
            summaryParts.push(aiAnalysis.summary);
        } else if (extractedText) {
            summaryParts.push(`--- Extracted Report Content ---\n${extractedText}`);
        }
        const finalSummary = summaryParts.join('\n\n') || 'Manually uploaded report';

        const report = await (prisma.report as any).create({
            data: {
                patientId,
                diagnosis: aiAnalysis.condition || diagnosis || (fileName ? `Uploaded: ${fileName}` : 'External Report'),
                confidenceScore: parseFloat(aiAnalysis.confidence) || 0,
                precautions: aiAnalysis.suggestions || [],
                chatTranscript: {},
                summary: finalSummary,
                symptoms: aiAnalysis.symptoms_extracted || [],
                medications: aiAnalysis.medications || [],
                history: {},
                vitals: {},
                reportType: reportType || 'UPLOADED',
                doctorId: doctorId || null,
                fileUrl: fileUrl || null,
                fileName: fileName || null,
            },
            include: {
                patient: { select: { name: true, username: true, email: true, preferredLanguage: true } },
                doctor: { select: { name: true, username: true } }
            }
        });

        // Email report asynchronously
        if (report.patient?.email) {
            const lang = report.patient.preferredLanguage || 'en';
            try {
                const [rSubject, rHeader, rBtn] = await Promise.all([
                    translationService.translate('Your Uploaded Medical Report - MedEcho', lang),
                    translationService.translate('Uploaded Report Added', lang),
                    translationService.translate('View Full Report', lang)
                ]);

                await sendEmail({
                    to: report.patient.email,
                    subject: rSubject,
                    text: `A new uploaded medical report has been added to your account. Diagnosis: ${report.diagnosis}`,
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
                console.error("Non-blocking error sending upload report email:", emailErr);
            }
        }

        // Create UI Notification
        await prisma.notification.create({
            data: {
                userId: patientId,
                title: 'New Uploaded Report',
                message: `An external report (${report.fileName || 'document'}) has been analyzed and added to your records.`
            }
        });

        console.log(`[Upload] Report saved. Extraction: ${extractionMethod}, Summary: ${finalSummary.length} chars.`);
        res.status(201).json(report);
    } catch (error: any) {
        console.error('Upload Report Error:', error);
        res.status(500).json({ message: 'Server error uploading report', error: error.message });
    }
};
/**
 * Delete a report by ID
 */
export const deleteReport = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // User must own the report to delete it

        // Check if report exists and belongs to user
        const report = await prisma.report.findUnique({
            where: { id: id }
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        if (report.patientId !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this report' });
        }

        await prisma.report.delete({
            where: { id: id }
        });

        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error: any) {
        console.error('Delete Report Error:', error);
        res.status(500).json({ message: 'Server error deleting report', error: error.message });
    }
};
