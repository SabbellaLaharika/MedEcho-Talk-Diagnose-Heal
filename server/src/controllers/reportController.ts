
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { translationService } from '../services/translationService';
import { sendEmail } from '../services/emailService';
import { getMedicalReportTemplate } from '../services/emailTemplates';

const prisma = new PrismaClient();

// Create Medical Report
export const createReport = async (req: Request, res: Response) => {
    try {
        const { patientId, doctorId, diagnosis, confidenceScore, preventions, chatTranscript, summary, symptoms, history, vitals } = req.body;

        console.log("Creating report with payload:", { patientId, diagnosis, hasVitals: !!vitals });

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
