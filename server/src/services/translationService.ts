
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export const translationService = {
  /**
   * Translates a text string using the ML service
   */
  translate: async (text: string, targetLang: string): Promise<string> => {
    if (!text || !targetLang || targetLang === 'en') return text;

    try {
      const response = await axios.post(`${ML_SERVICE_URL}/translate`, {
        text,
        target_lang: targetLang,
        source_lang: 'en'
      });
      let translated = response.data.translated || text;

      // Apply clinical shortening for specific languages
      if (targetLang === 'te') translated = translated.replace(/డాక్టర్/g, 'డా.');
      if (targetLang === 'hi') translated = translated.replace(/डॉक्टर/g, 'डॉ.');
      if (targetLang === 'mr') translated = translated.replace(/डॉक्टर/g, 'डॉ.');

      return translated;
    } catch (error) {
      console.error('Core Translation Error:', text, error);
      return text;
    }
  },

  /**
   * Translates multiple fields of an object
   */
  translateObject: async <T>(obj: T, fields: string[], targetLang: string): Promise<T> => {
    if (!targetLang || targetLang === 'en' || !obj) return obj;

    const translatedObj = { ...obj } as any;

    for (const field of fields) {
      if (translatedObj[field] && typeof translatedObj[field] === 'string') {
        translatedObj[field] = await translationService.translate(translatedObj[field], targetLang);
      } else if (Array.isArray(translatedObj[field])) {
        // Translate array of strings (e.g., symptoms, precautions)
        translatedObj[field] = await Promise.all(
          translatedObj[field].map((item: any) =>
            typeof item === 'string' ? translationService.translate(item, targetLang) : item
          )
        );
      }
    }

    return translatedObj as T;
  },

  /**
   * Translates an array of objects
   */
  translateArray: async <T>(arr: T[], fields: string[], targetLang: string): Promise<T[]> => {
    if (!targetLang || targetLang === 'en' || !arr || arr.length === 0) return arr;

    return Promise.all(arr.map(item => translationService.translateObject(item, fields, targetLang)));
  }
};
