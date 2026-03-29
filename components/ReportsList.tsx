
import React, { useState, useRef } from 'react';
import { MedicalReport, User, Appointment } from '../types';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  PrinterIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  UserGroupIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  PaperClipIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/solid';
import ClinicalReportPaper from './ClinicalReportPaper';
import { getTranslation, translateString, translateClinical, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';
import api from '../services/api';
import { alertService } from '../services/alertService';

interface ReportsListProps {
  reports: MedicalReport[];
  user: User;
  onReportUploaded?: (report: MedicalReport) => void;
  onDeleteReport?: (id: string) => void;
  appointments?: Appointment[];
}

type TabType = 'AI' | 'CONSULTATION' | 'UPLOADED';

const TAB_CONFIG: { key: TabType; label: string; icon: React.ReactNode; color: string; bg: string; border: string }[] = [
  {
    key: 'AI',
    label: 'MedEcho AI',
    icon: <SparklesIcon className="w-4 h-4" />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  {
    key: 'CONSULTATION',
    label: 'Consultation',
    icon: <UserGroupIcon className="w-4 h-4" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'UPLOADED',
    label: 'Uploaded',
    icon: <FolderOpenIcon className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
];

const ReportsList: React.FC<ReportsListProps> = ({ reports, user, onReportUploaded, onDeleteReport, appointments }) => {
  const t = getTranslation(user.preferredLanguage);

  React.useEffect(() => {
    loadTranslations(user.preferredLanguage, 'reports');
  }, [user.preferredLanguage]);

  const [activeTab, setActiveTab] = useState<TabType>('AI');
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDiagnosis, setUploadDiagnosis] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getShortId = (fullId: string) => {
    if (!fullId) return 'R-00000';
    return `R-${fullId.split('-')[0].toUpperCase().slice(0, 5)}`;
  };

  const getFileIcon = (fileUrl?: string, fileName?: string) => {
    if (!fileUrl && !fileName) return <DocumentTextIcon className="w-4 h-4" />;
    const name = fileName || fileUrl || '';
    if (name.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return <PhotoIcon className="w-4 h-4" />;
    if (name.includes('pdf') || /\.pdf$/i.test(name)) return <DocumentTextIcon className="w-4 h-4" />;
    return <PaperClipIcon className="w-4 h-4" />;
  };

  const handleDeleteReport = async (reportId: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`reports/${reportId}`);
      if (onDeleteReport) {
        onDeleteReport(reportId);
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alertService.error('Failed to delete report. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handlePrint = () => {
    window.print();
    setIsPreviewOpen(false);
  };

  // Categorize reports
  const categorized = {
    AI: reports.filter(r => !r.reportType || r.reportType === 'AI'),
    CONSULTATION: reports.filter(r => r.reportType === 'CONSULTATION'),
    UPLOADED: reports.filter(r => r.reportType === 'UPLOADED'),
  };

  let filteredReports = categorized[activeTab].filter(r =>
    r.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.doctorName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user.role === 'DOCTOR' && selectedPatientId) {
    filteredReports = filteredReports.filter(r => r.patientId === selectedPatientId);
  }

  const activeReport = selectedReport || (user.role === 'DOCTOR' && !selectedPatientId ? null : filteredReports[0]);

  const uniquePatients = Array.from(new Map<string, { id: string, name: string }>(
    (appointments || []).filter(a => a.doctorId === user.id).map(a => [
      a.patientId,
      { id: a.patientId, name: a.patientName || a.patient?.name || t.unknownPatient || 'Unknown Patient' }
    ])
  ).values());

  // Tab badge count
  const badgeCount = (tab: TabType) => categorized[tab].length;

  // ─── Upload Handlers ───────────────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile && !uploadDiagnosis) return;
    // File size guard: 10MB
    if (uploadFile && uploadFile.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10MB.');
      return;
    }
    setUploadError('');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('patientId', user.role === 'DOCTOR' ? (selectedPatientId || user.id) : user.id);
      if (uploadFile) formData.append('file', uploadFile);
      formData.append('diagnosis', uploadDiagnosis || uploadFile?.name || 'External Report');
      formData.append('notes', uploadNotes);

      const isDoctor = user.role === 'DOCTOR';
      const uploadType = isDoctor ? 'CONSULTATION' : 'UPLOADED';

      formData.append('reportType', uploadType);
      if (isDoctor) formData.append('doctorId', user.id);

      const { data } = await api.post('reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadSuccess(true);
      if (onReportUploaded) {
        onReportUploaded({
          id: data.id,
          patientId: data.patientId,
          doctorId: data.doctorId,
          doctorName: data.doctor?.name || 'Self',
          date: new Date().toISOString().split('T')[0],
          diagnosis: data.diagnosis,
          summary: data.summary,
          prescription: data.precautions || [],
          reportType: uploadType,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
        });
      }
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadDiagnosis('');
        setUploadNotes('');
        setUploadSuccess(false);
        setActiveTab(uploadType);
      }, 1500);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Tab bar colour for active ──────────────────────────────────
  const getTabStyle = (tab: TabType) => {
    const cfg = TAB_CONFIG.find(c => c.key === tab)!;
    if (activeTab === tab) {
      return `${cfg.bg} ${cfg.color} ${cfg.border} border font-black shadow-sm`;
    }
    return 'bg-slate-50 text-slate-400 border border-transparent hover:bg-slate-100';
  };

  // ─── Report Card Badge ──────────────────────────────────────────
  const TypeBadge = ({ type }: { type?: string }) => {
    if (type === 'CONSULTATION') return (
      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-emerald-100 uppercase tracking-widest">
        <TranslatedText text="Consultation" lang={user.preferredLanguage} />
      </span>
    );
    if (type === 'UPLOADED') return (
      <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-amber-100 uppercase tracking-widest">
        <TranslatedText text="Uploaded" lang={user.preferredLanguage} />
      </span>
    );
    return (
      <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[8px] font-black border border-indigo-100 uppercase tracking-widest">
        AI
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto h-[calc(100vh-100px)] flex flex-col space-y-5">
      {/* Header */}
      <div className="flex justify-between items-start flex-shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
            <TranslatedText text={t.medicalReports} lang={user.preferredLanguage} />
          </h2>
          <p className="text-slate-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-1">
            <TranslatedText text={t.aiHistory} lang={user.preferredLanguage} />
          </p>
        </div>
        <button
          disabled={user.role === 'DOCTOR' && !selectedPatientId}
          onClick={() => setIsUploadOpen(true)}
          className={`flex items-center space-x-0 sm:space-x-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg ${user.role === 'DOCTOR' && !selectedPatientId ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
          title={user.role === 'DOCTOR' && !selectedPatientId ? 'Select a patient first to upload a report' : 'Upload Report'}
        >
          <CloudArrowUpIcon className="w-5 h-5 sm:w-4 h-4" />
          <span className="hidden sm:inline"><TranslatedText text="Upload Report" lang={user.preferredLanguage} /></span>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex space-x-2 flex-shrink-0">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedReport(null); }}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest transition-all ${getTabStyle(tab.key)}`}
          >
            {tab.icon}
            <span className={activeTab === tab.key ? 'inline' : 'hidden sm:inline'}><TranslatedText text={tab.label} lang={user.preferredLanguage} /></span>
            <span className={`ml-1 px-1.2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black ${activeTab === tab.key ? 'bg-white/60' : 'bg-slate-200 text-slate-500'}`}>
              {badgeCount(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-0 lg:gap-8 flex-col lg:flex-row">
        {/* Left: List */}
        <div className={`w-full lg:w-72 flex-shrink-0 flex flex-col space-y-3 ${selectedReport ? 'hidden lg:flex' : 'flex'}`}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t.filterDiagnosis}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {user.role === 'DOCTOR' && !selectedPatientId ? (
              // Doctor Patient Selection View
              uniquePatients.length > 0 ? uniquePatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatientId(p.id); setSelectedReport(null); }}
                  className="w-full p-4 rounded-2xl border-2 border-transparent bg-slate-50 hover:bg-white hover:border-slate-200 text-left transition-all flex items-center space-x-4"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-bold flex flex-shrink-0 items-center justify-center uppercase">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate">
                      <TranslatedText text={p.name} lang={user.preferredLanguage} />
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Patient Records
                    </p>
                  </div>
                </button>
              )) : (
                <div className="text-center py-10 text-slate-400 uppercase text-[10px] font-black">No patients found</div>
              )
            ) : (
              <>
                {user.role === 'DOCTOR' && selectedPatientId && (
                  <button
                    onClick={() => { setSelectedPatientId(null); setSelectedReport(null); }}
                    className="mb-3 w-full text-left text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center bg-indigo-50/50 p-2 rounded-xl"
                  >
                    &larr; Back to Patients List
                  </button>
                )}
                {filteredReports.map(report => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${activeReport?.id === report.id ? 'border-slate-800 bg-white shadow-md' : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200'}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight flex-1 pr-1">
                        <TranslatedText text={report.diagnosis} lang={user.preferredLanguage} isClinical={true} />
                      </h3>
                      <TypeBadge type={report.reportType} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`flex items-center space-x-1 text-[9px] font-bold uppercase tracking-wider ${
                        report.reportType === 'UPLOADED' ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {getFileIcon(report.fileUrl, report.fileName)}
                        <span>{report.fileName ? report.fileName.slice(0, 18) : report.date}</span>
                      </div>
                      {report.aiConfidence != null && report.aiConfidence > 0 && (
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black border border-emerald-100">
                          {report.aiConfidence}%
                        </span>
                      )}
                    </div>
                    {report.reportType === 'UPLOADED' && report.date && (
                      <p className="text-[9px] text-slate-400 font-bold mt-1">{report.date}</p>
                    )}
                  </button>
                ))}

                {filteredReports.length === 0 && (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center space-y-3">
                    {activeTab === 'UPLOADED' ? (
                      <>
                        <CloudArrowUpIcon className="w-10 h-10 text-slate-300" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <TranslatedText text="No uploaded reports" lang={user.preferredLanguage} />
                        </p>
                        <button
                          onClick={() => setIsUploadOpen(true)}
                          className="px-4 py-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all"
                        >
                          <TranslatedText text="Upload Now" lang={user.preferredLanguage} />
                        </button>
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="w-10 h-10 text-slate-300" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.noReportsFound}</p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className={`flex-1 bg-white border border-slate-100 rounded-[2rem] lg:rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden ${!selectedReport ? 'hidden lg:flex' : 'flex'}`}>
          {activeReport ? (
            <>
              <div className="p-6 lg:p-8 border-b border-slate-50 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="lg:hidden p-2 -ml-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                  <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    <TranslatedText text={t.diagnosisReport} lang={user.preferredLanguage} />
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <TypeBadge type={activeReport.reportType} />
                    {activeReport.fileName && (
                      <span className="text-[9px] text-slate-400 font-bold">{activeReport.fileName}</span>
                    )}
                  </div>
                </div>
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  ID: {getShortId(activeReport.id)}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                {/* If uploaded file — show viewer */}
                {activeReport.fileUrl && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <TranslatedText text="Attached File" lang={user.preferredLanguage} />
                      </h4>
                      <div className="flex items-center space-x-2">
                        {/* Expand full screen */}
                        <button
                          onClick={() => setIsFullScreen(true)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                          title="View full screen"
                        >
                          <ArrowsPointingOutIcon className="w-4 h-4 text-slate-500" />
                        </button>
                        {/* Download */}
                        <a
                          href={activeReport.fileUrl}
                          download={activeReport.fileName || 'report'}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all"
                        >
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                        {/* Delete (uploaded only) */}
                        {activeReport.reportType === 'UPLOADED' && (
                          <button
                            onClick={() => setDeleteConfirmId(activeReport.id)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-100 border border-red-200 transition-all"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                      {activeReport.fileUrl.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(activeReport.fileUrl) ? (
                        <img src={activeReport.fileUrl} alt="Uploaded Report" className="w-full max-h-80 object-contain p-4" />
                      ) : activeReport.fileUrl.startsWith('data:application/pdf') || /\.pdf$/i.test(activeReport.fileUrl) ? (
                        <iframe src={activeReport.fileUrl} title="PDF Report" className="w-full h-80 border-0" />
                      ) : (
                        <div className="p-8 text-center">
                          <PaperClipIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-bold">{activeReport.fileName || 'Attached File'}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Diagnosis */}
                <section>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                    <TranslatedText text={t.predictedCondition} lang={user.preferredLanguage} />
                  </h4>
                  <div className="flex items-center space-x-6">
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-800 animate-pulse border border-slate-100">
                      <HeartIcon className="w-8 h-8" />
                    </div>
                    <div className="flex items-center space-x-4 flex-wrap gap-2">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                        <TranslatedText text={activeReport.diagnosis} lang={user.preferredLanguage} isClinical={true} />
                      </h3>
                      {activeReport.aiConfidence != null && activeReport.aiConfidence > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black border border-indigo-100 uppercase tracking-widest">
                          {t.confidence}: {activeReport.aiConfidence}%
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Summary */}
                {activeReport.summary && (
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                      <TranslatedText text="Summary / Notes" lang={user.preferredLanguage} />
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <TranslatedText text={activeReport.summary} lang={user.preferredLanguage} />
                    </p>
                  </section>
                )}

                {/* Vitals */}
                {activeReport.vitals && Object.values(activeReport.vitals).some(v => v) && (
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      <TranslatedText text={t.vitals || 'Vitals'} lang={user.preferredLanguage} />
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {activeReport.vitals.bp && (
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center text-center">
                          <span className="text-lg mb-1">❤️</span>
                          <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">BP</p>
                          <p className="text-sm font-black text-rose-700">{activeReport.vitals.bp}</p>
                        </div>
                      )}
                      {activeReport.vitals.weight && (
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
                          <span className="text-lg mb-1">⚖️</span>
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5"><TranslatedText text="Weight" lang={user.preferredLanguage} /></p>
                          <p className="text-sm font-black text-blue-700">{activeReport.vitals.weight}</p>
                        </div>
                      )}
                      {activeReport.vitals.glucose && (
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                          <span className="text-lg mb-1">🔥</span>
                          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-0.5">
                            <TranslatedText text="Glucose" lang={user.preferredLanguage} /></p>
                          <p className="text-sm font-black text-amber-700">{activeReport.vitals.glucose}</p>
                        </div>
                      )}
                      {activeReport.vitals.temperature && (
                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col items-center text-center">
                          <span className="text-lg mb-1">🌡️</span>
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-0.5"><TranslatedText text="Temp" lang={user.preferredLanguage} /></p>
                          <p className="text-sm font-black text-purple-700">{activeReport.vitals.temperature}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Symptoms */}
                {activeReport.symptoms && activeReport.symptoms.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      <TranslatedText text={t.reportedSymptoms} lang={user.preferredLanguage} />
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {activeReport.symptoms.map((s, idx) => (
                        <span key={idx} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 lowercase">
                          <TranslatedText text={s.replace(/_/g, ' ')} lang={user.preferredLanguage} />
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Prescription / Advice */}
                {activeReport.prescription && activeReport.prescription.length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      <TranslatedText text={t.advicePrecautions} lang={user.preferredLanguage} />
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeReport.prescription.map((p, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start space-x-3">
                          <div className="mt-1 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                          <p className="text-xs font-bold text-slate-600 leading-relaxed">
                            <TranslatedText text={p} lang={user.preferredLanguage} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* History */}
                {activeReport.history && Object.keys(activeReport.history).length > 0 && (
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      <TranslatedText text={t.patientHistory} lang={user.preferredLanguage} />
                    </h4>
                    <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <tbody>
                          {Object.entries(activeReport.history).map(([key, val], idx) => (
                            <tr key={key} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30'}>
                              <td className="py-3 px-6 text-xs font-black text-slate-800 uppercase tracking-widest w-1/3">
                                <TranslatedText text={t[key.toLowerCase()] || key} lang={user.preferredLanguage} />
                              </td>
                              <td className="py-3 px-6 text-xs font-bold text-slate-600">
                                <TranslatedText text={typeof val === 'string' ? val : String(val)} lang={user.preferredLanguage} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-slate-50 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {/* Delete for uploaded reports without a file preview (pure metadata) */}
                  {activeReport.reportType === 'UPLOADED' && !activeReport.fileUrl && (
                    <button
                      onClick={() => setDeleteConfirmId(activeReport.id)}
                      className="flex items-center space-x-2 px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 border border-red-200 transition-all"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
                {!activeReport.fileUrl && (
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center space-x-3 shadow-lg shadow-slate-200"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span><TranslatedText text={t.previewPrint} lang={user.preferredLanguage} /></span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-300">
              <DocumentTextIcon className="w-20 h-20" />
              <p className="font-black uppercase tracking-[0.3em] text-xs leading-none">
                <TranslatedText text="Select a report to view details" lang={user.preferredLanguage} />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Print Preview Modal ─────────────────────────────────────── */}
      {isPreviewOpen && activeReport && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-10 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-area, #printable-area * { visibility: visible !important; }
              #printable-area { position: fixed !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: 100vh !important; margin: 0 !important; padding: 40px !important; background: white !important; z-index: 1000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-slate-100 flex justify-between items-center flex-shrink-0 no-print">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-slate-800 text-white rounded-lg"><PrinterIcon className="w-4 h-4" /></div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest"><TranslatedText text={t.reportReview} lang={user.preferredLanguage} /></h3>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                <XMarkIcon className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 bg-slate-200/30 custom-scrollbar">
              <ClinicalReportPaper report={activeReport} user={user} />
            </div>
            <div className="p-8 bg-white border-t flex space-x-4 no-print">
              <button onClick={handlePrint} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center space-x-3">
                <PrinterIcon className="w-4 h-4" />
                <span><TranslatedText text={t.confirmPrint} lang={user.preferredLanguage} /></span>
              </button>
              <button onClick={() => setIsPreviewOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-100 transition-all">
                <TranslatedText text={t.cancel} lang={user.preferredLanguage} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Upload Report Modal ──────────────────────────────────────── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500 rounded-xl"><CloudArrowUpIcon className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    <TranslatedText text="Upload Report" lang={user.preferredLanguage} />
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    <TranslatedText text="PDF, JPG, PNG up to 10MB" lang={user.preferredLanguage} />
                  </p>
                </div>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="p-2 hover:bg-slate-700 rounded-full transition-all">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {uploadSuccess ? (
                <div className="flex flex-col items-center space-y-3 py-10">
                  <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                  <p className="font-black text-slate-800 uppercase tracking-widest text-sm">
                    <TranslatedText text="Uploaded Successfully!" lang={user.preferredLanguage} />
                  </p>
                </div>
              ) : (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragging ? 'border-amber-400 bg-amber-50' : uploadFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-400'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0] || null;
                        if (f && f.size > 10 * 1024 * 1024) {
                          setUploadError('File is too large. Maximum size is 10MB.');
                          setUploadFile(null);
                        } else {
                          setUploadError('');
                          setUploadFile(f);
                        }
                      }}
                    />
                    {uploadFile ? (
                      <div className="flex items-center justify-center space-x-3">
                        {getFileIcon(undefined, uploadFile.name)}
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-800">{uploadFile.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setUploadFile(null); setUploadError(''); }}
                          className="p-1 hover:bg-slate-200 rounded-full transition-all"
                        >
                          <XMarkIcon className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          <TranslatedText text="Drag & drop or click to browse" lang={user.preferredLanguage} />
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">PDF, JPG, PNG — max 10MB</p>
                      </>
                    )}
                  </div>
                  {/* File error */}
                  {uploadError && (
                    <div className="flex items-center space-x-2 text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                      <p className="text-[10px] font-black">{uploadError}</p>
                    </div>
                  )}

                  {/* Diagnosis / Title */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      <TranslatedText text="Report Title / Diagnosis" lang={user.preferredLanguage} />
                    </label>
                    <input
                      type="text"
                      value={uploadDiagnosis}
                      onChange={e => setUploadDiagnosis(e.target.value)}
                      placeholder="e.g. Blood Test, X-Ray, Prescription..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      <TranslatedText text="Notes (optional)" lang={user.preferredLanguage} />
                    </label>
                    <textarea
                      value={uploadNotes}
                      onChange={e => setUploadNotes(e.target.value)}
                      rows={3}
                      placeholder="Any additional notes about this report..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleUploadSubmit}
                      disabled={isUploading || (!uploadFile && !uploadDiagnosis)}
                      className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center space-x-2 ${isUploading || (!uploadFile && !uploadDiagnosis) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg'}`}
                    >
                      {isUploading ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Uploading...</span></>
                      ) : (
                        <><CloudArrowUpIcon className="w-4 h-4" /><span><TranslatedText text="Upload" lang={user.preferredLanguage} /></span></>
                      )}
                    </button>
                    <button
                      onClick={() => setIsUploadOpen(false)}
                      className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
                    >
                      <TranslatedText text={t.cancel} lang={user.preferredLanguage} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Screen File Viewer */}
      {isFullScreen && activeReport?.fileUrl && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto">
            {activeReport.fileUrl.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(activeReport.fileUrl) ? (
              <img src={activeReport.fileUrl} alt="Report" className="w-full object-contain rounded-2xl" />
            ) : (
              <iframe src={activeReport.fileUrl} title="PDF" className="w-full h-[85vh] rounded-2xl border-0" />
            )}
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Delete Report?</h3>
              <p className="text-xs text-slate-400 font-bold mt-2">This action cannot be undone. The file and its data will be permanently removed.</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDeleteReport(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsList;
