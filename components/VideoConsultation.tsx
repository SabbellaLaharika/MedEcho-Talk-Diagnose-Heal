import React, { useState, useEffect } from 'react';
import { User, Appointment } from '../types';
import { 
  XMarkIcon, 
  BoltIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/solid';

interface VideoConsultationProps {
  user: User;
  appointment: Appointment;
  onClose: (transcript?: string) => void;
  isInitiator: boolean;
  isVoiceOnly?: boolean;
}

const VideoConsultation: React.FC<VideoConsultationProps> = ({ user, appointment, onClose, isVoiceOnly = false }) => {
  const [notes, setNotes] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  
  const jitsiRoomName = `MedEcho-Apt-${appointment.id.replace(/-/g, '')}`;
  const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}#config.prejoinPageEnabled=false&userInfo.displayName="${encodeURIComponent(user.name)}"&config.startWithAudioMuted=false&config.startWithVideoMuted=${isVoiceOnly}&config.disableDeepLinking=true`;

  useEffect(() => {
    const interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[1000] flex flex-col items-center justify-center p-0 sm:p-6 font-inter overflow-hidden">
      <div className="w-full h-full max-w-7xl bg-slate-800 md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border-4 border-slate-700/50">
        
        {/* Main Video Area (Jitsi) */}
        <div className="flex-1 relative bg-black flex flex-col min-h-0">
          <div className="flex-1">
            <iframe
              src={jitsiUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write; self-same-origin"
              className="w-full h-full border-none"
              title="Secure Video Consultation"
            />
          </div>

          {/* Controls Bar Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-6 z-50">
             <div className="px-6 py-3 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 flex items-center space-x-3 shadow-2xl">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
                <span className="text-white text-sm font-black tracking-widest tabular-nums uppercase">{formatTime(callDuration)}</span>
             </div>

             <button
               onClick={() => onClose(notes)}
               className="w-16 h-16 bg-rose-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-rose-900/40 hover:bg-rose-600 transition-all border-4 border-slate-800 group relative"
               title="End Consultation"
             >
               <XMarkIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
               <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest shadow-xl pointer-events-none">
                 Complete Visit
               </span>
             </button>
          </div>
        </div>

        {/* Clinical Scribe Sidebar (Manual for Doctors) */}
        {user.role === 'DOCTOR' && (
          <div className="w-full lg:w-[400px] bg-slate-900 flex flex-col border-l border-slate-700/50 shrink-0">
            <div className="p-8 border-b border-slate-800 bg-slate-900/50">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center space-x-3">
                   <div className="p-2 bg-blue-500/20 rounded-xl">
                     <BoltIcon className="w-4 h-4 text-blue-400" />
                   </div>
                   <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Clinical AI Scribe</h2>
                 </div>
                 <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700">
                   <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Manual</span>
                 </div>
               </div>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Describe symptoms & diagnosis below</p>
            </div>

            <div className="flex-1 p-8 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
               <div className="flex-1 flex flex-col min-h-[300px]">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <ClockIcon className="w-3 h-3" />
                   Observation & Assessment Notes
                 </label>
                 <textarea
                   className="flex-1 bg-slate-800/40 border-2 border-slate-800 rounded-3xl p-6 text-slate-200 text-sm font-medium outline-none focus:border-blue-500/40 focus:bg-slate-800/60 transition-all resize-none custom-scrollbar leading-relaxed"
                   placeholder="Patient reports headache and fatigue... Possible dehydration. Recommend rest and hydration..."
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                 />
               </div>
               
               <div className="p-6 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 space-y-3">
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Next Step</h4>
                 <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                   When you finish the call, your notes will be processed to create a structured clinical report.
                 </p>
               </div>
            </div>
            
            <div className="p-8 bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
               <button 
                 onClick={() => onClose(notes)}
                 className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98]"
               >
                 Verify & Submit Report
               </button>
            </div>
          </div>
        )}

        {/* Patient View Sidebar */}
        {user.role === 'PATIENT' && (
           <div className="w-full lg:w-[350px] bg-slate-900 p-8 flex flex-col border-l border-slate-700/50 shrink-0">
              <div className="flex flex-col items-center text-center space-y-8 pt-12">
                 <div className="w-28 h-28 bg-indigo-500/10 rounded-[3rem] flex items-center justify-center border-2 border-indigo-500/20 shadow-2xl">
                    <UserIcon className="w-12 h-12 text-indigo-400" />
                 </div>
                 <div className="space-y-2">
                    <h3 className="text-white font-black text-xl tracking-tight">Dr. {appointment.doctor?.name}</h3>
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] font-black">{appointment.doctor?.specialization}</p>
                 </div>
              </div>
              
              <div className="mt-16 space-y-6">
                 <div className="p-8 bg-slate-800/30 rounded-[2.5rem] border border-slate-700/40 text-center">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4">Encryption Status</p>
                    <div className="flex items-center justify-center space-x-3">
                       <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                       <span className="text-slate-200 text-xs font-black uppercase tracking-widest">Secure Link Active</span>
                    </div>
                 </div>
                 
                 <div className="bg-slate-50/5 p-8 rounded-[2.5rem] mt-10">
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest text-center leading-loose">
                       Your medical notes are encrypted and privacy-guaranteed by MedEcho protocols.
                    </p>
                 </div>
              </div>
              
              <div className="mt-auto pb-6 text-center">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">MedEcho Secure Connect</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default VideoConsultation;
