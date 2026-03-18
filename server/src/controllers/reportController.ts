import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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
            }
        });

        console.log("Report created successfully:", report.id);
        res.status(201).json(report);
    } catch (error: any) {
        console.error("Error creating report:", error);
        res.status(500).json({ message: 'Server error creating report', error: error.message });
    }
};

// Get Reports for a Patient
export const getPatientReports = async (req: Request, res: Response) => {
    try {
        const { patientId } = req.params;

        const reports = await prisma.report.findMany({
            where: { patientId },
            include: {
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

// Get Report by ID
export const getReportById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const report = await prisma.report.findUnique({
            where: { id },
            include: {
                patient: { select: { name: true, email: true } },
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
