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
  UserCircleIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { UserRole, User } from '../types';
import { getTranslation } from '../services/translations';
import TranslatedText from './TranslatedText';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  role: UserRole;
  user: User;
  onClose?: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, role, user, onClose, canInstall, onInstall, isCollapsed, onToggleCollapse }) => {
  const t = getTranslation(user?.preferredLanguage);

  const patientItems = [
    { id: 'dashboard', name: t.dashboard, icon: HomeIcon },
    { id: 'appointments', name: t.bookVisit, icon: CalendarIcon },
    { id: 'reports', name: t.medicalFiles, icon: ClipboardDocumentListIcon },
    { id: 'reminders', name: t.reminders, icon: BellIcon },
    { id: 'chat', name: t.chatSupport, icon: ChatBubbleBottomCenterTextIcon },
    { id: 'virtual-doc', name: t.virtualDoctor, icon: MicrophoneIcon },
    { id: 'profile', name: t.myProfile, icon: UserCircleIcon },
  ];

  const doctorItems = [
    { id: 'dashboard', name: t.overview, icon: HomeIcon },
    { id: 'schedule', name: t.mySchedule, icon: ClockIcon },
    { id: 'reports', name: t.records, icon: ClipboardDocumentListIcon },
    { id: 'chat', name: t.aiResearch, icon: AcademicCapIcon },
    { id: 'profile', name: t.myProfile, icon: UserCircleIcon },
  ];

  // Translations are now handled by TranslatedText component in JSX

  const menuItems = role === 'DOCTOR' ? doctorItems : patientItems;
  const themeColor = role === 'DOCTOR' ? 'indigo' : 'blue';
  const roleDisplay = role === 'DOCTOR' ? t.doctor : t.patient;
  const staffDisplay = role === 'DOCTOR' ? t.staff : t.patient;

  return (
    <div className={`h-full bg-white border-r border-slate-200 flex flex-col shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-full max-w-[300px] sm:w-72'}`}>
      <div className={`p-6 sm:p-8 border-b border-slate-100 flex items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 transition-all duration-300 ${isCollapsed ? 'justify-center px-4' : 'justify-between'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 bg-${themeColor}-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-${themeColor}-500/20 shrink-0`}>
            <TranslatedText text={role === 'DOCTOR' ? t.doctorInitials : t.patientInitials} lang={user.preferredLanguage} />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="text-lg font-black text-slate-800 tracking-tight">
                <TranslatedText text={t.medEchoLogo} lang={user.preferredLanguage} />
              </span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <TranslatedText text={staffDisplay} lang={user.preferredLanguage} />
              </p>
            </div>
          )}
        </div>
        {onClose && !isCollapsed && (
          <button onClick={onClose} className="sm:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className={`flex-1 p-4 sm:p-6 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); if (onClose) onClose(); }}
            title={isCollapsed ? item.name : ''}
            className={`w-full flex items-center rounded-xl transition-all duration-200 group relative ${isCollapsed ? 'justify-center p-3' : 'space-x-4 px-4 py-3'} ${activeTab === item.id
              ? `bg-${themeColor}-50 text-${themeColor}-600 shadow-sm font-black`
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
          >
            <item.icon className={`w-6 h-6 transition-transform duration-300 ${activeTab === item.id ? `text-${themeColor}-600` : 'text-slate-400 group-hover:text-slate-600'} ${isCollapsed ? 'scale-110' : ''}`} />
            
            {!isCollapsed && (
              <span className="font-bold text-sm whitespace-nowrap opacity-100 transition-opacity duration-300 text-left flex-1 animate-in fade-in slide-in-from-left-2">
                <TranslatedText text={item.name} lang={user.preferredLanguage} />
              </span>
            )}

            {!isCollapsed && activeTab === item.id && (
              <div className={`w-1.5 h-1.5 bg-${themeColor}-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]`} />
            )}

            {isCollapsed && activeTab === item.id && (
              <div className={`absolute left-0 w-1 h-6 bg-${themeColor}-600 rounded-r-full`} />
            )}
          </button>
        ))}
      </nav>

      <div className={`p-4 sm:p-6 border-t border-slate-100 space-y-4 transition-all duration-300 ${isCollapsed ? 'p-3' : ''}`}>
        {canInstall && (
          <button
            onClick={onInstall}
            title={isCollapsed ? t.downloadApp : ''}
            className={`w-full flex items-center rounded-xl bg-${themeColor}-600 text-white shadow-lg shadow-${themeColor}-200 transition-all font-bold text-sm hover:scale-105 active:scale-95 ${isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'}`}
          >
            <ArrowLeftOnRectangleIcon className={`w-5 h-5 rotate-90 ${isCollapsed ? 'scale-110' : ''}`} />
            {!isCollapsed && <span><TranslatedText text={t.downloadApp} lang={user.preferredLanguage} /></span>}
          </button>
        )}
        
        <button
          onClick={onLogout}
          title={isCollapsed ? t.logout : ''}
          className={`w-full flex items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all font-bold text-sm group ${isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3'}`}
        >
          <ArrowLeftOnRectangleIcon className={`w-5 h-5 transition-transform group-hover:-translate-x-1 ${isCollapsed ? 'scale-110' : ''}`} />
          {!isCollapsed && <span><TranslatedText text={t.logout} lang={user.preferredLanguage} /></span>}
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className={`hidden lg:flex w-full items-center rounded-xl text-slate-300 hover:bg-slate-50 hover:text-slate-500 transition-all font-black text-[10px] uppercase tracking-widest ${isCollapsed ? 'justify-center p-3' : 'space-x-3 px-4 py-3 mt-4 border-t border-slate-50 pt-6'}`}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeftIcon className="w-5 h-5" />
              <span className="animate-in fade-in duration-500">
                <TranslatedText text={t.collapse || 'Collapse'} lang={user.preferredLanguage} />
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;