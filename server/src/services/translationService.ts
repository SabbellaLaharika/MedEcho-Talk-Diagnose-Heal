
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

import { callMLWithRetry } from '../controllers/mlController';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
console.log(`[TranslationService] Using ML_SERVICE_URL: ${ML_SERVICE_URL}`);
const CACHE_DIR = path.join(__dirname, '../../translations_cache');

export const translationService = {
  /**
   * Translates a text string using the ML service.
   * Supports placeholder replacement (e.g., {name}).
   */
  translate: async (text: string, targetLang: string, params?: Record<string, any>): Promise<string> => {
    if (!text || !targetLang) return text;

    const langCode = targetLang.toLowerCase().slice(0, 2);

    // 1. Check local cache subfolder for all available UI packs (highest priority)
    try {
      const langDir = path.join(CACHE_DIR, langCode);
      if (fs.existsSync(langDir)) {
        const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          const cachePath = path.join(langDir, file);
          const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          if (cache[text]) {
            let translated = cache[text];
            if (params) {
              Object.entries(params).forEach(([key, value]) => {
                translated = translated.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
              });
            }
            return translated;
          }
        }
      }
    } catch (e) {
      console.warn(`[TranslationService] Cache lookup failed for "${text.slice(0, 20)}...":`, e);
    }

    // Allow translation to English only if source contains non-ASCII (Telugu/Hindi etc.)
    if (langCode === 'en' && !/[^\x00-\x7F]/.test(text)) return text;

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
      // Placeholder Protection: Extract and replace {...} with temporary tokens
      const placeholders: string[] = [];
      const protectedText = text.replace(/\{[a-zA-Z0-9_-]+\}/g, (match) => {
        const token = `__PH${placeholders.length}__`;
        placeholders.push(match);
        return token;
      });

      const response = await callMLWithRetry(() => 
        axios.post(`${ML_SERVICE_URL}/translate`, {
          text: protectedText,
          target_lang: targetLang,
          source_lang: 'auto'
        }, { timeout: 30000 })
      );
      
      let translated = response.data.translated || protectedText;

      // Restore Placeholders
      placeholders.forEach((original, i) => {
        translated = translated.replace(new RegExp(`__PH${i}__`, 'g'), original);
      });
      const isVirtual = translated.includes('వర్చువల్') || translated.includes('वर्चुअल') || translated.toLowerCase().includes('virtual');

      // Apple clinical shortening ONLY for actual doctor names, not Virtual Doctor
      if (!isVirtual) {
        if (targetLang === 'te') translated = translated.replace(/డాక్టర్/g, 'డా.');
        if (targetLang === 'hi') translated = translated.replace(/डॉक्टर/g, 'डॉ.');
        if (targetLang === 'mr') translated = translated.replace(/डॉक्टर/g, 'डॉ.');
      }

      // Interpolate parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          translated = translated.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        });
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
      if (!t || !t.trim()) return false;
      
      // SKIP translation if it's already in the target language (for English only)
      if (targetLang === 'en' && !/[^\x00-\x7F]/.test(t)) return false;
      

      return true;
    });

    const textsToTranslate = texts.filter((_, i) => needsTranslation[i]);
    if (textsToTranslate.length === 0) {
        return texts;
    }

    try {
      // Placeholder Protection for Batch
      const batchPlaceholders: string[][] = [];
      const protectedBatch = textsToTranslate.map(t => {
        const placeholders: string[] = [];
        const protectedText = t.replace(/\{[a-zA-Z0-9_-]+\}/g, (match) => {
          const token = `__PH${placeholders.length}__`;
          placeholders.push(match);
          return token;
        });
        batchPlaceholders.push(placeholders);
        return protectedText;
      });

      const response = await callMLWithRetry(() => 
        axios.post(`${ML_SERVICE_URL}/translate_batch`, {
          texts: protectedBatch,
          target_lang: targetLang,
          source_lang: 'auto'
        }, { timeout: 30000 })
      );

      const translatedBatch = response.data.translations || response.data.translated || [];
      
      // Restore Placeholders for Batch
      const restoredBatch = translatedBatch.map((t: string, idx: number) => {
        let restored = t;
        batchPlaceholders[idx].forEach((original, i) => {
          restored = restored.replace(new RegExp(`__PH${i}__`, 'g'), original);
        });
        return restored;
      });

      let batchIdx = 0;
      return texts.map((original, i) => {
        if (needsTranslation[i]) {
          return restoredBatch[batchIdx++] || original;
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
  },

  /**
   * Persists a dynamic translation to the language-specific dynamic.json file.
   * This prevents English fallbacks and redundant ML calls for clinical notes.
   */
  saveToCache: async (originalText: string, translatedText: string, lang: string) => {
    try {
      const langCode = lang.toLowerCase().slice(0, 2);
      const langDir = path.join(CACHE_DIR, langCode);
      if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });

      const dynamicFile = path.join(langDir, 'dynamic.json');
      let cache: Record<string, string> = {};

      if (fs.existsSync(dynamicFile)) {
        try {
          cache = JSON.parse(fs.readFileSync(dynamicFile, 'utf8'));
        } catch (e) {
          console.warn(`[TranslationService] Dynamic cache corrupt, resetting: ${langCode}`);
        }
      }

      cache[originalText] = translatedText;
      fs.writeFileSync(dynamicFile, JSON.stringify(cache, null, 2));
      // console.log(`[TranslationService] Persisted dynamic translation to ${langCode}/dynamic.json`);
    } catch (error) {
      console.error('[TranslationService] saveToCache failed:', error);
    }
  }
};

