import React, { useState, useEffect } from 'react';
import {
  MapPinIcon, PhoneIcon, ArrowTopRightOnSquareIcon,
  BeakerIcon, BuildingOffice2Icon, HomeModernIcon, PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { User } from '../types';
import { getTranslation } from '../services/translations';

interface HospitalLocatorProps {
  user?: User;
}

const HEALTHCARE_DATA = {
  MAJOR: [
    { name: "amorHospitals", type: "multiSpecialty", contact: "040-61626302", location: "kukatpallyYJunction", coords: { lat: 17.4795, lng: 78.4111 } },
    { name: "renovaHospitals", type: "emergency247", contact: "040-61626341", location: "sanathNagar", coords: { lat: 17.4646, lng: 78.4320 } },
    { name: "aradhyaSpeciality", type: "generalSurgery", contact: "040-23812345", location: "moosapetXRoads", coords: { lat: 17.4735, lng: 78.4231 } },
  ],
  MINOR: [
    { name: "vasundharaHospital", type: "motherAndChild", contact: "9989028628", location: "moosapetBusDepot", coords: { lat: 17.4760, lng: 78.4215 } },
    { name: "sreeManjuHospital", type: "generalClinic", contact: "040-23835566", location: "kalyanNagarMotiNagar", coords: { lat: 17.4601, lng: 78.4180 } },
  ],
  LABS: [
    { name: "vijayaDiagnostics", type: "scansAndBlood", contact: "040-23456789", location: "moosapetCrossRd", coords: { lat: 17.4730, lng: 78.4240 } },
    { name: "lucidDiagnostics", type: "radiologyMri", contact: "040-44445555", location: "greenHillsMoosapet", coords: { lat: 17.4715, lng: 78.4210 } },
  ]
};

const TAB_KEYS: Record<string, string> = {
  MAJOR: 'majorHospitals',
  MINOR: 'minorHospitals',
  LABS: 'labsAndDiagnostics'
};

const HospitalLocator: React.FC<HospitalLocatorProps> = ({ user }) => {
  const t = getTranslation(user?.preferredLanguage);
  const [activeTab, setActiveTab] = useState<'MAJOR' | 'MINOR' | 'LABS'>('MAJOR');
  const [uLoc, setULoc] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setULoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => console.log("Loc blocked")
    );
  }, []);

  const getDist = (tLat: number, tLng: number) => {
    if (!uLoc) return null;
    const R = 6371;
    const dLat = (tLat - uLoc.lat) * Math.PI / 180;
    const dLon = (tLng - uLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(uLoc.lat * Math.PI / 180) * Math.cos(tLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  return (
    <div className="p-6 bg-white rounded-[2rem] shadow-lg border border-slate-100">
      <div className="flex flex-wrap gap-2 mb-6">
        {(['MAJOR', 'MINOR', 'LABS'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
          >
            {t[TAB_KEYS[tab]]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HEALTHCARE_DATA[activeTab].map((item, i) => (
          <div key={i} className="p-5 border-2 border-slate-50 rounded-[1.5rem] hover:border-indigo-100 transition-all bg-white group hover:shadow-xl hover:shadow-indigo-50/50">
            <div className="flex justify-between items-start mb-2">
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 text-lg truncate group-hover:text-indigo-600 transition-colors">
                  {t[item.name] || item.name}
                </h3>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{t[item.type] || item.type}</span>
              </div>
              {getDist(item.coords.lat, item.coords.lng) && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
                  {getDist(item.coords.lat, item.coords.lng)} {t.km}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">
              {t[item.location] || item.location}
            </p>
            <div className="flex gap-2">
              <a 
                href={`tel:${item.contact}`} 
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
              >
                {t.call}
              </a>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + " " + item.location)}`} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 bg-indigo-50 text-indigo-600 py-2.5 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalLocator;