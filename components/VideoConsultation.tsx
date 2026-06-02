import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Appointment, Prescription } from '../types';
import {
  XMarkIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon,
  ListBulletIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import { BoltIcon, UserIcon, ClockIcon, PlusIcon } from '@heroicons/react/24/solid';
import TranslatedText from './TranslatedText';
import PrescriptionBuilder from './PrescriptionBuilder';
import { getTranslation } from '../services/translations';
import api from '../services/api';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface VideoConsultationProps {
  user: User;
  appointment: Appointment;
  onEnd: (data: { notes: string; prescriptions: Prescription[]; duration?: number }) => void;
  isInitiator?: boolean;
  isVoiceOnly?: boolean;
  socket?: any;
  participantCount?: number;
}

const VideoConsultation: React.FC<VideoConsultationProps> = ({
  user,
  appointment,
  onEnd,
  isInitiator = false,
  isVoiceOnly = false,
  socket,
  participantCount = 0
}) => {
  const t = getTranslation(user?.preferredLanguage);
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'prescriptions' | 'ai'>('notes');
  const [callDuration, setCallDuration] = useState(0);
  const [isJitsiReady, setIsJitsiReady] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  
  // AI Detection State
  const [isAiListening, setIsAiListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [detectedMeds, setDetectedMeds] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  const [isNudging, setIsNudging] = useState(false);

  // Use the EXACT same logic as appointmentController.ts
  const jitsiRoomName = useMemo(() => {
    // Standardized Room Name (Matches server-side generation logic)
    // Using simple hash of appointment ID to ensure uniqueness and consistency
    const hash = appointment.id.replace(/-/g, '').substring(0, 16).toUpperCase();
    return `MedEcho-Consult-${hash}`;
  }, [appointment.id]);

  // Load Jitsi External API Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://meet.element.io/external_api.js';
    script.async = true;
    script.onload = () => setIsJitsiReady(true);
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://meet.element.io/external_api.js"]');
      if (existingScript) document.body.removeChild(existingScript);
      
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, []);

  // Initialize Jitsi API
  useEffect(() => {
    if (!isJitsiReady || !jitsiContainerRef.current || jitsiApiRef.current) return;

    const options = {
      roomName: jitsiRoomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        prejoinPageEnabled: false,
        disableModeratorIndicator: true,
        startWithAudioMuted: false,
        startWithVideoMuted: isVoiceOnly,
        enableLobby: false,
        enableWelcomePage: false,
        requireDisplayName: false,
        enableUserRolesBasedOnToken: false, // Help with guest rooms
        enableFeaturesBasedOnToken: false,
        hideLobbyButton: true,
        p2p: { enabled: true },
        enableNoisyMicDetection: false,
        toolbarButtons: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'settings',
          'videoquality', 'filmstrip', 'shortcuts', 'tileview'
        ],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: t.participant || 'Participant',
      },
      userInfo: {
        displayName: user.name,
        email: user.email
      }
    };

    const apiInstance = new (window as any).JitsiMeetExternalAPI('meet.element.io', options);
    
    // Auto-join handling if the bridge is strict
    apiInstance.addEventListener('videoConferenceJoined', () => {
      console.log(`[Jitsi] Local user joined: ${user.name}`);
      if (socket) {
        socket.emit('join_consultation', { appointmentId: appointment.id, userId: user.id });
      }
    });

    apiInstance.addEventListener('readyToClose', () => {
      onEnd({ notes, prescriptions, duration: callDuration });
    });

    jitsiApiRef.current = apiInstance;
  }, [isJitsiReady, isVoiceOnly, appointment.id, user, jitsiRoomName]);

  // Join consultation room immediately on mount
  useEffect(() => {
    if (socket && appointment.id) {
      console.log(`[Consultation] Initial join for ${appointment.id}`);
      socket.emit('join_consultation', { appointmentId: appointment.id, userId: user.id });
    }
  }, [socket, appointment.id, user.id]);

  useEffect(() => {
    // Start timer when participantCount >= 2 or if we detect audio/video activity
    // Fallback: If we are here for more than 10 seconds, start timer anyway to be safe
    const timer = setTimeout(() => {
      if (callDuration === 0 && participantCount >= 1) {
         // Start if at least one person is here for a while
      }
    }, 10000);

    if (participantCount < 2) return;
    
    const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [participantCount, callDuration]);

  // AI Speech Recognition Logic...
  useEffect(() => {
    if (user.role !== 'DOCTOR') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = user.preferredLanguage || 'en';
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
      recognition.onerror = (e: any) => console.error('AI STT Error:', e);
      recognitionRef.current = recognition;
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [user.role, user.preferredLanguage]);

  useEffect(() => {
    if (!isAiListening || !transcript.trim()) return;
    const analyzeInterval = setInterval(async () => {
      try {
        const response = await api.post('ml/analyze', { text: `Doctor: ${transcript}` });
        if (response.data?.medications) {
          const newMeds = response.data.medications as string[];
          setDetectedMeds(prev => Array.from(new Set([...prev, ...newMeds])));
        }
      } catch (err) { console.warn("AI Analysis failed:", err); }
    }, 8000);
    return () => clearInterval(analyzeInterval);
  }, [isAiListening, transcript]);

  const toggleAiAssistant = () => {
    if (isAiListening) {
      recognitionRef.current?.stop();
      setIsAiListening(false);
    } else {
      recognitionRef.current?.start();
      setIsAiListening(true);
      setActiveTab('ai');
    }
  };

  const handleApproveMed = (medName: string) => {
    const newPres: Prescription = {
       name: medName,
       dosage: '500mg',
       unit: 'TABLET',
       times: ['08:00', '20:00'],
       days: 5
    };
    setPrescriptions(prev => [...prev, newPres]);
    setDetectedMeds(prev => prev.filter(m => m !== medName));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNudge = async () => {
    setIsNudging(true);
    try {
      await api.post(`appointments/${appointment.id}/nudge`, { initiatorId: user.id });
    } finally {
      setTimeout(() => setIsNudging(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[999] flex flex-col lg:flex-row h-full overflow-hidden font-inter">
      {/* Video Content */}
      <main className="flex-1 relative bg-black flex flex-col min-h-0 order-1 lg:order-1">
        {participantCount < 2 && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
              <div className="relative bg-blue-600 w-full h-full rounded-full flex items-center justify-center shadow-2xl">
                <ClockIcon className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
              <TranslatedText 
                text={user.role === 'DOCTOR' ? `Waiting for ${appointment.patientName}` : `Connecting to Dr. ${appointment.doctorName}`} 
                lang={user.preferredLanguage} 
              />
            </h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-sm mb-10">
              <TranslatedText text={t.sessionBeginNotice || "The clinical session will begin as soon as both participants are present in the room."} lang={user.preferredLanguage} />
            </p>
            
            <button 
              onClick={handleNudge}
              disabled={isNudging}
              className={`px-8 py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center space-x-3 shadow-2xl ${isNudging ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:scale-105 active:scale-95'}`}
            >
              <BoltIcon className={`w-4 h-4 ${isNudging ? 'animate-none' : 'text-blue-600 animate-bounce'}`} />
              <span>
                <TranslatedText text={isNudging ? (t.reminderSent || 'Reminder Sent') : (t.sendJoinReminder || 'Send Join Reminder')} lang={user.preferredLanguage} />
              </span>
            </button>
          </div>
        )}
        
        <div ref={jitsiContainerRef} className="w-full h-full" />

        {/* Floating Overlay Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
            <div className="bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              <TranslatedText text={t.liveWith.includes('{name}') ? t.liveWith.replace('{name}', appointment.doctorName) : `${t.liveWith} ${appointment.doctorName}`} lang={user.preferredLanguage} />
            </span>
            <div className="w-px h-3 bg-white/10 mx-1" />
            <span className="text-[10px] font-black text-blue-400 tabular-nums uppercase">{formatTime(callDuration)}</span>
          </div>

          <button
            onClick={() => onEnd({ notes, prescriptions })}
            className="p-3 bg-white text-slate-400 rounded-2xl hover:text-rose-500 transition-colors"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </main>

      {/* Sidebar: Notes & prescriptions */}
      <aside className="w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 flex flex-col h-[45%] lg:h-full shadow-2xl z-[1000] order-2">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <BoltIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-widest">
                <TranslatedText text={t.clinicalConsole} lang={user.preferredLanguage} />
              </h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                {user.role === 'DOCTOR' && appointment.patient?.contact ? (
                  <span className="text-emerald-400 font-black">
                    <TranslatedText text={`${t.patient}: ${appointment.patient.contact}`} lang={user.preferredLanguage} />
                  </span>
                ) : <TranslatedText text={t.secureSession} lang={user.preferredLanguage} />}
              </p>
            </div>
          </div>

          <button
            onClick={() => onEnd({ notes, prescriptions })}
            className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black transition-all shadow-xl shadow-rose-900/20 uppercase tracking-widest"
          >
            <CheckBadgeIcon className="w-4 h-4" />
            <TranslatedText text={t.endSession} lang={user.preferredLanguage} />
          </button>
        </div>

        {/* Tab Selection */}
        {user.role === 'DOCTOR' && (
          <div className="flex px-4 pt-4 shrink-0 bg-slate-900/50">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'text-blue-500 border-blue-500 bg-blue-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
              <TranslatedText text={t.observations} lang={user.preferredLanguage} />
            </button>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'prescriptions' ? 'text-blue-500 border-blue-500 bg-blue-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              <ListBulletIcon className="w-4 h-4" />
              <TranslatedText text={t.reminders} lang={user.preferredLanguage} />
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-emerald-500 border-emerald-500 bg-emerald-500/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
            >
              <BoltIcon className="w-4 h-4" />
              <TranslatedText text={t.aiInsights} lang={user.preferredLanguage} />
            </button>
          </div>
        )}

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900">
          {activeTab === 'notes' ? (
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <ClockIcon className="w-3.5 h-3.5" />
                  <TranslatedText text={t.clinicalAssessment} lang={user.preferredLanguage} />
                </label>
                <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">
                  <TranslatedText text={t.autoSaving} lang={user.preferredLanguage} />
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.assessmentPlaceholder}
                className="flex-1 w-full bg-slate-950/50 border border-slate-800 rounded-3xl p-6 text-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none placeholder:text-slate-700 transition-all leading-relaxed shadow-inner"
              />
              <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-wider italic text-center">
                  "<TranslatedText text={t.assessmentNote} lang={user.preferredLanguage} />"
                </p>
              </div>
            </div>
          ) : activeTab === 'ai' ? (
            <div className="space-y-6">
              {/* AI Status & Toggle */}
              <div className={`p-5 rounded-3xl border transition-all ${isAiListening ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isAiListening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      <TranslatedText text={isAiListening ? t.assistantListening : t.assistantIdle} lang={user.preferredLanguage} />
                    </span>
                  </div>
                  <button
                    onClick={toggleAiAssistant}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isAiListening ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-900/40'}`}
                  >
                    <TranslatedText text={isAiListening ? t.stopAssistant : t.startAssistant} lang={user.preferredLanguage} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  <TranslatedText text={t.assistantDescription} lang={user.preferredLanguage} />
                </p>
              </div>

              {/* Live Transcript */}
              {isAiListening && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t.liveTranscript}</h4>
                  <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl min-h-[60px]">
                    <p className="text-[11px] text-slate-300 italic">
                      <TranslatedText text={transcript || t.speaking} lang={user.preferredLanguage} />
                    </p>
                  </div>
                </div>
              )}

              {/* Detected Medications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <TranslatedText text={t.detectedMeds} lang={user.preferredLanguage} />
                  </h4>
                  <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {detectedMeds.length} <TranslatedText text={t.found} lang={user.preferredLanguage} />
                  </span>
                </div>
                
                {detectedMeds.length > 0 ? (
                  <div className="grid gap-2">
                    {detectedMeds.map((med) => (
                      <div key={med} className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700/50 rounded-2xl hover:border-emerald-500/50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <PlusIcon className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <span className="text-xs font-bold text-white">{med}</span>
                        </div>
                        <button
                          onClick={() => handleApproveMed(med)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-tight transition-all"
                        >
                          <TranslatedText text={t.addToList} lang={user.preferredLanguage} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed whitespace-pre-line">
                      <TranslatedText text={isAiListening ? t.noMedsDetected : t.startAssistantPrompt} lang={user.preferredLanguage} />
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <PrescriptionBuilder
              onPrescriptionsChange={setPrescriptions}
              initialPrescriptions={prescriptions}
              lang={user.preferredLanguage}
            />
          )}
        </div>

        {/* Mobile Action Bar */}
        <div className="lg:hidden p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <button
            onClick={() => onEnd({ notes, prescriptions })}
            className="w-full py-4 bg-blue-600 active:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-blue-900/40"
          >
            <TranslatedText text={t.completeConsultation} lang={user.preferredLanguage} />
          </button>
        </div>
      </aside>
    </div>
  );
};

export default VideoConsultation;
