
import api from './api';

export type SupportedLanguage = 'en' | 'hi' | 'te' | 'ta' | 'mr' | 'bn' | 'kn' | 'ml' | 'gu' | 'pa';

/**
 * Hardcoded English fallback dictionary.
 * COMPLETE SYNC with Backend MASTER_DICTIONARY
 */
const FALLBACK_PACK: Record<string, string> = {
  // Sidebar/Nav
  dashboard: 'Dashboard',
  bookVisit: 'Book Appointment',
  medicalFiles: 'Medical Files',
  chatSupport: 'Chat Assistant',
  virtualDoctor: 'Virtual Doctor',
  language: 'Language',
  myProfile: 'My Profile',
  logout: 'Log Out',

  // Common UI
  welcomeBack: 'Welcome Back',
  overview: 'Overview',
  records: 'Records',
  patient: 'Patient',
  doctor: 'Doctor',
  staff: 'Staff',
  medEchoLogo: 'MedEcho',
  selectSpecialist: 'Select Specialist',
  searchSpecialists: 'Search specialists...',
  selectTime: 'Select Specialist & Time',
  latestReports: 'Latest Reports',
  appointmentsTitle: 'Appointments',
  realTime: 'Real-time',
  sendReports: 'Send Reports',
  sending: 'Sending…',
  noAppointmentsBooked: 'No appointments booked',
  findNearbyCare: 'Find Nearby Care',

  // Dashboard Stats
  bpm: 'BP',
  weight: 'Weight',
  glucose: 'Glucose',
  optimalRange: 'Optimal Range',
  stable: 'Stable',
  confidence: 'Confidence',
  temperature: 'Temperature',

  // Profile View
  coreDemographics: 'Core Demographics',
  legalFullName: 'Legal Full Name',
  bloodGroup: 'Blood Group',
  selectBloodGroup: 'Select Group',
  genderIdentification: 'Gender Identification',
  preferredInterfaceLanguage: 'Preferred Interface Language',
  selectGender: 'Select Gender',
  male: 'Male',
  female: 'Female',
  nonBinary: 'Non-binary',
  preferNotToSay: 'Prefer not to say',
  dateOfBirth: 'Date of Birth',
  contactInfrastructure: 'Contact Infrastructure',
  primaryEmail: 'Primary Email',
  mobileContact: 'Mobile Contact',
  residentialAddress: 'Residential Address',
  noSymptoms: 'No symptoms extracted',
  noMarkers: 'No specific markers detected',
  noHistory: 'No historical data available',
  reportLang: 'Report Language',
  original: 'Original',
  examinationDate: 'Examination Date',
  digitalCert: 'Digital Certification',
  authByAI: 'Authenticated by MedEcho AI System',
  medSignature: 'Medical Signature',
  securityStatus: 'Security Status',
  systemAuthenticated: 'System Authenticated',
  changePassword: 'Change Password',
  medicalState: 'Medical State',
  totalDiagnoses: 'Total Diagnoses',
  clinicLoyalty: 'Clinic Loyalty',
  clinicRef: 'Clinic Reference',
  healthEco: 'Advanced Health Ecosystem',
  confirmPrint: 'Confirm & Print PDF',
  reportReview: 'Medical Report Print Review',
  editProfile: 'Edit Personal Profile',
  saveChanges: 'Save Changes',
  syncInProgress: 'Synchronizing...',
  cancel: 'Cancel',
  updateSuccess: 'Update Successful',
  profileSyncDesc: 'Your medical records and profile have been synchronized with the cloud core.',
  securityDesc: 'Your biometric and clinical data is encrypted using AES-256 protocols.',
  totalCaps: 'Total',
  memberCaps: 'Member',

  // AI Chat
  aiGreeting: 'Hi! I am your MedEcho assistant. How can I help you today?',
  aiChatTitle: 'MedEcho Chat',
  autoDetect: 'Auto Detect',
  aiWarning: 'AI Assistant: Collecting clinical intake data in realtime.',
  describeSymptoms: 'Describe symptoms...',
  listening: 'Listening...',

  // Booking
  specialists: 'Specialists',
  backToList: 'Back to List',
  inPerson: 'In-Person',
  virtual: 'Virtual',
  noAvailability: 'No Availability',
  reviewAndBook: 'Review & Book',
  confirmed: 'Confirmed',
  time: 'Time',

  // Doctor Dashboard
  pendingVisits: 'Pending Visits',
  patientCount: 'Patient Count',
  finished: 'Finished',
  online: 'Online',
  away: 'Away',
  aiSupport: 'AI Support',
  activeQueue: 'Active Queue',
  aiResearch: 'AI Clinical Research Hub',
  emptyQueue: 'Active queue is currently empty',
  patientRecords: 'Patient Records',
  noReports: 'No recent medical reports',

  // Clinical States
  hepatitisE: 'Hepatitis E',
  covid: 'Covid',
  flu: 'Flu',
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',

  // Schedule Management
  mySchedule: 'My Schedule',
  scheduleDescription: 'Set availability & block slots',
  bulkTool: 'Bulk Apply Tool',
  bulkDescription: 'Create a slot template and apply to selected days',
  addSlotTemplate: 'Add Slot to Template',
  applyToSelected: 'Apply to Selected Days',
  weeklyHours: 'Weekly Hours',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  clearDay: 'Clear Day',
  addSlot: 'Add Slot',
  noHoursSet: 'No hours set',
  freezeSlotsHeader: 'Freeze Slots',
  freeze: 'Freeze',
  unfreeze: 'Unfreeze',
  noFrozenSlots: 'No frozen slots — all available times are open',
  date: 'Date',
  start: 'Start',
  end: 'End',
  reason: 'Reason',
  surgery: 'Surgery',
  personalLeave: 'Personal Leave',
  emergency: 'Emergency',
  conference: 'Conference',
  training: 'Training',
  otherReason: 'Other',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  saved: 'Saved',
  saving: 'Saving...',
  saveSchedule: 'Save Schedule',

  // Specializations
  cardiology: 'Cardiology',
  neurology: 'Neurology',
  orthopedics: 'Orthopedics',
  pediatrics: 'Pediatrics',
  generalMedicine: 'General Medicine',
  urology: 'Urology',

  // Reports Management
  medicalReports: 'Medical Reports',
  diagnosisHistory: 'Diagnosis History',
  filterDiagnosis: 'Filter diagnosis...',
  diagnosisReport: 'Diagnosis Report',
  predictedCondition: 'Predicted Condition',
  reportedSymptoms: 'Reported Symptoms',
  patientHistory: 'Patient History',
  advicePrecautions: 'Advice & Precautions',

  // Patient History Table Keys
  sleep: 'Sleep',
  appetite: 'Appetite',
  duration: 'Duration',
  gastric: 'Gastric',

  // Virtual Clinic
  virtualClinic: 'Virtual Clinic',
  talkToAI: 'Talk to our AI specialist instantly.',
  startCheckup: 'Start Checkup',
  finishAndAnalyze: 'Finish & Analyze',
  languageMode: 'Language Mode',
  caseSaved: 'Case record saved',
  clinicalEntitiesWarning: 'ACADEMIC PROJECT: Clinical entities are AI-extracted. Call 102/108 for emergencies.',

  // Hospital Recommendations
  hospitalRecSub: 'MedEcho-Powered Hospital Recommendations',
  refreshList: 'REFRESH LIST',
  locating: 'LOCATING...',
  openMaps: 'Open in Google Maps',
  allowLocation: 'Allow location to see the best hospitals near you.',

  // Common History Values
  good: 'Good',
  regular: 'Regular',
  poor: 'Poor',
  bad: 'Bad',
  yes: 'Yes',
  no: 'No',
  aWeek: 'A Week',
  fewDays: 'A Few Days',
  months: 'Months',
  monthsLower: 'months',
  years: 'Years',
  yearsLower: 'years',

  // Report Viewer
  docViewer: 'Clinical Document Viewer',
  printPdf: 'Print / Save PDF',
  close: 'Close',
  previewPrint: 'Preview & Print',

  // Error Messages
  hospitalError: 'Could not retrieve nearby hospital information.',
  locationDenied: 'Location access denied. Please enable location to find nearby hospitals.',
  geoNotSupported: 'Geolocation is not supported by your browser.',
  updateProfileFail: 'Failed to update profile',
  aiHistory: 'Your AI-generated diagnosis history',
  noReportsFound: 'No reports found',

  // Hospital Locator UI
  majorHospitals: 'Major Hospitals',
  minorHospitals: 'Minor Clinics',
  labsAndDiagnostics: 'Labs & Diagnostics',
  km: 'KM',
  kmLower: 'km',
  call: 'Call',

  // Healthcare Types
  multiSpecialty: 'Multi-Specialty',
  emergency247: '24/7 Emergency',
  generalSurgery: 'General Surgery',
  motherAndChild: 'Mother & Child',
  generalClinic: 'General Clinic',
  scansAndBlood: 'Scans & Blood',
  radiologyMri: 'Radiology/MRI',

  // Hospital & Lab Names
  amorHospitals: 'Amor Hospitals',
  renovaHospitals: 'Renova Neelima Hospital',
  aradhyaSpeciality: 'Aradhya Multi Speciality',
  vasundharaHospital: 'Vasundhara Hospital',
  sreeManjuHospital: 'Sree Manju Hospital',
  vijayaDiagnostics: 'Vijaya Diagnostics',
  lucidDiagnostics: 'Lucid Diagnostics',

  // Local Neighborhoods & Landmarks
  kukatpallyYJunction: 'Kukatpally Y Junction',
  sanathNagar: 'Sanath Nagar',
  moosapetXRoads: 'Moosapet X Roads',
  moosapetBusDepot: 'Opp. Moosapet Bus Depot',
  kalyanNagarMotiNagar: 'Kalyan Nagar, Moti Nagar',
  moosapetCrossRd: 'Moosapet Cross Rd',
  greenHillsMoosapet: 'Green Hills Rd, Moosapet',

  // Calling / Telehealth UI
  liveCall: 'Live Call',
  incomingCall: 'Incoming call...',
  inCall: 'In call',
  calling: 'Calling...',
  endCall: 'End',
  webRtcNote: 'This demo uses WebRTC signaling. Audio should connect once remote peer answers.',
  callFrom: 'Call from',
  callingUser: 'Calling',
  diagnosisReportFor: 'Diagnosis report for',
  unknownPatient: 'Unknown patient',
  patientFor: 'For',
  aiContextReceived: "I've received the patient context. How can I assist?",
  micDenied: 'Microphone access denied.',
  sttError: 'Error processing speech.',
  aiServiceError: 'Error connecting to AI service.',
  unassigned: 'Unassigned',
  clinicalConsult: 'Clinical Consultation',
  consultProfessional: 'Consult a professional.',
  aiMedicalIntake: 'AI Medical Intake',
  recordFiled: 'Record Filed',

  // Auth & Profile Extension
  patientPortal: 'Patient Portal',
  clinicalStaff: 'Clinical Staff',
  secureAccess: 'Secure Access',
  createCredentials: 'Create Credentials',
  precisionHealthDesc: 'Precision health infrastructure. Automated triage, real-time reporting, and intelligent patient tracking.',
  joinMedEcho: 'Join MedEcho? Register',
  alreadyHaveAccess: 'Already have access? Login',
  medicalProfileId: 'Medical Profile ID',
  enterAddress: 'Enter your complete residential address for medical shipping and emergencies...',
  gold: 'Gold',
  languageGlobal: 'English (Global)',
  hindiLL: 'Hindi (हिन्दी)',
  teleguLL: 'Telugu (తెలుగు)',
  tamilLL: 'Tamil (தமிழ்)',
  marathiLL: 'Marathi (మరాఠీ)',
  bengaliLL: 'Bengali (বাংলা)',
  kannadaLL: 'Kannada (ಕನ್ನಡ)',
  malayalamLL: 'Malayalam (മലയാളം)',
  gujaratiLL: 'Gujarati (ગુજરાતી)',
  punjabiLL: 'Punjabi (ਪੰਜਾਬੀ)',

  // AI Chat Extension
  multilingualAI: 'Multilingual AI',
  aiConsultation: 'AI Consultation',
  quickChatIntake: 'Quick Chat Intake Record',
  consultHumanDoctor: 'Please consult a human doctor for confirmation.',
  aiAssistantName: 'MedEcho AI Assistant',
  reportGenQuickChat: 'Report generated via quick chat assistant.',
  standardPrecautions: 'Standard precautions advised.',
  saveReportError: 'I couldn’t save your report. Please check your network connection.',
  aiConnectError: '❌ Error connecting to AI service. Please ensure the backend and ML servers are running.',
};

// In-memory store for loaded language packs
let packs: Record<string, Record<string, string>> = {
  en: { ...FALLBACK_PACK }
};
let currentLang: string = 'en';
let loadingLang: string | null = null;

// Observers to notify when translations are updated
const observers: Set<() => void> = new Set();

export const subscribeToTranslations = (cb: () => void) => {
  observers.add(cb);
  return () => observers.delete(cb);
};

const notifyObservers = () => observers.forEach(cb => cb());

/**
 * Loads a language pack (or specific namespace) from the backend and caches it.
 */
export const loadTranslations = async (lang: string = 'en', ns?: string) => {
  const code = (lang || 'en').toLowerCase().slice(0, 2);

  try {
    loadingLang = code;

    // 1. Check Local Storage for the base pack first if no namespace
    if (!ns) {
      const cached = localStorage.getItem(`med_echo_lang_v3_${code}`);
      if (cached && !packs[code]) {
        packs[code] = { ...FALLBACK_PACK, ...JSON.parse(cached) };
        currentLang = code;
        notifyObservers();
      }
    }

    // 2. Fetch Fresh from Backend
    const url = ns ? `/translations/${code}?ns=${ns}` : `/translations/${code}`;
    const response = await api.get(url);
    const freshData = response.data;

    // 3. Update memory + local storage (Merge namespaces)
    packs[code] = { ...FALLBACK_PACK, ...(packs[code] || {}), ...freshData };
    currentLang = code;

    // Only persist the global pack to local storage, not partials (to avoid corruption)
    if (!ns) {
      localStorage.setItem(`med_echo_lang_v3_${code}`, JSON.stringify(freshData));
    }

    notifyObservers();
    return packs[code];
  } catch (err) {
    console.error(`Translation load failed for ${code}${ns ? ':' + ns : ''}`, err);
    return packs[code] || FALLBACK_PACK;
  } finally {
    loadingLang = null;
  }
};

/**
 * Synchronous getter for translations.
 * NO SIDE EFFECTS here to prevent infinite re-render loops.
 */
export const getTranslation = (lang: string = 'en') => {
  const code = (lang || 'en').toLowerCase().slice(0, 2);
  const base = packs[code] || FALLBACK_PACK;

  return new Proxy(base, {
    get: (target, key: string) => {
      if (typeof key !== 'string') return target[key as any];
      return target[key] || FALLBACK_PACK[key] || key;
    }
  }) as any;
};

/**
 * Clinical formatting logic
 */
export const translateClinical = (text: string = '', lang: string = 'en') => {
  if (!text) return '';
  const t = getTranslation(lang);
  // 1. Regex handles for dynamic durations (Instant Fallback)
  if (lang === 'te') {
    text = text.replace(/(\d+)\s*months/gi, '$1 నెలలు');
    text = text.replace(/(\d+)\s*years/gi, '$1 సంవత్సరాలు');
    text = text.replace(/(\d+)\s*days/gi, '$1 రోజులు');
    text = text.replace(/(\d+)\s*week/gi, '$1 వారం');
  }
  if (lang === 'hi') {
    text = text.replace(/(\d+)\s*months/gi, '$1 महीने');
    text = text.replace(/(\d+)\s*years/gi, '$1 साल');
    text = text.replace(/(\d+)\s*days/gi, '$1 दिन');
    text = text.replace(/(\d+)\s*week/gi, '$1 सप्ताह');
  }

  const normalized = text.toLowerCase().trim();

  if (normalized.includes('cardiol')) return t.cardiology;
  if (normalized.includes('neur')) return t.neurology;
  if (normalized.includes('ortho')) return t.orthopedics;
  if (normalized.includes('pedia')) return t.pediatrics;
  if (normalized.includes('general') || normalized.includes('medicine')) return t.generalMedicine;
  if (normalized.includes('urol')) return t.urology;

  if (normalized === 'sleep') return t.sleep;
  if (normalized === 'appetite') return t.appetite;
  if (normalized === 'duration') return t.duration;
  if (normalized === 'gastric') return t.gastric;

  if (normalized === 'good') return t.good || 'Good';
  if (normalized === 'poor' || normalized === 'bad') return t.poor || 'Poor';
  if (normalized === 'regular') return t.regular || 'Regular';
  if (normalized === 'yes') return t.yes || 'Yes';
  if (normalized === 'no') return t.no || 'No';
  if (normalized === 'a week') return t.aWeek || 'A Week';
  if (normalized.includes('few days')) return t.fewDays || 'A Few Days';
  if (normalized === 'in person' || normalized === 'in_person') return t.inPerson || 'In-Person';
  if (normalized === 'virtual') return t.virtual || 'Virtual';
  if (normalized.includes('covid')) return t.covid || 'Covid';
  if (normalized.includes('hepatitis')) return t.hepatitisE || 'Hepatitis E';
  if (normalized.includes('flu')) return t.flu || 'Flu';

  return text;
};

/**
 * High-Performance Translation Queue & Cache
 */
class TranslationQueue {
  private queue: Map<string, { texts: Set<string>; resolvers: Map<string, Array<(t: string) => void>> }> = new Map();
  private timers: Map<string, any> = new Map();
  private cache: Map<string, Record<string, string>> = new Map();

  constructor() {
    this.loadGlobalCache();
  }

  private loadGlobalCache() {
    try {
      const keys = Object.keys(localStorage);
      keys.filter(k => k.startsWith('med_echo_dynamic_v1_')).forEach(k => {
        const lang = k.split('_').pop() || '';
        this.cache.set(lang, JSON.parse(localStorage.getItem(k) || '{}'));
      });
    } catch (e) { }
  }

  private saveToCache(lang: string, text: string, translated: string) {
    if (!this.cache.has(lang)) this.cache.set(lang, {});
    const langCache = this.cache.get(lang)!;
    langCache[text] = translated;
    try {
      localStorage.setItem(`med_echo_dynamic_v1_${lang}`, JSON.stringify(langCache));
    } catch (e) { }
  }

  public getCached(text: string, lang: string): string | null {
    return this.cache.get(lang)?.[text] || null;
  }

  public async push(text: string, lang: string): Promise<string> {
    const cached = this.getCached(text, lang);
    if (cached) return cached;

    return new Promise((resolve) => {
      if (!this.queue.has(lang)) {
        this.queue.set(lang, { texts: new Set(), resolvers: new Map() });
      }

      const q = this.queue.get(lang)!;
      q.texts.add(text);

      const resList = q.resolvers.get(text) || [];
      resList.push(resolve);
      q.resolvers.set(text, resList);

      if (this.timers.has(lang)) clearTimeout(this.timers.get(lang));
      this.timers.set(lang, setTimeout(() => this.flush(lang), 50));
    });
  }

  private async flush(lang: string) {
    const q = this.queue.get(lang);
    if (!q) return;
    this.queue.delete(lang);
    this.timers.delete(lang);

    const textsToTranslate = Array.from(q.texts);
    if (textsToTranslate.length === 0) return;

    try {
      const res = await api.post('/ml/translate_batch', { texts: textsToTranslate, target_lang: lang });
      const results: string[] = res.data.translations || [];

      textsToTranslate.forEach((original, idx) => {
        const translated = results[idx] || original;
        this.saveToCache(lang, original, translated);
        const resolvers = q.resolvers.get(original);
        resolvers?.forEach(resolve => resolve(translated));
      });
    } catch (err) {
      textsToTranslate.forEach(original => {
        const resolvers = q.resolvers.get(original);
        resolvers?.forEach(resolve => resolve(original));
      });
    }
  }
}

const batchQueue = new TranslationQueue();

/**
 * Async utility to translate a string using the ML service (with batching & caching)
 */
export const translateString = async (text: string, targetLang: string = 'en') => {
  if (!text || targetLang === 'en') return text;

  // 1. Check Dictionary First (Synchronous)
  const code = targetLang.toLowerCase().slice(0, 2);
  const t = getTranslation(code);
  const lowerText = text.toLowerCase().trim();
  const dictVal = t[lowerText] || t[text.trim()];
  if (dictVal && dictVal !== lowerText && dictVal !== text.trim()) {
    return dictVal;
  }

  // 2. Use Batching Queue
  return await batchQueue.push(text, code);
};
