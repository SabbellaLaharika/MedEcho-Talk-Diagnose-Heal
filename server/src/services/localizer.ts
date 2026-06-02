import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(__dirname, '../../translations_cache');

/**
 * GLOBAL_DEFAULTS acts as a resilient fallback for critical background services
 * (like the reminder worker) when the local cache files are unavailable.
 */
const GLOBAL_DEFAULTS: Record<string, any> = {
  en: {
    medicalRemindersHeader: '💊 Medication Reminder',
    medicationReminderBody: 'It is time to take your {medicine} ({dosage} {unit}).',
    appointmentReminderTitle: '📅 Upcoming Appointment',
    appointmentReminderBody: 'Your appointment with Dr. {name} starts in 15 minutes.',
    appointmentReminderBodyDoc: 'Your appointment with {name} starts in 15 minutes.',
    tablet: 'Tablet',
    capsule: 'Capsule',
    ml: 'ML',
    mg: 'MG',
    drops: 'Drops',
    injection: 'Injection'
  },
  hi: {
    medicalRemindersHeader: '💊 दवा रिमाइंडर',
    medicationReminderBody: 'आपकी {medicine} ({dosage} {unit}) लेने का समय हो गया है।',
    appointmentReminderTitle: '📅 आगामी अपॉइंटमेंट',
    appointmentReminderBody: 'डॉ. {name} के साथ आपका अपॉइंटमेंट 15 मिनट में शुरू होगा।',
    appointmentReminderBodyDoc: '{name} के साथ आपका अपॉइंटमेंट 15 मिनट में शुरू होगा।',
    tablet: 'टैबलेट',
    capsule: 'कैप्सूल',
    ml: 'मिलीलीटर',
    mg: 'मिलीग्राम',
    drops: 'बूंदें',
    injection: 'इंजेक्शन'
  },
  te: {
    medicalRemindersHeader: '💊 మందుల రిమైండర్',
    medicationReminderBody: 'మీ {medicine} ({dosage} {unit}) తీసుకునే సమయం అయింది.',
    appointmentReminderTitle: '📅 రాబోయే అపాయింట్‌మెంట్',
    appointmentReminderBody: 'డాక్టర్ {name} తో మీ అపాయింట్‌మెంట్ 15 నిమిషాల్లో ప్రారంభమవుతుంది.',
    appointmentReminderBodyDoc: '{name} తో మీ అపాయింట్‌మెంట్ 15 నిమిషాల్లో ప్రారంభమవుతుంది.',
    tablet: 'టాబ్లెట్',
    capsule: 'క్యాప్సూల్',
    ml: 'ML',
    mg: 'MG',
    drops: 'చుక్కలు',
    injection: 'ఇంజెక్షన్'
  }
};

/**
 * Retrieves a translated string for a given key and language.
 * Prioritizes local cache files, then falls back to GLOBAL_DEFAULTS, 
 * and finally to English.
 */
export function getTranslatedString(lang: string, key: string, params: Record<string, string> = {}): string {
  let dictionary: any = GLOBAL_DEFAULTS[lang] || GLOBAL_DEFAULTS['en'];
  
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      // Find all files for this language: lang.json or lang_*.json
      const langFiles = files.filter(f => f === `${lang}.json` || f.startsWith(`${lang}_`));
      
      langFiles.forEach(file => {
        try {
          const content = fs.readFileSync(path.join(CACHE_DIR, file), 'utf8');
          dictionary = { ...dictionary, ...JSON.parse(content) };
        } catch (e) {
          console.error(`[Localizer] Failed to parse ${file}:`, e);
        }
      });
    }
  } catch (error) {
    console.error(`[Localizer] Error loading cache for ${lang}:`, error);
  }

  let text = dictionary[key] || GLOBAL_DEFAULTS['en'][key] || key;

  // Replace placeholders like {medicine} or {medicineName}
  Object.entries(params).forEach(([k, v]) => {
    // Robust replacement for both {key} and { key }
    text = text.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, 'g'), String(v || ''));
  });

  return text;
}


export const localizer = {
  t: getTranslatedString,
};
