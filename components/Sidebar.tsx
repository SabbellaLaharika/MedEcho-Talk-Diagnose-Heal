import React from 'react';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ChatBubbleBottomCenterTextIcon,
  MicrophoneIcon,
  ArrowLeftOnRectangleIcon,
  ClockIcon,
  AcademicCapIcon,
  XMarkIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { UserRole, User } from '../types';
import { getTranslation, translateString } from '../services/translations';
import TranslatedText from './TranslatedText';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  role: UserRole;
  user: User;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, role, user, onClose }) => {
  const t = getTranslation(user?.preferredLanguage);

  const patientItems = [
    { id: 'dashboard', name: t.dashboard || 'Dashboard', icon: HomeIcon },
    { id: 'appointments', name: t.bookVisit || 'Book Visit', icon: CalendarIcon },
    { id: 'reports', name: t.medicalFiles || 'Medical Files', icon: ClipboardDocumentListIcon },
    { id: 'chat', name: t.chatSupport || 'Chat Support', icon: ChatBubbleBottomCenterTextIcon },
    { id: 'virtual-doc', name: t.virtualDoctor || 'Virtual Doctor', icon: MicrophoneIcon },
    { id: 'profile', name: t.myProfile || 'My Profile', icon: UserCircleIcon },
  ];

  const doctorItems = [
    { id: 'dashboard', name: t.overview || 'Overview', icon: HomeIcon },
    { id: 'schedule', name: t.mySchedule || 'My Schedule', icon: ClockIcon },
    { id: 'reports', name: t.records || 'Records', icon: ClipboardDocumentListIcon },
    { id: 'chat', name: t.aiResearch || 'AI Research', icon: AcademicCapIcon },
  ];

  // Translations are now handled by TranslatedText component in JSX

  const menuItems = role === 'DOCTOR' ? doctorItems : patientItems;
  const themeColor = role === 'DOCTOR' ? 'indigo' : 'blue';
  const roleDisplay = role === 'DOCTOR' ? t.doctor : t.patient;
  const staffDisplay = role === 'DOCTOR' ? t.staff : t.patient;

  return (
    <div className="w-full max-w-[300px] sm:w-72 bg-white border-r border-slate-100 h-full flex flex-col shadow-2xl sm:shadow-sm overflow-y-auto custom-scrollbar">
      <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-tr ${role === 'DOCTOR' ? 'from-indigo-600' : 'from-blue-600'} to-slate-800 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg transform rotate-6`}>
            {role === 'DOCTOR' ? 'DR' : 'ME'}
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-slate-800 tracking-tight"><TranslatedText text={t.medEchoLogo} lang={user.preferredLanguage} /></span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"><TranslatedText text={staffDisplay} lang={user.preferredLanguage} /></p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="sm:hidden p-2 text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 sm:p-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); if (onClose) onClose(); }}
            className={`w-full flex items-center space-x-4 px-5 py-4 sm:py-3.5 rounded-2xl transition-all duration-300 ${activeTab === item.id
              ? `${role === 'DOCTOR' ? 'bg-indigo-600' : 'bg-blue-600'} text-white shadow-xl shadow-blue-500/20 translate-x-1`
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
          >
            <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === item.id ? 'scale-110' : ''}`} />
            <span className="font-black text-[11px] sm:text-[13px] uppercase whitespace-nowrap overflow-hidden">
              <TranslatedText text={item.name} lang={user.preferredLanguage} />
            </span>
          </button>
        ))}
      </nav>

      <div className="p-4 sm:p-6 border-t border-slate-50">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-4 px-5 py-4 sm:py-3.5 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-black uppercase text-[11px] sm:text-sm tracking-wider"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          <span><TranslatedText text={t.logout} lang={user.preferredLanguage} /></span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;