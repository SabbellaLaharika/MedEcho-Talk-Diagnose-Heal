import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Appointment, MedicalReport, BlockedSlot, DaySchedule, TimeSlot, AppNotification } from './types';
import { dbService } from './services/dbService';
import { io } from 'socket.io-client';
import { API_URL } from './services/api';
import Sidebar from './components/Sidebar';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AppointmentBooking from './components/AppointmentBooking';
import ReportsList from './components/ReportsList';
import AIChatAssistant from './components/AIChatAssistant';
import VirtualDoctor from './components/VirtualDoctor';
import FloatingAIChat from './components/FloatingAIChat';
import DoctorScheduleManager from './components/DoctorScheduleManager';
import ProfilePage from './components/ProfilePage';
import RemindersPage from './components/RemindersPage';
import { getTranslation, loadTranslations, subscribeToTranslations, translateString } from './services/translations';
import TranslatedText from './components/TranslatedText';
import { alertService } from './services/alertService';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
import GlobalAlertModal from './components/GlobalAlertModal';
import VideoConsultation from './components/VideoConsultation';
import api from './services/api';
import {
  UserIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  ClockIcon,
  NoSymbolIcon,
  PlusIcon,
  TrashIcon,
  BoltIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
  BellIcon,
  CheckIcon,
  Bars3Icon,
  PhoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/solid';

const MED_ECHO_ICON = "/Logo.jpeg";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(dbService.auth.getCurrentSessionId());
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const t = getTranslation(user?.preferredLanguage);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Persistent Active Tab: Initialize from sessionStorage if exists
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('medecho_activeTab') || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('medecho_activeTab', tab);
    } catch (e) { }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [, setTick] = useState(0); // For forcing re-render on translation load
  const notifiedIdsRef = React.useRef<Set<string>>(new Set());
  const isFetchingRef = React.useRef(false);

  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD'>('LOGIN');
  const [authRole, setAuthRole] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');

  // Standard Jitsi configuration for seamless, moderator-free embedding
  const getJitsiConfig = (isVoice: boolean) => [
    `config.prejoinPageEnabled=false`,
    `config.enableLobby=false`,
    `config.requireDisplayName=false`,
    `config.startWithAudioMuted=false`,
    `config.startWithVideoMuted=${isVoice}`,
    `config.disableDeepLinking=true`,
    `config.enableNoisyMicDetection=false`,
    `config.p2p.enabled=true`,
    `config.disableModeratorIndicator=true`,
    `config.makeJsonStats=true`,
    `userInfo.displayName="${user ? encodeURIComponent(user.name) : 'Guest'}"`,
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
    'interfaceConfig.GENERATE_ROOMNAMES_ON_WELCOME_PAGE=false'
  ].join('&');

  const [formData, setFormData] = useState({ name: '', email: '', password: '', language: 'en', otp: '', newPassword: '' });
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [activeCallApt, setActiveCallApt] = useState<Appointment | null>(null);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [isCallVoiceOnly, setIsCallVoiceOnly] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{ apt: Appointment; isVoice: boolean } | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const activeCallAptRef = useRef<Appointment | null>(null);
  const incomingCallDataRef = useRef<{ apt: Appointment; isVoice: boolean } | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const participantCountRef = useRef(0);
  const audioUnlockedRef = useRef(false);

  // Audio Unlocker: Browsers block sound until user interacts. 
  // We play a brief silent sound to 'unlock' audio context for future ringtones.
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    console.log("[Audio] Attempting interaction unlock...");
    const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    silentAudio.play()
      .then(() => {
        audioUnlockedRef.current = true;
        console.log("[Audio] 🔓 Context unlocked for ringtones.");
      })
      .catch(() => {
        // Still blocked, will retry on next interaction
      });
  }, []);

  const generateReminders = useCallback((user: User, apts: Appointment[], reports: MedicalReport[]) => {
    // Disabled frontend-only reminder logic
  }, []);

  useEffect(() => {
    dbService.init();
    const currentUser = dbService.auth.getCurrentUser();

    // ─── Session Heartbeat ───
    const runHeartbeat = () => {
      import('./services/api').then(({ default: api }) => {
        const jitter = Math.random() * 20000;
        setTimeout(() => {
          api.get('/ml/ping').catch(() => { });
        }, jitter);
      });
    };

    let heartbeatInterval: any;
    if (currentUser) {
      setTimeout(runHeartbeat, 2000);
      heartbeatInterval = setInterval(runHeartbeat, 12 * 60 * 1000);
    }

    // ─── Emergency Purge ───
    try {
      if (localStorage.getItem('medecho_purge_v12_stable') !== 'true') {
        const keys = Object.keys(localStorage);
        const toDelete = keys.filter(k => k.startsWith('med_echo_'));
        if (toDelete.length > 0) {
          toDelete.forEach(k => localStorage.removeItem(k));
        }
        localStorage.setItem('medecho_purge_v12_stable', 'true');
      }
    } catch (e) {}

    // ─── Deep-Link Handler ───
    const params = new URLSearchParams(window.location.search);
    const goto = params.get('goto');
    const joinCall = params.get('joinCall');
    const resetEmail = params.get('resetEmail');
    const authModeParam = params.get('authMode');

    if (resetEmail || authModeParam === 'RESET_PASSWORD') {
      setAuthMode('RESET_PASSWORD');
      if (resetEmail) setFormData(prev => ({ ...prev, email: decodeURIComponent(resetEmail) }));
    } else if (currentUser) {
      if (goto === 'reports' || goto === 'appointments') {
        setActiveTab(goto);
      } else if (joinCall) {
        sessionStorage.setItem('medecho_pendingCall', joinCall);
        setActiveTab('dashboard');
      }
    } else if (goto || joinCall) {
      sessionStorage.setItem('medecho_deeplink', JSON.stringify({ goto, joinCall }));
    }

    if (params.toString()) window.history.replaceState({}, '', window.location.pathname);

    if (currentUser) {
      setUser(currentUser);
      loadTranslations(currentUser.preferredLanguage, 'common');
    } else {
      loadTranslations('en', 'common');
      const pendingReset = localStorage.getItem('medecho_pending_reset');
      if (pendingReset) {
        setAuthMode('RESET_PASSWORD');
        const { email } = JSON.parse(pendingReset);
        setFormData(prev => ({ ...prev, email }));
        localStorage.removeItem('medecho_pending_reset');
      }
    }
    setLoading(false);

    const unsubscribe = subscribeToTranslations(() => setTick(t => t + 1));
    return () => {
      unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadTranslations(user.preferredLanguage, 'common');
      loadTranslations(user.preferredLanguage, 'dashboard');

      const fetchData = async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
          const [apts, reps, notifs] = await Promise.all([
            dbService.appointments.getAll(),
            dbService.reports.getAll(),
            dbService.notifications.getAll()
          ]);

          notifs.forEach(n => {
            if (!n.isRead && !notifiedIdsRef.current.has(n.id)) {
              notificationService.notify(n.title, n.message);
              notifiedIdsRef.current.add(n.id);
            }
          });

          setNotifications(prev => {
            const combined = [...notifs, ...prev];
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
            return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          });

          if (user.role === 'DOCTOR') {
            setAppointments(apts.filter(a => a.doctorId === user.id));
            setReports(reps.filter(r => r.doctorId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          } else {
            setAppointments(apts.filter(a => a.patientId === user.id));
            setReports(reps.filter(r => r.patientId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          }
        } catch (e) {} finally {
          isFetchingRef.current = false;
        }
      };

      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    activeCallAptRef.current = activeCallApt;
  }, [activeCallApt]);

  useEffect(() => {
    incomingCallDataRef.current = incomingCallData;
  }, [incomingCallData]);

  useEffect(() => {
    participantCountRef.current = participantCount;
  }, [participantCount]);

  // ─── Real-time Socket for Push Notifications ──────────────────────────────
  useEffect(() => {
    if (!user) return;

    const socketUrl = API_URL.replace('/api', '');
    const s = io(socketUrl, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    setSocket(s);

    s.on('connect', () => {
      console.log(`[Socket] Connected: ${s.id}`);
      if (user.id && user.role) {
        s.emit('join', { userId: user.id, role: user.role, sessionId });
      }
    });

    s.on('session_update', (payload: { newSessionId: string }) => {
      if (sessionId && payload.newSessionId && payload.newSessionId !== sessionId) {
        handleLogout();
      }
    });

    s.on('consultation_presence', (payload: { appointmentId: string, count: number }) => {
      console.log(`[Socket] Consultation presence update:`, payload);
      if (activeCallAptRef.current?.id === payload.appointmentId) {
        setParticipantCount(payload.count);
      }
    });

    s.on('appointment_completed', (payload: { id: string, status: string }) => {
      console.log(`[Socket] ✅ Appointment finished/expired:`, payload.id, payload.status);
      setAppointments(prev => prev.map(a => 
        a.id === payload.id ? { ...a, status: (payload.status || 'COMPLETED') as any } : a
      ));
    });

    s.on('notification', (notif: AppNotification) => {
      console.log(`[Socket] 🔔 Notification received (User: ${user.name}, Role: ${user.role}):`, notif);
      
      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        notificationService.notify(notif.title as string, notif.message as string);
        return [{ ...notif, isRead: false }, ...prev];
      });

      if (notif.type === 'CALL') {
        console.log(`[Socket] 📞 Processing CALL notification. Current active call:`, activeCallAptRef.current?.id || 'none');
        
        if (!activeCallAptRef.current) {
          const notifTime = new Date(notif.timestamp).getTime();
          const now = Date.now();
          const drift = Math.abs(now - notifTime);
          
          console.log(`[Socket] ⏰ Time Check: Now=${now}, Notif=${notifTime}, Drift=${drift}ms`);

          // Allow a wider drift window (90 seconds) to account for client/server clock sync issues
          if (drift < 90000) {
            const aptId = notif.metadata?.appointmentId;
            if (aptId) {
              const incoming = { 
                apt: { 
                  id: aptId, 
                  patientId: notif.metadata.patientId,
                  doctorId: notif.metadata.doctorId,
                  doctorName: notif.metadata.doctorName || 'Specialist',
                  patientName: notif.metadata.patientName || 'Patient',
                  doctorSpecialization: notif.metadata.doctorSpecialization
                } as any,
                isVoice: notif.metadata?.callType === 'VOICE'
              };
              
              console.log(`[Socket] ✅ Setting Incoming Call Data:`, incoming);
              setIncomingCallData(incoming);
              
              try {
                if (!ringtoneRef.current) {
                  console.log(`[Socket] 🎵 Initializing ringtone...`);
                  ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
                  ringtoneRef.current.loop = true;
                }
                
                console.log(`[Socket] 🔊 Playing ringtone...`);
                ringtoneRef.current.play().catch(err => {
                  console.warn(`[Socket] 🔇 Auto-play blocked by browser. User interaction required.`, err);
                });
              } catch (e) {
                console.error(`[Socket] ❌ Audio playback error:`, e);
              }
            } else {
              console.error(`[Socket] ❌ No appointmentId in CALL metadata!`);
            }
          } else {
            console.warn(`[Socket] ⚠️ Ignoring stale call notification (Drift: ${drift}ms)`);
          }
        } else {
          console.log(`[Socket] ⏭️ Ignoring call notification because an active call is already in progress.`);
        }
      }

      if (notif.type === 'CALL_NUDGE' && activeCallAptRef.current) {
         alertService.info(notif.message as string);
      }
    });

    s.on('end_call', (data: { appointmentId?: string, callId?: string; reason?: string }) => {
      const id = data.callId || data.appointmentId;
      console.log(`[Socket] 🔴 Received end_call for ${id}. Reason: ${data.reason || 'none'}`);
      
      const wasActive = activeCallAptRef.current?.id === id;
      const wasIncoming = incomingCallDataRef.current?.apt.id === id;

      if (wasActive || wasIncoming) {
        setActiveCallApt(null);
        setIncomingCallData(null);
        
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }

        if (wasIncoming) {
          alertService.info("Call cancelled by the other person.");
        } else if (wasActive) {
          alertService.info("The consultation has ended.");
        }
      }
    });

    return () => { 
      console.log("[Socket] Cleaning up connection...");
      s.disconnect(); 
      setSocket(null);
    };
  }, [user, sessionId]);

  // Handle messages from Service Worker (Background Notifications)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'ACTION_ACCEPT_CALL') {
            const callData = event.data.payload;
            console.log("[SW Bridge] 📲 Accept call requested from notification:", callData);
            
            // If the tab just focused from a notification click, 
            // the state might need a moment to sync or we set it directly
            if (callData.appointmentId) {
                const incoming = {
                    apt: {
                        id: callData.appointmentId,
                        patientId: callData.patientId,
                        doctorId: callData.doctorId,
                        doctorName: callData.doctorName || 'Specialist',
                        patientName: callData.patientName || 'Patient',
                        doctorSpecialization: callData.doctorSpecialization
                    } as any,
                    isVoice: callData.callType === 'VOICE'
                };
                
                setIncomingCallData(incoming);
                // Immediately transition to active call
                setActiveCallApt(incoming.apt);
                if (ringtoneRef.current) {
                    ringtoneRef.current.pause();
                    ringtoneRef.current.currentTime = 0;
                }
            }
        }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  const handleGlobalCallEnd = useCallback(async (data: { notes: string; prescriptions: any[]; duration?: number }) => {
    const endedApt = activeCallAptRef.current;
    const duration = data.duration || 0;
    
    console.log(`[Call] Ending call for ${endedApt?.id}. Duration: ${duration}s. Participants: ${participantCountRef.current}`);
    
    setActiveCallApt(null);
    setIncomingCallData(null);
    
    if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
    }

    // Only generate a report and complete the appointment if it actually occurred
    // We consider it occurred if duration > 5s OR if the doctor specifically added notes/prescriptions
    const callOccurred = duration > 5 || data.notes?.trim() || data.prescriptions?.length > 0;

    if (user?.role === 'DOCTOR' && endedApt && callOccurred) {
        try {
            console.log(`[Call] Saving consultation report for completed session.`);
            await api.post('reports/consultation', {
                appointmentId: endedApt.id,
                notes: data.notes,
                prescriptions: data.prescriptions,
                patientId: endedApt.patientId,
                doctorId: user.id,
                timestamp: new Date().toISOString(),
                reportType: 'CONSULTATION'
            });
            
            if (socket) {
                socket.emit('end_call', { 
                    callId: endedApt.id,
                    from: user.id,
                    to: endedApt.patientId,
                    toRole: 'PATIENT'
                });
            }
            alertService.success(t.consultationSaved);
        } catch (err) {
            console.error('Failed to save consultation:', err);
            alertService.error(t.failedSaveConsultation);
        }
    } else if (endedApt) {
        console.log(`[Call] Session ended without meeting report requirements. No report generated.`);
        if (socket) {
          socket.emit('end_call', { 
              callId: endedApt.id,
              from: user.id,
              to: user.role === 'DOCTOR' ? endedApt.patientId : endedApt.doctorId,
              toRole: user.role === 'DOCTOR' ? 'PATIENT' : 'DOCTOR'
          });
        }
    }
  }, [user, socket, t.consultationSaved, t.failedSaveConsultation]);

  // ─── Push Notification Handshake ──────────────────────────────
  useEffect(() => {
    if (user) {
      // Register for system-level background push notifications
      // This ensures notifications arrive even if the app is closed
      const registerPush = async () => {
        try {
          // 1. Ensure Service Worker is ready
          if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.ready;
          }
          
          // 2. Subscribe to push service
          const success = await pushNotificationService.subscribeUser(user.id);
          if (success) {
            console.log(`[Push] Background notifications active for ${user.id}`);
          }
        } catch (err) {
          console.warn("[Push] Handshake failed", err);
        }
      };

      registerPush();
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'FORGOT_PASSWORD') {
        await dbService.auth.forgotPassword(formData.email);
        setAuthMode('RESET_PASSWORD');
        alertService.success(t.otpSent);
        setAuthLoading(false);
        return;
      } else if (authMode === 'RESET_PASSWORD') {
        await dbService.auth.resetPassword(formData.email, formData.otp, formData.newPassword);
        setAuthMode('LOGIN');
        alertService.success(t.passwordResetSuccess);
        setAuthLoading(false);
        return;
      }
      
      if (authMode === 'LOGIN') {
        const result = await dbService.auth.login(formData.email, formData.password);
        if (result.user.role !== authRole) throw new Error(`Role mismatch. Use ${result.user.role} portal.`);
        setSessionId(result.sessionId);
        setUser(result.user);
      } else {
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name,
          email: formData.email,
          role: authRole,
          preferredLanguage: formData.language,
          avatar: `https://picsum.photos/200?random=${Math.random()}`,
          isAvailable: true,
          daySchedules: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, slots: [{ startTime: '09:00', endTime: '17:00' }], isActive: i >= 1 && i <= 5 })),
          blockedSlots: []
        };
        const result = await dbService.auth.register(newUser, formData.password);
        setSessionId(result.sessionId);
        setUser(result.user);
      }

      setActiveTab('dashboard');
      unlockAudio(); // Unlock audio on successful login
    } catch (err: any) {
      alertService.error(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    pushNotificationService.unsubscribeUser().catch(console.error);
    dbService.auth.logout();
    setUser(null);
    setSessionId(null);
    setNotifications([]);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };


  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-gradient p-4 sm:p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/10 blur-[150px] rounded-full"></div>
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center z-10">
          <div className="hidden lg:flex flex-col space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl transform rotate-6">
                <span className="text-4xl font-black text-blue-600">ME</span>
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter">MedEcho</h1>
            </div>
            <p className="text-slate-400 text-2xl font-medium max-w-lg leading-relaxed">
              {t.precisionHealthDesc}
            </p>
          </div>

          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden w-full max-w-lg mx-auto">
            <div className="p-1 flex border-b bg-slate-50">
              <button
                onClick={() => setAuthRole('PATIENT')}
                className={`flex-1 py-5 flex flex-col items-center space-y-2 transition-all ${authRole === 'PATIENT' ? 'bg-white border-b-4 border-blue-600' : 'opacity-40 hover:opacity-100'}`}
              >
                <UserIcon className={`w-6 h-6 ${authRole === 'PATIENT' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {t.patientPortal}
                </span>
              </button>
              <button
                onClick={() => setAuthRole('DOCTOR')}
                className={`flex-1 py-5 flex flex-col items-center space-y-2 transition-all ${authRole === 'DOCTOR' ? 'bg-white border-b-4 border-indigo-600' : 'opacity-40 hover:opacity-100'}`}
              >
                <BriefcaseIcon className={`w-6 h-6 ${authRole === 'DOCTOR' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {t.clinicalStaff}
                </span>
              </button>
            </div>

            <div className="p-8 sm:p-14 space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                  {authMode === 'LOGIN' ? t.secureAccess : authMode === 'FORGOT_PASSWORD' ? t.forgotPassword : authMode === 'RESET_PASSWORD' ? t.resetPassword : t.createCredentials}
                </h2>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'REGISTER' && (
                  <>
                    <input required type="text" placeholder={t.legalFullName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold appearance-none text-slate-500" value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}>
                      <option value="en">{t.english} ({t.original})</option>
                      <option value="hi">{t.hindiLL}</option>
                      <option value="te">{t.teluguLL}</option>
                      <option value="ta">{t.tamilLL}</option>
                      <option value="mr">{t.marathiLL}</option>
                      <option value="bn">{t.bengaliLL}</option>
                      <option value="kn">{t.kannadaLL}</option>
                      <option value="ml">{t.malayalamLL}</option>
                      <option value="gu">{t.gujaratiLL}</option>
                      <option value="pa">{t.punjabiLL}</option>
                    </select>
                  </>
                )}

                {authMode !== 'RESET_PASSWORD' && (
                  <input
                    required
                    type={authMode === 'LOGIN' ? "text" : "email"}
                    placeholder={authMode === 'LOGIN' ? (t.loginId || 'Email or User ID') : (t.primaryEmail || 'Primary Email Address')}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                )}

                {(authMode === 'LOGIN' || authMode === 'REGISTER') && (
                  <input required type="password" placeholder={t.changePassword} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                )}

                {authMode === 'RESET_PASSWORD' && (
                  <>
                    <input required type="text" placeholder={t.enterOtp} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold tracking-[0.5em] text-center" value={formData.otp} onChange={(e) => setFormData({ ...formData, otp: e.target.value })} />
                    <input required type="password" placeholder={t.enterNewPassword} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} />
                  </>
                )}

                {(authMode === 'LOGIN') && (
                  <div className="flex justify-end w-full">
                    <button type="button" onClick={() => setAuthMode('FORGOT_PASSWORD')} className="text-blue-600 text-[10px] font-bold uppercase tracking-widest hover:underline">{t.forgotPassword}?</button>
                  </div>
                )}

                <button type="submit" disabled={authLoading} className={`w-full py-5 rounded-2xl text-white font-black uppercase text-xs shadow-xl tracking-widest ${authRole === 'PATIENT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {authLoading ? <TranslatedText text={t.verifying} lang={formData.language} /> : (authMode === 'LOGIN' ? <TranslatedText text={t.signIn} lang={formData.language} /> : authMode === 'FORGOT_PASSWORD' ? <TranslatedText text={t.sendOtp} lang={formData.language} /> : authMode === 'RESET_PASSWORD' ? <TranslatedText text={t.resetPassword} lang={formData.language} /> : <TranslatedText text={t.register} lang={formData.language} />)}
                </button>
              </form>

              <button type="button" onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600">
                <TranslatedText text={authMode === 'LOGIN' ? t.joinMedEcho : t.alreadyHaveAccess} lang={formData.language} />
              </button>
            </div>
          </div>
        </div>

        <GlobalAlertModal fallbackLang={formData.language} />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-inter relative">
      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Responsive Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-all duration-300 ease-in-out z-[60] lg:z-30 h-full ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-[300px]'}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          role={user.role}
          user={user}
          onClose={() => setIsSidebarOpen(false)}
          canInstall={!!installPrompt}
          onInstall={handleInstallApp}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col h-full bg-slate-50/50">
        {/* Responsive Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 sm:px-10 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-slate-800">
              {
                activeTab === 'dashboard' ? (user.role === 'DOCTOR' ? t.overview : t.dashboard) || 'Dashboard' :
                  activeTab === 'appointments' ? (t.bookVisit || 'Book Visit') :
                    activeTab === 'schedule' ? (t.mySchedule || 'My Schedule') :
                      activeTab === 'reports' ? (user.role === 'DOCTOR' ? t.records : t.medicalFiles) || 'Medical Files' :
                        activeTab === 'chat' ? (user.role === 'DOCTOR' ? t.aiResearch : t.chatSupport) || 'Chat Support' :
                          activeTab === 'virtual-doc' ? (t.virtualDoctor || 'Virtual Doctor') :
                            activeTab === 'profile' ? (t.myProfile || 'My Profile') :
                          activeTab === 'reminders' ? (t.medicalRemindersHeader || 'Medical Reminders') : activeTab.replace('-', ' ')
              }
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-3 rounded-2xl transition-all relative ${showNotifications ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 z-[100] overflow-hidden text-left flex flex-col max-h-[80vh]">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">
                      <TranslatedText text={t.notifications} lang={user.preferredLanguage} />
                    </h3>
                    <div className="flex items-center space-x-3">
                      {notifications.some(n => !n.isRead) && (
                        <button
                          onClick={async () => {
                            await dbService.notifications.markAllAsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          }}
                          className="text-[10px] uppercase font-bold text-blue-600 hover:underline"
                        >
                          <TranslatedText text={t.markAllRead} lang={user.preferredLanguage} />
                        </button>
                      )}
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <TranslatedText text={t.noNotifications} lang={user.preferredLanguage} />
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-50">
                        {notifications.map((n, i) => (
                          <li key={i} className={`p-4 transition-colors ${n.isRead ? 'bg-white opacity-70' : 'bg-blue-50 border-l-4 border-blue-600'}`}>
                            <div className="flex justify-between items-start mb-1">
                              <p className={`text-xs font-bold ${n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                                {typeof n.title === 'string' ? <TranslatedText text={n.title} lang={user.preferredLanguage} /> : n.title}
                              </p>
                              <span className="text-[10px] text-slate-400 font-bold ml-2 shrink-0">{new Date(n.timestamp || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <p className={`text-xs leading-relaxed ${n.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                              {typeof n.message === 'string' ? <TranslatedText text={n.message} lang={user.preferredLanguage} /> : n.message}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex items-center space-x-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all active:scale-95"
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=f1f5f9&color=64748b`}
                className="w-8 h-8 rounded-xl object-cover"
                alt={user.name}
              />
              <span className="text-[10px] font-black uppercase text-slate-700 truncate max-w-[100px]">
                <TranslatedText text={user.name} lang={user.preferredLanguage} />
              </span>
            </button>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative custom-scrollbar flex flex-col">
          {activeCallApt && participantCount < 2 && (
            <div className="bg-indigo-600 px-4 py-2 flex items-center justify-between text-white animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Live Session Active: Waiting for participant...
                </span>
              </div>
              <button 
                onClick={() => {
                  // Re-trigger the modal if it was closed
                  // This is a placeholder since the modal is always rendered if activeCallApt is set
                }}
                className="text-[9px] font-bold underline uppercase tracking-tighter"
              >
                Focus Session
              </button>
            </div>
          )}
          {activeTab === 'dashboard' && (
            user.role === 'DOCTOR'
              ? <DoctorDashboard
                doctor={user}
                appointments={appointments}
                reports={reports}
                notifications={notifications}
                socket={socket}
                activeCallApt={activeCallApt}
                setActiveCallApt={setActiveCallApt}
                setIsCallInitiator={setIsCallInitiator}
                setIsCallVoiceOnly={setIsCallVoiceOnly}
                onUpdateUser={async (u) => {
                  try {
                    const updated = await dbService.auth.updateUser(u);
                    setUser(updated);
                  } catch (e) {
                    console.error("Failed to update user:", e);
                  }
                }}
                onUpdateAppointment={async (u) => {
                  try {
                    const updated = await dbService.appointments.update(u);
                    setAppointments(p => p.map(a => a.id === updated.id ? updated : a));
                  } catch (e) {
                    console.error("Failed to update appointment:", e);
                  }
                }}
                onDeleteAppointment={async (id) => {
                  try {
                    const updated = await dbService.appointments.delete(id);
                    setAppointments(p => p.filter(a => a.id !== id));
                  } catch (e) {
                    console.error("Failed to delete appointment:", e);
                  }
                }}
              />
              : <PatientDashboard
                user={user}
                appointments={appointments}
                reports={reports}
                notifications={notifications}
                socket={socket}
                activeCallApt={activeCallApt}
                setActiveCallApt={setActiveCallApt}
                setIsCallInitiator={setIsCallInitiator}
                setIsCallVoiceOnly={setIsCallVoiceOnly}
                onUpdateUser={(u) => setUser(u)}
              />
          )}
          {activeTab === 'appointments' && <AppointmentBooking
            user={user}
            preselectedDoctorId={preselectedDoctorId}
            onBook={async (apt) => {
              const newApt = { ...apt, patientId: user.id, patientName: user.name, status: 'PENDING', doctorContact: apt.doctorContact || '' } as Appointment;
              try {
                const saved = await dbService.appointments.create(newApt);
                setAppointments(prev => [saved, ...prev]);
                return true; // Success
              } catch (e: any) {
                console.error("Booking failed:", e);
                const msg = e?.response?.data?.message === 'EX_APT' 
                  ? t.alreadyHasApt || 'You already have an active appointment.'
                  : (e?.response?.data?.message || e.message || "There was an issue booking this appointment.");
                alertService.error(msg);
                return false; // Failed
              }
            }}
            onBookingComplete={() => {
              setActiveTab('dashboard');
              setPreselectedDoctorId(null);
            }}
          />}
          {activeTab === 'schedule' && <DoctorScheduleManager doctor={user} />}
          {activeTab === 'reports' && <ReportsList
            reports={reports}
            user={user}
            appointments={appointments}
            onDeleteReport={(id) => setReports(prev => prev.filter(r => r.id !== id))}
          />}
          {activeTab === 'chat' && <AIChatAssistant
            onReportGenerated={(report) => setReports(prev => [report, ...prev])}
            onConsultDoctor={(doctorId) => {
              setPreselectedDoctorId(doctorId);
              setActiveTab('appointments');
            }}
          />}
          {activeTab === 'virtual-doc' && <VirtualDoctor patientId={user.id} user={user} onSessionComplete={async (r) => {
            try {
              // Snapshot the user's current vitals at report-generation time
              const reportWithVitals = {
                ...r,
                vitals: {
                  bp: user.vitalBp || undefined,
                  weight: user.vitalWeight || undefined,
                  glucose: user.vitalGlucose || undefined,
                  temperature: user.vitalTemperature || undefined,
                }
              };
              const saved = await dbService.reports.create(reportWithVitals);
              setReports(prev => [saved, ...prev]);
              setActiveTab('reports');
            } catch (e) {
              console.error("Saving report failed:", e);
            }
          }} />}
          {activeTab === 'profile' && <ProfilePage user={user} onUpdate={async (u) => {
            try {
              const updated = await dbService.auth.updateUser(u);
              setUser(updated);
            } catch (e) {
              console.error("Failed to update user:", e);
              throw e;
            }
          }} />}
          {activeTab === 'reminders' && user && <RemindersPage user={user} />}
        </div>

        {(activeTab !== 'chat' && activeTab !== 'virtual-doc') && (
          <FloatingAIChat onReportGenerated={(report) => setReports(prev => [report, ...prev])} />
        )}
        <GlobalAlertModal fallbackLang={user.preferredLanguage || 'en'} />

        {/* Incoming Call Overlay */}
        {incomingCallData && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-8 flex flex-col items-center text-center space-y-6 border border-white/20">
              <div className="relative">
                <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-xl animate-bounce">
                  {incomingCallData.isVoice ? <PhoneIcon className="w-10 h-10 text-white" /> : <VideoCameraIcon className="w-10 h-10 text-white" />}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white animate-pulse"></div>
              </div>
              
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{t.incomingConsultation}</p>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  <TranslatedText 
                    text={user.role === 'DOCTOR' 
                      ? (incomingCallData.apt.patientName || (incomingCallData.apt as any).fromName || t.patient)
                      : (incomingCallData.apt.doctorName || (incomingCallData.apt as any).fromName || t.doctor)
                    } 
                    lang={user.preferredLanguage}
                  />
                </h3>
                {user.role === 'PATIENT' && incomingCallData.apt.doctorSpecialization && (
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                    <TranslatedText text={incomingCallData.apt.doctorSpecialization} lang={user.preferredLanguage} />
                  </p>
                )}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {incomingCallData.isVoice ? t.voiceCall : t.videoCall}
                </p>
              </div>

              <div className="flex gap-4 w-full pt-4">
                <button 
                  onClick={() => {
                    if (socket && incomingCallData) {
                      socket.emit('decline_call', {
                        callId: incomingCallData.apt.id,
                        from: user.id,
                        to: user.role === 'DOCTOR' ? incomingCallData.apt.patientId : incomingCallData.apt.doctorId,
                        toRole: user.role === 'DOCTOR' ? 'PATIENT' : 'DOCTOR'
                      });
                    }
                    setIncomingCallData(null);
                    if (ringtoneRef.current) {
                      ringtoneRef.current.pause();
                      ringtoneRef.current.currentTime = 0;
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-100 transition-all border border-slate-100"
                >
                  {t.decline}
                </button>
                <button 
                  onClick={() => {
                    setIsCallInitiator(false); // Answering, so NOT the initiator
                    setIsCallVoiceOnly(incomingCallData.isVoice);
                    setActiveCallApt(incomingCallData.apt);
                    setIncomingCallData(null);
                    if (ringtoneRef.current) {
                      ringtoneRef.current.pause();
                      ringtoneRef.current.currentTime = 0;
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                >
                  {t.answer}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeCallApt && user && (
          <div className="fixed inset-0 z-[1600] bg-white animate-in slide-in-from-bottom duration-500">
            <VideoConsultation
              appointment={activeCallApt}
              user={user}
              onEnd={handleGlobalCallEnd}
              isInitiator={isCallInitiator}
              isVoiceOnly={isCallVoiceOnly}
              socket={socket}
              participantCount={participantCount}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
