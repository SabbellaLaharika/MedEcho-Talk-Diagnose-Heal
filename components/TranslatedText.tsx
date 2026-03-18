import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { translateClinical } from '../services/translations';

interface TranslatedTextProps {
  text: string;
  targetLang: string;
  className?: string;
}

const TranslatedText: React.FC<TranslatedTextProps> = ({ text, targetLang, className }) => {
  const [translated, setTranslated] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If English, don't translate
    if (!targetLang || targetLang === 'en' || !text) {
      setTranslated(text);
      return;
    }

    const translate = async () => {
      setIsLoading(true);
      try {
        const res = await api.post('/ml/translate', {
          text: text,
          target_lang: targetLang
        });
        
        // Apply clinical shortening (Dr. -> డా.) to the translated result
        const finalWord = translateClinical(res.data.translated, targetLang);
        setTranslated(finalWord);
      } catch (err) {
        console.error("Fly Translation error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [text, targetLang]);

  return (
    <span className={className}>
      {isLoading ? (
        <span className="animate-pulse opacity-50">{text}</span>
      ) : translated}
    </span>
  );
};

export default TranslatedText;
