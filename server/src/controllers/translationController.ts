
import { Request, Response } from 'express';
import { translationService } from '../services/translationService';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(__dirname, '../../translations_cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Namespaced Master Dictionary (English)
const NAMESPACED_DICTIONARY: Record<string, Record<string, string>> = {
  common: {
    dashboard: 'Dashboard',
    bookVisit: 'Book Appointment',
    medicalFiles: 'Medical Files',
    chatSupport: 'Chat Assistant',
    virtualDoctor: 'Virtual Doctor',
    myProfile: 'My Profile',
    logout: 'Log Out',
    welcomeBack: 'Welcome Back',
    overview: 'Overview',
    records: 'Records',
    patient: 'Patient',
    doctor: 'Doctor',
    staff: 'Staff',
    medEchoLogo: 'MedEcho',
    language: 'Language',
    healthEco: 'Advanced Health Ecosystem',
    syncInProgress: 'Synchronizing...',
    cancel: 'Cancel',
    updateSuccess: 'Update Successful',
    genderIdentification: 'Gender Identification',
    preferredInterfaceLanguage: 'Preferred Interface Language',
    male: 'Male',
    female: 'Female',
    nonBinary: 'Non-binary',
    preferNotToSay: 'Prefer not to say',
    yes: 'Yes',
    no: 'No',
    from: 'From',
    to: 'To',
    languageGlobal: 'English (Global)',
    hindiLL: 'Hindi (हिन्दी)',
    teleguLL: 'Telugu (తెలుగు)',
    tamilLL: 'Tamil (தமிழ்)',
    marathiLL: 'Marathi (మరాఠీ)',
    bengaliLL: 'Bengali (বাংলা)',
    kannadaLL: 'Kannada (ಕನ್ನಡ)',
    malayalamLL: 'Malayalam (മലയാളం)',
    gujaratiLL: 'Gujarati (ગુજરાતી)',
    punjabiLL: 'Punjabi (ਪੰਜਾਬੀ)',
    close: 'Close',
    saveChanges: 'Save Changes',
  },
  auth: {
    patientPortal: 'Patient Portal',
    clinicalStaff: 'Clinical Staff',
    secureAccess: 'Secure Access',
    createCredentials: 'Create Credentials',
    precisionHealthDesc: 'Precision health infrastructure. Automated triage, real-time reporting, and intelligent patient tracking.',
    joinMedEcho: 'Join MedEcho? Register',
    alreadyHaveAccess: 'Already have access? Login',
    legalFullName: 'Legal Full Name',
    primaryEmail: 'Primary Email Address',
    loginId: 'Email or User ID',
  },
  dashboard: {
    latestReports: 'Latest Reports',
    appointmentsTitle: 'Appointments',
    realTime: 'Real-time',
    sendReports: 'Send Reports',
    sending: 'Sending…',
    reportsSent: 'Reports Sent',
    noAppointmentsBooked: 'No appointments booked',
    findNearbyCare: 'Find Nearby Care',
    bpm: 'B P',
    weight: 'Weight',
    glucose: 'Glucose',
    optimalRange: 'Optimal Range',
    stable: 'Stable',
    confidence: 'Confidence',
    temperature: 'Temperature',
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
    totalDiagnoses: 'Total Diagnoses',
    clinicLoyalty: 'Clinic Loyalty',
    totalCaps: 'Total',
    memberCaps: 'Member',
    medicalState: 'Medical State',
  },
  profile: {
    coreDemographics: 'Core Demographics',
    bloodGroup: 'Blood Group',
    selectBloodGroup: 'Select Blood Group',
    selectGender: 'Select Gender',
    dateOfBirth: 'Date of Birth',
    contactInfrastructure: 'Contact Infrastructure',
    primaryEmail: 'Primary Email',
    mobileContact: 'Mobile Contact',
    residentialAddress: 'Residential Address',
    medicalProfileId: 'Medical Profile ID',
    enterAddress: 'Enter your complete residential address for medical shipping and emergencies...',
    editProfile: 'Edit Personal Profile',
    profileSyncDesc: 'Your medical records and profile have been synchronized with the cloud core.',
    securityStatus: 'Security Status',
    systemAuthenticated: 'System Authenticated',
    changePassword: 'Change Password',
    securityDesc: 'Your biometric and clinical data is encrypted using AES-256 protocols.',
    updateProfileFail: 'Failed to update profile',
  },
  reports: {
    medicalReports: 'Medical Reports',
    diagnosisHistory: 'Diagnosis History',
    filterDiagnosis: 'Filter diagnosis...',
    diagnosisReport: 'Diagnosis Report',
    predictedCondition: 'Predicted Condition',
    reportedSymptoms: 'Reported Symptoms',
    patientHistory: 'Patient History',
    advicePrecautions: 'Advice & Precautions',
    vitals: 'Vitals at Time of Report',
    bpm: 'BP',
    weight: 'Weight',
    glucose: 'Glucose',
    temperature: 'Temperature',
    sleep: 'Sleep',
    appetite: 'Appetite',
    duration: 'Duration',
    gastric: 'Gastric',
    good: 'Good',
    regular: 'Regular',
    poor: 'Poor',
    bad: 'Bad',
    aWeek: 'A Week',
    fewDays: 'A Few Days',
    months: 'Months',
    monthsLower: 'months',
    years: 'Years',
    yearsLower: 'years',
    reportLang: 'Report Language',
    original: 'Original',
    examinationDate: 'Examination Date',
    digitalCert: 'Digital Certification',
    authByAI: 'Authenticated by MedEcho AI System',
    medSignature: 'Medical Signature',
    clinicRef: 'Clinic Reference',
    confirmPrint: 'Confirm & Print PDF',
    reportReview: 'Medical Report Print Review',
    docViewer: 'Clinical Document Viewer',
    printPdf: 'Print / Save PDF',
    previewPrint: 'Preview & Print',
    aiHistory: 'Your AI-generated diagnosis history',
    noReportsFound: 'No reports found',
    noSymptoms: 'No symptoms extracted',
    noMarkers: 'No specific markers detected',
    noHistory: 'No historical data available',
    diagnosisReportFor: 'Diagnosis report for',
    unknownPatient: 'Unknown patient',
    patientFor: 'For',
  },
  virtual_clinic: {
    virtualClinic: 'Virtual Clinic',
    talkToAI: 'Talk to our AI specialist instantly.',
    startCheckup: 'Start Checkup',
    finishAndAnalyze: 'Finish & Analyze',
    languageMode: 'Language Mode',
    caseSaved: 'Case record saved',
    clinicalEntitiesWarning: 'ACADEMIC PROJECT: Clinical entities are AI-extracted. Call 102/108 for emergencies.',
  },
  booking: {
    selectSpecialist: 'Select Specialist',
    searchSpecialists: 'Search specialists...',
    selectTime: 'Select Specialist & Time',
    specialists: 'Specialists',
    backToList: 'Back to List',
    inPerson: 'In-Person',
    virtual: 'Virtual',
    noAvailability: 'No Availability',
    reviewAndBook: 'Review & Book',
    confirmed: 'Confirmed',
    time: 'Time',
    cardiology: 'Cardiology',
    neurology: 'Neurology',
    orthopedics: 'Orthopedics',
    pediatrics: 'Pediatrics',
    generalMedicine: 'General Medicine',
    urology: 'Urology',
  },
  hospitals: {
    hospitalRecSub: 'MedEcho-Powered Hospital Recommendations',
    refreshList: 'REFRESH LIST',
    locating: 'LOCATING...',
    openMaps: 'Open in Google Maps',
    allowLocation: 'Allow location to see the best hospitals near you.',
    hospitalError: 'Could not retrieve nearby hospital information.',
    locationDenied: 'Location access denied. Please enable location to find nearby hospitals.',
    geoNotSupported: 'Geolocation is not supported by your browser.',
    majorHospitals: 'Major Hospitals',
    minorHospitals: 'Minor Clinics',
    labsAndDiagnostics: 'Labs & Diagnostics',
    km: 'KM',
    kmLower: 'km',
    call: 'Call',
    multiSpecialty: 'Multi-Specialty',
    emergency247: '24/7 Emergency',
    generalSurgery: 'General Surgery',
    motherAndChild: 'Mother & Child',
    generalClinic: 'General Clinic',
    scansAndBlood: 'Scans & Blood',
    radiologyMri: 'Radiology/MRI',
    amorHospitals: 'Amor Hospitals',
    renovaHospitals: 'Renova Neelima Hospital',
    aradhyaSpeciality: 'Aradhya Multi Speciality',
    vasundharaHospital: 'Vasundhara Hospital',
    sreeManjuHospital: 'Sree Manju Hospital',
    vijayaDiagnostics: 'Vijaya Diagnostics',
    lucidDiagnostics: 'Lucid Diagnostics',
    kukatpallyYJunction: 'Kukatpally Y Junction',
    sanathNagar: 'Sanath Nagar',
    moosapetXRoads: 'Moosapet X Roads',
    moosapetBusDepot: 'Opp. Moosapet Bus Depot',
    kalyanNagarMotiNagar: 'Kalyan Nagar, Moti Nagar',
    moosapetCrossRd: 'Moosapet Cross Rd',
    greenHillsMoosapet: 'Green Hills Rd, Moosapet',
  },
  telehealth: {
    liveCall: 'Live Call',
    incomingCall: 'Incoming call...',
    inCall: 'In call',
    calling: 'Calling...',
    endCall: 'End',
    webRtcNote: 'This demo uses WebRTC signaling. Audio should connect once remote peer answers.',
    callFrom: 'Call from',
    callingUser: 'Calling',
    aiContextReceived: "I've received the patient context. How can I assist?",
    micDenied: 'Microphone access denied.',
    sttError: 'Error processing speech.',
    aiServiceError: 'Error connecting to AI service.',
    unassigned: 'Unassigned',
    clinicalConsult: 'Clinical Consultation',
    consultProfessional: 'Consult a professional.',
    aiMedicalIntake: 'AI Medical Intake',
    recordFiled: 'Record Filed',
  },
  schedule: {
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
  },
  chat: {
    aiGreeting: 'Hi! I am your MedEcho assistant. How can I help you today?',
    aiChatTitle: 'MedEcho Chat',
    autoDetect: 'Auto Detect',
    aiWarning: 'AI Assistant: Collecting clinical intake data in realtime.',
    describeSymptoms: 'Describe symptoms...',
    listening: 'Listening...',
    multilingualAI: 'Multilingual AI',
    aiConsultation: 'AI Consultation',
    quickChatIntake: 'Quick Chat Intake Record',
    consultHumanDoctor: 'Please consult a human doctor for confirmation.',
    aiAssistantName: 'MedEcho AI Assistant',
    reportGenQuickChat: 'Report generated via quick chat assistant.',
    standardPrecautions: 'Standard precautions advised.',
    saveReportError: 'I couldn’t save your report. Please check your network connection.',
    aiConnectError: '❌ Error connecting to AI service. Please ensure the backend and ML servers are running.',
  }
};

// Flatten utility for backwards compatibility and easy access
const getFlatDictionary = () => {
  const flat: Record<string, string> = {};
  Object.values(NAMESPACED_DICTIONARY).forEach(group => {
    Object.assign(flat, group);
  });
  return flat;
};

// In-memory cache to prevent redundant ML service calls
const translationCache: Record<string, Record<string, string>> = {
  en: getFlatDictionary()
};

export const getTranslationPack = async (req: Request, res: Response) => {
  try {
    const { lang } = req.params;
    const { ns } = req.query as { ns?: string };

    // 0. Resolve the target content to translate
    const targetSource = ns ? NAMESPACED_DICTIONARY[ns] : getFlatDictionary();
    if (!targetSource) {
      return res.status(404).json({ error: "Namespace not found" });
    }

    const cacheKey = ns ? `${lang}_${ns}` : lang;

    // 1. Return from memory cache if exists
    if (translationCache[cacheKey]) {
      console.log(`[Memory Cache Hit] Serving ${cacheKey} UI Pack`);
      return res.json(translationCache[cacheKey]);
    }

    // 2. Check Disk Cache
    const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);
    if (fs.existsSync(cacheFile)) {
      try {
        const diskData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        translationCache[cacheKey] = diskData;
        console.log(`[Disk Cache Hit] Serving ${cacheKey} UI Pack`);
        return res.json(diskData);
      } catch (e) {
        console.error(`Disk cache read failed for ${cacheKey}:`, e);
      }
    }

    console.log(`[Cache Miss] Generating ${cacheKey} UI Pack via ML Service...`);

    // 3. Translate Target Source to target language
    const keys = Object.keys(targetSource);
    const values = Object.values(targetSource);

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

    // 4. Cache the result (Memory + Disk)
    translationCache[cacheKey] = translatedPack;
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(translatedPack, null, 2));
    } catch (e) {
      console.error(`Disk cache write failed for ${cacheKey}:`, e);
    }

    res.json(translatedPack);
  } catch (error: any) {
    console.error("Failed to generate translation pack:", error);
    // Fallback to English if translation fails
    res.json(getFlatDictionary());
  }
};
