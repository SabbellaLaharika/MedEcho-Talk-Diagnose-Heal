import React, { useState, useEffect, useRef } from 'react';
import { User, Appointment } from '../types';
import TranslatedText from './TranslatedText';
import { 
  PhoneIcon, 
  XMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon,
  VideoCameraSlashIcon,
  NoSymbolIcon,
  SignalIcon,
  PhoneArrowUpRightIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/solid';

interface VideoConsultationProps {
  user: User;
  appointment: Appointment;
  onClose: (transcript?: string) => void;
  isInitiator: boolean;
  isVoiceOnly?: boolean;
}

const VideoConsultation: React.FC<VideoConsultationProps> = ({ user, appointment, onClose, isInitiator, isVoiceOnly = false }) => {
  const [status, setStatus] = useState<'CONNECTING' | 'IN_CALL' | 'FAILED' | 'DISCONNECTED'>('CONNECTING');
  const [hasStarted, setHasStarted] = useState(isInitiator);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  
  const peerRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const dataConnRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoiceOnly });
      localStreamRef.current = stream;
      if (localVideoRef.current && !isVoiceOnly) localVideoRef.current.srcObject = stream;
      
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !isVoiceOnly });
      localStreamRef.current = stream;
      if (localVideoRef.current && !isVoiceOnly) localVideoRef.current.srcObject = stream;
      
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
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
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted;
      if (!isMuted) recognitionRef.current?.stop();
      else recognitionRef.current?.start();
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900 flex items-center justify-center p-0 md:p-6 overflow-hidden">
      <div className="bg-slate-800 w-full h-full md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Main Remote Video Area */}
        <div className="relative flex-1 bg-black group">
          {status === 'IN_CALL' ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-8">
              <div className="w-32 h-32 rounded-[3.5rem] bg-indigo-600/20 flex items-center justify-center border-4 border-indigo-500/30 animate-pulse">
                 <PhoneIcon className="w-14 h-14 text-indigo-400" />
              </div>
              <div className="text-center">
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                   {user.role === 'PATIENT' ? (appointment.doctor?.name || appointment.doctorName) : (appointment.patient?.name || appointment.patientName)}
                 </h2>
                 <p className="text-indigo-400 font-bold text-[10px] tracking-[0.3em] uppercase mt-2">
                   Initializing SECURE TUNNEL...
                 </p>
              </div>
            </div>
          )}

          {/* Local PIP Video */}
          {!isVoiceOnly && (
            <div className="absolute top-6 right-6 w-32 h-40 md:w-48 md:h-64 bg-slate-900 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl z-20">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <VideoCameraSlashIcon className="w-8 h-8 text-slate-500" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg">
                 <p className="text-[8px] font-black text-white uppercase tracking-widest">You</p>
              </div>
            </div>
          )}

          {/* Bottom Bar Controls Overlay */}
          <div className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-6 z-30 pointer-events-none">
             {status === 'IN_CALL' && (
               <div className="bg-black/60 backdrop-blur-2xl px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/10">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-white font-black tabular-nums text-sm">{formatTime(callDuration)}</span>
               </div>
             )}

             <div className="flex items-center justify-center gap-4 pointer-events-auto">
               <button
                  onClick={toggleMute}
                  disabled={status !== 'IN_CALL'}
                  className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 border border-white/10'}`}
               >
                  {isMuted ? <NoSymbolIcon className="w-7 h-7" /> : <MicrophoneIcon className="w-7 h-7" />}
               </button>

               {!isVoiceOnly && (
                 <button
                    onClick={toggleVideo}
                    disabled={status !== 'IN_CALL'}
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all ${isVideoOff ? 'bg-rose-500 text-white' : 'bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 border border-white/10'}`}
                 >
                    {isVideoOff ? <VideoCameraSlashIcon className="w-7 h-7" /> : <VideoCameraIcon className="w-7 h-7" />}
                 </button>
               )}

               <button
                  onClick={onClose as any}
                  className="w-20 h-20 bg-rose-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-rose-900/40 hover:bg-rose-600 transition-all border-4 border-slate-800"
               >
                  <XMarkIcon className="w-8 h-8" />
               </button>
             </div>
          </div>

          {/* Incoming Call Layout Overlay */}
          {status === 'CONNECTING' && !hasStarted && (
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100]">
                <div className="bg-white p-12 rounded-[4rem] text-center max-w-sm w-full shadow-2xl">
                   <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200">
                      <PhoneIcon className="w-12 h-12 text-white animate-pulse" />
                   </div>
                   <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{isVoiceOnly ? 'Incoming Voice' : 'Incoming Video'}</h2>
                   <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mt-2 mb-10">Secure Clinical Handshake</p>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={onClose as any}
                        className="py-5 bg-slate-50 text-slate-500 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={handleAnswer}
                        className="py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                      >
                        Join Call
                      </button>
                   </div>
                </div>
             </div>
          )}
        </div>

        {/* Sidebar Transcript Panel (Visible on Desktop) */}
        <div className="hidden lg:flex w-96 bg-white border-l border-white/10 flex-col">
           <div className="p-8 border-b border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Scribe</h4>
              <h2 className="text-xl font-black text-slate-800 tracking-tighter mt-1">Live Transcription</h2>
           </div>
           <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-4">
              {transcript.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className={`p-4 rounded-2xl ${line.startsWith('Doctor:') ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                   <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">
                      {line.includes(':') ? line.split(':')[0] : 'Note'}
                   </p>
                   <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      {line.includes(':') ? line.split(':')[1] : line}
                   </p>
                </div>
              ))}
              {transcript.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                   <SignalIcon className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">Waiting for clinical audio signal...</p>
                </div>
              )}
           </div>
           <div className="p-8 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">STT Scribe Active</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default VideoConsultation;
