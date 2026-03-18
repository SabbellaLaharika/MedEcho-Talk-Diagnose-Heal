import React, { useState, useEffect } from 'react';
import { MedicalReport, User } from '../types';
import api from '../services/api';
import { getTranslation } from '../services/translations';

interface ClinicalReportPaperProps {
  report: MedicalReport;
  user?: User;
  idSuffix?: string;
}
const ClinicalReportPaper: React.FC<ClinicalReportPaperProps> = ({ report, user, idSuffix = "" }) => {
  const [targetLang, setTargetLang] = useState(user?.preferredLanguage || 'en');
  const t = getTranslation(targetLang);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedReport, setTranslatedReport] = useState<any>(null);

  const getShortId = (fullId: string) => {
    if (!fullId) return 'R-00000';
    return `R-${fullId.split('-')[0].toUpperCase().slice(0, 5)}`;
  };

  useEffect(() => {
     if (targetLang === 'en') {
       setTranslatedReport(null);
       return;
     }
     handleTranslate();
  }, [targetLang]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const langCode = targetLang;
      
      // Translate diagnosis
      const diagRes = await api.post('/ml/translate', { text: report.diagnosis, target_lang: langCode });
      
      // Translate summary
      const summaryRes = await api.post('/ml/translate', { text: report.summary, target_lang: langCode });
      
      // Translate prescriptions / precautions array
      const transPrescriptions = await Promise.all(
        report.prescription.map(async (p) => {
          const res = await api.post('/ml/translate', { text: p, target_lang: langCode });
          return res.data.translated;
        })
      );

      setTranslatedReport({
         diagnosis: diagRes.data.translated || report.diagnosis,
         summary: summaryRes.data.translated || report.summary,
         prescription: transPrescriptions
      });
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const displayReport = translatedReport || report;

  return (
    <div id={`printable-area${idSuffix}`} className="bg-white mx-auto w-full max-w-[210mm] min-h-[297mm] shadow-lg p-8 sm:p-[20mm] border border-slate-100 font-serif text-slate-900">
      {/* Translation Toolbar - No Print */}
      <div className="flex justify-end mb-6 no-print space-x-3">
         <div className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-xl">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.medicalReports === 'Medical Reports' ? 'Report Language' : t.medicalReports.includes('డ్యా') ? 'నివేదిక భాష' : t.medicalReports.includes('डै') ? 'रिपोर्ट भाषा' : 'Language'}</span>
            <select 
               value={targetLang}
               onChange={(e) => setTargetLang(e.target.value)}
               className="bg-transparent border-none text-[10px] font-black text-blue-600 uppercase focus:ring-0 cursor-pointer"
            >
               <option value="en">English (Original)</option>
               <option value="hi">Hindi (हिन्दी)</option>
               <option value="te">Telugu (తెలుగు)</option>
               <option value="ta">Tamil (தமிழ்)</option>
               <option value="mr">Marathi (मराठी)</option>
               <option value="bn">Bengali (বাংলা)</option>
               <option value="kn">Kannada (ಕನ್ನಡ)</option>
            </select>
         </div>
      </div>

      {/* Clinic Logo/Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-1">{t.medEchoLogo}</h1>
          <p className="text-[10px] font-black tracking-[0.4em] text-blue-600 uppercase">Advanced Health Ecosystem</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clinic Reference</p>
          <p className="text-xs font-bold font-mono uppercase">{getShortId(report.id)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-12">
        <div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.patientHistory}</h5>
          <p className="text-lg font-bold text-slate-900 underline decoration-slate-200 underline-offset-4 mb-1">
            {user?.name || 'Authorized Patient'}
          </p>
          <p className="text-xs text-slate-500">ID: {(user?.id || report.patientId).split('-')[0].toUpperCase()}</p>
        </div>
        <div className="text-right">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t.dateOfBirth === 'Date of Birth' ? 'Examination Date' : t.dateOfBirth.includes('పు') ? 'పరీక్షించిన తేదీ' : t.dateOfBirth.includes('जन्') ? 'परीक्षा तिथि' : 'Date'}</h5>
          <p className="text-lg font-bold text-slate-900">{report.date}</p>
        </div>
      </div>

      {report.vitals && Object.values(report.vitals).some(v => v) && (
        <div className="grid grid-cols-3 gap-6 mb-12 no-print">
          {report.vitals.bp && (
            <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-rose-500 mb-2">❤️</span>
              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">BP</p>
              <p className="text-xl font-black text-rose-700 leading-none">{report.vitals.bp}</p>
            </div>
          )}
          {report.vitals.weight && (
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-blue-500 mb-2">⚖️</span>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">{t.weight}</p>
              <p className="text-xl font-black text-blue-700 leading-none">{report.vitals.weight}</p>
            </div>
          )}
          {report.vitals.temperature && (
            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-amber-500 mb-2">🔥</span>
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">Temp</p>
              <p className="text-xl font-black text-amber-700 leading-none">{report.vitals.temperature}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-12">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.diagnosisReport}</h5>
        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{t.predictedCondition}</p>
            <h2 className="text-3xl font-black text-slate-900">{isTranslating ? 'Translating...' : displayReport.diagnosis}</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.optimalRange === 'Optimal Range' ? 'Confidence' : t.optimalRange.includes('సరై') ? 'విశ్వాసం' : t.optimalRange.includes('इष्ट') ? 'आत्मविश्वास' : 'Confidence'}</p>
            <p className="text-2xl font-black text-emerald-600">{report.aiConfidence}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-12 items-start">
        <section>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.reportedSymptoms}</h5>
          <div className="flex flex-wrap gap-2">
            {report.symptoms?.map((s, i) => (
              <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 capitalize">
                {s.replace(/_/g, ' ')}
              </span>
            ))}
            {(!report.symptoms || report.symptoms.length === 0) && (
              <p className="text-xs text-slate-400 italic">No specific markers detected</p>
            )}
          </div>
        </section>
        <section>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.patientHistory}</h5>
          <table className="w-full text-left text-xs">
            <tbody>
              {report.history && Object.entries(report.history).map(([k, v]) => (
                <tr key={k} className="border-b border-slate-50">
                  <td className="py-2 font-bold uppercase text-[9px] text-slate-500 w-1/2">{k}</td>
                  <td className="py-2 text-slate-700">{v as string}</td>
                </tr>
              ))}
              {(!report.history || Object.keys(report.history).length === 0) && (
                 <tr>
                    <td colSpan={2} className="py-2 text-xs text-slate-400 italic">No historical data available</td>
                 </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <div className="mb-12">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t.advicePrecautions}</h5>
        <ul className="space-y-4">
          {displayReport.prescription.map((p, i) => (
            <li key={i} className="text-xs flex items-start space-x-3 text-slate-700 leading-relaxed">
              <span className="font-bold text-blue-500">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Digital Certification</p>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center font-black text-[10px] text-slate-300">ME</div>
            <p className="text-[9px] font-black text-slate-300 uppercase italic">Authenticated by MedEcho AI System</p>
          </div>
        </div>
        <div className="text-right border-t border-slate-800 w-48 pt-2">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Medical Signature</p>
        </div>
      </div>
    </div>
  );
};

export default ClinicalReportPaper;
