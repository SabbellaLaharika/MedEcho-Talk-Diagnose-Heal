import React, { useState } from 'react';
import { User } from '../types';
import { getTranslation, translateString, loadTranslations } from '../services/translations';
import TranslatedText from './TranslatedText';
import {
  UserCircleIcon,
  MapPinIcon,
  CalendarIcon,
  InformationCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  CameraIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useRef } from 'react';

interface ProfilePageProps {
  user: User;
  onUpdate: (updatedUser: User) => Promise<void>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdate }) => {
  const t = getTranslation(user.preferredLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    contact: user.contact || '',
    gender: user.gender || '',
    dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    bloodGroup: user.bloodGroup || '',
    address: user.address || '',
    avatar: user.avatar || '',
    preferredLanguage: user.preferredLanguage || 'en'
  });

  React.useEffect(() => {
    loadTranslations(user.preferredLanguage, 'profile');
  }, [user.preferredLanguage]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate({
        ...user,
        ...formData,
        dob: formData.dob ? formData.dob : undefined
      });
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      alert(t.updateProfileFail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center space-x-6">
          <div className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
            <div
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={`w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-2xl overflow-hidden transition-all ${isEditing ? 'cursor-pointer hover:rotate-6 scale-105 ring-4 ring-blue-100' : ''}`}
            >
              <img
                src={formData.avatar || `https://ui-avatars.com/api/?name=${formData.name}&background=f1f5f9&color=64748b`}
                alt="Profile"
                className="w-full h-full object-cover rounded-[2.3rem] bg-white"
              />
            </div>
            {isEditing && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors group/cam"
              >
                <CameraIcon className="w-5 h-5 text-blue-600 group-hover/cam:scale-110 transition-transform" />
              </div>
            )}
            {isEditing && formData.avatar && (
              <div
                onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                className="absolute -top-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-slate-100 cursor-pointer hover:bg-rose-50 transition-colors group/trash"
              >
                <TrashIcon className="w-5 h-5 text-rose-500 group-hover/trash:scale-110 transition-transform" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight"><TranslatedText text={formData.name} lang={user.preferredLanguage} /></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
              <TranslatedText text={t.medicalProfileId} lang={user.preferredLanguage} />: {user.id.split('-')[0].toUpperCase()}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <TranslatedText text={t.editProfile} lang={user.preferredLanguage} />
          </button>
        ) : (
          <div className="flex space-x-3">
            <button onClick={() => setIsEditing(false)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all"><TranslatedText text={t.cancel} lang={user.preferredLanguage} /></button>
            <button onClick={handleSubmit} disabled={saving} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
              {saving ? <TranslatedText text={t.syncInProgress} lang={user.preferredLanguage} /> : <TranslatedText text={t.saveChanges} lang={user.preferredLanguage} />}
            </button>
          </div>
        )}
      </header>

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] flex items-center space-x-4 animate-in zoom-in-95 duration-300">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-black text-emerald-800 uppercase tracking-widest"><TranslatedText text={t.updateSuccess} lang={user.preferredLanguage} /></p>
            <p className="text-[10px] font-bold text-emerald-600 opacity-70"><TranslatedText text={t.profileSyncDesc} lang={user.preferredLanguage} /></p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 space-y-10">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.3em] flex items-center space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-500" />
              <span><TranslatedText text={t.coreDemographics} lang={user.preferredLanguage} /></span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.legalFullName} lang={user.preferredLanguage} /></label>
                <div className="relative group">
                  <UserCircleIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    disabled={!isEditing}
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.bloodGroup} lang={user.preferredLanguage} /></label>
                <select
                  disabled={!isEditing}
                  value={formData.bloodGroup}
                  onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="">{t.selectBloodGroup}</option>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.genderIdentification} lang={user.preferredLanguage} /></label>
                <select
                  disabled={!isEditing}
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="">{t.selectGender}</option>
                  <option value="Male">{t.male}</option>
                  <option value="Female">{t.female}</option>
                  <option value="Non-binary">{t.nonBinary}</option>
                  <option value="Prefer not to say">{t.preferNotToSay}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.dateOfBirth} lang={user.preferredLanguage} /></label>
                <div className="relative group">
                  <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    disabled={!isEditing}
                    type="date"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.preferredInterfaceLanguage} lang={user.preferredLanguage} /></label>
                <select
                  disabled={!isEditing}
                  value={formData.preferredLanguage}
                  onChange={e => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="en">English (Global)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-50 space-y-10">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.3em] flex items-center space-x-3">
              <MapPinIcon className="w-5 h-5 text-indigo-500" />
              <span><TranslatedText text={t.contactInfrastructure} lang={user.preferredLanguage} /></span>
            </h3>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.primaryEmail} lang={user.preferredLanguage} /></label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      disabled
                      type="email"
                      value={formData.email}
                      className="w-full bg-slate-100/50 border-2 border-slate-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-400 outline-none italic"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.mobileContact} lang={user.preferredLanguage} /></label>
                  <div className="relative group">
                    <PhoneIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      disabled={!isEditing}
                      type="tel"
                      value={formData.contact}
                      onChange={e => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4"><TranslatedText text={t.residentialAddress} lang={user.preferredLanguage} /></label>
                <textarea
                  disabled={!isEditing}
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t.enterAddress}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 resize-none"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full group-hover:bg-blue-600/30 transition-all"></div>
            <div className="relative z-10 space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400"><TranslatedText text={t.securityStatus} lang={user.preferredLanguage} /></p>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                <span className="text-sm font-black uppercase tracking-widest"><TranslatedText text={t.systemAuthenticated} lang={user.preferredLanguage} /></span>
              </div>
              <p className="text-xs text-white/40 leading-relaxed font-medium">{t.securityDesc}</p>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 mt-6">
                <TranslatedText text={t.changePassword} lang={user.preferredLanguage} />
              </button>
            </div>
          </div>

          <div className="bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-blue-200">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-100/50 mb-8"><TranslatedText text={t.medicalState} lang={user.preferredLanguage} /></p>
            <div className="space-y-8">
              <div>
                <p className="text-xs font-black uppercase opacity-60 mb-2"><TranslatedText text={t.totalDiagnoses} lang={user.preferredLanguage} /></p>
                <p className="text-4xl font-black italic">14<span className="text-sm not-italic opacity-40 ml-2">{t.totalCaps}</span></p>
              </div>
              <div>
                <p className="text-xs font-black uppercase opacity-60 mb-2"><TranslatedText text={t.clinicLoyalty} lang={user.preferredLanguage} /></p>
                <p className="text-4xl font-black italic">
                  <TranslatedText text={t.gold} lang={user.preferredLanguage} />
                  <span className="text-sm not-italic opacity-40 ml-2">{t.totalCaps}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
