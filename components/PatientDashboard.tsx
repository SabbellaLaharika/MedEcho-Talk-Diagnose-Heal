import React, { useState } from 'react';
import { User, Appointment, MedicalReport } from '../types';
import HospitalLocator from './HospitalLocator';
import ReportDetailModal from './ReportDetailModal';
import api from '../services/api';
import { getTranslation, translateString } from '../services/translations';
import TranslatedText from './TranslatedText';
import {
  HeartIcon,
  ScaleIcon,
  FireIcon,
  UserCircleIcon,
  VideoCameraIcon,
  PhoneIcon,
  XMarkIcon,
  ArrowRightCircleIcon
} from '@heroicons/react/24/solid';


interface PatientDashboardProps {
  user: User;
  appointments: Appointment[];
  reports: MedicalReport[];
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, appointments, reports }) => {
  const t = getTranslation(user.preferredLanguage);
  const [viewingReport, setViewingReport] = useState<MedicalReport | null>(null);
  const [sendingReportsId, setSendingReportsId] = useState<string | null>(null);
  const [sendReportsMessage, setSendReportsMessage] = useState<string>('');
  const upcoming = appointments.filter(a => a.status === 'PENDING').slice(0, 2);
  const latestReport = reports[0];

  const [translatedWelcomeName, setTranslatedWelcomeName] = useState('');
  const [translatedDiagnosis, setTranslatedDiagnosis] = useState('');
  const [translatedPatientName, setTranslatedPatientName] = useState('');
  const [translatedDoctorName, setTranslatedDoctorName] = useState('');

  // Translations are now handled by TranslatedText component in JSX

  const dialDoctor = (apt: Appointment) => {
    const phone = apt.doctorContact || apt.doctor?.contact || '6300292724';
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length > 0) {
      window.location.href = `tel:${cleaned}`;
    }
  };

  const sendAllPatientReportsToDoctor = async (apt: Appointment) => {
    setSendingReportsId(apt.id);
    setSendReportsMessage('');
    try {
      const { data } = await api.post(`/reports/patient/${user.id}/send/${apt.id}`);
      setSendReportsMessage(`Sent ${data.reports.length} report(s) to doctor.`);
    } catch (error) {
      console.error('Send reports failed:', error);
      setSendReportsMessage('Failed to send reports.');
    } finally {
      setSendingReportsId(null);
    }
  };

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

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
        {[
          { icon: HeartIcon, label: t.bpm, value: '72', color: 'bg-rose-500', sub: t.optimalRange },
          { icon: ScaleIcon, label: t.weight, value: '72kg', color: 'bg-blue-500', sub: 'Last: Oct 20' },
          { icon: FireIcon, label: t.glucose, value: '95', color: 'bg-amber-400', sub: t.stable }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-between group hover:shadow-xl hover:-translate-y-1 transition-all">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-800">{stat.value}</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase">{stat.sub}</span>
              </div>
            </div>
            <div className={`p-4 sm:p-5 rounded-3xl ${stat.color} text-white shadow-lg`}>
              <stat.icon className="w-6 h-6 sm:w-7 sm:h-7" />
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
            <div className="space-y-4">
              {upcoming.length > 0 ? upcoming.map(apt => {
                const doctorDisplayName = apt.doctorName || apt.doctor?.name || 'Doctor';
                const dateStr = new Date(apt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
                        className="text-[10px] font-black uppercase bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl"
                        disabled={sendingReportsId === apt.id}
                      >
                        {sendingReportsId === apt.id ? <TranslatedText text={t.sending} lang={user.preferredLanguage} /> : <TranslatedText text={t.sendReports} lang={user.preferredLanguage} />}
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
          {latestReport ? (
            <button
              onClick={() => setViewingReport(latestReport)}
              className="flex-1 bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between hover:bg-blue-50 hover:border-blue-100 transition-all text-left group"
            >
              <div>
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-100/50 px-3 py-1 rounded-full border border-blue-200">{t.latestReports}</span>
                <p className="text-base sm:text-lg font-bold text-slate-800 mt-6 leading-relaxed">
                  <TranslatedText text={latestReport.diagnosis} lang={user.preferredLanguage} isClinical={true} />
                </p>
                <div className="mt-4 flex items-center space-x-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.noReports === 'No reports found.' ? <TranslatedText text='See Full Details' lang={user.preferredLanguage} /> : <TranslatedText text={t.reports} lang={user.preferredLanguage} />}</span>
                  <ArrowRightCircleIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-10 pt-6 border-t border-slate-200">
                <span className="text-[11px] font-black text-slate-700 uppercase">
                  {t.patient}: <TranslatedText text={latestReport.patientName || 'Unknown'} lang={user.preferredLanguage} />
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  {t.doctor}: <TranslatedText text={latestReport.doctorName || 'Unassigned'} lang={user.preferredLanguage} />
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{latestReport.date}</span>
              </div>
            </button>
          ) : <div className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest">{t.noReports}</div>}
        </section>
      </div>

      {sendReportsMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-bold uppercase tracking-widest">
          <TranslatedText text={sendReportsMessage} lang={user.preferredLanguage} />
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
    </div>
  );
};

export default PatientDashboard;