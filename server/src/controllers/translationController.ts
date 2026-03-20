
import { Request, Response } from 'express';
import { translationService } from '../services/translationService';

// Master Dictionary (English) - The source of truth for all UI labels
const MASTER_DICTIONARY: Record<string, string> = {
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
  aiResearch: 'AI Clinical Research Hub',
  emptyQueue: 'Active queue is currently empty',
  patientRecords: 'Patient Records',
  noReports: 'No recent medical reports',

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
};

// In-memory cache to prevent redundant ML service calls
const translationCache: Record<string, Record<string, string>> = {
  en: MASTER_DICTIONARY
};

export const getTranslationPack = async (req: Request, res: Response) => {
  try {
    const { lang } = req.params;
    
    // 1. Return from cache if exists
    if (translationCache[lang]) {
      console.log(`[Cache Hit] Serving ${lang} UI Pack`);
      return res.json(translationCache[lang]);
    }

    console.log(`[Cache Miss] Generating ${lang} UI Pack via ML Service...`);
    
    // 2. Translate Master Dictionary to target language
    // We do this in one batch to be efficient
    const keys = Object.keys(MASTER_DICTIONARY);
    const values = Object.values(MASTER_DICTIONARY);
    
    // Use the array translation utility
    const translatedValues = await translationService.translateArray(
        values.map(v => ({ text: v })), 
        ['text'], 
        lang
    );

    const translatedPack: Record<string, string> = {};
    keys.forEach((key, index) => {
      translatedPack[key] = (translatedValues[index] as any).text;
    });

    // 3. Cache the result
    translationCache[lang] = translatedPack;

    res.json(translatedPack);
  } catch (error: any) {
    console.error("Failed to generate translation pack:", error);
    // Fallback to English if translation fails
    res.json(MASTER_DICTIONARY);
  }
};
