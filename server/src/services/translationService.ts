
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

import { callMLWithRetry } from '../controllers/mlController';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const translationService = {
  /**
   * Translates a text string using the ML service
   */
  translate: async (text: string, targetLang: string): Promise<string> => {
    if (!text || !targetLang) return text;
    // Allow translation to English only if source contains non-ASCII (Telugu/Hindi etc.)
    if (targetLang === 'en' && !/[^\x00-\x7F]/.test(text)) return text;

    // 1. Static Overrides for common UI terms to prevent ML Hallucinations
    const lowerText = text.toLowerCase().trim();
    if (lowerText === 'dashboard') {
      if (targetLang === 'hi') return 'डैशबोर्ड';
      if (targetLang === 'te') return 'డ్యాష్‌బోర్డ్';
    }
    if (lowerText === 'doctor' || lowerText === 'dr') {
      if (targetLang === 'hi') return 'डॉक्टर';
      if (targetLang === 'te') return 'డాక్టర్';
    }

    try {
      const response = await callMLWithRetry(() => 
        axios.post(`${ML_SERVICE_URL}/translate`, {
          text,
          target_lang: targetLang,
          source_lang: 'auto'
        }, { timeout: 30000 })
      );
      let translated = response.data.translated || text;
      const isVirtual = translated.includes('వర్చువల్') || translated.includes('वर्चुअल') || translated.toLowerCase().includes('virtual');

      // Apple clinical shortening ONLY for actual doctor names, not Virtual Doctor
      if (!isVirtual) {
        if (targetLang === 'te') translated = translated.replace(/డాక్టర్/g, 'డా.');
        if (targetLang === 'hi') translated = translated.replace(/डॉक्टर/g, 'डॉ.');
        if (targetLang === 'mr') translated = translated.replace(/डॉक्टर/g, 'डॉ.');
      }

      return translated;
    } catch (error) {
      console.error('Core Translation Error:', text, error);
      return text;
    }
  },

  /**
   * Translates multiple strings in one batch request
   */
  translateBatch: async (texts: string[], targetLang: string): Promise<string[]> => {
    if (!texts || texts.length === 0 || !targetLang) return texts;

    // Filter out texts that don't need translation (ASCII/IDs)
    const needsTranslation = texts.map(t => {
      if (!t) return false;
      if (targetLang === 'en' && !/[^\x00-\x7F]/.test(t)) return false;
      // Skip IDs or very short technical strings
      if (/^[A-Z0-9_\-]+$/i.test(t) && t.length > 5) return false;
      return true;
    });

    const textsToTranslate = texts.filter((_, i) => needsTranslation[i]);
    if (textsToTranslate.length === 0) return texts;

    try {
      const response = await callMLWithRetry(() => 
        axios.post(`${ML_SERVICE_URL}/translate_batch`, {
          texts: textsToTranslate,
          target_lang: targetLang
        }, { timeout: 45000 })
      );

      const translatedBatch = response.data.translated || [];
      let batchIdx = 0;
      return texts.map((original, i) => {
        if (needsTranslation[i]) {
          return translatedBatch[batchIdx++] || original;
        }
        return original;
      });
    } catch (error) {
      console.error('Core Batch Translation Error:', error);
      return texts;
    }
  },

  /**
   * Translates multiple fields of an object
   */
  translateObject: async <T>(obj: T, fields: string[], targetLang: string): Promise<T> => {
    if (!targetLang || !obj) return obj;

    const translatedObj = { ...obj } as any;
    const valuesToTranslate: string[] = [];
    const fieldIndices: { field: string; isArray: boolean; arrayIdx?: number }[] = [];

    // Collect all translatable values
    for (const field of fields) {
      if (translatedObj[field] && typeof translatedObj[field] === 'string') {
        valuesToTranslate.push(translatedObj[field]);
        fieldIndices.push({ field, isArray: false });
      } else if (Array.isArray(translatedObj[field])) {
        translatedObj[field].forEach((item: any, idx: number) => {
          if (typeof item === 'string') {
            valuesToTranslate.push(item);
            fieldIndices.push({ field, isArray: true, arrayIdx: idx });
          }
        });
      }
    }

    if (valuesToTranslate.length === 0) return obj;

    const results = await translationService.translateBatch(valuesToTranslate, targetLang);

    // Re-assign translated values
    results.forEach((translated, i) => {
      const { field, isArray, arrayIdx } = fieldIndices[i];
      if (isArray && arrayIdx !== undefined) {
        translatedObj[field][arrayIdx] = translated;
      } else {
        translatedObj[field] = translated;
      }
    });

    return translatedObj as T;
  },

  /**
   * Translates an array of objects
   */
  translateArray: async <T>(arr: T[], fields: string[], targetLang: string): Promise<T[]> => {
    if (!targetLang || !arr || arr.length === 0) return arr;
    // We do sequential object translation here to avoid one huge payload, 
    // but each object now uses a single batch request instead of N individual ones.
    const results: T[] = [];
    for (const item of arr) {
      results.push(await translationService.translateObject(item, fields, targetLang));
    }
    return results;
  }
};

