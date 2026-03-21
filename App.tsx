import React, { useState, useEffect, useCallback } from 'react';
import { User, Appointment, MedicalReport, BlockedSlot, DaySchedule, TimeSlot, AppNotification } from './types';
import { dbService } from './services/dbService';
import Sidebar from './components/Sidebar';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import AppointmentBooking from './components/AppointmentBooking';
import ReportsList from './components/ReportsList';
import AIChatAssistant from './components/AIChatAssistant';
import VirtualDoctor from './components/VirtualDoctor';
import FloatingAIChat from './components/FloatingAIChat';
import DoctorScheduleManager from './components/DoctorScheduleManager';
import ProfilePage from './components/ProfilePage';
import { getTranslation, loadTranslations, subscribeToTranslations, translateString } from './services/translations';
import TranslatedText from './components/TranslatedText';
import {
  UserIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  ClockIcon,
  NoSymbolIcon,
  PlusIcon,
  TrashIcon,
  BoltIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
  BellIcon,
  CheckIcon,
  Bars3Icon
} from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const t = getTranslation(user?.preferredLanguage);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [, setTick] = useState(0); // For forcing re-render on translation load

  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authRole, setAuthRole] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');

  const [formData, setFormData] = useState({ name: '', email: '', password: '', language: 'en' });

  const generateReminders = useCallback((user: User, apts: Appointment[]) => {
    const today = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    const newNotifications: AppNotification[] = [];
    apts.forEach(apt => {
      if (apt.status !== 'PENDING') return;
      const aptDate = new Date(apt.date);
      const timeDiff = aptDate.getTime() - today.getTime();

      if (timeDiff > 0 && timeDiff <= oneDayInMs) {
        newNotifications.push({
          id: `reminder-${apt.id}`,
          userId: user.id,
          title: <TranslatedText text="Appointment Reminder" lang={user.preferredLanguage} />,
          message: <TranslatedText text={`Your visit with ${user.role === 'DOCTOR' ? apt.patientName : apt.doctorName} is tomorrow at ${apt.time}.`} lang={user.preferredLanguage} />,
          type: 'REMINDER',
          timestamp: new Date(),
          isRead: false,
          appointmentId: apt.id
        });
      }
    });

    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
      return [...uniqueNew, ...prev];
    });
  }, []);

  useEffect(() => {
    dbService.init();
    const currentUser = dbService.auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadTranslations(currentUser.preferredLanguage, 'common');
    } else {
      loadTranslations('en', 'common');
    }
    setLoading(false);

    // Subscribe to translation updates to re-render UI
    const unsubscribe = subscribeToTranslations(() => setTick(t => t + 1));
    return unsubscribe;
  }, []);

  // Translations are now handled by TranslatedText component in JSX

  useEffect(() => {
    if (user) {
      loadTranslations(user.preferredLanguage, 'common');
      loadTranslations(user.preferredLanguage, 'dashboard'); // Pre-load dashboard
      const fetchData = async () => {
        const [apts, reps] = await Promise.all([
          dbService.appointments.getAll(),
          dbService.reports.getAll()
        ]);

        if (user.role === 'DOCTOR') {
          setAppointments(apts.filter(a => a.doctorId === user.id));
          // For doctors, we might show all patient reports they've generated
          const doctorReports = reps.filter(r => r.doctorId === user.id);
          setReports(doctorReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
          setAppointments(apts.filter(a => a.patientId === user.id));
          const patientReports = reps.filter(r => r.patientId === user.id);
          setReports(patientReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
        generateReminders(user, apts);
      };
      fetchData();
    }
  }, [user, generateReminders]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'LOGIN') {
        const loggedUser = await dbService.auth.login(formData.email, formData.password);
        if (loggedUser.role !== authRole) throw new Error(`Role mismatch. Use ${loggedUser.role} portal.`);
        setUser(loggedUser);
      } else {
        const newUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name,
          email: formData.email,
          role: authRole,
          preferredLanguage: formData.language,
          avatar: `https://picsum.photos/200?random=${Math.random()}`,
          isAvailable: true,
          daySchedules: Array.from({ length: 7 }, (_, i) => ({ dayIndex: i, slots: [{ startTime: '09:00', endTime: '17:00' }], isActive: i >= 1 && i <= 5 })),
          blockedSlots: []
        };
        const registered = await dbService.auth.register(newUser, formData.password);
        setUser(registered);
      }
      setActiveTab('dashboard');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    dbService.auth.logout();
    setUser(null);
    setNotifications([]);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-gradient p-4 sm:p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-500/10 blur-[150px] rounded-full"></div>
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center z-10">
          <div className="hidden lg:flex flex-col space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl transform rotate-6">
                <span className="text-4xl font-black text-blue-600">ME</span>
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter">MedEcho</h1>
            </div>
            <p className="text-slate-400 text-2xl font-medium max-w-lg leading-relaxed">
              <TranslatedText text={t.precisionHealthDesc} lang={formData.language} />
            </p>
          </div>

          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden w-full max-w-lg mx-auto">
            <div className="p-1 flex border-b bg-slate-50">
              <button
                onClick={() => setAuthRole('PATIENT')}
                className={`flex-1 py-5 flex flex-col items-center space-y-2 transition-all ${authRole === 'PATIENT' ? 'bg-white border-b-4 border-blue-600' : 'opacity-40 hover:opacity-100'}`}
              >
                <UserIcon className={`w-6 h-6 ${authRole === 'PATIENT' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  <TranslatedText text={t.patientPortal} lang={formData.language} />
                </span>
              </button>
              <button
                onClick={() => setAuthRole('DOCTOR')}
                className={`flex-1 py-5 flex flex-col items-center space-y-2 transition-all ${authRole === 'DOCTOR' ? 'bg-white border-b-4 border-indigo-600' : 'opacity-40 hover:opacity-100'}`}
              >
                <BriefcaseIcon className={`w-6 h-6 ${authRole === 'DOCTOR' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  <TranslatedText text={t.clinicalStaff} lang={formData.language} />
                </span>
              </button>
            </div>

            <div className="p-8 sm:p-14 space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
                  <TranslatedText text={authMode === 'LOGIN' ? t.secureAccess : t.createCredentials} lang={formData.language} />
                </h2>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'REGISTER' && (
                  <>
                    <input required type="text" placeholder={t.legalFullName} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold appearance-none text-slate-500" value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })}>
                      <option value="en">English (Global)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="te">Telugu (తెలుగు)</option>
                      <option value="ta">Tamil (தமிழ்)</option>
                      <option value="mr">Marathi (मराठी)</option>
                      <option value="bn">Bengali (বাংলা)</option>
                      <option value="kn">Kannada (ಕನ್ನಡ)</option>
                      <option value="ml">Malayalam (മലയാളం)</option>
                      <option value="gu">Gujarati (ગુજરાતી)</option>
                      <option value="pa">Punjabi (ਪੰਜਾਬీ)</option>
                    </select>
                  </>
                )}
                <input required type="email" placeholder={t.primaryEmail} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                <input required type="password" placeholder={t.changePassword} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                <button type="submit" disabled={authLoading} className={`w-full py-5 rounded-2xl text-white font-black uppercase text-xs shadow-xl tracking-widest ${authRole === 'PATIENT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {authLoading ? <TranslatedText text="Verifying..." lang={formData.language} /> : (authMode === 'LOGIN' ? <TranslatedText text="Sign In" lang={formData.language} /> : <TranslatedText text="Register" lang={formData.language} />)}
                </button>
              </form>
              <button onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-blue-600">
                <TranslatedText text={authMode === 'LOGIN' ? t.joinMedEcho : t.alreadyHaveAccess} lang={formData.language} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-inter relative">
      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Responsive Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-[60] lg:z-30 h-full`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          role={user.role}
          user={user}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col h-full">
        {/* Responsive Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-6 sm:px-10 py-5 sm:py-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-slate-800">
              <TranslatedText text={
                activeTab === 'dashboard' ? (t.dashboard || 'Dashboard') :
                  activeTab === 'appointments' ? (t.bookVisit || 'Book Visit') :
                    activeTab === 'schedule' ? (t.mySchedule || 'My Schedule') :
                      activeTab === 'reports' ? (t.medicalFiles || 'Medical Files') :
                        activeTab === 'chat' ? (t.chatSupport || 'Chat Support') :
                          activeTab === 'virtual-doc' ? (t.virtualDoctor || 'Virtual Doctor') :
                            activeTab === 'profile' ? (t.myProfile || 'My Profile') : activeTab.replace('-', ' ')
              } lang={user.preferredLanguage} />
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-3 rounded-2xl transition-all relative ${showNotifications ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-white"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="hidden sm:flex items-center space-x-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all active:scale-95"
            >
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=f1f5f9&color=64748b`}
                className="w-8 h-8 rounded-xl object-cover"
                alt={user.name}
              />
              <span className="text-[10px] font-black uppercase text-slate-700 truncate max-w-[100px]">
                <TranslatedText text={user.name} lang={user.preferredLanguage} />
              </span>
            </button>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="flex-1">
          {activeTab === 'dashboard' && (
            user.role === 'DOCTOR'
              ? <DoctorDashboard
                doctor={user}
                appointments={appointments}
                reports={reports}
                onUpdateUser={async (u) => {
                  try {
                    const updated = await dbService.auth.updateUser(u);
                    setUser(updated);
                  } catch (e) {
                    console.error("Failed to update user:", e);
                  }
                }}
                onUpdateAppointment={async (u) => {
                  try {
                    const updated = await dbService.appointments.update(u);
                    setAppointments(p => p.map(a => a.id === updated.id ? updated : a));
                  } catch (e) {
                    console.error("Failed to update appointment:", e);
                  }
                }}
                onDeleteAppointment={async (id) => {
                  try {
                    await dbService.appointments.delete(id);
                    setAppointments(p => p.filter(a => a.id !== id));
                  } catch (e) {
                    console.error("Failed to delete appointment:", e);
                  }
                }}
              />
              : <PatientDashboard user={user} appointments={appointments} reports={reports} onUpdateUser={(u) => setUser(u)} />
          )}
          {activeTab === 'appointments' && <AppointmentBooking user={user} onBook={async (apt) => {
            const newApt = { ...apt, patientId: user.id, patientName: user.name, status: 'PENDING', doctorContact: apt.doctorContact || '' } as Appointment;
            try {
              const saved = await dbService.appointments.create(newApt);
              setAppointments(prev => [saved, ...prev]);
              setActiveTab('dashboard');
            } catch (e) {
              console.error("Booking failed:", e);
              alert("Wait, there was an issue booking this appointment.");
            }
          }} />}
          {activeTab === 'schedule' && <DoctorScheduleManager doctor={user} />}
          {activeTab === 'reports' && <ReportsList reports={reports} user={user} />}
          {activeTab === 'chat' && <AIChatAssistant onReportGenerated={(report) => setReports(prev => [report, ...prev])} />}
          {activeTab === 'virtual-doc' && <VirtualDoctor patientId={user.id} user={user} onSessionComplete={async (r) => {
            try {
              // Snapshot the user's current vitals at report-generation time
              const reportWithVitals = {
                ...r,
                vitals: {
                  bp: user.vitalBp || undefined,
                  weight: user.vitalWeight || undefined,
                  glucose: user.vitalGlucose || undefined,
                  temperature: user.vitalTemperature || undefined,
                }
              };
              const saved = await dbService.reports.create(reportWithVitals);
              setReports(prev => [saved, ...prev]);
              setActiveTab('reports');
            } catch (e) {
              console.error("Saving report failed:", e);
            }
          }} />}
          {activeTab === 'profile' && <ProfilePage user={user} onUpdate={async (u) => {
            try {
              const updated = await dbService.auth.updateUser(u);
              setUser(updated);
            } catch (e) {
              console.error("Failed to update user:", e);
              throw e;
            }
          }} />}
        </div>

        <FloatingAIChat onReportGenerated={(report) => setReports(prev => [report, ...prev])} />
      </main>
    </div>
  );
};

export default App;
