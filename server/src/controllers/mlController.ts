import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';

// Get Python Service URL from env or default
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

let lastPingStatus: { time: number; data: any } | null = null;
const PING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Proxy Chat/Predict Request
export const pingML = async (req: Request, res: Response) => {
    // Check cache
    const now = Date.now();
    if (lastPingStatus && (now - lastPingStatus.time < PING_CACHE_TTL)) {
        return res.status(200).json(lastPingStatus.data);
    }

    try {
        const { data } = await axios.get(`${ML_SERVICE_URL}/ping`, { timeout: 5000 });
        lastPingStatus = { time: now, data: { status: 'ok', message: 'ML Service Active', ...data } };
        res.status(200).json(lastPingStatus.data);
    } catch (error: any) {
        // Return 200 even if down to "clear" the browser console error as requested
        // But log the real issue on the server side for the developer
        console.warn(`⚠️ ML Service Ping Failed at ${ML_SERVICE_URL}: ${error.message}`);
        
        const sleepingData = { 
            status: 'sleeping', 
            message: 'ML Service is currently unreachable or sleeping',
            url: ML_SERVICE_URL
        };
        
        // Don't cache failures for too long, but at least 30s to prevent spam
        if (!lastPingStatus || (now - lastPingStatus.time > 30000)) {
            lastPingStatus = { time: now, data: sleepingData };
        }
        
        res.status(200).json(sleepingData);
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
        const status = error.response?.status || 503;
        const message = error.response?.data?.message || error.message;
        
        console.error(`Chat AI Proxy Error (${status}):`, message);
        
        if (status === 429) {
            return res.status(429).json({
                message: 'AI Service is currently busy. Please wait a moment.',
                reply: 'I am receiving too many requests right now. Please wait a few seconds and try again!'
            });
        }

        if (error.code === 'ECONNREFUSED') {
            console.error('CRITICAL: Backend cannot reach ML Service. Check ML_SERVICE_URL env var.');
        }

        res.status(status).json({
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
