
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { User, Appointment, MedicalReport, AppNotification } from '../types';
import AIChatAssistant from './AIChatAssistant';
import ReportDetailModal from './ReportDetailModal';
import { getTranslation, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';
import {
  UsersIcon,
  CalendarDaysIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  XMarkIcon,
  SignalIcon,
  BoltIcon,
  ShieldCheckIcon,
  TrashIcon,
  ChevronRightIcon,
  PhoneIcon
} from '@heroicons/react/24/solid';
import VideoConsultation from './VideoConsultation';
import { alertService } from '../services/alertService';


import api from '../services/api';


interface DoctorDashboardProps {
  doctor: User;
  appointments: Appointment[];
  reports: MedicalReport[];
  notifications: AppNotification[];
  onUpdateUser: (updatedUser: User) => void;
  onUpdateAppointment: (updatedApt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  socket?: any | null;
  activeCallApt: Appointment | null;
  setActiveCallApt: (apt: Appointment | null) => void;
  setIsCallInitiator: (val: boolean) => void;
  setIsCallVoiceOnly: (val: boolean) => void;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctor,
  appointments,
  reports,
  notifications,
  onUpdateUser,
  onUpdateAppointment,
  onDeleteAppointment,
  socket,
  activeCallApt,
  setActiveCallApt,
  setIsCallInitiator,
  setIsCallVoiceOnly
}) => {
  const t = getTranslation(doctor.preferredLanguage);

  useEffect(() => {
    loadTranslations(doctor.preferredLanguage, 'dashboard');
  }, [doctor.preferredLanguage]);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [selectedPatientIdForRecords, setSelectedPatientIdForRecords] = useState<string | null>(null);

  // Translations are now handled by TranslatedText component in JSX

  // Data translation is now handled by TranslatedText component directly in the JSX

  const doctorAppointments = appointments.filter(a => a.doctorId === doctor.id);
  const pendingApts = doctorAppointments.filter(a => a.status === 'PENDING');
  const uniquePatientsForRecords = Array.from(new Map<string, { id: string, name: string }>(
    doctorAppointments.map(a => [a.patientId, { id: a.patientId, name: a.patientName || a.patient?.name || t.unknownPatient || 'Unknown Patient' }])
  ).values());
  const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
  const [draftReport, setDraftReport] = useState<any>(null);
  const [showReportReview, setShowReportReview] = useState(false);


  // Deep Link Handling (Join from Email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinAptId = params.get('joinCall');
    if (joinAptId && !activeCallApt) {
      const apt = pendingApts.find(a => a.id === joinAptId);
      if (apt) {
        setActiveCallApt(apt);
        setIsCallInitiator(false);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [pendingApts, activeCallApt]);

  // Redundant call detection removed - handled globally in App.tsx


  const stats = [
    { label: t.pendingVisits, value: pendingApts.length.toString(), icon: ClockIcon, color: 'bg-indigo-500' },
    { label: t.patientCount, value: '24', icon: UsersIcon, color: 'bg-slate-800' },
    { label: t.finished, value: doctorAppointments.filter(a => a.status === 'COMPLETED').length.toString(), icon: CheckCircleIcon, color: 'bg-emerald-500' },
  ];

  const handleStartCall = async (apt: Appointment, isVoice: boolean = false) => {
    // Notify patient of incoming call via backend
    try {
      await api.post(`appointments/${apt.id}/start-call`, {
        initiatorId: doctor.id,
        callType: isVoice ? 'VOICE' : 'VIDEO'
      });
      
      setIsCallVoiceOnly(isVoice);
      setIsCallInitiator(true);
      setActiveCallApt(apt);
    } catch (err: any) {
      console.error("Call notification failed:", err);
      const msg = err.response?.data?.message || "Failed to notify the patient. Please check your connection.";
      alertService.error(msg);
      // We still allow the doctor to enter the room as they are the authority
      setIsCallVoiceOnly(isVoice);
      setIsCallInitiator(true);
      setActiveCallApt(apt);
    }
  };

  // Call end handling is now global in App.tsx


  const submitFinalReport = async () => {
    if (!draftReport) return;
    try {
      await api.post('reports', {
        patientId: draftReport.patientId,
        doctorId: doctor.id,
        diagnosis: draftReport.diagnosis,
        summary: draftReport.summary,
        preventions: draftReport.precautions,
        symptoms: draftReport.problems,
        confidenceScore: draftReport.confidence,
        medications: draftReport.medications, // New field for reminders
        reportType: 'CONSULTATION'
      });
      setShowReportReview(false);
      setDraftReport(null);
      alert(t.reportSuccess || "Report verified and sent to patient!");
    } catch (err) {
      alert(t.reportError || "Failed to save report.");
    }
  };

  const toggleAvailability = (isAvailable: boolean) => {
    onUpdateUser({ ...doctor, isAvailable });
  };

  const handleStatusChange = (apt: Appointment, status: 'COMPLETED' | 'CANCELLED' | 'PENDING') => {
    onUpdateAppointment({ ...apt, status });
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-10 space-y-8 sm:space-y-12 animate-in fade-in duration-500">
      {/* Doctor Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-sm border border-slate-50">
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="relative flex-shrink-0">
            <img src={doctor.avatar} className="w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] sm:rounded-[2rem] object-cover border-4 border-slate-50 shadow-sm" alt={doctor.name} />
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${doctor.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tight truncate">
              <TranslatedText text={doctor.name} lang={doctor.preferredLanguage} />
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
              <span className="bg-indigo-50 text-indigo-600 text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full uppercase truncate max-w-[120px]">
                <TranslatedText text={doctor.specialization} lang={doctor.preferredLanguage} />
              </span>
              <span className="text-slate-400 text-[10px] font-bold">@{doctor.username || 'doctor'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex-1 lg:flex-none flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button
              onClick={() => toggleAvailability(true)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${doctor.isAvailable ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              <TranslatedText text={t.online} lang={doctor.preferredLanguage} />
            </button>
            <button
              onClick={() => toggleAvailability(false)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${!doctor.isAvailable ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}
            >
              <TranslatedText text={t.away} lang={doctor.preferredLanguage} />
            </button>
          </div>

          <button
            onClick={() => setAiPanelOpen(true)}
            className="p-3 sm:px-8 sm:py-4 bg-indigo-600 text-white rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg active:scale-95 hover:bg-indigo-700 transition-all"
          >
            <SparklesIcon className="w-5 h-5" />
            <span className="hidden sm:inline-block font-black text-[10px] uppercase ml-3"><TranslatedText text={t.aiSupport} lang={doctor.preferredLanguage} /></span>
          </button>
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                <TranslatedText text={stat.label} lang={doctor.preferredLanguage} />
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
            </div>
            <div className={`${stat.color} p-4 sm:p-5 rounded-3xl text-white shadow-lg`}>
              <stat.icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
        <div className="lg:col-span-2 bg-white rounded-[2rem] sm:rounded-[3.5rem] shadow-sm border border-slate-50 overflow-hidden">
          <div className="p-6 sm:p-10 border-b flex justify-between items-center bg-indigo-50/10">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                <TranslatedText text={t.activeQueue} lang={doctor.preferredLanguage} />
              </h2>
            </div>
            <SignalIcon className={`w-5 h-5 ${doctor.isAvailable ? 'text-emerald-500 animate-pulse' : 'text-slate-300'}`} />
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            {pendingApts.length > 0 ? pendingApts.map(apt => (
              <div key={apt.id} className="p-5 sm:p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4 sm:space-x-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center font-black text-indigo-600 border border-indigo-50 flex-shrink-0">
                    {(apt.patientName || apt.patient?.name || t.patient || 'P')[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-base sm:text-lg truncate">
                      <TranslatedText text={apt.patientName || apt.patient?.name || t.patient} lang={doctor.preferredLanguage} />
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="font-bold">{apt.time}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{new Date(apt.date).toLocaleDateString()}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 font-black uppercase text-[8px]">
                        <TranslatedText text={apt.type === 'VIRTUAL' ? t.virtual : t.inPerson} lang={doctor.preferredLanguage} />
                      </span>
                      {apt.patient?.contact && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 italic">
                          {apt.patient.contact}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleStartCall(apt, true)}
                    className={`p-3.5 rounded-xl transition-all ${notifications.some(n => !n.isRead && n.type === 'CALL' && n.metadata?.callType === 'VOICE' && n.metadata?.appointmentId === apt.id) ? 'bg-red-500 animate-pulse text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    title={t.voiceCall}
                  >
                    <PhoneIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleStartCall(apt, false)}
                    className={`p-3.5 rounded-xl transition-all ${notifications.some(n => !n.isRead && n.type === 'CALL' && n.metadata?.callType === 'VIDEO' && n.metadata?.appointmentId === apt.id) ? 'bg-red-500 animate-pulse text-white shadow-lg' : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'}`}
                    title={t.videoCall}
                  >
                    <VideoCameraIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleStatusChange(apt, 'COMPLETED')}
                    className="flex-1 sm:flex-none p-3.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl"
                  >
                    <CheckCircleIcon className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-16 text-center text-slate-200">
                <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest"><TranslatedText text={t.emptyQueue} lang={doctor.preferredLanguage} /></p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-50 flex flex-col max-h-[600px]">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center">
            <BoltIcon className="w-4 h-4 text-amber-500 mr-2" />
            <TranslatedText text={t.patientRecords} lang={doctor.preferredLanguage} />
          </h3>
          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
            {!selectedPatientIdForRecords ? (
              <>
                {uniquePatientsForRecords.length > 0 ? uniquePatientsForRecords.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientIdForRecords(p.id)}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-bold flex flex-shrink-0 items-center justify-center uppercase">
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">
                        <TranslatedText text={p.name} lang={doctor.preferredLanguage} />
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        <TranslatedText text={t.viewMedicalHistory} lang={doctor.preferredLanguage} />
                      </p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </button>
                )) : (
                  <div className="text-center py-10 text-slate-400 uppercase text-[10px] font-black">{t.noPatientsFound || 'No patients found'}</div>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectedPatientIdForRecords(null)}
                  className="mb-4 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center"
                >
                  &larr; <TranslatedText text={t.backToPatients} lang={doctor.preferredLanguage} />
                </button>
                {reports.filter(r => r.patientId === selectedPatientIdForRecords).length > 0 ? reports.filter(r => r.patientId === selectedPatientIdForRecords).map(report => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">
                          <TranslatedText text={t.diagnosisReportFor} lang={doctor.preferredLanguage} /> <TranslatedText text={report.patientName || t.unknownPatient} lang={doctor.preferredLanguage} />
                        </p>
                        <p className="font-black text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">
                          <TranslatedText text={report.diagnosis} lang={doctor.preferredLanguage} />
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          <TranslatedText text={t.patientFor} lang={doctor.preferredLanguage} />: <span className="font-extrabold text-slate-700">
                            <TranslatedText text={report.patientName || t.unknownPatient} lang={doctor.preferredLanguage} />
                          </span>
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{report.date}</p>
                      </div>
                      <ChevronRightIcon className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </button>
                )) : (
                  <div className="text-center py-10 text-slate-200 uppercase text-[9px] font-black">{t.noReports}</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel Overlay */}
      {aiPanelOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[490]"
          onClick={() => setAiPanelOpen(false)}
        ></div>
      )}

      {/* Responsive Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[500px] lg:w-[600px] bg-white shadow-2xl z-[500] transform transition-transform duration-500 ease-in-out border-l border-slate-100 flex flex-col ${aiPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-6 h-6 text-indigo-400" />
            <h2 className="text-lg font-black tracking-tight uppercase"><TranslatedText text={t.aiResearch} lang={doctor.preferredLanguage} /></h2>
          </div>
          <button onClick={() => setAiPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AIChatAssistant isModal />
        </div>
      </div>

      {/* Video Consultation handled globally in App.tsx */}


      {/* AI Report Generation Overlay */}
      {isAnalyzingReport && (
        <div className="fixed inset-0 z-[1100] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center animate-bounce shadow-2xl">
            <BoltIcon className="w-12 h-12 text-white" />
          </div>
          <h2 className="mt-8 text-xl font-black text-slate-800 uppercase tracking-tighter animate-pulse">
            <TranslatedText text={t.analyzingConsultation} lang={doctor.preferredLanguage} />
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            <TranslatedText text={t.detectingProblems} lang={doctor.preferredLanguage} />
          </p>
        </div>
      )}

      {/* Report Review & Verification Modal */}
      {showReportReview && draftReport && (
        <div className="fixed inset-0 z-[1200] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col my-8">
            <div className="p-8 border-b bg-indigo-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase"><TranslatedText text={t.verifyConsultationReport} lang={doctor.preferredLanguage} /></h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1"><TranslatedText text={t.generatedByAI} lang={doctor.preferredLanguage} /></p>
              </div>
              <button onClick={() => setShowReportReview(false)} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-rose-500 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Diagnosis */}
              <div>
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 block"><TranslatedText text={t.primaryDiagnosis} lang={doctor.preferredLanguage} /></label>
                <input
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600 font-bold text-slate-700"
                  value={draftReport.diagnosis}
                  onChange={(e) => setDraftReport({ ...draftReport, diagnosis: e.target.value })}
                />
              </div>

              {/* Suggestions */}
              <div>
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 block"><TranslatedText text={t.doctorsSuggestions} lang={doctor.preferredLanguage} /></label>
                <div className="space-y-3">
                  {draftReport.precautions.map((p: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="flex-1 px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                        value={p}
                        onChange={(e) => {
                          const newP = [...draftReport.precautions];
                          newP[i] = e.target.value;
                          setDraftReport({ ...draftReport, precautions: newP });
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setDraftReport({ ...draftReport, precautions: [...draftReport.precautions, ''] })}
                    className="text-[10px] font-black text-indigo-500 hover:underline uppercase"
                  >
                    <TranslatedText text={t.addSuggestion} lang={doctor.preferredLanguage} />
                  </button>
                </div>
              </div>

              {/* Medications */}
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block"><TranslatedText text={t.medicalReminders} lang={doctor.preferredLanguage} /></label>
                <div className="grid grid-cols-2 gap-3">
                  {draftReport.medications.map((m: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                      <input
                        className="bg-transparent font-bold text-xs text-emerald-800 outline-none w-full"
                        value={m}
                        onChange={(e) => {
                          const newM = [...draftReport.medications];
                          newM[i] = e.target.value;
                          setDraftReport({ ...draftReport, medications: newM });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setDraftReport({ ...draftReport, medications: [...draftReport.medications, ''] })}
                  className="text-[10px] font-black text-emerald-600 hover:underline uppercase mt-4"
                >
                  <TranslatedText text={t.addMedication} lang={doctor.preferredLanguage} />
                </button>
                <p className="text-[9px] text-slate-400 mt-2 italic font-medium"><TranslatedText text={t.medicationNotificationNote} lang={doctor.preferredLanguage} /></p>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex items-center justify-between">
              <button
                onClick={() => setShowReportReview(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
              >
                <TranslatedText text={t.discardDraft} lang={doctor.preferredLanguage} />
              </button>
              <button
                onClick={submitFinalReport}
                className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
              >
                <TranslatedText text={t.verifyAndSend} lang={doctor.preferredLanguage} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          user={doctor}
          onClose={() => setSelectedReport(null)}
        />
      )}

    </div>
  );
};

export default DoctorDashboard;
