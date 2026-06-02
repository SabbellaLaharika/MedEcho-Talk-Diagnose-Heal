import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { dbService } from '../services/dbService';
import {
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  CalendarIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import TranslatedText from './TranslatedText';
import { getTranslation, loadTranslations } from '../services/translations';
import { notificationService } from '../services/notificationService';

interface Reminder {
  id: string;
  medicationName: string;
  dosage: string;
  unit: string;
  remindTimes: string[];
  durationDays: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  reportId?: string;
}

const RemindersPage: React.FC<{ user: User }> = ({ user }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const t = getTranslation(user.preferredLanguage);

  // Form state
  const [formData, setFormData] = useState({
    medicationName: '',
    dosage: '',
    unit: 'TABLET',
    times: ['08:00'],
    durationDays: 7
  });

  useEffect(() => {
    loadTranslations(user.preferredLanguage, 'reminders');
    fetchReminders();
    notificationService.requestPermission();
  }, [user.preferredLanguage]);

  const fetchReminders = async () => {
    try {
      const data = await dbService.reminders.getAll();
      setReminders(data);
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (id: string, currentStatus: boolean) => {
    try {
      await dbService.reminders.toggle(id, !currentStatus);
      setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const deleteReminder = async (id: string) => {
    if (!window.confirm(t.deleteReminderConfirm || 'Are you sure you want to delete this reminder?')) return;
    try {
      await dbService.reminders.delete(id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await dbService.reminders.create({
        userId: user.id,
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        unit: formData.unit,
        remindTimes: formData.times,
        durationDays: formData.durationDays
      });
      setIsModalOpen(false);
      const reminderCreatedTitle = t.reminderCreated || 'Reminder Created';
      const reminderCreatedMsg = (t.reminderCreatedSuccess || 'Success! Your reminder for {name} has been set.').replace('{name}', formData.medicationName);
      
      notificationService.notify(reminderCreatedTitle, reminderCreatedMsg);
      await fetchReminders();
    } catch (err) {
      console.error('Create failed:', err);
      notificationService.notify(t.setupFailed || 'Setup Failed', t.setupFailedDesc || 'Could not save the reminder. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const addTimeSlot = () => {
    setFormData(prev => ({ ...prev, times: [...prev.times, '08:00'] }));
  };

  const removeTimeSlot = (index: number) => {
    if (formData.times.length <= 1) return;
    setFormData(prev => ({ ...prev, times: prev.times.filter((_, i) => i !== index) }));
  };

  const updateTimeSlot = (index: number, val: string) => {
    const newTimes = [...formData.times];
    newTimes[index] = val;
    setFormData(prev => ({ ...prev, times: newTimes }));
  };

  const testNotification = () => {
    notificationService.notify(
      t.testNotificationTitle || t.medicalRemindersHeader || 'MedEcho Reminder',
      t.testNotificationBody || 'This is a localized test notification. MedEcho background alerts are active.'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 lg:p-12 space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-4xl font-black text-slate-800 tracking-tight leading-none uppercase">
            <TranslatedText text={t.medicalRemindersHeader} lang={user.preferredLanguage} />
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs">
            <TranslatedText text={t.stayHealthy} lang={user.preferredLanguage} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-slate-900 border-2 border-slate-900 text-white rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <TranslatedText text={t.addCustomReminder} lang={user.preferredLanguage} />
          </button>
          <button
            onClick={testNotification}
            className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 rounded-2xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <BellIcon className="w-4 h-4" />
            <TranslatedText text={t.testAlert} lang={user.preferredLanguage} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reminders.length > 0 ? reminders.map((r) => {
          const startDate = new Date(r.startDate || Date.now());
          const endDate = r.endDate ? new Date(r.endDate) : null;
          
          // Fallback duration calculation if endDate is missing but durationDays exists
          const duration = endDate 
            ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))
            : (r.durationDays || 0);
            
          const isExpired = endDate ? (new Date() > endDate) : false;

          return (
            <div key={r.id} className={`bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border shadow-sm transition-all relative overflow-hidden group ${!r.isActive || isExpired ? 'border-slate-100 opacity-60' : 'border-blue-100 hover:shadow-xl'}`}>
              {!r.isActive && (
                <div className="absolute top-4 right-4">
                  <span className="bg-slate-100 text-slate-400 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                    <TranslatedText text={t.paused} lang={user.preferredLanguage} />
                  </span>
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-3xl ${r.isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircleIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      <TranslatedText text={r.medicationName} lang={user.preferredLanguage} />
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {r.dosage} <TranslatedText text={r.unit.toLowerCase()} lang={user.preferredLanguage} />
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleReminder(r.id, r.isActive)}
                    className={`p-2.5 rounded-xl transition-all ${r.isActive ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                  >
                    {r.isActive ? <NoSymbolIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => deleteReminder(r.id)}
                    className="p-2.5 rounded-xl bg-slate-50 text-slate-300 hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" /> <TranslatedText text={t.scheduledTimes} lang={user.preferredLanguage} />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {r.remindTimes?.map((time, idx) => (
                      <span key={idx} className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-black text-slate-700 shadow-sm">
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> <TranslatedText text={t.durationLabel} lang={user.preferredLanguage} />
                  </p>
                  <p className="text-xs font-bold text-slate-700">
                    {duration} <TranslatedText text={t.daysCount} lang={user.preferredLanguage} />
                    {endDate && (
                      <span className="text-[9px] text-slate-400 block font-medium">
                        <TranslatedText text={t.until} lang={user.preferredLanguage} /> {endDate.toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                <InformationCircleIcon className="w-4 h-4 text-slate-300" />
                <p className="text-[9px] text-slate-400 font-medium">
                  <TranslatedText text={t.remindersAutoNote || t.medicationNotificationNote} lang={user.preferredLanguage} />
                </p>
              </div>
            </div>
          );
        }) : (
          <div className="lg:col-span-2 py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-50 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <NoSymbolIcon className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-300 uppercase tracking-tight">
              <TranslatedText text={t.noActiveReminders} lang={user.preferredLanguage} />
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-2">
              <TranslatedText text={t.remindersEmptySub} lang={user.preferredLanguage} />
            </p>
          </div>
        )}
      </div>

      {/* Modern Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white w-full max-w-xl rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight"><TranslatedText text={t.createReminder || t.addCustomReminder} lang={user.preferredLanguage} /></h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <XMarkIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="p-8 sm:p-10 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block"><TranslatedText text={t.medicationName} lang={user.preferredLanguage} /></label>
                  <input
                    required
                    type="text"
                    value={formData.medicationName}
                    onChange={e => setFormData({ ...formData, medicationName: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                    placeholder={t.medicationPlaceholder || "e.g. Paracetamol"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block"><TranslatedText text={t.dosage} lang={user.preferredLanguage} /></label>
                    <input
                      required
                      type="text"
                      value={formData.dosage}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                      placeholder={t.dosagePlaceholder || "e.g. 500mg or 1"}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block"><TranslatedText text={t.unit} lang={user.preferredLanguage} /></label>
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                    >
                      <option value="Tablet">{t.tablet}</option>
                      <option value="Capsule">{t.capsule}</option>
                      <option value="ML">{t.ml}</option>
                      <option value="MG">{t.mg}</option>
                      <option value="Drops">{t.drops}</option>
                      <option value="Injection">{t.injection}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block"><TranslatedText text={t.scheduledTimes} lang={user.preferredLanguage} /></label>
                  <div className="space-y-3">
                    {formData.times.map((time, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="time"
                          value={time}
                          onChange={e => {
                            const newTimes = [...formData.times];
                            newTimes[idx] = e.target.value;
                            setFormData({ ...formData, times: newTimes });
                          }}
                          className="flex-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold"
                        />
                        {formData.times.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, times: formData.times.filter((_, i) => i !== idx) })}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, times: [...formData.times, '09:00'] })}
                      className="w-full py-3 bg-white border-2 border-dashed border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-500 rounded-xl transition-all font-bold flex items-center justify-center text-xs uppercase tracking-widest"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" /> <TranslatedText text={t.addTime} lang={user.preferredLanguage} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block"><TranslatedText text={t.durationDaysLabel} lang={user.preferredLanguage} /></label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.durationDays}
                    onChange={e => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      <TranslatedText text={t.createReminder} lang={user.preferredLanguage} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;
