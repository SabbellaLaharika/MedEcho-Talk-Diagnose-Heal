import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';

// Get Python Service URL from env or default
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Proxy Chat/Predict Request
export const pingML = async (req: Request, res: Response) => {
    try {
        await axios.get(`${ML_SERVICE_URL}/ping`, { timeout: 5000 });
        res.status(200).json({ status: 'ok', message: 'ML Service Active' });
    } catch (error: any) {
        // Return 200 even if down to "clear" the browser console error as requested
        // But log the real issue on the server side for the developer
        console.warn(`⚠️ ML Service Ping Failed at ${ML_SERVICE_URL}: ${error.message}`);
        res.status(200).json({ 
            status: 'sleeping', 
            message: 'ML Service is currently unreachable or sleeping',
            url: ML_SERVICE_URL
        });
    }
};

export const chatWithAI = async (req: Request, res: Response) => {
    try {
        const { text, context, lang } = req.body;
        console.log(`ML Proxy: Chat calling AI service at ${ML_SERVICE_URL}...`);

        // Forward to Python Service
        const response = await axios.post(`${ML_SERVICE_URL}/chat`, {
            text,
            context: context || {},
            lang: lang || 'en'
        });

        res.json(response.data);
    } catch (error: any) {
        console.error('Chat AI Proxy Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('CRITICAL: Backend cannot reach ML Service. Check ML_SERVICE_URL env var.');
        }
        // If Python service is down, return a fallback or error
        res.status(503).json({
            message: 'AI Service is currently unavailable',
            reply: 'I am sorry, I cannot process your request right now. Please try again later.'
        });
    }
};

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Proxy Speech-to-Text
export const speechToText = async (req: Request, res: Response) => {
    try {
        const file = (req as MulterRequest).file;
        const language = req.body.language || 'en';

        if (!file) {
            return res.status(400).json({ message: 'No audio file uploaded' });
        }

        // Create form data to send to Python service
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        formData.append('language', language);

        // Forward to Python Service
        const response = await axios.post(`${ML_SERVICE_URL}/stt`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('STT Error:', error);
        res.status(500).json({ message: 'Server error processing audio' });
    }
};

export const analyzeSymptoms = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        
        const response = await axios.post(`${ML_SERVICE_URL}/analyze`, { text });
        res.json(response.data);
    } catch (error) {
        console.error('Analysis Proxy Error:', error);
        res.status(500).json({ message: 'Error analyzing symptoms via AI service' });
    }
};

export const translateText = async (req: Request, res: Response) => {
    const { text, target_lang, source_lang } = req.body;
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/translate`, {
            text,
            target_lang: target_lang || 'en',
            source_lang: source_lang || 'en'
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Translate Proxy Error:', error);
        res.status(503).json({ 
            message: 'Translation Service Unavailable',
            translated: text // Fallback to original
        });
    }
};

export const translateBatch = async (req: Request, res: Response) => {
    const { texts, target_lang, source_lang } = req.body;
    try {
        console.log(`ML Proxy: Batch Translation to ${target_lang} calling ${ML_SERVICE_URL}...`);
        const response = await axios.post(`${ML_SERVICE_URL}/translate_batch`, {
            texts: texts || [],
            target_lang: target_lang || 'en',
            source_lang: source_lang || 'en'
        });
        
        res.json(response.data);
    } catch (error: any) {
        console.error('Translate Batch Proxy Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('CRITICAL: Backend cannot reach ML Service. Check ML_SERVICE_URL env var.');
        }
        res.status(503).json({ 
            message: 'Translation Service Unavailable',
            translations: texts // Fallback to originals
        });
    }
};
