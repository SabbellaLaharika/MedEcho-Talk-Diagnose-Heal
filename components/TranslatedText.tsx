import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface TranslatedTextProps {
  text: string;
  lang?: string;
  className?: string;
}

// ── Global translation cache ──────────────────────────────────────────────────
const cache = new Map<string, string>();

// ── Global request queue (max N concurrent calls) ────────────────────────────
let inFlight = 0;
const MAX_CONCURRENT = 4;
const queue: Array<() => void> = [];

const drainQueue = () => {
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift()!;
    next();
  }
};

const translate = (text: string, lang: string): Promise<string> => {
  const key = `${lang}::${text}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key)!);

  return new Promise((resolve) => {
    const execute = async () => {
      inFlight++;
      try {
        const res = await api.post('/ml/translate', { text, target_lang: lang });
        const result = res.data.translated || text;
        cache.set(key, result);
        resolve(result);
      } catch {
        cache.set(key, text); // cache fallback so we don't retry endlessly
        resolve(text);
      } finally {
        inFlight--;
        drainQueue();
      }
    };

    if (inFlight < MAX_CONCURRENT) {
      execute();
    } else {
      queue.push(execute);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────

const TranslatedText: React.FC<TranslatedTextProps> = ({ text, lang = 'en', className }) => {
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    if (!text || lang === 'en') {
      setTranslated(text);
      return;
    }
    let cancelled = false;
    translate(text, lang).then((result) => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  }, [text, lang]);

  return <span className={className}>{translated}</span>;
};

export default TranslatedText;
