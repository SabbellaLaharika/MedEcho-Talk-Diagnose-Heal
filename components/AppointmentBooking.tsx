import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { dbService } from '../services/dbService';
import api from '../services/api';
import { getTranslation, translateClinical } from '../services/translations';
import { User, Appointment } from '../types';
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/solid';

interface AppointmentBookingProps {
  onBook: (appointment: Partial<Appointment>) => void;
  user: User;
}

const AppointmentBooking: React.FC<AppointmentBookingProps> = ({ onBook, user }) => {
  const t = getTranslation(user.preferredLanguage);

  // 1. STATES
  const [doctors, setDoctors] = useState<User[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<User | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [type, setType] = useState<'VIRTUAL' | 'IN_PERSON'>('IN_PERSON');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookedAptSummary, setBookedAptSummary] = useState<any>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);

  // 2. REFS
  const socketRef = useRef<Socket | null>(null);

  // 3. SOCKET CONNECTION
  useEffect(() => {
    // Initialize Socket
    socketRef.current = io("http://localhost:5000");

    // Listen for real-time updates from other users
    socketRef.current.on("appointment_booked", (newApt: Appointment) => {
      setAllAppointments((prev) => [...prev, newApt]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 4. INITIAL DATA LOAD
  useEffect(() => {
    const loadData = async () => {
      try {
        const [doctorsList, apts] = await Promise.all([
          dbService.users.getDoctors(),
          dbService.appointments.getAll()
        ]);

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

        setDoctors(Array.from(uniqueDoctorMap.values()));
        setAllAppointments(apts || []);
      } catch (err) {
        console.error("Failed to load booking data:", err);
      }
    };
    loadData();
  }, []);

  // 5. FETCH SELECTED DOCTOR SCHEDULE
  useEffect(() => {
    if (!selectedDoc) return;
    const fetchSchedule = async () => {
      try {
        const [schedRes, blockedRes] = await Promise.all([
          api.get(`/schedules/${selectedDoc.id}`),
          api.get(`/schedules/${selectedDoc.id}/blocked`)
        ]).catch(() => [{ data: [] }, { data: [] }]); // Correct fallback array

        setDoctorSchedule(schedRes?.data || []);
        setBlockedSlots(blockedRes?.data || []);
      } catch (err) {
        console.warn("Schedule fetch failed, defaulting to no slots:", err);
        setDoctorSchedule([]);
        setBlockedSlots([]);
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

    // Filter Already Booked (Real-time update from Socket works here)
    const bookedForDate = allAppointments.filter(
      a => a.doctorId === selectedDoc.id &&
        (a.date === date || new Date(a.date).toISOString().split('T')[0] === date) &&
        a.status !== 'CANCELLED'
    );
    slots = slots.filter(slotTime => !bookedForDate.some(a => a.time === slotTime));

    return slots;
  }, [selectedDoc, date, doctorSchedule, blockedSlots, allAppointments]);

  // 8. HANDLERS
  const handleBookClick = () => {
    if (!selectedDoc || !selectedTime) return;
    const summary = {
      doctorId: selectedDoc.id,
      doctorName: selectedDoc.name,
      doctorAvatar: selectedDoc.avatar,
      doctorContact: selectedDoc.contact || selectedDoc?.contact || '',
      date,
      time: selectedTime,
      type
    };
    setBookedAptSummary(summary);
    setShowSuccessModal(true);
  };

  const confirmFinalBooking = () => {
    if (bookedAptSummary) {
      onBook(bookedAptSummary);
      // Emit to server so others see this slot as taken
      socketRef.current?.emit("new_appointment", bookedAptSummary);
    }
    setShowSuccessModal(false);
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
            {filteredDoctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => { setSelectedDoc(doc); setSelectedTime(null); }}
                className={`w-full p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all ${selectedDoc?.id === doc.id ? 'border-indigo-600 bg-white shadow-xl' : 'border-slate-50 bg-white/50 hover:border-indigo-100'
                  }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="relative flex-shrink-0">
                    <img src={doc.avatar} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-50 shadow-sm" />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${doc.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-black text-slate-800 text-lg leading-tight truncate">{doc.name}</p>
                    <p className="text-[10px] font-black text-indigo-500 uppercase mt-1 truncate">
                      {translateClinical(doc.specialization || '', user.preferredLanguage)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const phone = doc.contact || doc?.contact || '6300292724';
                      const clean = phone.replace(/[^\d+]/g, '');
                      if (clean.length > 0) window.location.href = `tel:${clean}`;
                    }}
                    className="text-[10px] font-black uppercase text-white bg-emerald-500 px-2 py-1 rounded-full"
                  >
                    Call
                  </button>
                  <ChevronRightIcon className={`w-4 h-4 ${selectedDoc?.id === doc.id ? 'text-indigo-600' : 'text-slate-200'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Booking Panel */}
        <div className={`lg:col-span-7 bg-white rounded-[4rem] shadow-xl border border-slate-50 overflow-hidden flex flex-col min-h-[500px] ${!selectedDoc ? 'hidden lg:flex' : 'flex'}`}>
          {selectedDoc ? (
            <div className="flex-1 flex flex-col">
              <div className="p-10 border-b bg-slate-50/50 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <button onClick={() => setSelectedDoc(null)} className="lg:hidden text-[10px] font-black uppercase text-indigo-600 underline">← {t.backToList}</button>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-800 truncate">{selectedDoc.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setType('IN_PERSON')} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${type === 'IN_PERSON' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400'}`}>{t.inPerson}</button>
                    <button onClick={() => setType('VIRTUAL')} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${type === 'VIRTUAL' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400'}`}>{t.virtual}</button>
                  </div>
                </div>
              </div>

              <div className="p-10 flex-1">
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-4 px-2 rounded-2xl border-2 font-black text-xs transition-all ${selectedTime === time
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
                            : 'bg-white border-slate-50 text-slate-600 hover:border-indigo-100'
                          }`}
                      >
                        {time}
                      </button>
                    ))}
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
                  disabled={!selectedTime}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl flex items-center justify-center space-x-2 font-black uppercase text-xs tracking-widest disabled:opacity-20"
                >
                  <CheckBadgeIcon className="w-4 h-4" />
                  <span>{t.reviewAndBook}</span>
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
            <div className="bg-emerald-600 p-10 flex flex-col items-center text-white text-center">
              <CheckCircleIcon className="w-12 h-12 mb-4" />
              <h3 className="text-2xl font-black uppercase">{t.confirmed}</h3>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-black uppercase text-[10px]">{t.doctor}</span>
                  <span className="font-black text-slate-800">{bookedAptSummary.doctorName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-black uppercase text-[10px]">{t.time}</span>
                  <span className="font-black text-slate-800">{bookedAptSummary.date} @ {bookedAptSummary.time}</span>
                </div>
              </div>
              <button
                onClick={confirmFinalBooking}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
              >
                {t.dashboard}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentBooking;