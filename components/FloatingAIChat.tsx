import React, { useState, useRef, useEffect } from 'react';
import { Message, MedicalReport } from '../types';
import { dbService } from '../services/dbService';
import api from '../services/api';
import { 
  PaperAirplaneIcon, 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/solid';

const LANGUAGES = [
  { code: 'en-US', name: 'English', label: 'English' },
  { code: 'hi-IN', name: 'Hindi', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', name: 'Telugu', label: 'తెలుగు (Telugu)' },
  { code: 'ta-IN', name: 'Tamil', label: 'தமிழ் (Tamil)' },
  { code: 'bn-IN', name: 'Bengali', label: 'বাংলা (Bengali)' },
  { code: 'gu-IN', name: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
  { code: 'kn-IN', name: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml-IN', name: 'Malayalam', label: 'മലയാളం (Malayalam)' },
  { code: 'pa-IN', name: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'mr-IN', name: 'Marathi', label: 'మరాठी (Marathi)' },
  { code: 'ur-IN', name: 'Urdu', label: 'اردو (Urdu)' }
];

interface FloatingAIChatProps {
  onReportGenerated?: (report: MedicalReport) => void;
}

const FloatingAIChat: React.FC<FloatingAIChatProps> = ({ onReportGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hi! I am your MedEcho assistant. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [conversationContext, setConversationContext] = useState<any>({ state: 'GREETING' });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const user = dbService.auth.getCurrentUser();

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
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

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

  const handleSpeechInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      alert("Voice recognition is not supported in this browser.");
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

      const reportPayload = {
        patientId: user.id,
        doctorId: null,
        diagnosis: mlContext.diagnosis || 'Clinical Consultation',
        confidenceScore: parseFloat(mlContext.confidence) || 85,
        preventions: mlContext.precautions ? [mlContext.precautions] : ['Please consult a human doctor for confirmation.'],
        summary: mlContext.history ? JSON.stringify(mlContext.history) : 'Intake completed via quick chat.',
        chatTranscript: transcript
      };

      const { data: savedReport } = await api.post('/reports', reportPayload);
      setReportSaved(true);

      if (onReportGenerated) {
        const report: MedicalReport = {
          id: savedReport.id,
          patientId: user.id,
          doctorId: null,
          doctorName: 'MedEcho AI Assistant',
          date: new Date().toISOString().split('T')[0],
          diagnosis: mlContext.diagnosis || 'Consultation',
          summary: 'Report generated via quick chat assistant.',
          prescription: mlContext.precautions ? [mlContext.precautions] : ['Standard precautions advised.'],
          aiConfidence: parseFloat(mlContext.confidence) || 85,
          vitals: {}
        };
        onReportGenerated(report);
      }

      const successMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `✓ Record Filed: **${mlContext.diagnosis}**. View details in your Records dashboard.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMsg]);
      setIsTyping(false);
    } catch (err) {
      console.error("Error saving report", err);
      setIsTyping(false);
      const errorMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: "I couldn't save your report. Please check your network connection.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
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

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        sender: 'ai', 
        text: data.response || '', 
        timestamp: new Date() 
      };
      
      setMessages(prev => [...prev, aiMsg]);
      setConversationContext(data.context);
      setIsTyping(false);

      // Auto-speak response
      speakText(data.response, data.lang || langShort);

      if (data.context?.final_report) {
        saveToMedicalFiles(data.context);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setIsTyping(false);
      const errorMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: "❌ Error connecting to AI service. Please ensure the backend and ML servers are running.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || reportSaved) return;
    processMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-4 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-sm">MedEcho Chat</h3>
                <div className="flex items-center space-x-1">
                  <GlobeAltIcon className="w-3 h-3 text-blue-200" />
                  <select 
                    value={selectedLang} 
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="bg-transparent border-none text-[8px] font-bold text-blue-100 uppercase tracking-widest p-0 focus:ring-0 outline-none cursor-pointer"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code} className="bg-slate-800 text-white">{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm relative group ${m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}>
                  <p>{m.text}</p>
                  <p className={`text-[9px] mt-1 ${m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {m.sender === 'ai' && (
                    <button
                      onClick={() => speakText(m.text)}
                      className={`absolute -right-8 top-1 p-1 text-slate-300 hover:text-blue-600 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100`}
                    >
                      <SpeakerWaveIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-t border-amber-100">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-3 h-3 text-amber-600 mt-0.5" />
              <p className="text-[8px] text-amber-800 font-bold leading-tight uppercase">
                AI Assistant: Collecting clinical intake data in realtime.
              </p>
            </div>
            {reportSaved && <CheckCircleIcon className="w-4 h-4 text-emerald-600" />}
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSpeechInput}
              disabled={reportSaved}
              className={`p-2 rounded-xl transition-all ${reportSaved ? 'opacity-20' : isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              <MicrophoneIcon className="w-4 h-4" />
            </button>
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={reportSaved || isTyping}
                placeholder={reportSaved ? "Case record saved" : isListening ? "Listening..." : "Describe symptoms..."}
                className="w-full pl-4 pr-10 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-800 shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping || reportSaved}
                className="absolute right-1.5 p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-all"
              >
                <PaperAirplaneIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
          } text-white`}
      >
        {isOpen ? <XMarkIcon className="w-8 h-8" /> : <ChatBubbleLeftRightIcon className="w-8 h-8" />}
      </button>
    </div>
  );
};

export default FloatingAIChat;