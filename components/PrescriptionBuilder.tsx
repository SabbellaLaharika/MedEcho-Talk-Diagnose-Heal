import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getTranslation } from '../services/translations';
import TranslatedText from './TranslatedText';

export type MedicationUnit = 'TABLET' | 'CAPSULE' | 'ML' | 'MG' | 'DROPS' | 'INJECTION';

export interface Prescription {
  name: string;
  dosage: string;
  unit: MedicationUnit;
  times: string[];
  days: number;
}

interface PrescriptionBuilderProps {
  onPrescriptionsChange: (prescriptions: Prescription[]) => void;
  initialPrescriptions?: Prescription[];
  lang: string;
}

const PrescriptionBuilder: React.FC<PrescriptionBuilderProps> = ({ onPrescriptionsChange, initialPrescriptions = [], lang }) => {
  const t = getTranslation(lang);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions);
  const units: MedicationUnit[] = ['TABLET', 'CAPSULE', 'ML', 'MG', 'DROPS', 'INJECTION'];

  // Sync with parent state if prescriptions are added externally (e.g., by AI)
  useEffect(() => {
    if (JSON.stringify(prescriptions) !== JSON.stringify(initialPrescriptions)) {
       setPrescriptions(initialPrescriptions);
    }
  }, [initialPrescriptions]);

  const handleAddMedication = () => {
    const newPrescription: Prescription = {
      name: '',
      dosage: '',
      unit: 'TABLET',
      times: ['08:00'],
      days: 5
    };
    const updated = [...prescriptions, newPrescription];
    setPrescriptions(updated);
    onPrescriptionsChange(updated);
  };

  const handleUpdateMedication = (index: number, field: keyof Prescription, value: any) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
    onPrescriptionsChange(updated);
  };

  const handleRemoveMedication = (index: number) => {
    const updated = prescriptions.filter((_, i) => i !== index);
    setPrescriptions(updated);
    onPrescriptionsChange(updated);
  };

  const handleAddTime = (index: number) => {
    const updated = [...prescriptions];
    updated[index].times = [...updated[index].times, '12:00'];
    setPrescriptions(updated);
    onPrescriptionsChange(updated);
  };

  const handleUpdateTime = (pIndex: number, tIndex: number, value: string) => {
    const updated = [...prescriptions];
    updated[pIndex].times[tIndex] = value;
    setPrescriptions(updated);
    onPrescriptionsChange(updated);
  };

  const handleRemoveTime = (pIndex: number, tIndex: number) => {
    const updated = [...prescriptions];
    updated[pIndex].times = updated[pIndex].times.filter((_, i) => i !== tIndex);
    setPrescriptions(updated);
    onPrescriptionsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-white uppercase tracking-widest"><TranslatedText text={t.prescriptionsRemindersHeader || 'Prescriptions & Reminders'} lang={lang} /></h3>
        <button
          onClick={handleAddMedication}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-blue-900/20"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span><TranslatedText text={t.addMedicine || 'Add Medicine'} lang={lang} /></span>
        </button>
      </div>

      <div className="space-y-3">
        {prescriptions.map((p, i) => (
          <div key={i} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 space-y-3 group">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold outline-none focus:border-blue-500"
                placeholder={t.medicinePlaceholder || "Medicine Name"}
                value={p.name}
                onChange={(e) => handleUpdateMedication(i, 'name', e.target.value)}
              />
              <button
                onClick={() => handleRemoveMedication(i)}
                className="p-2 text-slate-500 hover:text-rose-500 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold outline-none focus:border-blue-500"
                  placeholder={t.dosagePlaceholder || "Dosage"}
                  value={p.dosage}
                  onChange={(e) => handleUpdateMedication(i, 'dosage', e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-[10px] font-bold outline-none focus:border-blue-500 cursor-pointer"
                  value={p.unit}
                  onChange={(e) => handleUpdateMedication(i, 'unit', e.target.value)}
                >
                  {units.map((unit) => (
                    <option key={unit} value={unit}>{t[unit.toLowerCase()] || unit}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 relative flex items-center">
                 <input
                    type="number"
                    min="1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold outline-none focus:border-blue-500 pr-8"
                    placeholder={t.daysPlaceholder || "Days"}
                    value={p.days}
                    onChange={(e) => handleUpdateMedication(i, 'days', parseInt(e.target.value) || 1)}
                 />
                 <span className="absolute right-3 text-[8px] font-black text-slate-500 uppercase"><TranslatedText text={t.daysPlaceholder || 'Days'} lang={lang} /></span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  <TranslatedText text={t.scheduledTimes || 'Scheduled Times'} lang={lang} />
                </p>
                <button
                  onClick={() => handleAddTime(i)}
                  className="text-[9px] font-black text-blue-500 hover:underline uppercase"
                >
                  <TranslatedText text={t.addTime || '+ Add Time'} lang={lang} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.times.map((time, tIndex) => (
                  <div key={tIndex} className="relative group/time">
                    <input
                      type="time"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-[10px] font-bold outline-none focus:border-blue-400"
                      value={time}
                      onChange={(e) => handleUpdateTime(i, tIndex, e.target.value)}
                    />
                    {p.times.length > 1 && (
                      <button
                        onClick={() => handleRemoveTime(i, tIndex)}
                        className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/time:opacity-100 transition-opacity hover:bg-rose-500"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {prescriptions.length === 0 && (
          <div className="py-6 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest"><TranslatedText text={t.noPrescriptionsAdded || 'No prescriptions added yet'} lang={lang} /></p>
          </div>
      )}
    </div>
  );
};

export default PrescriptionBuilder;
