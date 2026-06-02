
import api from './api';

export type SupportedLanguage = 'en' | 'hi' | 'te' | 'ta' | 'mr' | 'bn' | 'kn' | 'ml' | 'gu' | 'pa';

const flattenObject = (obj: any): Record<string, string> => {
  let flat: Record<string, string> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(flat, flattenObject(obj[key]));
    } else {
      flat[key] = obj[key];
    }
  }
  return flat;
};

const MASTER_DICTIONARY = {
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
    teluguLL: 'Telugu (తెలుగు)',
    tamilLL: 'Tamil (தமிழ்)',
    marathiLL: 'Marathi (मराठी)',
    bengaliLL: 'Bengali (বাংলা)',
    kannadaLL: 'Kannada (ಕನ್ನಡ)',
    malayalamLL: 'Malayalam (മലയാളം)',
    gujaratiLL: 'Gujarati (ગુજરાતી)',
    punjabiLL: 'Punjabi (ਪੰਜਾਬੀ)',
    close: 'Close',
    collapse: 'Collapse',
    saveChanges: 'Save Changes',
    reminders: 'Reminders',
    consultationSaved: 'Consultation Successfully Recorded',
    failedSaveConsultation: 'Failed to save consultation. Please try again.',
    otpSent: 'OTP sent successfully! Please check your email.',
    passwordResetSuccess: 'Password reset successful! You can now login.',
    participant: 'Participant',
    tablet: 'Tablet',
    capsule: 'Capsule',
    ml: 'ML',
    mg: 'MG',
    drops: 'Drops',
    injection: 'Injection',
    doctorInitials: 'DR',
    patientInitials: 'ME',
    mySchedule: 'My Schedule',
    securityStatus: 'Security Status',
    systemAuthenticated: 'System Authenticated',
    securityDesc: 'All sensitive data is encrypted using military-grade AES-256 standards with zero-latency biometric retrieval.',
    passwordResetConfirm: 'We will send a secure OTP to your email to reset your password. You will be logged out to complete this security process. Proceed?',
    otpSuccess: 'OTP sent successfully! Please check your email.',
    passwordResetFail: 'Failed to initiate password reset.',
    patientId: 'Patient ID',
    noData: 'No Data',
    tbd: 'TBD',
    clinical: 'Clinical',
    medicalReminders: 'Medical Reminders',
    dosage: 'Dosage',
    duration: 'Duration',
    times: 'Times',
    addMedication: '+ Add Medication',
    voiceCall: 'Voice Call',
    videoCall: 'Video Call',
    incomingConsultation: 'Incoming Consultation',
    answer: 'Answer',
    decline: 'Decline',
    micConnError: 'Microphone connection failed. Please check permissions.',
    avatarError: 'Specialist visual feed error. Switch to voice call?',
    sttNotSupported: 'Speech recognition not supported in this browser.',
    saveScheduleFail: 'Failed to update professional schedule.',
    blockSlotFail: 'Could not reserve the selected time interval.',
    downloadApp: 'Download App',
    notifications: 'Notifications',
    markAllRead: 'Mark all read',
    noNotifications: 'No notifications yet.',
    medEchoSystem: 'MedEcho System',
    seeDetailedReport: 'See Detailed Report',
    english: 'English',
    hindi: 'Hindi',
    telugu: 'Telugu',
    tamil: 'Tamil',
    marathi: 'Marathi',
    bengali: 'Bengali',
    kannada: 'Kannada',
    malayalam: 'Malayalam',
    gujarati: 'Gujarati',
    punjabi: 'Punjabi',
    urdu: 'Urdu',
    original: 'Original',
    delete: 'Delete',
    download: 'Download',
    attachedFile: 'Attached File',
    autoDetect: 'Auto Detect',
    error: 'Error',
    success: 'Success',
    notice: 'Notice',
    dismiss: 'Dismiss',
    found: 'found',
    clinic: 'Clinic',
    drLabel: 'Dr.',
    generalMedicine: 'General Medicine',
    genMedShort: 'Gen. Med.',
    cardiology: 'Cardiology',
    neurology: 'Neurology',
    orthopedics: 'Orthopedics',
    pediatrics: 'Pediatrics',
    urology: 'Urology',
    chalapathiRao: 'Dr. L. Chalapathi Rao',
    chalapathiRaoMd: 'Dr. L. Chalapathi Rao, MD',
    muraliKrishna: 'Dr. M. Murali Krishna',
    kishorName: 'Dr. Kishor',
    mdDegree: 'MD',
    testNotificationTitle: 'MedEcho System Test',
    testNotificationBody: 'This is a localized test notification. MedEcho background alerts are active.'
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
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    enterOtp: 'Enter 6-digit OTP',
    enterNewPassword: 'Enter New Password',
    verifying: 'Verifying...',
    signIn: 'Sign In',
    register: 'Register',
    sendOtp: 'Send OTP',
  },
  chat: {
    multilingualAI: 'Multilingual MedEcho AI',
    aiConsultation: 'AI Consultation',
    confirmSelected: 'Confirm Selected',
    processingLive: 'Processing Live',
    other: 'Other',
    none: 'None',
    yesExperience: 'Yes, I experience:',
    otherSymptoms: 'I am experiencing other symptoms',
    noneOfThese: 'None of these',
    aiAssistantName: 'MedEcho AI Assistant',
    aiGreeting: 'Hi! I am your MedEcho AI assistant. How can I help you today?',
    aiContextReceived: 'I\'ve received the patient context. How can I assist?',
    aiConnectError: '❌ Error connecting to AI service. Please ensure the backend and ML servers are running.',
    aiChatTitle: 'MedEcho Chat',
    autoDetect: 'Auto Detect',
    aiWarning: 'AI Assistant: Collecting clinical intake data in realtime.',
    describeSymptoms: 'Describe symptoms...',
    listening: 'Listening',
    speakingResponse: 'Speaking Response',
    assistantThinking: 'Assistant Thinking',
    cancelVoice: 'Cancel Voice',
    uploadReport: 'Upload Report',
    aiSystemReady: 'MedEcho AI Ready',
    mode: 'Mode',
    quickChatIntake: 'Quick Chat Intake Record',
    consultHumanDoctor: 'Please consult a human doctor for confirmation.',
    reportGenQuickChat: 'Report generated via quick chat assistant.',
    standardPrecautions: 'Standard precautions advised.',
    saveReportError: 'I couldn’t save your report. Please check your network connection.',
    medEchoLogo: 'MedEcho',
    clinicalConsult: 'Clinical Consultation',
    aiMedicalIntake: 'AI Medical Intake',
    consultProfessional: 'Please consult a medical professional for advice.',
    unassigned: 'Unassigned',
    aiHubTitle: 'AI Medical Research Hub',
    voiceLocked: 'Voice Input Locked',
    voiceAnalyzing: 'Audio analysis in progress...',
    voiceAnalysisTitle: 'Medical Audio Analysis',
    voiceProcessing: 'Processing speech patterns...',
    contextLocked: 'Medical context locked',
    aiSynthesis: 'AI Synthesis',
    thinking: 'Thinking',
    speaking: 'Speaking',
    recommendedSpecialists: 'Recommended Specialists',
    consult: 'Consult',
    yesIExperience: 'Yes, I experience:',
    experiencingOther: 'I am experiencing other symptoms',
    mmhg: 'mmHg',
    kg: 'kg',
    mgdl: 'mg/dL',
    celsius: '°C',
    voiceCall: 'Voice Call',
    videoCall: 'Video Call',
    incomingConsultation: 'Incoming Consultation',
    answer: 'Answer',
    decline: 'Decline',
    sttError: 'Speech-to-text conversion failed. Please try typing.',
    uploadError: 'Failed to process document.',
    aiServiceError: 'Intelligence cluster unresponsive.',
    profileSyncDesc: 'Profile synchronized.',
    micDenied: 'Microphone access denied.',
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
    reportsSentSuccess: 'Sent {n} report(s) to doctor.',
    failedSend: 'Failed to send reports.',
    sendingReports: 'Sending...',
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
    clinicalConsole: 'Clinical Console',
    secureSession: 'Secure Session',
    endSession: 'End Session',
    observations: 'Observations',
    clinicalAssessment: 'Clinical Assessment',
    autoSaving: 'Auto-Saving',
    assessmentPlaceholder: 'Type findings, diagnosis, and plan here...',
    assessmentNote: 'Assessment notes are primary medical documentation.',
    completeConsultation: 'Complete Consultation',
    establishingLink: 'Establishing Real-Time WebRTC Link',
    liveWith: 'Live: Dr. {name}',
    assistantListening: 'Assistant Listening...',
    assistantIdle: 'Assistant Idle',
    stopAssistant: 'Stop Assistant',
    startAssistant: 'Start Assistant',
    assistantDescription: 'AI medication detection system active.',
    liveTranscript: 'Live Transcript',
    detectedMeds: 'Detected Medications',
    noMedsDetected: 'No medications detected yet.',
    aiInsights: 'AI Insights',
    verifyConsultationReport: 'Verify Consultation Report',
    generatedByAI: 'Generated by MedEcho AI',
    primaryDiagnosis: 'Primary Diagnosis',
    doctorsSuggestions: 'Doctor\'s Suggestions',
    addSuggestion: '+ Add Suggestion',
    medicalReminders: 'Medical Reminders',
    dosage: 'Dosage',
    duration: 'Duration',
    times: 'Times',
    reportSuccess: 'Report verified and sent to patient!',
    reportError: 'Failed to save report.',
    generalConsultation: 'General Consultation',
    asDirected: 'As directed',
    bpPlaceholder: 'e.g. 120/80',
    weightPlaceholder: 'e.g. 72',
    glucosePlaceholder: 'e.g. 95',
    tempPlaceholder: 'e.g. 37',
    medEchoSync: 'MedEcho Sync',
    analyzingConsultation: 'Analyzing Consultation...',
    detectingProblems: 'Detecting problems and extracting medical suggestions',
    viewMedicalHistory: 'View Medical History',
    noPatientsFound: 'No patients found',
    backToPatients: 'Back to Patients List',
    noReportsFound: 'No reports found',
    incomingVoiceCall: 'Incoming Voice Call',
    incomingVideoCall: 'Incoming Video Call',
    noNotes: 'No additional notes.',
    patientRecords_dup: 'Patient Records',
    backToPatientsList_dup: 'Back to Patients List',
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
    enterAddress: 'Enter your complete residential address...',
    editProfile: 'Edit Personal Profile',
    profileSyncDesc: 'Your medical profile has been synchronized.',
    securityStatus: 'Security Status',
    systemAuthenticated: 'System Authenticated',
    changePassword: 'Change Password',
    securityDesc: 'Clinical data is encrypted using AES-256 protocols.',
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
    vitals: 'Vitals',
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
    prescribedMeds: 'Prescribed Medications',
    medicineName: 'Medicine Name',
    frequency: 'Frequency',
    daysLabel: 'Days',
    aWeek: 'A Week',
    fewDays: 'A Few Days',
    mmhg: 'mmHg',
    kg: 'KG',
    mgdl: 'mg/dL',
    celsius: '°C',
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
    reportReview: 'Medical Report Review',
    docViewer: 'Document Viewer',
    printPdf: 'Print / Save PDF',
    previewPrint: 'Preview & Print',
    aiHistory: 'Diagnosis History & Lab Results',
    noReportsFound: 'No reports found',
    noSymptoms: 'No symptoms extracted',
    noMarkers: 'No specific markers detected',
    noHistory: 'No historical data available',
    diagnosisReportFor: 'Diagnosis report for',
    unknownPatient: 'Unknown Patient',
    patientFor: 'For',
    confidence: 'Confidence Score',
    clinicalSummaryExtract: 'Clinical Summary / Extract',
    healthVaultTitle: 'Health Vault',
    vaultExplorer: 'Vault Explorer',
    vaultSelectionRequired: 'Vault Selection Required',
    archive: 'Archive',
    id: 'ID',
    accuracyVerified: 'Accuracy Verified',
    issued: 'Issued',
    dr: 'Dr.',
    system: 'System',
    syncDownload: 'Sync and Download',
    printOriginal: 'Print Original',
    evidenceRecord: 'Evidence Record',
    documentReady: 'Document Ready',
    biometricDataSync: 'Biometric data sync',
    bloodPressure: 'Blood Pressure',
    bodyMass: 'Body Mass',
    bloodGlucose: 'Blood Glucose',
    clinicalAssessment: 'Clinical assessment',
    awaitingAssessment: 'Awaiting detailed assessment summary.',
    reportedSignals: 'Reported signals',
    careProtocols: 'Care Protocols / Prescription',
    noProtocols: 'No protocols defined',
    purgeRecord: 'Purge Record',
    dismissDetail: 'Dismiss Detail',
    vaultDescription: 'Access your encrypted medical records.',
    self: 'Self',
    medechoAI: 'MedEcho AI',
    syncHub: 'Sync Hub',
    syncStarting: 'System reports empty. Initiating sync.',
    vaultEmpty: 'No classified records found.',
    deleteConfirmTitle: 'Delete Report?',
    deleteConfirmBody: 'This action cannot be undone.',
    deleteSuccess: 'Report deleted successfully.',
    deleteError: 'Failed to delete report.',
    fileLimit: 'File is too large. Max 10MB.',
    fileTooLarge: 'File is too large. Max 10MB.',
    uploadSuccess: 'Uploaded Successfully!',
    uploadError: 'Failed to upload report.',
    externalReport: 'External Report',
    fileLimitHint: 'Maximum file size 10MB',
    consultation: 'Consultation',
    uploaded: 'Uploaded',
    medEchoAi: 'MedEcho AI',
    uploadReport: 'Upload Report',
    patientRecords: 'Patient Records',
    noUploadedReports: 'No uploaded reports',
    uploadNow: 'Upload Now',
    secureUpload: 'Secure Upload',
    consultationReport: 'Consultation Report',
    attachedFile: 'Attached Clinical File',
    download: 'Download',
    delete: 'Delete',
    observations: 'Clinical Observations',
    confirmPrint_dup: 'Confirm & Print',
    dragDropPrompt: 'Drag and drop files here',
    fileLimitNote: 'PDF, JPG and PNG supported',
    diagnosisPlaceholder_dup: 'e.g. Blood Test, X-Ray...',
    notesOptional: 'Clinical Notes (Optional)',
    additionalNotesPlaceholder: 'Add any specific notes...',
    vitals_dup: 'Vitals',
    patientHistory_dup: 'Patient History',
    accuracyVerified_dup: 'Accuracy Verified',
    issued_dup: 'Issued',
  },
  clinical_terms: {
    varicoseVeins: 'Varicose veins',
    fatigue: 'Fatigue',
    cramps: 'Cramps',
    swollenLegs: 'Swollen Legs',
    obesity: 'Obesity',
    pneumonia: 'Pneumonia',
    diabetes: 'Diabetes',
    hypertension: 'Hypertension',
    flu: 'Flu',
    covid: 'Covid',
    hepatitisE: 'Hepatitis E',
    asDirected: 'As Directed',
    generalConsultation: 'General Consultation',
    dolo: 'Dolo',
    paracetamol: 'Paracetamol',
    metformin: 'Metformin',
    aspirin: 'Aspirin',
    amoxicillin: 'Amoxicillin',
    cetirizine: 'Cetirizine',
    pantoprazole: 'Pantoprazole',
    azithromycin: 'Azithromycin'
  },
  reminders: {
    medicalRemindersHeader: 'Medical Reminders',
    stayHealthy: 'Stay on track with your health',
    notificationsActive: 'Notifications Active',
    enableNotifications: 'Enable Notifications',
    paused: 'Paused',
    scheduledTimes: 'Scheduled Times',
    durationLabel: 'Duration',
    daysCount: 'days',
    noActiveReminders: 'No Active Reminders',
    note: 'Note',
    remindersAutoNote: 'Notifications will be triggered on all devices.',
    remindersEmptySub: 'Reminders appear once prescribed by a doctor.',
    testAlert: 'Test Alert',
    until: 'Until',
    addCustomReminder: 'Add Custom Reminder',
    medicationName: 'Medication Name',
    createReminder: 'Create Reminder',
    durationDaysLabel: 'Duration (Days)',
    addTime: '+ add time',
    tablet: 'Tablet',
    capsule: 'Capsule',
    ml: 'ML',
    mg: 'MG',
    drops: 'Drops',
    injection: 'Injection',
    medicationPlaceholder: 'e.g. Paracetamol',
    dosagePlaceholder: 'e.g. 500mg',
    deleteReminderConfirm: 'Delete this reminder?',
    reminderCreated: 'Reminder Created',
    reminderCreatedSuccess: 'Success! Reminder set.',
    setupFailed: 'Setup Failed',
    setupFailedDesc: 'Could not save the reminder.',
  },
  notifications: {
    medicationReminderBody: 'It is time to take your {medicine}.',
    appointmentReminderTitle: 'Upcoming Appointment',
    appointmentReminderBody: 'Session starts in 15 mins.',
    appointmentReminderBodyDoc: 'Next patient in 15 mins.',
    appointmentCancelled: 'Appointment Cancelled',
    appointmentCancelledBody: 'Session cancelled by provider.',
    cancellationNoticeSubj: 'MedEcho: Cancellation Notice',
  },
  prescription: {
    medicineName: 'Medicine Name',
    dosagePlaceholder: 'Dosage',
    daysPlaceholder: 'Days',
    noPrescriptionsAdded: 'No prescriptions added yet',
    discardDraft: 'Discard Draft',
    verifyAndSend: 'Verify & Send',
  },
  virtual_clinic: {
    virtualClinic: 'Virtual Clinic',
    talkToAI: 'AI Clinical Assessment',
    startCheckup: 'Start Checkup',
    finishAndAnalyze: 'Finish & Analyze',
    languageMode: 'Language Mode',
    caseSaved: 'Case record saved',
    clinicalEntitiesWarning: 'Clinical entities are AI-extracted.',
    processingLive: 'Processing Live',
    confirmSelected: 'Confirm Selected',
    other: 'Other',
    none: 'None',
    noneOfThese: 'None of these',
    otherSymptoms: 'Other symptoms',
    yesExperience: 'Yes, I experience:',
    recommendedSpecialists: 'Recommended Specialists',
    listening: 'Listening...',
    connecting: 'Connecting...',
    establishingLink: 'Real-Time Sync Active',
    generatingReport: 'Generating Report',
    analyzingSymptoms: 'Analyzing symptoms...',
    selectSpecialist: 'Select Specialist',
    aiInsights: 'AI Insights',
    assistantListening: 'Assistant Listening',
    assistantIdle: 'Assistant Idle',
    stopAssistant: 'Stop Assistant',
    startAssistant: 'Start Assistant',
    liveTranscript: 'Live Transcript',
    detectedMeds: 'Detected Medications',
    noMedsDetected: 'No medications detected.',
    found: 'FOUND',
    addToList: 'Add to List',
    startAssistantPrompt: 'Start detected medications.',
    speaking: 'Speaking...',
  },
  booking: {
    selectSpecialist: 'Select Specialist',
    searchSpecialists: 'Search...',
    selectTime: 'Select Time',
    selectDate: 'Select Date',
    browseProfessional: 'Browse our certified medical network.',
    nowBookingWith: 'Booking with',
    verifiedSpecialist: 'Verified Specialist',
    inquiryReady: 'Inquiry Ready',
    selectYourPath: 'Select Mode',
    bookingInstructions: 'Choose a date and timeframe.',
    availableTimeIntervals: 'Available Intervals',
    noAvailability: 'No availability found.',
    confirmAppointment: 'Confirm appointment',
    finalizingSync: 'Finalizing...',
    bookingSyncActive: 'Real-time Sync Active',
    syncError: 'Sync Error',
    tryAnotherSlot: 'Try Another Slot',
    findYour: 'Find Your',
    perfectCare: 'Perfect Care',
    available: 'Available',
    specialists: 'Specialists',
    backToList: 'Back to List',
    inPerson: 'In-Person',
    virtual: 'Virtual',
    reviewAndBook: 'Review & Book',
    confirmed: 'Confirmed',
    time: 'Time',
    cardiology: 'Cardiology',
    neurology: 'Neurology',
    orthopedics: 'Orthopedics',
    pediatrics: 'Pediatrics',
    generalMedicine: 'General Medicine',
    urology: 'Urology',
    bookNewSlot: 'Book New Slot',
  },
  hospitals: {
    hospitalRecSub: 'Nearby Facilities',
    refreshList: 'REFRESH',
    locating: 'LOCATING...',
    openMaps: 'Open Maps',
    allowLocation: 'Allow location access.',
    hospitalError: 'Could not retrieve information.',
    locationDenied: 'Location access denied.',
    geoNotSupported: 'Geolocation not supported.',
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
    moosapetBusDepot: 'Moosapet Bus Depot',
    kalyanNagarMotiNagar: 'Kalyan Nagar',
    moosapetCrossRd: 'Moosapet Cross Rd',
    greenHillsMoosapet: 'Green Hills Rd',
  },
  telehealth: {
    liveCall: 'Live Call',
    incomingCall: 'Incoming call...',
    inCall: 'In call',
    calling: 'Calling...',
    endCall: 'End',
    webRtcNote: 'WebRTC Link Active.',
    callFrom: 'Call from',
    callingUser: 'Calling',
    aiContextReceived: 'Context synchronized.',
    micDenied: 'Mic denied.',
    sttError: 'Speech error.',
    aiServiceError: 'AI offline.',
    unassigned: 'Unassigned',
    clinicalConsult: 'Consultation',
    consultProfessional: 'Consult expert.',
    aiMedicalIntake: 'AI Intake',
    recordFiled: 'Filed',
  },
  schedule: {
    scheduleDescription: 'Set availability',
    bulkTool: 'Bulk Apply',
    bulkDescription: 'Slot template tool.',
    addSlotTemplate: 'Add Template Slot',
    applyToSelected: 'Apply Template',
    weeklyHours: 'Weekly Hours',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    clearDay: 'Clear Day',
    addSlot: 'Add Slot',
    noHoursSet: 'No hours set',
    freezeSlotsHeader: 'Freeze Slots',
    freeze: 'Freeze',
    unfreeze: 'Unfreeze',
    noFrozenSlots: 'All times open',
    date: 'Date',
    start: 'Start',
    end: 'End',
    reason: 'Reason',
    surgery: 'Surgery',
    personalLeave: 'Leave',
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
};

export const FALLBACK_PACK: Record<string, string> = flattenObject(MASTER_DICTIONARY);

// In-memory store for loaded language packs
let packs: Record<string, Record<string, string>> = {
  en: { ...FALLBACK_PACK }
};
let currentLang: string = 'en';
let loadingLang: string | null = null;

// Observers to notify when translations are updated
const observers: Set<() => void> = new Set();

const notifyObservers = () => {
  observers.forEach(cb => cb());
};

export const subscribeToTranslations = (cb: () => void) => {
  observers.add(cb);
  return () => observers.delete(cb);
};

export const loadTranslations = async (lang: string, ns?: string) => {
  const code = (lang || 'en').toLowerCase().slice(0, 2);

  if (loadingLang === `${code}_${ns || 'global'}`) return;
  loadingLang = `${code}_${ns || 'global'}`;

  try {
    if (!ns && packs[code] && Object.keys(packs[code]).length > (Object.keys(FALLBACK_PACK).length / 2)) {
      currentLang = code;
      notifyObservers();
      return packs[code];
    }

    if (!ns) {
      const cached = localStorage.getItem(`med_echo_lang_v10_${code}`);
      if (cached && !packs[code]) {
        packs[code] = { ...FALLBACK_PACK, ...JSON.parse(cached) };
        currentLang = code;
        notifyObservers();
      }
    }

    const url = ns ? `translations/${code}?ns=${ns}` : `translations/${code}`;
    const response = await api.get(url);
    const freshData = response.data;

    const normalizedData = flattenObject(freshData);
    packs[code] = { ...FALLBACK_PACK, ...(packs[code] || {}), ...normalizedData };
    currentLang = code;

    if (!ns) {
      localStorage.setItem(`med_echo_lang_v10_${code}`, JSON.stringify(normalizedData));
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

class TranslationQueue {
  private queue: Map<string, { texts: Set<string>; resolvers: Map<string, Array<(t: string) => void>> }> = new Map();
  private timers: Map<string, any> = new Map();
  private cache: Map<string, Record<string, string>> = new Map();

  constructor() {
    this.loadGlobalCache();
  }

  public clear() {
    this.cache.clear();
    this.queue.clear();
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
  }

  private isScriptMismatch(text: string, lang: string): boolean {
    const scripts: Record<string, RegExp> = {
      hi: /[\u0900-\u097F]/, te: /[\u0C00-\u0C7F]/, ta: /[\u0B80-\u0BFF]/,
      ml: /[\u0D00-\u0D7F]/, kn: /[\u0C80-\u0CFF]/, bn: /[\u0980-\u09FF]/,
      gu: /[\u0A80-\u0AFF]/, mr: /[\u0900-\u097F]/, pa: /[\u0A00-\u0A7F]/,
    };
    if (lang === 'en') return /[^\x00-\x7F]/.test(text);
    const targetScript = scripts[lang];
    if (!targetScript) return false;
    for (const [sLang, sRegex] of Object.entries(scripts)) {
      if (sLang === lang) continue;
      if (lang === 'hi' && sLang === 'mr') continue;
      if (lang === 'mr' && sLang === 'hi') continue;
      if (sRegex.test(text)) return true;
    }
    return false;
  }

  private loadGlobalCache() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('med_echo_') && !k.includes('_v10_')) {
          localStorage.removeItem(k);
        }
      });
      keys.filter(k => k.startsWith('med_echo_dynamic_v10_')).forEach(k => {
        const lang = k.split('_').pop() || '';
        this.cache.set(lang, JSON.parse(localStorage.getItem(k) || '{}'));
      });
    } catch (e) { }
  }

  private saveToCache(lang: string, text: string, translated: string) {
    if (this.isScriptMismatch(translated, lang)) return;
    if (!this.cache.has(lang)) this.cache.set(lang, {});
    const langCache = this.cache.get(lang)!;
    langCache[text] = translated;
    try {
      localStorage.setItem(`med_echo_dynamic_v10_${lang}`, JSON.stringify(langCache));
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
      this.timers.set(lang, setTimeout(() => this.flush(lang), 250));
    });
  }

  private async flush(lang: string) {
    const q = this.queue.get(lang);
    if (!q) return;
    this.queue.delete(lang);
    this.timers.delete(lang);
    const allTexts = Array.from(q.resolvers.keys());
    const filteredKeys = allTexts.filter(text => {
      if (!text || text.length < 2) return false;
      if (/^[\d\s\-\/:\.,]+$/.test(text)) return false;
      return true;
    });
    const excludedKeys = allTexts.filter(t => !filteredKeys.includes(t));
    excludedKeys.forEach(original => {
      q.resolvers.get(original)?.forEach(resolve => resolve(original));
    });
    if (filteredKeys.length === 0) return;
    try {
      const res = await api.post('ml/translate_batch', {
        texts: filteredKeys,
        target_lang: lang
      });
      const results: string[] = res.data.translations || [];
      filteredKeys.forEach((original, idx) => {
        const translated = results[idx] || original;
        this.saveToCache(lang, original, translated);
        q.resolvers.get(original)?.forEach(resolve => resolve(translated));
      });
    } catch (err) {
      filteredKeys.forEach(original => {
        q.resolvers.get(original)?.forEach(resolve => resolve(original));
      });
    }
  }
}

const batchQueue = new TranslationQueue();

export const translateString = async (text: string, targetLang: string = 'en') => {
  if (!text) return text;
  if (targetLang === 'en' && !/[^\x00-\x7F]/.test(text)) return text;
  const code = targetLang.toLowerCase().slice(0, 2);
  const t = getTranslation(code);
  const dictVal = t[text.toLowerCase().trim()] || t[text.trim()];
  if (dictVal && dictVal !== text.toLowerCase().trim() && dictVal !== text.trim()) {
    return dictVal;
  }
  return await batchQueue.push(text, code);
};

export const clearTranslationCache = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(k => {
    if (k.startsWith('med_echo_lang_') || k.startsWith('med_echo_dynamic_')) {
      localStorage.removeItem(k);
    }
  });
  packs = { en: { ...FALLBACK_PACK } };
  batchQueue.clear();
  notifyObservers();
};
