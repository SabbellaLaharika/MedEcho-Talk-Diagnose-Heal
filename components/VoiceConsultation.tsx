import React, { useState, useEffect, useRef } from 'react';
import { User, Appointment, AppNotification } from '../types';
import TranslatedText from './TranslatedText';
import { 
  PhoneIcon, 
  XMarkIcon, 
  MicrophoneIcon, 
  NoSymbolIcon,
  SignalIcon,
  PhoneArrowUpRightIcon
} from '@heroicons/react/24/solid';

interface VoiceConsultationProps {
  user: User;
  appointment: Appointment;
  onClose: (transcript?: string) => void;
  isInitiator: boolean;
}

const VoiceConsultation: React.FC<VoiceConsultationProps> = ({ user, appointment, onClose, isInitiator }) => {
  const [status, setStatus] = useState<'CONNECTING' | 'IN_CALL' | 'FAILED' | 'DISCONNECTED'>('CONNECTING');
  const [hasStarted, setHasStarted] = useState(isInitiator);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  
  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const dataConnRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // peerID: MedEcho-[Role]-[ID]
  const myPeerId = `MedEcho-${user.role}-${user.id}`;
  const targetPeerId = `MedEcho-${user.role === 'PATIENT' ? 'DOCTOR' : 'PATIENT'}-${user.role === 'PATIENT' ? appointment.doctorId : appointment.patientId}`;

  useEffect(() => {
    const Peer = (window as any).Peer;
    if (!Peer) {
      setStatus('FAILED');
      return;
    }

    // Initialize Peer
    peerRef.current = new Peer(myPeerId, {
      config: {
        'iceServers': [
          { 'urls': 'stun:stun.l.google.com:19302' },
          { 'urls': 'stun:stun1.l.google.com:19302' },
          { 'urls': 'stun:stun2.l.google.com:19302' },
        ]
      }
    });

    peerRef.current.on('open', (id: string) => {
      if (isInitiator) {
         startTheCall();
      }
    });

    // Handle Incoming Calls
    peerRef.current.on('call', async (incomingCall: any) => {
      callRef.current = incomingCall;
      if (hasStarted) {
         await handleAnswer();
      }
    });

    // Handle Incoming Data (Transcript)
    peerRef.current.on('connection', (conn: any) => {
      dataConnRef.current = conn;
      conn.on('data', (data: string) => {
        setTranscript(prev => prev + '\n' + data);
      });
    });

    peerRef.current.on('error', (err: any) => {
      console.error('PeerJS error:', err);
      if (err.type !== 'peer-unavailable') setStatus('FAILED');
    });

    // Speech Recognition Setup
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1][0].transcript;
        const speaker = user.role === 'DOCTOR' ? 'Doctor: ' : 'Patient: ';
        const entry = `${speaker}${result}`;
        setTranscript(prev => prev + '\n' + entry);
        
        if (dataConnRef.current?.open) {
          dataConnRef.current.send(entry);
        }
      };
    }

    return () => {
      destroyCall();
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === 'IN_CALL') {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
      try {
        recognitionRef.current?.start();
      } catch (e) { }
    }
    return () => clearInterval(interval);
  }, [status]);

  const startTheCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      
      const call = peerRef.current.call(targetPeerId, stream);
      if (call) setupCall(call);

      const conn = peerRef.current.connect(targetPeerId);
      dataConnRef.current = conn;
      conn.on('data', (data: string) => {
        setTranscript(prev => prev + '\n' + data);
      });

    } catch (err) {
      console.error('Failed to start call', err);
      setStatus('FAILED');
    }
  };

  const handleAnswer = async () => {
    setHasStarted(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      if (callRef.current) {
         callRef.current.answer(stream);
         setupCall(callRef.current);
      }
    } catch (err) {
      console.error('Failed to answer', err);
      setStatus('FAILED');
    }
  };

  const setupCall = (call: any) => {
    callRef.current = call;
    call.on('stream', (remoteStream: MediaStream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      setStatus('IN_CALL');
    });

    call.on('close', () => {
      setStatus('DISCONNECTED');
      onClose(transcript);
    });
    
    call.on('error', () => setStatus('FAILED'));
  };

  const destroyCall = () => {
    recognitionRef.current?.stop();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    callRef.current?.close();
    peerRef.current?.destroy();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks()[0].enabled = isMuted;
      if (!isMuted) recognitionRef.current?.stop();
      else recognitionRef.current?.start();
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-white/20">
        
        {status === 'IN_CALL' && (
           <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500/10 flex items-center justify-center gap-1">
             {[...Array(20)].map((_, i) => (
                <div key={i} className="w-1 bg-indigo-400/50 rounded-full animate-pulse" style={{ height: `${Math.random()*40 + 20}%`, animationDelay: `${i*100}ms` }} />
             ))}
           </div>
        )}

        <div className="p-10 flex flex-col items-center text-center">
          <div className="relative mb-10">
            <div className={`w-32 h-32 rounded-[3.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700 ${status === 'IN_CALL' ? 'bg-indigo-600 scale-110 ring-8 ring-indigo-50' : 'bg-slate-200'}`}>
               <PhoneIcon className={`w-14 h-14 ${status === 'IN_CALL' ? 'animate-none' : 'text-slate-400 animate-pulse'}`} />
            </div>
            {status === 'IN_CALL' && (
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-2xl border-4 border-white">
                <SignalIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
            {user.role === 'PATIENT' ? (appointment.doctor?.name || appointment.doctorName) : (appointment.patient?.name || appointment.patientName)}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">
             MedEcho Encrypted Consultation
          </p>

          <div className="mt-10 flex flex-col items-center w-full">
            {status === 'CONNECTING' && !hasStarted && (
               <div className="flex flex-col items-center gap-8 w-full">
                 <div>
                    <p className="text-indigo-600 font-black text-xs tracking-widest uppercase animate-pulse mb-2">Incoming Call...</p>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                       Secure P2P Line Requested
                    </span>
                 </div>
                 
                 <div className="flex gap-4 w-full">
                    <button 
                       onClick={onClose as any}
                       className="flex-1 py-5 bg-rose-50 text-rose-600 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                    >
                       Decline
                    </button>
                    <button 
                       onClick={handleAnswer}
                       className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                    >
                       Accept & Join
                    </button>
                 </div>
               </div>
            )}

            {status === 'CONNECTING' && hasStarted && (
               <div className="flex flex-col items-center gap-3">
                 <p className="text-indigo-600 font-bold text-sm tracking-widest animate-pulse">
                    {isInitiator ? "SIGNALING PEER..." : "INITIALIZING STREAM..."}
                 </p>
               </div>
            )}

            {status === 'IN_CALL' && (
              <div className="text-5xl font-black text-slate-800 tabular-nums tracking-tighter">
                {formatTime(callDuration)}
              </div>
            )}

            {status === 'FAILED' && (
              <p className="text-rose-600 font-black text-xs uppercase tracking-widest bg-rose-50 px-8 py-3 rounded-full border border-rose-100">
                Network Bridge Failed
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-50/50 p-10 flex items-center justify-center gap-6 border-t border-slate-100">
          <button
            onClick={toggleMute}
            disabled={status !== 'IN_CALL'}
            className={`p-6 rounded-[2.5rem] shadow-lg transition-all active:scale-95 disabled:opacity-20 ${isMuted ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'}`}
          >
            {isMuted ? <NoSymbolIcon className="w-7 h-7" /> : <MicrophoneIcon className="w-7 h-7" />}
          </button>
          
          <button
            onClick={onClose as any}
            className="p-8 bg-rose-500 text-white rounded-[2.5rem] shadow-xl shadow-rose-200 hover:bg-rose-600 active:scale-90 transition-all flex items-center justify-center border-4 border-white"
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
        </div>

        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default VoiceConsultation;
