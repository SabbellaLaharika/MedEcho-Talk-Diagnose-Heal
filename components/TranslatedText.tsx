import React, { useState, useEffect } from 'react';
import { getTranslation, translateString, translateClinical } from '../services/translations';

interface TranslatedTextProps {
  text: string;
  lang: string;
  isClinical?: boolean;
}

/**
 * Optimized Translation Component
 * - Prioritizes master dictionary lookups
 * - Skips ML service for English (en)
 * - Fallback to ML service for dynamic data (e.g. database strings)
 */
const TranslatedText: React.FC<TranslatedTextProps> = ({ text, lang, isClinical = false }) => {
  const [translated, setTranslated] = useState(text);
  const t = getTranslation(lang);

  useEffect(() => {
    if (!text) return;
    
    const updateTranslation = async () => {
      // 1. Skip ML for English
      if (lang === 'en') {
        setTranslated(text);
        return;
      }

      // 2. Check Dictionary First (case-insensitive)
      const lowerText = text.toLowerCase().trim();
      const dictVal = t[lowerText] || t[text.trim()];
      if (dictVal && dictVal !== lowerText && dictVal !== text.trim()) {
        setTranslated(dictVal);
        return;
      }

      // 3. ML Service Fallback for dynamic data
      try {
        let result = text;
        if (isClinical) {
          result = translateClinical(text, lang);
          // Fallback to ML service if formatting doesn't change text
          if ((result === text || result === text.replace(/_/g, ' ')) && lang !== 'en') {
            result = await translateString(text, lang);
          }
        } else {
          result = await translateString(text, lang);
        }
        
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

    updateTranslation();
  }, [text, lang, isClinical]);

  return <>{translated}</>;
};

export default TranslatedText;
