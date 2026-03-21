
import React, { useState, useRef, useEffect } from 'react';
import { Message, MedicalReport } from '../types';
import api from '../services/api';
import { dbService } from '../services/dbService';
import { 
  PaperAirplaneIcon, 
  ExclamationTriangleIcon, 
  SparklesIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  CheckCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/solid';
import { getTranslation, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';

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
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ initialContext, isModal, onReportGenerated }) => {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = selectedLang;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        processMessage(transcript);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [selectedLang]);

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
      synth.speak(utterance);
    } catch (e) {
      console.error("TTS Error", e);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setLastInputMethod('voice');
      recognitionRef.current.start();
      setIsListening(true);
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
    if (recognitionRef.current && isListening) {
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

  const processMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() };
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
      
      // Auto-translate AI response if needed
      if (langShort !== 'en' && aiResponse) {
        try {
          aiResponse = await translateString(aiResponse, langShort);
        } catch (e) {
          console.error("AI translation failed", e);
        }
      }

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        text: aiResponse, 
        timestamp: new Date() 
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
        bp: fullText.match(/(\d{2,3}\/\d{2,3})/)?.[1] || mlContext.history?.['bp'],
        weight: fullText.match(/(\d{1,3})\s*(kg|kilograms|lbs)/i)?.[0] || mlContext.history?.['weight'],
        temperature: fullText.match(/(\d{2,3}(\.\d)?)\s*(f|c|fahrenheit|celsius|degree)/i)?.[0] || mlContext.history?.['temperature']
      };

      const langShort = selectedLang.split('-')[0];
      let diagnosis = mlContext.diagnosis || t.clinicalConsult;
      let summary = mlContext.summary || t.aiMedicalIntake;
      let precautions = mlContext.precautions 
           ? (Array.isArray(mlContext.precautions) ? mlContext.precautions : String(mlContext.precautions).split(/,\s*/))
           : [t.consultProfessional];

      // Async translate metadata if user is not on English
      if (langShort !== 'en') {
        try {
          const transResults = await Promise.all([
            translateString(diagnosis, langShort),
            translateString(summary, langShort),
            Promise.all(precautions.map((p: string) => translateString(p, langShort)))
          ]);
          diagnosis = transResults[0];
          summary = transResults[1];
          precautions = transResults[2] as string[];
        } catch (e) {
          console.error("Metadata translation failed", e);
        }
      }

      const reportPayload = {
        patientId: user.id,
        patientName: user.name,
        doctorId: null,
        doctorName: t.unassigned,
        diagnosis,
        confidenceScore: parseFloat(mlContext.confidence) || 85,
        preventions: precautions,
        summary,
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
      
      const successMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `✓ ${t.recordFiled}: **${diagnosis}**.`,
        timestamp: new Date()
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
