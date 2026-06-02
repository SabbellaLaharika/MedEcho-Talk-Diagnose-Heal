import React, { useState, useEffect } from 'react';
import { alertService } from '../services/alertService';
import TranslatedText from './TranslatedText';
import { ExclamationCircleIcon, CheckCircleIcon, BellIcon } from '@heroicons/react/24/solid';

const GlobalAlertModal = ({ fallbackLang }: { fallbackLang: string }) => {
  const [globalAlert, setGlobalAlert] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    const unsubscribe = alertService.subscribe((message, type) => {
      setGlobalAlert({ message, type });
    });
    return unsubscribe;
  }, []);

  if (!globalAlert) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className={`p-10 flex flex-col items-center text-white text-center ${globalAlert.type === 'error' ? 'bg-rose-600' : globalAlert.type === 'success' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          {globalAlert.type === 'error' ? (
            <ExclamationCircleIcon className="w-12 h-12 mb-4" />
          ) : globalAlert.type === 'success' ? (
            <CheckCircleIcon className="w-12 h-12 mb-4" />
          ) : (
            <BellIcon className="w-12 h-12 mb-4" />
          )}
          <h3 className="text-2xl font-black uppercase">
            <TranslatedText text={globalAlert.type === 'error' ? 'Error' : globalAlert.type === 'success' ? 'Success' : 'Notice'} lang={fallbackLang} />
          </h3>
        </div>
        <div className="p-10 space-y-6">
          <div className="text-center">
            <p className="text-slate-700 font-semibold text-sm leading-relaxed">
              <TranslatedText text={globalAlert.message} lang={fallbackLang} />
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalAlert(null)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-colors"
          >
            <TranslatedText text="Dismiss" lang={fallbackLang} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalAlertModal;
