import axios from 'axios';
import { callMLWithRetry } from '../controllers/mlController';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const ocrRefiner = {
    /**
     * Refines noisy OCR text using the AI chat endpoint.
     * It instructs the AI to recognize the document type and clean up the noise.
     */
    refine: async (rawText: string, lang: string = 'en'): Promise<string> => {
        if (!rawText || rawText.length < 10) return rawText;

        try {
            console.log(`[OCR Refiner] Refining ${rawText.length} chars of noisy text...`);

            const outputLanguage = lang === 'te' ? 'Telugu' : lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';

            const prompt = `
You are a highly accurate Medical Transcription AI specialized in processing noisy, garbled OCR (Optical Character Recognition) text.
The following text was extracted from an uploaded medical document (which could be a medicine bottle label, a doctor's prescription, a laboratory report, or a hospital discharge summary).

TASK:
1. Identify the likely type of document (e.g., Medication Label, Lab Report, Prescription).
2. Clean up "OCR Noise": Fix typos (e.g., "Desloratadind" -> "Desloratadine"), ignore random symbols (@, #, etc.), and bridge broken words.
3. Structure the output into a clear, professional clinical assessment with bullet points.
4. Extract key details such as:
   - Medicine Name / Investigation Name
   - Dosage / Values
   - Instructions / Observations
   - Expiration Date / Issue Date (if visible)

OUTPUT LANGUAGE: ${outputLanguage}

RAW OCR DATA:
"""
${rawText}
"""

Provide only the cleaned, structured medical summary in ${outputLanguage}. Do not include introductory or concluding remarks.
`;

            const response = await callMLWithRetry(() =>
                axios.post(`${ML_SERVICE_URL}/chat`, {
                    text: prompt,
                    context: { system_prompt: "You are a professional medical transcriber." },
                    lang: lang
                }, { timeout: 60000 })
            );

            if (response.data && response.data.reply) {
                return response.data.reply.trim();
            }

            return rawText;
        } catch (error: any) {
            console.warn('[OCR Refiner] Refinement failed, falling back to raw text:', error.message);
            return rawText;
        }
    }
};
