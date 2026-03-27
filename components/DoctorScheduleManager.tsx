
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import api from '../services/api';
import { alertService } from '../services/alertService';
import {
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XMarkIcon,
  NoSymbolIcon,
  PlusIcon,
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';
import { getTranslation, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const BLOCK_REASON_KEYS = ['surgery', 'personalLeave', 'emergency', 'conference', 'training', 'otherReason'];

interface DoctorScheduleManagerProps {
  doctor: User;
}

interface DayScheduleData {
  dayIndex: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface BlockedSlotData {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

const DoctorScheduleManager: React.FC<DoctorScheduleManagerProps> = ({ doctor }) => {
  const t = getTranslation(doctor.preferredLanguage);

  useEffect(() => {
    loadTranslations(doctor.preferredLanguage, 'schedule');
  }, [doctor.preferredLanguage]);
  const [schedule, setSchedule] = useState<DayScheduleData[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Block form state
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockStart, setBlockStart] = useState('09:00');
  const [blockEnd, setBlockEnd] = useState('10:00');
  const [blockReason, setBlockReason] = useState('surgery');
  const [blocking, setBlocking] = useState(false);

  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [bulkSlots, setBulkSlots] = useState<{ startTime: string, endTime: string }[]>([
    { startTime: '09:00', endTime: '18:00' }
  ]);


  // Translations are now handled by TranslatedText component in JSX

  useEffect(() => {
    loadData();
  }, [doctor.id]);

  const loadData = async () => {
    try {
      const [schedRes, blockedRes] = await Promise.all([
        api.get(`/schedules/${doctor.id}`),
        api.get(`/schedules/${doctor.id}/blocked`)
      ]);
      setSchedule(schedRes.data);
      setBlockedSlots(blockedRes.data);
    } catch (err) {
      console.error('Failed to load schedule:', err);
    }
  };

  const addSlot = (dayIndex: number) => {
    setSchedule(prev => [...prev, { dayIndex, startTime: '09:00', endTime: '18:00', isActive: true }]);
    setSaved(false);
  };

  const clearDay = (dayIndex: number) => {
    setSchedule(prev => prev.filter(s => s.dayIndex !== dayIndex));
    setSaved(false);
  };

  const addBulkSlot = () => {
    setBulkSlots(prev => [...prev, { startTime: '09:00', endTime: '18:00' }]);
  };

  const removeBulkSlot = (index: number) => {
    setBulkSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateBulkSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setBulkSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const applyBulkHours = () => {
    if (selectedDays.length === 0 || bulkSlots.length === 0) return;

    setSchedule(prev => {
      // Remove existing slots for selected days
      const filtered = prev.filter(s => !selectedDays.includes(s.dayIndex));
      // Create new slots for each selected day based on bulkSlots template
      const newSlots: DayScheduleData[] = [];
      selectedDays.forEach(dayIndex => {
        bulkSlots.forEach(slot => {
          newSlots.push({
            dayIndex,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: true
          });
        });
      });
      return [...filtered, ...newSlots];
    });

    setSelectedDays([]);
    setSaved(false);
  };

  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays(prev => prev.includes(dayIndex) ? prev.filter(id => id !== dayIndex) : [...prev, dayIndex]);
  };

  const removeSlot = (index: number) => {
    setSchedule(prev => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const updateSlot = (index: number, field: keyof DayScheduleData, value: any) => {
    setSchedule(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setSaved(false);
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await api.put(`/schedules/${doctor.id}`, { days: schedule });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save schedule:', err);
      alertService.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockSlot = async () => {
    setBlocking(true);
    try {
      const { data } = await api.post(`/schedules/${doctor.id}/blocked`, {
        date: blockDate,
        startTime: blockStart,
        endTime: blockEnd,
        reason: blockReason
      });
      setBlockedSlots(prev => [...prev, data]);
    } catch (err: any) {
      alertService.error(err.response?.data?.message || 'Failed to block slot');
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await api.delete(`/schedules/${doctor.id}/blocked/${id}`);
      setBlockedSlots(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to unblock:', err);
    }
  };

  // Generate time options for dropdowns
  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  return (
    <div className="p-4 sm:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight uppercase">
            <TranslatedText text={t.mySchedule} lang={doctor.preferredLanguage} />
          </h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            <TranslatedText text={t.scheduleDescription} lang={doctor.preferredLanguage} />
          </p>
        </div>
        <button
          onClick={saveSchedule}
          disabled={saving}
          className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
            }`}
        >
          {saved ? <><CheckCircleIcon className="w-4 h-4" /> <TranslatedText text={t.saved} lang={doctor.preferredLanguage} /></> : saving ? <TranslatedText text={t.saving} lang={doctor.preferredLanguage} /> : <><ShieldCheckIcon className="w-4 h-4" /> <TranslatedText text={t.saveSchedule} lang={doctor.preferredLanguage} /></>}
        </button>
      </div>

      {/* Bulk Settings Tool */}
      <div className="bg-indigo-50/50 rounded-[2rem] p-6 sm:p-8 border-2 border-indigo-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">
              <TranslatedText text={t.bulkTool} lang={doctor.preferredLanguage} />
            </h4>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">
              <TranslatedText text={t.bulkDescription} lang={doctor.preferredLanguage} />
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={addBulkSlot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-200 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <TranslatedText text={t.addSlotTemplate} lang={doctor.preferredLanguage} />
            </button>
            <button
              onClick={applyBulkHours}
              disabled={selectedDays.length === 0 || bulkSlots.length === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all disabled:opacity-30"
            >
              <TranslatedText text={t.applyToSelected} lang={doctor.preferredLanguage} /> ({selectedDays.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bulkSlots.map((slot, idx) => (
            <div key={idx} className="p-4 bg-white rounded-2xl border border-indigo-100 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase">
                    <TranslatedText text={t.from} lang={doctor.preferredLanguage} />
                  </span>
                  <select
                    value={slot.startTime}
                    onChange={(e) => updateBulkSlot(idx, 'startTime', e.target.value)}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black outline-none"
                  >
                    {timeOptions.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase">
                    <TranslatedText text={t.to} lang={doctor.preferredLanguage} />
                  </span>
                  <select
                    value={slot.endTime}
                    onChange={(e) => updateBulkSlot(idx, 'endTime', e.target.value)}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black outline-none"
                  >
                    {timeOptions.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
                  </select>
                </div>
              </div>
              {bulkSlots.length > 1 && (
                <button onClick={() => removeBulkSlot(idx)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
        <div className="p-6 sm:p-8 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              <TranslatedText text={t.weeklyHours} lang={doctor.preferredLanguage} />
            </h3>
          </div>
          <button
            onClick={() => setSelectedDays(selectedDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
          >
            {selectedDays.length === 7 ? <TranslatedText text={t.deselectAll} lang={doctor.preferredLanguage} /> : <TranslatedText text={t.selectAll} lang={doctor.preferredLanguage} />}
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {DAY_KEYS.map((dayKey, dayIndex) => {
            const daySlots = schedule.map((s, idx) => ({ ...s, originalIndex: idx })).filter(s => s.dayIndex === dayIndex);
            const isSelected = selectedDays.includes(dayIndex);

            return (
              <div key={dayIndex} className={`p-5 rounded-[2rem] border-2 transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-50'} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleDaySelection(dayIndex)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 bg-white'}`}
                    >
                      {isSelected && <CheckCircleIcon className="w-4 h-4" />}
                    </button>
                    <span className="font-black text-sm uppercase tracking-wider text-slate-800">
                      <TranslatedText text={t[DAY_KEYS[dayIndex]]} lang={doctor.preferredLanguage} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {daySlots.length > 0 && (
                      <button
                        onClick={() => clearDay(dayIndex)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        <TranslatedText text={t.clearDay} lang={doctor.preferredLanguage} />
                      </button>
                    )}
                    <button
                      onClick={() => addSlot(dayIndex)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <TranslatedText text={t.addSlot} lang={doctor.preferredLanguage} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {daySlots.length > 0 ? daySlots.map((slot) => (
                    <div
                      key={slot.originalIndex}
                      className="p-4 rounded-xl bg-slate-50 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase"><TranslatedText text={t.from} lang={doctor.preferredLanguage} /></span>
                          <select
                            value={slot.startTime}
                            onChange={(e) => updateSlot(slot.originalIndex, 'startTime', e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                          >
                            {timeOptions.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase"><TranslatedText text={t.to} lang={doctor.preferredLanguage} /></span>
                          <select
                            value={slot.endTime}
                            onChange={(e) => updateSlot(slot.originalIndex, 'endTime', e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                          >
                            {timeOptions.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSlot(slot.originalIndex)}
                        className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )) : (
                    <p className="text-center py-4 text-slate-300 font-bold text-xs uppercase">
                      <TranslatedText text={t.noHoursSet} lang={doctor.preferredLanguage} />
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Block Slots */}
      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-slate-50 overflow-hidden">
        <div className="p-6 sm:p-8 border-b bg-rose-50/30 flex items-center gap-3">
          <NoSymbolIcon className="w-5 h-5 text-rose-500" />
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            <TranslatedText text={t.freezeSlotsHeader} lang={doctor.preferredLanguage} />
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {/* Add Block Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                <TranslatedText text={t.date} lang={doctor.preferredLanguage} />
              </label>
              <input
                type="date"
                value={blockDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBlockDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                <TranslatedText text={t.start} lang={doctor.preferredLanguage} />
              </label>
              <select
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                <TranslatedText text={t.end} lang={doctor.preferredLanguage} />
              </label>
              <select
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                <TranslatedText text={t.reason} lang={doctor.preferredLanguage} />
              </label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                {BLOCK_REASON_KEYS.map(rKey => (
                  <option key={rKey} value={rKey}>
                    <TranslatedText text={t[rKey]} lang={doctor.preferredLanguage} />
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBlockSlot}
                disabled={blocking}
                className="w-full h-[46px] bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 justify-center shadow-lg"
              >
                <PlusIcon className="w-4 h-4" />
                <TranslatedText text={t.freeze} lang={doctor.preferredLanguage} />
              </button>
            </div>
          </div>

          {/* Blocked Slots List */}
          {blockedSlots.length > 0 ? (
            <div className="space-y-2">
              {blockedSlots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl flex items-center justify-center">
                      <NoSymbolIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{slot.date} @ {slot.startTime} - {slot.endTime}</p>
                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">
                        <TranslatedText text={t[slot.reason]} lang={doctor.preferredLanguage} />
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => slot.id && handleUnblock(slot.id)}
                    className="p-2.5 hover:bg-rose-100 rounded-xl text-rose-400 hover:text-rose-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-300 font-black uppercase text-[10px] tracking-widest">
              <TranslatedText text={t.noFrozenSlots} lang={doctor.preferredLanguage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorScheduleManager;
