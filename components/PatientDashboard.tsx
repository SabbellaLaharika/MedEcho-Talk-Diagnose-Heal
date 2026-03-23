import React, { useState, useEffect } from 'react';
import { User, Appointment, MedicalReport, AppNotification } from '../types';
import HospitalLocator from './HospitalLocator';
import ReportDetailModal from './ReportDetailModal';
import api from '../services/api';
import { getTranslation } from '../services/translations';
import TranslatedText from './TranslatedText';
import {
  HeartIcon,
  ScaleIcon,
  FireIcon,
  UserCircleIcon,
  VideoCameraIcon,
  PhoneIcon,
  XMarkIcon,
  ArrowRightCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  BeakerIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import VoiceConsultation from './VoiceConsultation';


interface PatientDashboardProps {
  user: User;
  appointments: Appointment[];
  reports: MedicalReport[];
  notifications: AppNotification[];
  onUpdateUser?: (u: User) => void;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, appointments, reports, notifications, onUpdateUser }) => {
  const t = getTranslation(user.preferredLanguage);
  const [viewingReport, setViewingReport] = useState<MedicalReport | null>(null);
  const [sendingReportsId, setSendingReportsId] = useState<string | null>(null);
  const [localSentDoctorId, setLocalSentDoctorId] = useState<string | null>(null);
  const [sendReportsMessage, setSendReportsMessage] = useState<string>('');
  const [activeCallApt, setActiveCallApt] = useState<Appointment | null>(null);
  const [isCallInitiator, setIsCallInitiator] = useState(false);

  // Deep Link Handling (Join from Email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinAptId = params.get('joinCall');
    if (joinAptId && !activeCallApt) {
       const apt = appointments.find(a => a.id === joinAptId);
       if (apt) {
          setActiveCallApt(apt);
          setIsCallInitiator(false);
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
       }
    }
  }, [appointments, activeCallApt]);

  // Automatic Call Detection (Patient side)
  useEffect(() => {
    const incoming = notifications.find(n => !n.isRead && n.title === 'Incoming Voice Call');
    if (incoming && !activeCallApt) {
      const notifTime = new Date(incoming.timestamp).getTime();
      const now = new Date().getTime();
      
      // Only auto-open if less than 60 seconds old
      if (now - notifTime < 60000) {
        // Mark as read immediately to prevent loop
        api.put(`/notifications/${incoming.id}/read`);
        // Find matching appointment by doctor name mention
        const apt = appointments.find(a => incoming.message.includes(a.doctorName || a.doctor?.name || ''));
        if (apt) {
          setActiveCallApt(apt);
          setIsCallInitiator(false);
        }
      } else {
         // It's an old notification, just mark it as read so it doesn't bother us.
         api.put(`/notifications/${incoming.id}/read`);
      }
    }
  }, [notifications, appointments, activeCallApt]);
  const upcoming = appointments.filter(a => a.status === 'PENDING');
  const latestReports = reports.slice(0, 2);

  // Multi-doctor send prevention logic
  const effectiveSentDoctorId = localSentDoctorId || reports[0]?.doctorId;

  // Vitals CRUD state
  const [editingVital, setEditingVital] = useState<'bp' | 'weight' | 'glucose' | 'temperature' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [vitals, setVitals] = useState({
    bp: user.vitalBp || '',
    weight: user.vitalWeight || '',
    glucose: user.vitalGlucose || '',
    temperature: user.vitalTemperature || '',
  });
  const [savingVital, setSavingVital] = useState(false);

  const saveVital = async (key: 'bp' | 'weight' | 'glucose' | 'temperature', value: string | null) => {
    setSavingVital(true);
    try {
      const fieldMap = { bp: 'vitalBp', weight: 'vitalWeight', glucose: 'vitalGlucose', temperature: 'vitalTemperature' } as const;

      // Smart unit normalization — append only if user hasn't typed them
      let normalized = value;
      if (normalized) {
        const v = normalized.trim();
        const lower = v.toLowerCase().replace(/\s+/g, '');
        if (key === 'bp') {
          normalized = lower.endsWith('mmhg') ? v : `${v} mmHg`;
        } else if (key === 'weight') {
          normalized = lower.endsWith('kg') ? v : `${v} kg`;
        } else if (key === 'glucose') {
          normalized = lower.endsWith('mg/dl') || lower.endsWith('mgdl') ? v : `${v} mg/dL`;
        } else if (key === 'temperature') {
          normalized = lower.endsWith('°c') || lower.endsWith('c') || lower.endsWith('°f') || lower.endsWith('f') ? v : `${v} °C`;
        }
      }

      const payload = { id: user.id, [fieldMap[key]]: normalized ?? '' };
      const { data } = await api.put('/auth/update', payload);

      // Sync updated user back to localStorage so vitals survive page reloads
      const session = JSON.parse(localStorage.getItem('medecho_session') || '{}');
      localStorage.setItem('medecho_session', JSON.stringify({ ...session, user: data }));

      setVitals(prev => ({ ...prev, [key]: normalized ?? '' }));
      if (onUpdateUser) onUpdateUser({ ...user, ...data });
    } catch (err) {
      console.error('Vital update failed:', err);
    } finally {
      setSavingVital(false);
      setEditingVital(null);
    }
  };

  const startEdit = (key: 'bp' | 'weight' | 'glucose' | 'temperature', current: string) => {
    setEditingVital(key);
    setEditValue(current);
  };

  const dialDoctor = async (apt: Appointment) => {
    // Notify doctor of incoming call via backend
    try {
      await api.post(`/appointments/${apt.id}/start-call`, { initiatorId: user.id });
    } catch (err) {
      console.warn("Call notification failed, but opening channel...");
    }
    setIsCallInitiator(true);
    setActiveCallApt(apt);
  };

  const sendAllPatientReportsToDoctor = async (apt: Appointment) => {
    setSendingReportsId(apt.id);
    setSendReportsMessage('');
    try {
      const { data } = await api.post(`/reports/patient/${user.id}/send/${apt.id}`);
      setSendReportsMessage(`Sent ${data.reports.length} report(s) to doctor.`);
      // Per user request: Only one doctor can have the reports.
      setLocalSentDoctorId(apt.doctorId);
      setTimeout(() => setSendReportsMessage(''), 4000);
    } catch (error) {
      console.error('Send reports failed:', error);
      setSendReportsMessage('Failed to send reports.');
      setTimeout(() => setSendReportsMessage(''), 4000);
    } finally {
      setSendingReportsId(null);
    }
  };

  const stats = [
    { key: 'bp' as const, icon: HeartIcon, label: t.bpm, value: vitals.bp, color: 'bg-rose-500', sub: t.optimalRange, placeholder: 'e.g. 120/80' },
    { key: 'weight' as const, icon: ScaleIcon, label: t.weight, value: vitals.weight, color: 'bg-blue-500', sub: t.stable, placeholder: 'e.g. 72' },
    { key: 'glucose' as const, icon: FireIcon, label: t.glucose, value: vitals.glucose, color: 'bg-amber-400', sub: t.stable, placeholder: 'e.g. 95' },
    { key: 'temperature' as const, icon: BeakerIcon, label: t.temperature || 'Temperature', value: vitals.temperature, color: 'bg-purple-500', sub: t.stable, placeholder: 'e.g. 37' },
  ];

  return (
    <div className="p-4 sm:p-10 space-y-8 sm:space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            {t.welcomeBack}, <span className="text-blue-600">
              <TranslatedText text={user.name.split(' ')[0]} lang={user.preferredLanguage} />
            </span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic text-sm">MedEcho {t.dashboard}</p>
        </div>
        <div className="flex items-center space-x-3 bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100">
          <div className="p-2 bg-blue-500 rounded-xl text-white">
            <UserCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t.patient?.[0] + " ID" || 'PATIENT ID'}</p>
            <span className="font-black text-slate-700 text-xs">P{user.id.replace(/\D/g, '').slice(0, 5).padStart(5, '0')}</span>
          </div>
        </div>
      </header>

      {/* Vital Stats Grid — 2 cols on sm, 4 on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <div key={stat.key} className="relative bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-between group hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1"><TranslatedText text={stat.label} lang={user.preferredLanguage} /></p>
              {editingVital === stat.key ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveVital(stat.key, editValue); if (e.key === 'Escape') setEditingVital(null); }}
                    placeholder={stat.placeholder}
                    className="w-full text-sm font-bold border-2 border-blue-400 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button onClick={() => saveVital(stat.key, editValue)} disabled={savingVital} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingVital(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-800">{stat.value || <span className="text-slate-300 text-xl">—</span>}</span>
                  {stat.value && <span className="text-[9px] font-bold text-emerald-500 uppercase">{stat.sub}</span>}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className={`p-4 sm:p-5 rounded-3xl ${stat.color} text-white shadow-lg`}>
                <stat.icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              {/* Edit/Delete — shown on hover */}
              {editingVital !== stat.key && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(stat.key, stat.value)} title="Edit" className="p-1.5 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors">
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  {stat.value && (
                    <button onClick={() => saveVital(stat.key, null)} title="Delete" className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
        <section className="bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{t.appointmentsTitle}</h2>
              <span className="text-[9px] font-black bg-white/10 px-3 py-1 rounded-full text-blue-300 uppercase tracking-widest">{t.realTime}</span>
            </div>
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {upcoming.length > 0 ? upcoming.map(apt => {
                const doctorDisplayName = apt.doctorName || apt.doctor?.name || 'Doctor';
                const dateStr = new Date(apt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const isSent = !!effectiveSentDoctorId && (apt.doctorId === effectiveSentDoctorId);
                return (
                  <div key={apt.id} className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-4 sm:space-x-5">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white">
                        <VideoCameraIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <div>
                        <p className="font-black text-sm sm:text-lg">
                          <TranslatedText text={doctorDisplayName} lang={user.preferredLanguage} />
                        </p>
                        <p className="text-[10px] sm:text-xs text-white/40 font-bold uppercase tracking-widest">{dateStr} • {apt.time || 'TBD'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => dialDoctor(apt)}
                        className="p-3.5 sm:p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-lg transition-transform active:scale-95"
                      >
                        <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => sendAllPatientReportsToDoctor(apt)}
                        className={`text-[9px] sm:text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all ${isSent ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg'}`}
                        disabled={sendingReportsId === apt.id || isSent}
                      >
                        {sendingReportsId === apt.id
                          ? <TranslatedText text={t.sending} lang={user.preferredLanguage} />
                          : isSent
                            ? <div className="flex items-center gap-1.5"><CheckCircleIcon className="w-3.5 h-3.5" /><TranslatedText text={t.reportsSent} lang={user.preferredLanguage} /></div>
                            : <TranslatedText text={t.sendReports} lang={user.preferredLanguage} />
                        }
                      </button>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-10 text-white/20 font-black uppercase tracking-widest text-[10px]">{t.noAppointmentsBooked}</div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border border-slate-50 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">{t.latestReports}</h2>
          </div>
          <div className="space-y-4 flex-1 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {latestReports.length > 0 ? latestReports.map((report) => (
              <button
                key={report.id}
                onClick={() => setViewingReport(report)}
                className="w-full bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between hover:bg-blue-50 hover:border-blue-100 transition-all text-left group"
              >
                <div>
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-100/50 px-3 py-1 rounded-full border border-blue-200">{t.latestReports}</span>
                  <p className="text-base sm:text-lg font-bold text-slate-800 mt-6 leading-relaxed">
                    <TranslatedText text={report.diagnosis} lang={user.preferredLanguage} isClinical={true} />
                  </p>
                  <div className="mt-4 flex items-center space-x-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      <TranslatedText text="See Detailed Report" lang={user.preferredLanguage} />
                    </span>
                    <ArrowRightCircleIcon className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-slate-200">
                  <span className="text-[11px] font-black text-slate-700 uppercase">
                    {t.patient}: <TranslatedText text={report.patientName || user.name} lang={user.preferredLanguage} />
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    {t.doctor}: <TranslatedText text={report.doctorName || 'Unassigned'} lang={user.preferredLanguage} />
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {report.date || new Date(report.createdAt).toISOString().split('T')[0]}
                  </span>
                </div>
              </button>
            )) : (
              <div className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest">{t.noReports}</div>
            )}
          </div>
        </section>
      </div>

      {sendReportsMessage && (
        <div className="fixed top-10 right-10 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-[1.5rem] shadow-2xl border border-emerald-400 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <CheckBadgeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">MedEcho System</p>
              <p className="font-bold text-sm">
                <TranslatedText text={sendReportsMessage} lang={user.preferredLanguage} />
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-8">
        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6 px-2">{t.findNearbyCare}</h3>
        <HospitalLocator user={user} />
      </div>

      {/* Report Modal */}
      {viewingReport && (
        <ReportDetailModal
          report={viewingReport}
          user={user}
          onClose={() => setViewingReport(null)}
        />
      )}
      
      {/* Embedded P2P Voice Consultation */}
      {activeCallApt && (
        <VoiceConsultation
          user={user}
          appointment={activeCallApt}
          isInitiator={isCallInitiator}
          onClose={() => setActiveCallApt(null)}
        />
      )}
    </div>
  );
};

export default PatientDashboard;