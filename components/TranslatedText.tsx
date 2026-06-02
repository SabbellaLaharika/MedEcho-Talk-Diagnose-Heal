import React, { useState, useEffect } from 'react';
import { getTranslation, translateString, FALLBACK_PACK, subscribeToTranslations } from '../services/translations';

interface TranslatedTextProps {
  text: string;
  lang: string;
}

/**
 * Optimized Translation Component
 * - Prioritizes master dictionary lookups
 * - Skips ML service for English (en)
 * - Fallback to ML service for dynamic data (e.g. database strings)
 */
const TranslatedText: React.FC<TranslatedTextProps> = ({ text, lang }) => {
  const [translated, setTranslated] = useState(text);
  const t = getTranslation(lang);

  useEffect(() => {
    const updateTranslation = async () => {
      if (!text) return;
      setTranslated(text); // Reset to original while loading
      const code = (lang || 'en').toLowerCase().slice(0, 2);
      const lowerText = (text || '').toLowerCase().trim();

      // 1. If it's pure English and we are in English mode, avoid any extra work
      if (code === 'en' && !/[^\x00-\x7F]/.test(text)) {
        setTranslated(text);
        return;
      }

      // 2. Dictionary Lookup
      const dictVal = t[lowerText] || t[text.trim()];
      
      // Only use dictionary value if it's NOT the same as original OR if it's specifically for this language
      // But we must be careful: if we are in 'te' and dictVal is English, it's just a fallback.
      const isEnglishFallback = code !== 'en' && dictVal === FALLBACK_PACK[lowerText];

      if (dictVal && !isEnglishFallback && dictVal !== lowerText && dictVal !== text.trim()) {
        setTranslated(dictVal);
        return;
      }

      // 4. ML Service Fallback
      try {
        const result = await translateString(text, code);

        // Final sanity check
        const halls = ['thank you', 'dhanyavad', 'answer', 'uttar', 'उत्तर', 'धन्यवाद', 'not available'];
        if (halls.some(h => result.toLowerCase().trim().includes(h)) && !halls.some(h => lowerText.includes(h))) {
          setTranslated(text);
        } else {
          setTranslated(result);
        }
      } catch (err) {
        setTranslated(text);
      }
    };

    const unsubscribe = subscribeToTranslations(updateTranslation);
    updateTranslation();
    return () => unsubscribe();
  }, [text, lang]);

  return <>{translated}</>;
};

export default TranslatedText;
