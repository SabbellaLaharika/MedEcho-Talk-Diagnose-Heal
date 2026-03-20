
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
  findNearbyCare: 'Find Nearby Care',
  
  // Dashboard Stats
  bpm: 'BPM',
  weight: 'Weight',
  glucose: 'Glucose',
  optimalRange: 'Optimal Range',
  stable: 'Stable',
  confidence: 'Confidence',

  // Profile View
  coreDemographics: 'Core Demographics',
  legalFullName: 'Legal Full Name',
  bloodGroup: 'Blood Group',
  selectBloodGroup: 'Select Group',
  genderIdentification: 'Gender Identification',
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
  caseSaved: 'Case record saved',

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
};

// In-memory store for the current language pack
let currentPack: Record<string, string> = { ...FALLBACK_PACK };
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
 * Loads a language pack from the backend and caches it.
 */
export const loadTranslations = async (lang: string = 'en') => {
  const code = (lang || 'en').toLowerCase().slice(0, 2);
  
  // Avoid redundant loads
  if (currentLang === code || loadingLang === code) return currentPack;
  
  try {
    loadingLang = code;
    
    // 1. Check Local Storage
    const cached = localStorage.getItem(`med_echo_lang_${code}`);
    if (cached) {
      currentPack = { ...FALLBACK_PACK, ...JSON.parse(cached) };
      currentLang = code;
      notifyObservers();
    }

    // 2. Fetch Fresh from Backend
    const response = await api.get(`/translations/${code}`);
    const freshPack = response.data;
    
    // 3. Update memory + local storage
    currentPack = { ...FALLBACK_PACK, ...freshPack };
    currentLang = code;
    localStorage.setItem(`med_echo_lang_${code}`, JSON.stringify(freshPack));
    
    notifyObservers();
    return currentPack;
  } catch (err) {
    console.error("Translation load failed:", err);
    return currentPack;
  } finally {
    loadingLang = null;
  }
};

/**
 * Synchronous getter for translations.
 * NO SIDE EFFECTS here to prevent infinite re-render loops.
 */
export const getTranslation = (lang: string = 'en') => {
  // We don't trigger loadTranslations here anymore to prevent infinite loops.
  // App.tsx or useTranslations hook should trigger the load.

  return new Proxy(currentPack, {
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
  
  return text; 
};
