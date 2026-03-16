
import React from 'react';
import { MedicalReport } from '../types';
import { 
  XMarkIcon, 
  HeartIcon, 
  ScaleIcon, 
  FireIcon, 
  DocumentTextIcon, 
  GlobeAltIcon, 
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/solid';

interface ReportDetailModalProps {
  report: MedicalReport;
  onClose: () => void;
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose }) => {
  // Validate and ensure all fields have proper values
  const validatedReport = {
    ...report,
    diagnosis: String(report.diagnosis || 'Pending diagnosis').trim(),
    summary: String(report.summary || 'No summary available').trim(),
    doctorName: String(report.doctorName || 'MedEcho AI').trim(),
    date: String(report.date || new Date().toISOString().split('T')[0]).trim(),
    aiConfidence: Number(report.aiConfidence) || 0,
    prescription: Array.isArray(report.prescription) ? report.prescription.map(p => String(p).trim()) : []
  };
  const handleDownloadPDF = () => {
    try {
      // Create PDF content
      const pdfContent = `
MEDECHO - CLINICAL REPORT
================================================

REFERENCE ID: ${report.id}
DATE: ${validatedReport.date}

DIAGNOSIS: ${validatedReport.diagnosis}
CONFIDENCE: ${validatedReport.aiConfidence ? validatedReport.aiConfidence + '%' : 'N/A'}

CLINICAL SUMMARY:
${validatedReport.summary}

ADVICE & CARE PLAN:
${validatedReport.prescription && validatedReport.prescription.length > 0 ? validatedReport.prescription.map((item, i) => `${i + 1}. ${item}`).join('\n') : 'No prescriptions available'}

VITALS:
- Blood Pressure: ${validatedReport.vitals?.bp || '120/80'}
- Weight: ${validatedReport.vitals?.weight || '70kg'}
- Temperature: ${validatedReport.vitals?.temperature || '98.6F'}

REVIEWING CONSULTANT: ${validatedReport.doctorName}

Generated on: ${new Date().toLocaleString()}
      `.trim();

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MedEcho_Report_${report.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 p-6 sm:p-8 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Clinical Report</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reference ID: {report.id.toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar">
          {/* Header Info */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnosis</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{validatedReport.diagnosis}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
              <p className="font-bold text-slate-700">{validatedReport.date}</p>
            </div>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col items-center text-center">
              <HeartIcon className="w-5 h-5 text-rose-500 mb-2" />
              <p className="text-[8px] font-black text-rose-400 uppercase">BP</p>
              <p className="font-black text-rose-700">{validatedReport.vitals?.bp || '120/80'}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
              <ScaleIcon className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-[8px] font-black text-blue-400 uppercase">Weight</p>
              <p className="font-black text-blue-700">{validatedReport.vitals?.weight || '70kg'}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
              <FireIcon className="w-5 h-5 text-amber-500 mb-2" />
              <p className="text-[8px] font-black text-amber-400 uppercase">Temp</p>
              <p className="font-black text-amber-700">{validatedReport.vitals?.temperature || '98.6F'}</p>
            </div>
          </div>

          {/* Clinical Summary */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-slate-400" />
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Clinical Summary</h4>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed italic font-medium">
                "{validatedReport.summary}"
              </p>
            </div>
          </div>

          {/* Prescriptions / Precautions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Advice & Care Plan</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {validatedReport.prescription && validatedReport.prescription.length > 0 ? (
                validatedReport.prescription.map((item, i) => (
                  <div key={i} className="flex items-center space-x-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <p className="text-xs font-bold text-slate-700">{item}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No prescriptions available</p>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500">
                {validatedReport.doctorName ? validatedReport.doctorName[0] : 'M'}
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reviewing Consultant</p>
                <p className="text-xs font-bold text-slate-700">{validatedReport.doctorName}</p>
              </div>
            </div>
            {validatedReport.aiConfidence > 0 && (
              <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100">
                <ShieldCheckIcon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{validatedReport.aiConfidence}% AI Analysis</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex space-x-3 flex-shrink-0">
          <button onClick={handleDownloadPDF} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center space-x-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Download Report</span>
          </button>
          <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Close Viewer</button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailModal;
