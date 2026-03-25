
import React, { useState, useRef, useEffect } from 'react';

const Waveform = () => (
  <div className="flex items-center space-x-0.5 h-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="w-0.5 bg-rose-500 rounded-full animate-[wave_1s_ease-in-out_infinite]"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
    <style>{`
      @keyframes wave {
        0%, 100% { height: 4px; }
        50% { height: 12px; }
      }
      @keyframes flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .animate-flash {
        animation: flash 1s ease-in-out infinite;
      }
    `}</style>
  </div>
);
import { Message, MedicalReport } from '../types';
import api from '../services/api';
import { dbService, mapBackendReportToFrontend } from '../services/dbService';
import {
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  PaperClipIcon
} from '@heroicons/react/24/solid';
import { getTranslation, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';

const SymptomSelector = ({ suggestions, onSend, isTyping, preferredLanguage, chatState }: any) => {
  const [selected, setSelected] = useState<string[]>([]);

  if (chatState === 'GATHERING_DETAILS') {
    return (
      <div className="mt-3 flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
        {suggestions.map((sug: any, idx: number) => (
          <button
            key={idx}
            disabled={isTyping}
            onClick={() => onSend(sug.id, sug.label)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all border border-blue-200 shadow-sm active:scale-95"
          >
            {sug.label}
          </button>
        ))}
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (selected.length > 0) {
      const selectedLabels = suggestions.filter((s: any) => selected.includes(s.id)).map((s: any) => s.label);
      const backendText = `yes, I experience ${selected.join(', ')}`;
      const langCode = preferredLanguage?.slice(0, 2) || 'en';
      let uiPrefix = langCode === 'en' ? 'Yes, I experience:' : await translateString('Yes, I experience:', langCode);
      onSend(backendText, `${uiPrefix} ${selectedLabels.join(', ')}`);
    }
  };

  const handleOther = async () => {
    const langCode = preferredLanguage?.slice(0, 2) || 'en';
    const localized = langCode === 'en' ? 'I am experiencing other symptoms' : await translateString('I am experiencing other symptoms', langCode);
    onSend('I am experiencing other symptoms', localized);
  };

  const handleNone = async () => {
    const langCode = preferredLanguage?.slice(0, 2) || 'en';
    const localized = langCode === 'en' ? 'None of these' : await translateString('None of these', langCode);
    onSend('none', localized);
  };

  return (
    <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-300">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((sug: any, idx: number) => (
          <button
            key={idx}
            disabled={isTyping}
            onClick={() => toggle(sug.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border shadow-sm active:scale-95 ${selected.includes(sug.id)
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
          >
            {sug.label}
          </button>
        ))}
      </div>
      <div className="flex space-x-2 pt-3 border-t border-slate-100 mt-2">
        <button
          disabled={isTyping || selected.length === 0}
          onClick={handleSend}
          className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all shadow-sm ${selected.length > 0
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border outline-none'
            }`}
        >
          <TranslatedText text="Confirm Selected" lang={preferredLanguage} />
        </button>
        <button
          disabled={isTyping}
          onClick={handleOther}
          className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all border border-slate-200 shadow-sm active:scale-95"
        >
          <TranslatedText text="Other" lang={preferredLanguage} />
        </button>
        <button
          disabled={isTyping}
          onClick={handleNone}
          className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all border border-red-200 shadow-sm active:scale-95"
        >
          <TranslatedText text="None" lang={preferredLanguage} />
        </button>
      </div>
    </div>
  );
};

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', label: 'Auto Detect' },
  { code: 'en-US', name: 'English', label: 'English' },
  { code: 'hi-IN', name: 'Hindi', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', name: 'Telugu', label: 'తెలుగు (Telugu)' },
  { code: 'ta-IN', name: 'Tamil', label: 'தமிழ் (Tamil)' },
  { code: 'bn-IN', name: 'Bengali', label: 'বাংলা (Bengali)' },
  { code: 'gu-IN', name: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
  { code: 'kn-IN', name: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml-IN', name: 'Malayalam', label: 'മലയാളம் (Malayalam)' },
  { code: 'pa-IN', name: 'Punjabi', label: 'ప్ర్పన్జాబీ (Punjabi)' },
  { code: 'mr-IN', name: 'Marathi', label: 'మరాఠీ (Marathi)' },
  { code: 'ur-IN', name: 'Urdu', label: 'اردو (Urdu)' }
];

interface AIChatAssistantProps {
  initialContext?: string;
  isModal?: boolean;
  onReportGenerated?: (report: MedicalReport) => void;
  onConsultDoctor?: (doctorId: string) => void;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ initialContext, isModal, onReportGenerated, onConsultDoctor }) => {
  const user = dbService.auth.getCurrentUser();
  const t = getTranslation(user?.preferredLanguage);

  React.useEffect(() => {
    if (user?.preferredLanguage) {
      loadTranslations(user.preferredLanguage, 'chat');
    }
  }, [user?.preferredLanguage]);

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: initialContext ? t.aiContextReceived : t.aiGreeting, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [selectedLang, setSelectedLang] = useState('auto');
  const [conversationContext, setConversationContext] = useState<any>({ state: 'GREETING' });
  const [lastInputMethod, setLastInputMethod] = useState<'text' | 'voice'>('text');
  const [isUploading, setIsUploading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const manualStop = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang === 'auto' ? (user?.preferredLanguage || 'en') : selectedLang;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(finalTranscript);
          processMessage(finalTranscript);
        } else if (interimTranscript) {
          setInput(interimTranscript);
        }
      };

      recognition.onend = () => {
        if (!manualStop.current && isListening && !isSpeaking) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Speech recognition restart failed", e);
          }
        } else if (manualStop.current) {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
          manualStop.current = true;
        }
      };
    }
  }, [selectedLang, user?.preferredLanguage, isSpeaking]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const speakText = (text: string, langCode: string = selectedLang) => {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (langCode.length === 2) {
        const fullLang = LANGUAGES.find(l => l.code.startsWith(langCode));
        if (fullLang) utterance.lang = fullLang.code;
      } else {
        utterance.lang = langCode;
      }
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (recognitionRef.current && isListening && !manualStop.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Auto-restart after speaking failed", e);
          }
        }
      };

      synth.speak(utterance);
    } catch (e) {
      console.error("TTS Error", e);
    }
  };

  const startRecording = () => {
    manualStop.current = false;
    if (recognitionRef.current) {
      setLastInputMethod('voice');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn("Initial recognition start failed", e);
      }
    } else {
      startMediaRecorder();
    }
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      alert(t.micDenied);
    }
  };

  const stopRecording = () => {
    manualStop.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsTyping(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('language', selectedLang.split('-')[0]);

    try {
      const { data } = await api.post('/ml/stt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.text) {
        setInput(data.text);
        processMessage(data.text);
      }
    } catch (error) {
      console.error("STT Error:", error);
      alert(t.sttError);
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setIsUploading(true);
    setIsTyping(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', user.id);
    
    if (user.role === 'DOCTOR') {
      formData.append('reportType', 'CONSULTATION');
      formData.append('doctorId', user.id);
    }
    
    try {
      const { data: rawReport } = await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const report = mapBackendReportToFrontend(rawReport);
      
      const successMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: `✓ **Report Uploaded**: ${report.fileName}\n\n${report.diagnosis}\n\nI've analyzed the report and added it to your medical files. You can see it in your dashboard.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMsg]);
      
      if (onReportGenerated) {
        onReportGenerated(report);
      }
      
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Failed to upload report. Please try again.");
    } finally {
      setIsUploading(false);
      setIsTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processMessage = async (text: string, uiText?: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: uiText || text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const langShort = selectedLang.split('-')[0];

      const { data } = await api.post('/ml/chat', {
        text,
        context: conversationContext,
        lang: langShort
      });

      let aiResponse = data.response || '';
      let rawSuggestions = data.context?.pending_suggestions || [];

      // Map to object preserving the valid ML engine lookup ID vs localized Label
      let formattedSuggestions = rawSuggestions.map((s: string) => ({
        id: s.replace(/_/g, ' '),
        label: s.replace(/_/g, ' ')
      }));

      const returnedLang = data.lang || langShort;

      const targetLang = user?.preferredLanguage || 'en';

      // Auto-translate AI response and suggestions to user's preferred language
      if (targetLang !== 'en' || /[^\x00-\x7F]/.test(aiResponse)) {
        try {
          if (aiResponse) {
            aiResponse = await translateString(aiResponse, targetLang);
          }
          if (formattedSuggestions.length > 0) {
            const translatedSugs = await Promise.all(
              formattedSuggestions.map((s: any) => translateString(s.label, targetLang))
            );
            formattedSuggestions = formattedSuggestions.map((s: any, idx: number) => ({
              id: s.id, // Keep original ID for backend
              label: translatedSugs[idx]
            }));
          }
        } catch (e) {
          console.error("AI translation failed", e);
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date(),
        suggestions: formattedSuggestions.length > 0 ? formattedSuggestions : undefined,
        chatState: data.context?.state
      };

      setMessages(prev => [...prev, aiMsg]);
      setConversationContext(data.context);

      if (selectedLang === 'auto' && data.lang && data.lang !== 'en') {
        const found = LANGUAGES.find(l => l.code.startsWith(data.lang));
        if (found) setSelectedLang(found.code);
      }

      setIsTyping(false);
      speakText(data.response, data.lang || langShort);

      if (data.context?.final_report) {
        saveToMedicalFiles(data.context);
      }

      if (lastInputMethod === 'text') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setIsTyping(false);
      const errorMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: t.aiServiceError,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const saveToMedicalFiles = async (mlContext: any) => {
    if (!user || reportSaved) return;

    setIsTyping(true);
    try {
      const transcript = messages.map(m => ({
        role: m.sender,
        content: m.text,
        time: m.timestamp.toISOString()
      }));

      const fullText = messages.map(m => m.text).join(' ');
      const vitals = {
        bp: fullText.match(/(\d{2,3}\/\d{2,3})/)?.[1] || mlContext.history?.['bp'] || user.vitalBp || undefined,
        weight: fullText.match(/(\d{1,3})\s*(kg|kilograms|lbs)/i)?.[0] || mlContext.history?.['weight'] || user.vitalWeight || undefined,
        temperature: fullText.match(/(\d{2,3}(\.\d)?)\s*(f|c|fahrenheit|celsius|degree)/i)?.[0] || mlContext.history?.['temperature'] || user.vitalTemperature || undefined,
        glucose: user.vitalGlucose || undefined
      };

      let diagnosis = mlContext.diagnosis || t.clinicalConsult;
      let summary = mlContext.summary || t.aiMedicalIntake;
      let precautions = mlContext.precautions
        ? (Array.isArray(mlContext.precautions) ? mlContext.precautions : String(mlContext.precautions).split(/,\s*/))
        : [t.consultProfessional];

      // CRITICAL: Always translate medical metadata back to English for storage.
      // This ensures the database is consistent. Frontend handles display translation.
      const storageLang = 'en';

      if (/[^\x00-\x7F]/.test(diagnosis) || /[^\x00-\x7F]/.test(summary)) {
        try {
          const transResults = await Promise.all([
            translateString(diagnosis, storageLang),
            translateString(summary, storageLang),
            Promise.all(precautions.map((p: string) => translateString(p, storageLang)))
          ]);
          diagnosis = transResults[0];
          summary = transResults[1];
          precautions = transResults[2] as string[];
        } catch (e) {
          console.error("Database stabilization failed", e);
        }
      }

      const reportPayload = {
        patientId: user.id,
        patientName: user.name,
        doctorId: null,
        doctorName: t.unassigned,
        diagnosis, // Now standardized to English
        confidenceScore: parseFloat(mlContext.confidence) || 85,
        preventions: precautions, // Standardized to English
        summary, // Standardized to English
        symptoms: mlContext.collected_symptoms || [],
        history: mlContext.history || {},
        vitals: vitals,
        chatTranscript: transcript
      };

      const { data: savedReport } = await api.post('/reports', reportPayload);
      setReportSaved(true);

      if (onReportGenerated) {
        const report: MedicalReport = {
          id: savedReport.id,
          patientId: user.id,
          patientName: user.name,
          doctorId: null,
          doctorName: t.medEchoLogo + ' AI',
          date: new Date().toISOString().split('T')[0],
          diagnosis: mlContext.diagnosis || t.clinicalConsult,
          summary: mlContext.summary,
          prescription: mlContext.precautions,
          aiConfidence: parseFloat(mlContext.confidence) || 85,
          vitals: vitals
        };
        onReportGenerated(report);
      }

      let recommendedDocs: { id: string, name: string, specialization?: string }[] = [];
      try {
        const doctors = await dbService.users.getDoctors();
        if (doctors && doctors.length > 0) {

          // Smart ML-Diagnosis to Specialty Mapping
          const diagLower = diagnosis.toLowerCase();
          let targetSpecialty = 'General Physician';

          if (diagLower.includes('heart') || diagLower.includes('stroke') || diagLower.includes('blood')) targetSpecialty = 'Cardiologist';
          else if (diagLower.includes('brain') || diagLower.includes('paralysis') || diagLower.includes('headache') || diagLower.includes('migraine')) targetSpecialty = 'Neurologist';
          else if (diagLower.includes('asthma') || diagLower.includes('lungs') || diagLower.includes('breath') || diagLower.includes('covid')) targetSpecialty = 'Pulmonologist';
          else if (diagLower.includes('skin') || diagLower.includes('rash') || diagLower.includes('acne') || diagLower.includes('fungal')) targetSpecialty = 'Dermatologist';
          else if (diagLower.includes('stomach') || diagLower.includes('gastro') || diagLower.includes('acid') || diagLower.includes('ulcer') || diagLower.includes('diarrhea')) targetSpecialty = 'Gastroenterologist';
          else if (diagLower.includes('bone') || diagLower.includes('joint') || diagLower.includes('arthritis') || diagLower.includes('osteo')) targetSpecialty = 'Orthopedic';
          else if (diagLower.includes('sugar') || diagLower.includes('diabet') || diagLower.includes('thyroid')) targetSpecialty = 'Endocrinologist';
          else if (diagLower.includes('eye') || diagLower.includes('vision')) targetSpecialty = 'Ophthalmologist';
          else if (diagLower.includes('fever') || diagLower.includes('malaria') || diagLower.includes('dengue') || diagLower.includes('typhoid')) targetSpecialty = 'General Physician';

          // Filter doctors by the target specialty
          const matchedDocs = doctors.filter(d =>
            d.specialization && d.specialization.toLowerCase().includes(targetSpecialty.toLowerCase())
          );

          // Use matched doctors, or fallback to any doctors if none match
          const selectedDocs = matchedDocs.length > 0 ? matchedDocs : doctors;

          recommendedDocs = selectedDocs.slice(0, 2).map((d: any) => ({
            id: d.id,
            name: d.name,
            specialization: d.specialization || 'General Physician'
          }));
        }
      } catch (docErr) {
        console.error("Could not fetch recommended doctors", docErr);
      }

      const successMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `✓ ${t.recordFiled}: **${diagnosis}**.`,
        timestamp: new Date(),
        recommendedDoctors: recommendedDocs.length > 0 ? recommendedDocs : undefined
      };
      setMessages(prev => [...prev, successMsg]);
      setIsTyping(false);
    } catch (err) {
      console.error("Error saving report", err);
      setIsTyping(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping || reportSaved) return;
    processMessage(input);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setLastInputMethod('text');
  };

  return (
    <div className={`${isModal ? 'h-full w-full' : 'max-w-4xl mx-auto h-[calc(100vh-140px)] m-4 sm:m-8'} flex flex-col bg-white sm:rounded-3xl shadow-xl border-x sm:border overflow-hidden animate-in zoom-in-95 duration-500`}>
      <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-bold tracking-tight uppercase"><TranslatedText text={t.aiChatTitle} lang={user?.preferredLanguage} /></h2>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none">
                <TranslatedText text={t.multilingualAI} lang={user?.preferredLanguage} />
              </span>
              <div className="h-2 w-px bg-slate-700"></div>
              <div className="flex items-center space-x-1">
                <GlobeAltIcon className="w-3 h-3 text-blue-400" />
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="bg-transparent border-none text-[8px] font-bold text-blue-400 uppercase tracking-widest p-0 focus:ring-0 outline-none cursor-pointer"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code} className="bg-slate-800 text-white">
                      {l.code === 'auto' ? <TranslatedText text={t.autoDetect} lang={user?.preferredLanguage} /> : l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 rounded-2xl shadow-sm relative group ${m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border rounded-tl-none'}`}>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">{m.text}</p>

              {/* Symptom Suggestions UI Chips */}
              {m.suggestions && m.suggestions.length > 0 && m.id === messages[messages.length - 1].id && !reportSaved && (
                <SymptomSelector
                  suggestions={m.suggestions}
                  onSend={processMessage}
                  isTyping={isTyping}
                  preferredLanguage={user?.preferredLanguage}
                  chatState={m.chatState}
                />
              )}

              {/* Recommended Doctors UI Block */}
              {m.recommendedDoctors && m.recommendedDoctors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <TranslatedText text="Recommended Specialists" lang={user?.preferredLanguage} />
                  </p>
                  {m.recommendedDoctors.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in slide-in-from-bottom-2 duration-500">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{doc.name}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          <TranslatedText text={doc.specialization || 'General Physician'} lang={user?.preferredLanguage} />
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (onConsultDoctor) onConsultDoctor(doc.id);
                        }}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <TranslatedText text="Consult" lang={user?.preferredLanguage} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className={`text-[8px] sm:text-[10px] mt-1 ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex space-x-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border-y border-amber-100 px-4 py-2 flex items-center space-x-2 flex-shrink-0">
        <ExclamationTriangleIcon className="w-3 h-3 text-amber-600 flex-shrink-0" />
        <p className="text-[8px] text-amber-800 font-bold uppercase tracking-tight">
          <TranslatedText text={t.aiWarning} lang={user?.preferredLanguage} />
        </p>
      </div>

      {/* Voice/AI Status Indicator */}
      {(isListening || isTyping || isSpeaking) && (
        <div className="px-4 py-2 bg-white/80 backdrop-blur-sm border-b flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center space-x-3">
            {isListening && !isSpeaking ? (
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Listening</span>
                <Waveform />
              </div>
            ) : isSpeaking ? (
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Speaking</span>
                <div className="flex space-x-0.5">
                   <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                   <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                   <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            ) : isTyping ? (
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Thinking</span>
                <div className="flex space-x-1">
                  <span className="w-1 h-1 bg-amber-400 rounded-full animate-flash"></span>
                  <span className="w-1 h-1 bg-amber-400 rounded-full animate-flash [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 bg-amber-400 rounded-full animate-flash [animation-delay:0.4s]"></span>
                </div>
              </div>
            ) : null}
          </div>
          {isListening && (
             <button 
               type="button"
               onClick={stopRecording} 
               className="text-[8px] font-black text-slate-400 uppercase hover:text-rose-500 transition-colors tracking-tighter"
             >
               [ Stop Assistant ]
             </button>
          )}
        </div>
      )}

      <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        <button
          type="button"
          disabled={reportSaved}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`p-3 sm:p-4 rounded-2xl transition-all ${reportSaved ? 'opacity-20 bg-slate-100' : isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          <MicrophoneIcon className="w-5 h-5" />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf"
        />

        <button
          type="button"
          disabled={reportSaved || isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 sm:p-4 rounded-2xl transition-all ${reportSaved || isUploading ? 'opacity-20 bg-slate-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          title="Upload Report"
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleTextChange}
            disabled={reportSaved || isTyping}
            placeholder={reportSaved ? t.caseSaved : isListening ? t.listening : t.describeSymptoms}
            className="w-full pl-4 pr-12 py-3.5 sm:pl-6 sm:pr-14 sm:py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm text-slate-800 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || reportSaved}
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 text-white px-3 sm:px-4 rounded-xl flex items-center justify-center transition-all shadow-lg"
          >
            <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChatAssistant;
