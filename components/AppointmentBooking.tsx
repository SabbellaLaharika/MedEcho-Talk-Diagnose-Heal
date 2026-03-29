import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { dbService } from '../services/dbService';
import api, { API_URL } from '../services/api';
import { getTranslation, translateClinical, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';
import { User, Appointment } from '../types';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  UserIcon,
  NoSymbolIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';

interface AppointmentBookingProps {
  onBook: (appointment: Partial<Appointment>) => Promise<void>;
  onBookingComplete?: () => void;
  user: User;
  preselectedDoctorId?: string | null;
}

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({ onBook, onBookingComplete, user, preselectedDoctorId }) => {
  const t = getTranslation(user.preferredLanguage);

  useEffect(() => {
    loadTranslations(user.preferredLanguage, 'booking');
  }, [user.preferredLanguage]);

  // 1. STATES
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ time: string; date: string }[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<User | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [type, setType] = useState<'VIRTUAL' | 'IN_PERSON'>('IN_PERSON');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookedAptSummary, setBookedAptSummary] = useState<any>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);

  // 2. REFS
  const socketRef = useRef<Socket | null>(null);

  // 3. SOCKET CONNECTION
  useEffect(() => {
    // Initialize Socket
    const socketUrl = API_URL.replace('/api', '');
    socketRef.current = io(socketUrl);

    // Listen for real-time updates from other users
    socketRef.current.on("appointment_booked", (newApt: { time: string; date: string }) => {
      setBookedSlots((prev) => [...prev, newApt]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 4. INITIAL DATA LOAD
  useEffect(() => {
    const loadData = async () => {
      try {
        const doctorsList = await dbService.users.getDoctors();

        const preferredOrder = [
          'Dr. L. Chalapathi Rao',
          'Dr. M. Murali Krishna',
          'Dr. Kishor'
        ];

        const sortedDoctors = [...doctorsList].sort((a, b) => {
          let indexA = preferredOrder.findIndex(name => a.name.includes(name));
          let indexB = preferredOrder.findIndex(name => b.name.includes(name));
          if (indexA === -1) indexA = 99;
          if (indexB === -1) indexB = 99;
          return indexA - indexB;
        });

        const uniqueDoctorMap = new Map<string, User>();
        for (const doc of sortedDoctors) {
          const key = (doc.name || '').trim().toLowerCase();
          if (!uniqueDoctorMap.has(key)) {
            uniqueDoctorMap.set(key, doc);
          }
        }

        const allDocs = Array.from(uniqueDoctorMap.values());
        setDoctors(allDocs);

        // Auto-select pre-selected doctor
        if (preselectedDoctorId) {
          const found = allDocs.find(d => d.id === preselectedDoctorId);
          if (found) setSelectedDoc(found);
        }
      } catch (err) {
        console.error("Failed to load booking data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Translations are now handled by TranslatedText component in JSX

  // 5. FETCH SELECTED DOCTOR SCHEDULE
  useEffect(() => {
    if (!selectedDoc) return;
    const fetchSchedule = async () => {
      try {
        const [schedRes, blockedRes, bookedRes] = await Promise.all([
          api.get(`/schedules/${selectedDoc.id}`),
          api.get(`/schedules/${selectedDoc.id}/blocked`),
          api.get(`/appointments/doctor/${selectedDoc.id}/booked`)
        ]).catch(() => [{ data: [] }, { data: [] }, { data: [] }]);

        setDoctorSchedule(schedRes?.data || []);
        setBlockedSlots(blockedRes?.data || []);
        setBookedSlots(bookedRes?.data || []);
      } catch (err) {
        console.warn("Schedule fetch failed, defaulting to no slots:", err);
        setDoctorSchedule([]);
        setBlockedSlots([]);
        setBookedSlots([]);
      }
    };
    fetchSchedule();
  }, [selectedDoc]);

  // 6. HELPER: GENERATE TIME SLOTS
  const generateSlots = (startTime: string, endTime: string) => {
    const slots: string[] = [];
    let [h, m] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const endTotal = endH * 60 + endM;

    while ((h * 60 + m) < endTotal) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      m += 30;
      if (m >= 60) { h += 1; m = 0; }
    }
    return slots;
  };

  // 7. MEMOIZED AVAILABLE SLOTS
  const availableSlots = useMemo(() => {
    if (!selectedDoc || !date) return [];
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getUTCDay();

    let schedules = doctorSchedule.filter((s: any) => s.dayIndex === dayOfWeek && s.isActive);

    // Default 9-6 schedule if none provided
    if (schedules.length === 0 && doctorSchedule.length === 0) {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        schedules.push({ startTime: '09:00', endTime: '18:00', isActive: true });
      }
    }

    if (schedules.length === 0) return [];

    let allSlots: string[] = [];
    schedules.forEach(sched => {
      allSlots = [...allSlots, ...generateSlots(sched.startTime, sched.endTime)];
    });

    let slots = Array.from(new Set(allSlots)).sort();

    // Filter Blocked
    const blockedForDate = blockedSlots.filter(b => b.date === date);
    slots = slots.filter(slotTime => {
      return !blockedForDate.some(b => slotTime >= b.startTime && slotTime < b.endTime);
    });

    // Filter Already Booked (Global — from server, includes ALL patients)
    const bookedForDate = bookedSlots.filter(
      b => new Date(b.date).toISOString().split('T')[0] === date
    );
    slots = slots.filter(slotTime => !bookedForDate.some(b => b.time === slotTime));

    return slots;
  }, [selectedDoc, date, doctorSchedule, blockedSlots, bookedSlots]);

  // 11. HELPER: IS PAST SLOT
  const isPastSlot = (time: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (date !== today) return false;
    
    const [h, m] = time.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    // 5 min buffer
    return (h * 60 + m) <= (currentH * 60 + currentM + 5);
  };

  // 8. HANDLERS
  const handleBookClick = async () => {
    if (!selectedDoc) return;
    const summary = {
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      doctorAvatar: selectedDoc.avatar,
      doctorContact: selectedDoc.contact || '',
      date,
      time: selectedTime,
      type
    };
    
    setIsBooking(true);
    setBookingError(null);
    try {
      await onBook(summary);
      setBookedAptSummary(summary);
      setShowSuccessModal(true);
      socketRef.current?.emit("new_appointment", summary);
    } catch (e: any) {
      setBookingError(e.message || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const confirmFinalBooking = () => {
    setShowSuccessModal(false);
    if (onBookingComplete) {
      onBookingComplete();
    }
  };

  const filteredDoctors = doctors.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight uppercase">{t.bookVisit}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">{t.selectTime}</p>
        </div>
        <div className="relative w-full md:w-96">
          <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input
            type="text"
            placeholder={t.searchSpecialists}
            className="w-full pl-12 pr-5 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Doctor List */}
        <div className={`lg:col-span-5 space-y-4 ${selectedDoc ? 'hidden lg:block' : 'block'}`}>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.specialists}</label>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              // Skeleton Loaders
              [...Array(4)].map((_, i) => (
                <div key={i} className="w-full p-6 rounded-[2rem] border-2 border-slate-50 bg-white/50 animate-pulse flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200"></div>
                    <div className="space-y-2">
                      <div className="h-5 bg-slate-200 rounded-md w-32"></div>
                      <div className="h-3 bg-slate-200 rounded-md w-24"></div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                </div>
              ))
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <NoSymbolIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{t.noDoctorsFound}</p>
              </div>
            ) : (
              filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDoc(doc); setSelectedTime(null); } }}
                  onClick={() => { setSelectedDoc(doc); setSelectedTime(null); }}
                  className={`w-full text-left p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all cursor-pointer ${selectedDoc?.id === doc.id ? 'border-indigo-600 bg-white shadow-xl' : 'border-slate-50 bg-white/50 hover:border-indigo-100'
                    }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <img src={doc.avatar} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-50 shadow-sm" />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${doc.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-black text-slate-800 text-lg leading-tight truncate">
                        <TranslatedText text={doc.name} lang={user.preferredLanguage} />
                      </p>
                      <p className="text-[10px] font-black text-indigo-500 uppercase mt-1 truncate">
                        {translateClinical(doc.specialization || '', user.preferredLanguage)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const phone = doc.contact || '6300292724';
                        const clean = phone.replace(/[^\d+]/g, '');
                        if (clean.length > 0) window.location.href = `tel:${clean}`;
                      }}
                      className="text-[10px] font-black uppercase text-white bg-emerald-500 px-2 py-1 rounded-full"
                    >
                      {t.call}
                    </button>
                    <ChevronRightIcon className={`w-4 h-4 ${selectedDoc?.id === doc.id ? 'text-indigo-600' : 'text-slate-200'}`} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Booking Panel */}
        <div className={`lg:col-span-7 bg-white rounded-[3rem] lg:rounded-[4rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col min-h-[500px] ${!selectedDoc ? 'hidden lg:flex' : 'flex'}`}>
          {selectedDoc ? (
            <div className="flex-1 flex flex-col">
              <div className="p-6 sm:p-10 border-b bg-slate-50/50 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <button onClick={() => setSelectedDoc(null)} className="lg:hidden text-[10px] font-black uppercase text-indigo-600 underline">← {t.backToList}</button>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-3 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] sm:text-[10px] font-black outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 truncate">
                    <TranslatedText text={selectedDoc.name} lang={user.preferredLanguage} />
                  </h3>
                  <div className="flex gap-1.5 sm:gap-2">
                    <button onClick={() => setType('IN_PERSON')} className={`text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full border ${type === 'IN_PERSON' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400'}`}>{t.inPerson}</button>
                    <button onClick={() => setType('VIRTUAL')} className={`text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full border ${type === 'VIRTUAL' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400'}`}>{t.virtual}</button>
                  </div>
                </div>
              </div>

              <div className="p-10 flex-1">
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {availableSlots.map((time) => {
                      const disabled = isPastSlot(time);
                      return (
                        <button
                          key={time}
                          disabled={disabled}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 sm:py-4 px-1 sm:px-2 rounded-xl sm:rounded-2xl border-2 font-black text-[10px] sm:text-xs transition-all relative ${selectedTime === time
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
                            : disabled
                              ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-white border-slate-50 text-slate-600 hover:border-indigo-100'
                            }`}
                        >
                          {time}
                          {disabled && (
                            <div className="absolute top-1 right-1">
                              <NoSymbolIcon className="w-3 h-3 text-slate-200" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                    <p className="text-slate-300 font-bold uppercase text-[10px]">{t.noAvailability}</p>
                  </div>
                )}
              </div>

              <div className="p-10 pt-0">
                <button
                  onClick={handleBookClick}
                  disabled={!selectedTime || isBooking}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl flex items-center justify-center space-x-2 font-black uppercase text-xs tracking-widest disabled:opacity-20"
                >
                  <CheckBadgeIcon className="w-4 h-4" />
                  <span>{isBooking ? t.verifying || "Verifying..." : t.reviewAndBook}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-8">
              <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] flex items-center justify-center text-indigo-200">
                <UserIcon className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{t.selectSpecialist}</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">{t.searchSpecialists}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && bookedAptSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-emerald-600 p-6 sm:p-10 flex flex-col items-center text-white text-center">
              <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 mb-4" />
              <h3 className="text-xl sm:text-2xl font-black uppercase">{t.confirmed}</h3>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-400 font-black uppercase text-[9px] sm:text-[10px]">{t.doctor}</span>
                  <span className="font-black text-slate-800">
                    <TranslatedText text={bookedAptSummary.doctorName} lang={user.preferredLanguage} />
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-400 font-black uppercase text-[9px] sm:text-[10px]">{t.time}</span>
                  <span className="font-black text-slate-800">{bookedAptSummary.date} @ {bookedAptSummary.time}</span>
                </div>
              </div>
              <button
                onClick={confirmFinalBooking}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] sm:text-[10px] tracking-widest"
              >
                {t.dashboard}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {bookingError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-rose-600 p-10 flex flex-col items-center text-white text-center">
              <ExclamationCircleIcon className="w-12 h-12 mb-4" />
              <h3 className="text-2xl font-black uppercase">
                <TranslatedText text="Error" lang={user.preferredLanguage} />
              </h3>
            </div>
            <div className="p-10 space-y-6">
              <div className="text-center">
                <p className="text-slate-600 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                  <TranslatedText text={bookingError} lang={user.preferredLanguage} />
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingError(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-colors"
              >
                <TranslatedText text="Try Again" lang={user.preferredLanguage} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentBooking;