import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';

// Get Python Service URL from env or default
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

let lastPingStatus: { time: number; data: any } | null = null;
const PING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function for automatic retries on cold starts (429/503)
/**
 * Wraps an axios call with a retry strategy explicitly for Render cold-starts.
 * If we get a 429 (Busy) or 503 (Starting), we wait and try again.
 */
export const callMLWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 3000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const status = error.response?.status;
            // 429 = Too many requests (Render rate limiter during boot)
            // 503 = Service Unavailable (Render during spin-up)
            if ((status === 429 || status === 503) && i < retries - 1) {
                console.log(`ML Proxy: Service busy (Status ${status}). Retrying in ${delay/1000}s... (Attempt ${i+1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
};

export const pingML = async (req: Request, res: Response) => {
    // Check cache
    const now = Date.now();
    if (lastPingStatus && (now - lastPingStatus.time < PING_CACHE_TTL)) {
        return res.status(200).json(lastPingStatus.data);
    }

    try {
        const { data } = await axios.get(`${ML_SERVICE_URL}/ping`, { timeout: 10000 });
        lastPingStatus = { time: now, data: { status: 'ok', message: 'ML Service Active', ...data } };
        res.status(200).json(lastPingStatus.data);
    } catch (error: any) {
        console.warn(`⚠️ ML Service Ping Failed at ${ML_SERVICE_URL}: ${error.message}`);
        
        const sleepingData = { 
            status: 'sleeping', 
            message: 'ML Service is currently unreachable or sleeping',
            url: ML_SERVICE_URL
        };
        
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

        // Forward to Python Service with Retry
        const response = await callMLWithRetry(() => 
            axios.post(`${ML_SERVICE_URL}/chat`, {
                text,
                context: context || {},
                lang: lang || 'en'
            }, { timeout: 60000 }) // 1 minute timeout for cold starts
        );

        res.json(response.data);
    } catch (error: any) {
        const status = error.response?.status || 503;
        const message = error.response?.data?.message || error.message;
        
        console.error(`Chat AI Proxy Error (${status}):`, message);
        
        if (status === 429) {
            return res.status(429).json({
                message: 'AI Service is currently waking up or busy. Please wait a moment.',
                reply: 'I am receiving too many requests right now while waking up. Please wait a few seconds and try again!'
            });
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

        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        formData.append('language', language);

        const response = await callMLWithRetry(() => 
            axios.post(`${ML_SERVICE_URL}/stt`, formData, {
                headers: { ...formData.getHeaders() },
                timeout: 60000
            })
        );

        res.json(response.data);
    } catch (error: any) {
        console.error('STT Error:', error.message);
        res.status(error.response?.status || 500).json({ message: 'Error processing audio' });
    }
};

export const analyzeSymptoms = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        const response = await callMLWithRetry(() => 
            axios.post(`${ML_SERVICE_URL}/analyze`, { text }, { timeout: 30000 })
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Analysis Proxy Error:', error.message);
        res.status(error.response?.status || 500).json({ message: 'Error analyzing symptoms' });
    }
};

export const translateText = async (req: Request, res: Response) => {
    const { text, target_lang, source_lang } = req.body;
    try {
        const response = await callMLWithRetry(() => 
            axios.post(`${ML_SERVICE_URL}/translate`, {
                text,
                target_lang: target_lang || 'en',
                source_lang: source_lang || 'en'
            }, { timeout: 30000 })
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Translate Proxy Error:', error.message);
        res.status(error.response?.status || 503).json({ 
            message: 'Translation Service Unavailable',
            translated: text 
        });
    }
};

export const translateBatch = async (req: Request, res: Response) => {
    const { texts, target_lang, source_lang } = req.body;
    try {
        const response = await callMLWithRetry(() => 
            axios.post(`${ML_SERVICE_URL}/translate_batch`, {
                texts: texts || [],
                target_lang: target_lang || 'en',
                source_lang: source_lang || 'en'
            }, { timeout: 45000 })
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Translate Batch Proxy Error:', error.message);
        res.status(error.response?.status || 503).json({ 
            message: 'Translation Service Unavailable',
            translations: texts 
        });
    }
};

