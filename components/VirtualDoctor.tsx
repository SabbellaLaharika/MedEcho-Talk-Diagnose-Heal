import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MedicalReport, User } from '../types';
import api from '../services/api';
import { getTranslation, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';
import {
  StopIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

interface VirtualDoctorProps {
  patientId: string;
  user: User;
  onSessionComplete: (report: MedicalReport) => void;
}

type Persona = 'Sarah' | 'James' | 'Elena' | 'Marcus';
const INDIAN_LANGUAGES = [
  "english", "hindi", "telugu", "tamil", "bengali", "marathi", "gujarati", "kannada", "malayalam", "punjabi"
];

const VirtualDoctor: React.FC<VirtualDoctorProps> = ({ patientId, user, onSessionComplete }) => {
  useEffect(() => {
    loadTranslations(user.preferredLanguage, 'virtual_clinic');
  }, [user.preferredLanguage]);

  const [isConnecting, setIsConnecting] = useState(false);
  const t = getTranslation(user.preferredLanguage);
  const [isActive, setIsActive] = useState(false);
  const [chatOverlay, setChatOverlay] = useState<{ sender: string, text: string }[]>([]);
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(20).fill(10));
  const [persona, setPersona] = useState<Persona>('Sarah');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastDocResponseRef = useRef<string>("");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // D-ID WebRTC State
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const didSessionIdRef = useRef<string | null>(null);
  const didStreamIdRef = useRef<string | null>(null);
  const didVideoRef = useRef<HTMLVideoElement>(null);
  const [streamConnected, setStreamConnected] = useState(false);

  // Map language codes to Virtual Doctor's display names
  const langMap: Record<string, string> = {
    'hi': 'Hindi',
    'te': 'Telugu',
    'ta': 'Tamil',
    'mr': 'Marathi',
    'bn': 'Bengali',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'gu': 'Gujarati',
    'pa': 'Punjabi'
  };
  const defaultLang = langMap[user.preferredLanguage || 'en'] || 'English';
  const [language, setLanguage] = useState(defaultLang);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const transcriptionRef = useRef<string>("");

  const personas = {
    Sarah: { img: "https://clips-presenters.d-id.com/amy/image.png", voice: "Puck", desc: "Empathetic", gender: "female" },
    James: { img: "https://clips-presenters.d-id.com/matt/image.png", voice: "Kore", desc: "Professional", gender: "male" },
    Elena: { img: "https://clips-presenters.d-id.com/sophia/image.png", voice: "Zephyr", desc: "Pediatric", gender: "female" },
    Marcus: { img: "https://clips-presenters.d-id.com/william/image.png", voice: "Charon", desc: "Expert Surgeon", gender: "male" }
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start D-ID WebRTC Stream instantly
      await startDIDStream();

      let nextStartTime = 0;
      const sources = new Set<AudioBufferSourceNode>();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const avg = inputData.reduce((acc, val) => acc + Math.abs(val), 0) / inputData.length;
              setVisualizerData(prev => [...prev.slice(1), 5 + avg * 400]);

              // Only show 'Listening' badge if user is speaking loudly enough
              if (avg > 0.015) {
                setIsUserSpeaking(true);
                if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                speakingTimeoutRef.current = setTimeout(() => {
                  setIsUserSpeaking(false);
                }, 800); // 800ms hang time to stay visible between words
              }

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;

              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            setIsConnecting(false);
            setIsActive(true);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              transcriptionRef.current += "Doc: " + text + "\n";
              lastDocResponseRef.current += text;
              // Defer UI update to turnComplete to synchronize with avatar
            }
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              transcriptionRef.current += "Patient: " + text + "\n";
              setChatOverlay(prev => {
                const last = prev[prev.length - 1];
                if (last?.sender === 'You') {
                  return [...prev.slice(0, -1), { sender: 'You', text: text }];
                }
                return [...prev, { sender: 'You', text }];
              });
            }

            // Check for turn completion to trigger D-ID
            const turnComplete = (msg as any).serverContent?.turnComplete ||
              (msg.serverContent?.modelTurn?.parts?.some(p => p.text === ""));

            if (turnComplete) {
              if (lastDocResponseRef.current.trim().length > 0) {
                const finalText = lastDocResponseRef.current;
                if (finalText.trim().length > 5) {
                  sendToDIDStream(finalText);
                }
                setTimeout(() => {
                  setChatOverlay(prev => [...prev, { sender: 'Doc', text: finalText }]);
                }, 1500); // 1s sync delay to match D-ID latency
                lastDocResponseRef.current = ""; // Reset after dispatch
              }
            }

            // Inline audio playback disabled in favor of D-ID video
            /*
            const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64) {
              nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioBase64), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
              sources.add(source);
              source.onended = () => sources.delete(source);
            }
            */
          },
          onerror: () => { setIsActive(false); setIsConnecting(false); },
          onclose: () => setIsActive(false),
        },
        config: {
          // Fixed typo: responseModalities
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: personas[persona].voice as any } } },
          systemInstruction: `You are Dr. ${persona}, an AI ${personas[persona].desc} specialist. Greet the patient introducing yourself as Dr. ${persona}. Ask step-by-step questions to diagnose. CRITICAL INSTRUCTION: You MUST speak, think, and respond EXCLUSIVELY in ${language}. Your text output and subtitles MUST be natively written in ${language}. Do not use English unless the selected language is English!`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},

        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Start Session Error:", err);
      setIsConnecting(false);
      alert("Microphone or Connection Error: " + err?.message);
    }
  };

  const startDIDStream = async () => {
    try {
      setIsGenerating(true);
      // 1. Create stream
      const createRes = await api.post('/did/stream/create', {
        source_url: personas[persona].img
      });
      const { id: streamId, session_id: sessionId, offer, ice_servers } = createRes.data;
      didStreamIdRef.current = streamId;
      didSessionIdRef.current = sessionId;

      // 2. Setup RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: ice_servers });
      peerConnectionRef.current = pc;

      // 3. Handle incoming video track
      pc.ontrack = (event) => {
        if (didVideoRef.current && event.track.kind === 'video') {
          didVideoRef.current.srcObject = event.streams[0];
          didVideoRef.current.play().then(() => {
            setStreamConnected(true);
            setIsGenerating(false);
          }).catch(e => {
            console.error("Video play error:", e);
            // Fallback unlock if autoplay fails but track exists
            setStreamConnected(true);
            setIsGenerating(false);
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setStreamConnected(true);
          setIsGenerating(false);
        }
      };

      // 4. Handle ICE candidates (Buffering)
      let sdpSent = false;
      const iceCandidatesBuffer: any[] = [];

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const iceData = {
            streamId,
            sessionId,
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          };
          if (sdpSent) {
            api.post('/did/stream/ice', iceData).catch(err => console.error("ICE error", err));
          } else {
            iceCandidatesBuffer.push(iceData);
          }
        }
      };

      // 5. Set Remote Description (Offer) and Create Local Answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Send Answer back to D-ID
      await api.post('/did/stream/sdp', {
        streamId,
        sessionId,
        answer: pc.localDescription
      });
      sdpSent = true;

      // 7. Flush ICE candidates
      for (const candidate of iceCandidatesBuffer) {
        api.post('/did/stream/ice', candidate).catch(err => console.error("Buffered ICE error", err));
      }

    } catch (err: any) {
      console.error("D-ID Stream Initialization Error:", err);
      setIsGenerating(false);
      alert("Avatar Generation Error: " + (err?.response?.data?.message || err?.message || 'Unknown error. Check console.'));
    }
  };

  const sendToDIDStream = async (text: string) => {
    if (!didStreamIdRef.current || !didSessionIdRef.current) return;
    try {
      await api.post('/did/stream/send', {
        streamId: didStreamIdRef.current,
        sessionId: didSessionIdRef.current,
        text: text,
        language: language,
        gender: personas[persona].gender
      });
    } catch (err) {
      console.error("D-ID Stream Send Error:", err);
    }
  };

  const closeDIDStream = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (didStreamIdRef.current && didSessionIdRef.current) {
      try {
        await api.delete('/did/stream', {
          data: { streamId: didStreamIdRef.current, sessionId: didSessionIdRef.current }
        });
      } catch (err) {
        console.error("D-ID cleanup error", err);
      }
    }
    setStreamConnected(false);
    if (didVideoRef.current) didVideoRef.current.srcObject = null;
  };

  const endSession = async () => {
    setIsAnalyzing(true);
    if (sessionPromiseRef.current) (await sessionPromiseRef.current).close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsActive(false);
    await closeDIDStream();

    // Call custom ML service analysis instead of Gemini
    let analysis = null;
    try {
      const response = await api.post('/ml/analyze', { text: transcriptionRef.current });
      analysis = response.data;
    } catch (err) {
      console.error("Analysis Error:", err);
    }

    const newReport: MedicalReport = {
      id: 'r-' + Math.random().toString(36).substr(2, 9),
      patientId: patientId,
      doctorId: null,
      date: new Date().toISOString().split('T')[0],
      doctorName: `AI-Doc (${persona})`,
      diagnosis: analysis?.condition || 'Checkup Completed',
      confidenceScore: analysis?.confidence || 80,
      aiConfidence: analysis?.confidence || 80,
      inputLanguage: language,
      summary: analysis?.summary || transcriptionRef.current || 'Session recorded.',
      prescription: analysis?.advice ? [analysis.advice] : ['Follow-up as advised'],
      vitals: { temperature: '98.6F' }
    };
    setIsAnalyzing(false);
    onSessionComplete(newReport);
  };

  return (
    <div className="p-3 sm:p-8 bg-[#F8FAFC] min-h-[calc(100vh-80px)] font-sans relative overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none"></div>


      {!isActive && (
        <div className="relative z-10 max-w-4xl mx-auto space-y-4 sm:space-y-12 mb-6 sm:mb-20">
          <div className="text-center space-y-2 sm:space-y-4 pt-4 sm:pt-10">
            <h1 className="text-2xl sm:text-6xl font-black text-slate-800 tracking-tight leading-none">
              <TranslatedText text={t.virtualClinic} lang={user.preferredLanguage} />
            </h1>
            <p className="text-slate-500 text-[10px] sm:text-sm mt-1">
              <TranslatedText text={t.talkToAI} lang={user.preferredLanguage} />
            </p>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <div className="glass-panel p-3 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-white/40">
              <h3 className="text-[9px] sm:text-sm font-black text-slate-700 flex items-center space-x-2 mb-3 sm:mb-6">
                <GlobeAltIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600" />
                <span className="uppercase tracking-wider">1. <TranslatedText text={t.language} lang={user.preferredLanguage} /></span>
              </h3>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">

                {INDIAN_LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-1 py-1.5 sm:px-3 sm:py-3 rounded-lg sm:rounded-2xl text-[7px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-300 hover-lift ${language === lang
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/50 text-slate-500 border border-slate-100 hover:bg-white hover:text-blue-600 hover:border-blue-100'}`}
                  >
                    <TranslatedText text={lang} lang={user.preferredLanguage} />
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-3 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-white/40">
              <h3 className="text-[9px] sm:text-sm font-black text-slate-700 flex items-center space-x-2 mb-3 sm:mb-6">
                <UserCircleIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-indigo-600" />
                <span className="uppercase tracking-wider">2. <TranslatedText text={t.selectSpecialist} lang={user.preferredLanguage} /></span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">

                {(Object.keys(personas) as Persona[]).map((name) => (
                  <button
                    key={name}
                    onClick={() => setPersona(name)}
                    className={`relative rounded-xl sm:rounded-3xl overflow-hidden border-2 transition-all duration-500 hover-lift ${persona === name ? 'border-indigo-500 ring-2 sm:ring-8 ring-indigo-500/10 scale-105 z-10' : 'border-white/50 grayscale-[0.3]'}`}
                  >
                    <img src={personas[name].img} alt={name} className="w-full h-12 sm:h-24 object-cover" />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-1.5 sm:p-3">
                      <span className="text-white font-black text-[7px] sm:text-[10px] uppercase tracking-widest">
                        <TranslatedText text={name} lang={user.preferredLanguage} />
                      </span>
                    </div>
                  </button>

                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      <div className="relative w-full max-w-5xl aspect-[4/3] sm:aspect-video bg-[#ebeced] rounded-[2rem] sm:rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border-[4px] sm:border-[8px] border-white group mx-auto premium-shadow">
        <video
          ref={didVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover sm:object-contain transition-all duration-1000 ${streamConnected ? 'opacity-100' : 'opacity-0'} absolute inset-0 z-10`}
        />

        <img
          src={personas[persona].img}
          alt="Doc"
          className={`w-full h-full object-contain transition-all duration-1000 ${isActive ? 'scale-105' : 'scale-100 brightness-90'} ${streamConnected ? 'opacity-0' : 'opacity-100'} absolute inset-0 z-0`}
        />

        {/* HUD UI - Responsive stacking */}
        <div className="absolute inset-x-6 sm:inset-x-12 top-6 sm:top-12 flex flex-col space-y-3 items-start pointer-events-none z-10">
          <div className="bg-black/30 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
            <TranslatedText text={language} lang={user.preferredLanguage} /> <TranslatedText text={t.languageMode} lang={user.preferredLanguage} />
          </div>
        </div>

        {/* Top Right HUD - Listening Indicator */}
        {isActive && isUserSpeaking && (
          <div className="absolute top-4 sm:top-12 right-4 sm:right-12 flex items-center space-x-2 sm:space-x-3 bg-red-500/20 backdrop-blur-xl px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full border border-red-500/30 z-20 pointer-events-none shadow-lg">
            <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]"></div>
            <span className="text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest">
              <TranslatedText text={t.listening} lang={user.preferredLanguage} />
            </span>
          </div>
        )}

        {/* Live Subtitles (Bottom Center) */}
        <div className="absolute bottom-4 sm:bottom-10 inset-x-0 flex justify-center pointer-events-none z-30 px-4 sm:px-12 transition-all duration-500">
          {chatOverlay.length > 0 && (
            <div
              className={`max-w-3xl w-full px-4 py-2 sm:px-8 sm:py-5 rounded-[1.2rem] sm:rounded-[2.5rem] backdrop-blur-2xl border shadow-2xl flex items-center space-x-3 sm:space-x-5 transition-all duration-500 transform translate-y-0 scale-100 ${chatOverlay[chatOverlay.length - 1].sender.includes('Doc')
                ? 'bg-blue-600/20 border-blue-400/30 text-white'
                : 'bg-black/40 border-white/10 text-slate-100'
                }`}
            >
              <div className="flex-shrink-0">
                {chatOverlay[chatOverlay.length - 1].sender.includes('Doc') ? (
                  <div className="relative">
                    <img src={personas[persona].img} className="w-8 h-8 sm:w-16 sm:h-16 rounded-xl sm:rounded-3xl object-cover border-2 border-blue-400 shadow-xl" alt="Doc" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 border border-white rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-8 h-8 sm:w-16 sm:h-16 rounded-xl sm:rounded-3xl bg-slate-800/80 flex items-center justify-center border-2 border-slate-600 shadow-xl">
                    <UserCircleIcon className="w-5 h-5 sm:w-8 sm:h-8 text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className={`text-[7px] sm:text-[10px] uppercase tracking-[0.2em] block mb-0 font-black ${chatOverlay[chatOverlay.length - 1].sender.includes('Doc') ? 'text-blue-300' : 'text-slate-400'}`}>
                  {chatOverlay[chatOverlay.length - 1].sender}
                </span>
                <p className="text-[10px] sm:text-[16px] font-bold leading-tight sm:leading-relaxed tracking-wide text-shadow-sm truncate sm:whitespace-normal">
                  {chatOverlay[chatOverlay.length - 1].text}
                </p>
              </div>
            </div>
          )}
        </div>


        {isActive && (
          <div className="absolute bottom-8 inset-x-0 flex items-end justify-center space-x-1 h-12 px-10">
            {visualizerData.map((val, i) => (
              <div
                key={i}
                className="bg-blue-400/80 rounded-full w-1 transition-all duration-75"
                style={{ height: `${val}%` }}
              ></div>
            ))}
          </div>
        )}

        {!isActive && !isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-30">
            <button
              onClick={startSession}
              className="glass-panel p-6 sm:p-14 rounded-[2rem] sm:rounded-[4rem] shadow-2xl text-center active:scale-95 transition-all w-full sm:w-auto hover-lift border-white/60"
            >
              <div className="w-12 h-12 sm:w-24 sm:h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-blue-500/40">
                <VideoCameraIcon className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
              </div>
              <h3 className="text-xl sm:text-4xl font-black text-slate-800 tracking-tight">
                <TranslatedText text={t.startCheckup} lang={user.preferredLanguage} />
              </h3>
              <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[8px] sm:text-[10px] mt-2 sm:mt-4">
                <TranslatedText text={t.medEchoLogo || "MedEcho AI Ready"} lang={user.preferredLanguage} />
              </p>
            </button>
          </div>
        )}


        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white p-6 text-center z-50">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-xs font-black uppercase mt-6 tracking-widest">
              <TranslatedText text={t.connecting} lang={user.preferredLanguage} />
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-lg text-white p-6 text-center z-50">
            <div className="w-16 h-16 border-[6px] border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-6"></div>
            <h4 className="text-xl font-black uppercase tracking-widest animate-pulse">
              <TranslatedText text={t.connecting} lang={user.preferredLanguage} /> Dr. {persona}...
            </h4>
            <p className="text-[10px] text-blue-200 mt-2 font-bold uppercase"><TranslatedText text={t.establishingLink} lang={user.preferredLanguage} /></p>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl text-white p-8 text-center z-[60]">
            <div className="w-20 h-20 border-8 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <h4 className="text-2xl font-black uppercase tracking-widest text-indigo-100 animate-pulse">
              <TranslatedText text={t.generatingReport} lang={user.preferredLanguage} />
            </h4>
            <p className="text-xs text-indigo-300 mt-3 font-bold uppercase tracking-widest">
              <TranslatedText text={t.analyzingSymptoms} lang={user.preferredLanguage} />
            </p>
          </div>
        )}
      </div>

      {isActive && (
        <button
          onClick={endSession}
          className="mt-10 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-black py-4 px-12 rounded-[2rem] flex items-center space-x-3 shadow-xl shadow-rose-500/20 active:scale-95 transition-all hover-lift"
        >
          <StopIcon className="w-6 h-6" />
          <span className="uppercase tracking-[0.2em] text-xs">
            <TranslatedText text={t.finishAndAnalyze} lang={user.preferredLanguage} />
          </span>
        </button>
      )}

      <div className="mt-8 max-w-2xl w-full bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start space-x-3">
        <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-[10px] font-bold text-blue-800 leading-tight uppercase">
          <TranslatedText text={t.clinicalEntitiesWarning} lang={user.preferredLanguage} />
        </p>
      </div>
    </div>
  );
};

export default VirtualDoctor;