
import React, { useState } from 'react';
import { MedicalReport, User } from '../types';
import ReportDetailModal from './ReportDetailModal';
import { 
  DocumentTextIcon, 
  ArrowDownTrayIcon, 
  GlobeAltIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { HeartIcon, ChartBarIcon as ChartBarSolidIcon } from '@heroicons/react/24/solid';
import ClinicalReportPaper from './ClinicalReportPaper';
import { getTranslation } from '../services/translations';
import TranslatedText from './TranslatedText';

interface ReportsListProps {
  reports: MedicalReport[];
  user: User;
}

const ReportsList: React.FC<ReportsListProps> = ({ reports, user }) => {
  const t = getTranslation(user.preferredLanguage);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Helper for user-friendly short ID's
  const getShortId = (fullId: string) => {
    if (!fullId) return 'R-00000';
    return `R-${fullId.split('-')[0].toUpperCase().slice(0, 5)}`;
  };

  const handlePrint = () => {
    window.print();
    setIsPreviewOpen(false);
  };

  const filteredReports = reports.filter(r => 
    r.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.doctorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Default to first report if none selected
  const activeReport = selectedReport || filteredReports[0];

  return (
    <div className="p-4 sm:p-8 max-w-[1400px] mx-auto h-[calc(100vh-100px)] flex flex-col space-y-6">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{t.medicalReports}</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Your AI-generated diagnosis history</p>
      </div>

      <div className="flex flex-1 overflow-hidden gap-8">
        {/* Left Side: List */}
        <div className="w-80 flex-shrink-0 flex flex-col space-y-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder={t.filterDiagnosis}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {filteredReports.map((report) => (
              <button 
                key={report.id} 
                onClick={() => setSelectedReport(report)}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${activeReport?.id === report.id ? 'border-slate-800 bg-white shadow-md shadow-slate-200' : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    <TranslatedText text={report.diagnosis} targetLang={user.preferredLanguage} />
                  </h3>
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-black border border-emerald-100">
                    {report.aiConfidence}%
                  </span>
                </div>
                <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <DocumentTextIcon className="w-3 h-3 mr-1" />
                  {report.date}
                </div>
              </button>
            ))}
            {filteredReports.length === 0 && (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">No reports found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail */}
        <div className="flex-1 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col overflow-hidden">
          {activeReport ? (
            <>
              {/* Report Header */}
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t.diagnosisReport}</h2>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {getShortId(activeReport.id)}</span>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                {/* Predicted Condition */}
                <section>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.predictedCondition}</h4>
                  <div className="flex items-center space-x-6">
                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-800 animate-pulse border border-slate-100">
                      <HeartIcon className="w-8 h-8" />
                    </div>
                    <div className="flex items-center space-x-4">
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight">
                        <TranslatedText text={activeReport.diagnosis} targetLang={user.preferredLanguage} />
                      </h3>
                      <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black border border-indigo-100 uppercase tracking-widest">
                        Confidence: {activeReport.aiConfidence}%
                      </span>
                    </div>
                  </div>
                </section>

                {/* Reported Symptoms */}
                <section>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.reportedSymptoms}</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeReport.symptoms && activeReport.symptoms.length > 0 ? (
                      activeReport.symptoms.map((s, idx) => (
                        <span key={idx} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 lowercase">
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No symptoms extracted</p>
                    )}
                  </div>
                </section>

                {/* Patient History */}
                <section>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.patientHistory}</h4>
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        {activeReport.history && Object.keys(activeReport.history).length > 0 ? (
                          Object.entries(activeReport.history).map(([key, val], idx) => (
                            <tr key={key} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/30'}>
                              <td className="py-4 px-8 text-xs font-black text-slate-800 uppercase tracking-widest w-1/3">{key}</td>
                              <td className="py-4 px-8 text-xs font-bold text-slate-600">{val as string}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="py-8 px-8 text-xs text-slate-400 italic text-center">No detailed history available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Advice Section */}
                {activeReport.prescription && activeReport.prescription.length > 0 && (
                   <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.advicePrecautions}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeReport.prescription.map((p, i) => (
                          <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start space-x-3">
                            <div className="mt-1 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <p className="text-xs font-bold text-slate-600 leading-relaxed">{p}</p>
                          </div>
                        ))}
                    </div>
                   </section>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-8 border-t border-slate-50 flex justify-end">
                <button 
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all flex items-center space-x-3 shadow-lg shadow-slate-200"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>Preview & Print</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-300">
              <DocumentTextIcon className="w-20 h-20" />
              <p className="font-black uppercase tracking-[0.3em] text-xs leading-none">Select a report to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Modern Print Preview Modal */}
      {isPreviewOpen && activeReport && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-10 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           {/* Add dynamic print styles here instead of global CSS */}
           <style>{`
             @media print {
               body * { visibility: hidden !important; }
               #printable-area, #printable-area * { visibility: visible !important; }
               #printable-area { 
                 position: fixed !important; 
                 left: 0 !important; 
                 top: 0 !important; 
                 width: 100vw !important;
                 height: 100vh !important;
                 margin: 0 !important;
                 padding: 40px !important;
                 background: white !important;
                 z-index: 1000 !important;
               }
               // Hide buttons during print
               .no-print { display: none !important; }
             }
           `}</style>

           <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             <div className="p-6 bg-slate-100 flex justify-between items-center flex-shrink-0 no-print">
               <div className="flex items-center space-x-2">
                 <div className="p-2 bg-slate-800 text-white rounded-lg">
                   <PrinterIcon className="w-4 h-4" />
                 </div>
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Medical Report Print Review</h3>
               </div>
               <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                 <XMarkIcon className="w-6 h-6 text-slate-500" />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto p-10 bg-slate-200/30 custom-scrollbar">
                {/* The Paper Component */}
                <ClinicalReportPaper report={activeReport} user={user} />
             </div>

             <div className="p-8 bg-white border-t flex space-x-4 no-print">
               <button onClick={handlePrint} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center space-x-3">
                 <PrinterIcon className="w-4 h-4" />
                 <span>Confirm & Print PDF</span>
               </button>
               <button onClick={() => setIsPreviewOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-100 transition-all">Cancel</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportsList;
