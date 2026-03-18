
import React from 'react';
import { MedicalReport, User } from '../types';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import ClinicalReportPaper from './ClinicalReportPaper';
import { getTranslation } from '../services/translations';

interface ReportDetailModalProps {
  report: MedicalReport;
  user?: User;
  onClose: () => void;
}

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, user, onClose }) => {
  const t = getTranslation(user?.preferredLanguage);
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-10 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
       <style>{`
         @media print {
           body * { visibility: hidden !important; }
           #printable-area-modal, #printable-area-modal * { visibility: visible !important; }
           #printable-area-modal { 
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
           .no-print { display: none !important; }
         }
       `}</style>

       <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
         <div className="p-6 bg-slate-100 flex justify-between items-center flex-shrink-0 no-print">
           <div className="flex items-center space-x-2">
             <div className="p-2 bg-slate-800 text-white rounded-lg">
               <PrinterIcon className="w-4 h-4" />
             </div>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t.docViewer}</h3>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
             <XMarkIcon className="w-6 h-6 text-slate-500" />
           </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-slate-200/30 custom-scrollbar">
            <div id="printable-area-modal">
              <ClinicalReportPaper report={report} user={user} idSuffix="-modal" />
            </div>
         </div>

         <div className="p-8 bg-white border-t flex space-x-4 no-print">
           <button onClick={handlePrint} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center space-x-3">
             <PrinterIcon className="w-4 h-4" />
             <span>{t.printPdf}</span>
           </button>
           <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-100 transition-all">{t.close}</button>
         </div>
       </div>
    </div>
  );
};

export default ReportDetailModal;
