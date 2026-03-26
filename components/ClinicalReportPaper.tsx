import React, { useState, useEffect } from 'react';
import { MedicalReport, User } from '../types';
import api from '../services/api';
import { getTranslation, translateClinical, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';

interface ClinicalReportPaperProps {
  report: MedicalReport;
  user?: User;
  idSuffix?: string;
}

const ClinicalReportPaper: React.FC<ClinicalReportPaperProps> = ({ report, user, idSuffix = "" }) => {
  const [targetLang, setTargetLang] = useState(user?.preferredLanguage || 'en');
  const t = getTranslation(targetLang);

  useEffect(() => {
    if (targetLang) {
      loadTranslations(targetLang, 'reports');
      loadTranslations(targetLang, 'common');
    }
  }, [targetLang]);

  const getShortId = (fullId: string) => {
    if (!fullId) return 'R-00000';
    return `R-${fullId.split('-')[0].toUpperCase().slice(0, 5)}`;
  };

  // Translations are now handled by TranslatedText component in JSX

  return (
    <div id={`printable-area${idSuffix}`} className="bg-white mx-auto w-full max-w-[210mm] min-h-[297mm] shadow-lg p-8 sm:p-[20mm] border border-slate-100 font-serif text-slate-900">
      {/* Translation Toolbar - No Print */}
      <div className="flex justify-end mb-6 no-print space-x-3">
        <div className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-xl">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <TranslatedText text={t.reportLang} lang={targetLang} />
          </span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="bg-transparent border-none text-[10px] font-black text-blue-600 uppercase focus:ring-0 cursor-pointer"
          >
            <option value="en">English</option>
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
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-1">
            <TranslatedText text={t.medEchoLogo} lang={targetLang} />
          </h1>
          <p className="text-[10px] font-black tracking-[0.4em] text-blue-600 uppercase">
            <TranslatedText text={t.healthEco} lang={targetLang} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            <TranslatedText text={t.clinicRef} lang={targetLang} />
          </p>
          <p className="text-xs font-bold font-mono uppercase">{getShortId(report.id)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-12">
        <div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
            <TranslatedText text={t.patientHistory} lang={targetLang} />
          </h5>
          <p className="text-lg font-bold text-slate-900 underline decoration-slate-200 underline-offset-4 mb-1">
            <TranslatedText text={report.patientName || user?.name || 'Authorized Patient'} lang={targetLang} />
          </p>
          <p className="text-xs text-slate-500">ID: {(report.patientId || user?.id || '').split('-')[0].toUpperCase()}</p>
        </div>
        <div className="text-right">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
            <TranslatedText text={t.examinationDate} lang={targetLang} />
          </h5>
          <p className="text-lg font-bold text-slate-900">{report.date}</p>
        </div>
      </div>

      {report.vitals && Object.values(report.vitals).some(v => v) && (
        <div className="grid grid-cols-2 gap-4 mb-12">
          {report.vitals.bp && (
            <div className="bg-rose-50 p-5 rounded-[2rem] border border-rose-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-rose-500 mb-1">❤️</span>
              <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">
                <TranslatedText text={t.bpm || 'BP'} lang={targetLang} />
              </p>
              <p className="text-xl font-black text-rose-700 leading-none">{report.vitals.bp}</p>
            </div>
          )}
          {report.vitals.weight && (
            <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-blue-500 mb-1">⚖️</span>
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">
                <TranslatedText text={t.weight} lang={targetLang} />
              </p>
              <p className="text-xl font-black text-blue-700 leading-none">{report.vitals.weight}</p>
            </div>
          )}
          {(report.vitals as any).glucose && (
            <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-amber-500 mb-1">🔥</span>
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">
                <TranslatedText text={t.glucose || 'Glucose'} lang={targetLang} />
              </p>
              <p className="text-xl font-black text-amber-700 leading-none">{(report.vitals as any).glucose}</p>
            </div>
          )}
          {report.vitals.temperature && (
            <div className="bg-purple-50 p-5 rounded-[2rem] border border-purple-100 flex flex-col items-center text-center shadow-sm">
              <span className="text-purple-500 mb-1">🌡️</span>
              <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">
                <TranslatedText text={t.temperature || 'Temperature'} lang={targetLang} />
              </p>
              <p className="text-xl font-black text-purple-700 leading-none">{report.vitals.temperature}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-10">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
          <TranslatedText text={t.diagnosisReport} lang={targetLang} />
        </h5>
        <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">
              <TranslatedText text={t.predictedCondition} lang={targetLang} />
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              <TranslatedText text={report.diagnosis} lang={targetLang} isClinical={true} />
            </h2>
          </div>
          {report.aiConfidence != null && report.aiConfidence > 0 && (
            <div className="text-right pl-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                <TranslatedText text={t.confidence} lang={targetLang} />
              </p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600">{report.aiConfidence}%</p>
            </div>
          )}
        </div>
      </div>

      {report.summary && (
        <div className="mb-10">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
            <TranslatedText text="Clinical Summary / Extract" lang={targetLang} />
          </h5>
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap shadow-sm">
            <TranslatedText text={report.summary} lang={targetLang} isClinical={true} />
          </div>
        </div>
      )}

      {(report.symptoms?.length > 0 || (report.history && Object.keys(report.history).length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10 items-start">
          {report.symptoms?.length > 0 && (
            <section>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                <TranslatedText text={t.reportedSymptoms} lang={targetLang} />
              </h5>
              <div className="flex flex-wrap gap-2">
                {report.symptoms.map((s: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 capitalize">
                    <TranslatedText text={s.replace(/_/g, ' ')} lang={targetLang} isClinical={true} />
                  </span>
                ))}
              </div>
            </section>
          )}

          {report.history && Object.keys(report.history).length > 0 && (
            <section>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                <TranslatedText text={t.patientHistory} lang={targetLang} />
              </h5>
              <table className="w-full text-left text-xs">
                <tbody>
                  {Object.entries(report.history).map(([k, v]) => (
                    <tr key={k} className="border-b border-slate-50">
                      <td className="py-2 font-bold uppercase text-[9px] text-slate-500 w-1/2">
                        <TranslatedText text={t[k.toLowerCase()] || k} lang={targetLang} />
                      </td>
                      <td className="py-2 text-slate-700 capitalize text-[11px]">
                        {typeof v === 'string' ? (
                          <TranslatedText text={v} lang={targetLang} isClinical={true} />
                        ) : v}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}

      {report.prescription?.length > 0 && (
        <div className="mb-10">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
            <TranslatedText text={t.advicePrecautions} lang={targetLang} />
          </h5>
          <ul className="space-y-3">
            {report.prescription.map((p: string, i: number) => (
              <li key={i} className="text-xs flex items-start space-x-3 text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="font-black text-blue-500 mt-0.5">{i + 1}.</span>
                <p><TranslatedText text={p} lang={targetLang} isClinical={true} /></p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-20 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            <TranslatedText text={t.digitalCert} lang={targetLang} />
          </p>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center font-black text-[10px] text-slate-300">ME</div>
            <p className="text-[9px] font-black text-slate-300 uppercase italic">
              <TranslatedText text={t.authByAI} lang={targetLang} />
            </p>
          </div>
        </div>
        <div className="text-right border-t border-slate-800 w-48 pt-2">
          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
            <TranslatedText text={t.medSignature} lang={targetLang} />
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClinicalReportPaper;
