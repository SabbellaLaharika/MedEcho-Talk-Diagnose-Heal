import React, { useState, useEffect } from 'react';
import { 
  MapPinIcon, PhoneIcon, ArrowTopRightOnSquareIcon, 
  BeakerIcon, BuildingOffice2Icon, HomeModernIcon, PaperAirplaneIcon 
} from '@heroicons/react/24/outline';

const HEALTHCARE_DATA = {
  MAJOR: [
    { name: "Amor Hospitals", type: "Multi-Specialty", contact: "040-61626302", location: "Kukatpally Y Junction", coords: { lat: 17.4795, lng: 78.4111 } },
    { name: "Renova Neelima Hospital", type: "24/7 Emergency", contact: "040-61626341", location: "Sanath Nagar", coords: { lat: 17.4646, lng: 78.4320 } },
    { name: "Aradhya Multi Speciality", type: "General Surgery", contact: "040-23812345", location: "Moosapet X Roads", coords: { lat: 17.4735, lng: 78.4231 } },
  ],
  MINOR: [
    { name: "Vasundhara Hospital", type: "Mother & Child", contact: "9989028628", location: "Opp. Moosapet Bus Depot", coords: { lat: 17.4760, lng: 78.4215 } },
    { name: "Sree Manju Hospital", type: "General Clinic", contact: "040-23835566", location: "Kalyan Nagar, Moti Nagar", coords: { lat: 17.4601, lng: 78.4180 } },
  ],
  LABS: [
    { name: "Vijaya Diagnostics", type: "Scans & Blood", contact: "040-23456789", location: "Moosapet Cross Rd", coords: { lat: 17.4730, lng: 78.4240 } },
    { name: "Lucid Diagnostics", type: "Radiology/MRI", contact: "040-44445555", location: "Green Hills Rd, Moosapet", coords: { lat: 17.4715, lng: 78.4210 } },
  ]
};

const HospitalLocator = () => {
  const [activeTab, setActiveTab] = useState<'MAJOR' | 'MINOR' | 'LABS'>('MAJOR');
  const [uLoc, setULoc] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((p) => setULoc({ lat: p.coords.latitude, lng: p.coords.longitude }), () => console.log("Loc blocked"));
  }, []);

  const getDist = (tLat: number, tLng: number) => {
    if (!uLoc) return null;
    const R = 6371; 
    const dLat = (tLat - uLoc.lat) * Math.PI / 180;
    const dLon = (tLng - uLoc.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(uLoc.lat * Math.PI/180) * Math.cos(tLat * Math.PI/180) * Math.sin(dLon/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
  };

  return (
    <div className="p-6 bg-white rounded-[2rem] shadow-lg border border-slate-100">
      <div className="flex flex-wrap gap-2 mb-6">
        {(['MAJOR', 'MINOR', 'LABS'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HEALTHCARE_DATA[activeTab].map((item, i) => (
          <div key={i} className="p-5 border-2 border-slate-50 rounded-[1.5rem] hover:border-indigo-100 transition-all">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-black text-slate-800 text-lg">{item.name}</h3>
              {getDist(item.coords.lat, item.coords.lng) && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{getDist(item.coords.lat, item.coords.lng)} KM</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">{item.location}</p>
            <div className="flex gap-2">
              <a href={`tel:${item.contact}`} className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-center text-[10px] font-bold uppercase tracking-widest">Call</a>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + " " + item.location)}`} target="_blank" className="px-4 bg-indigo-50 text-indigo-600 py-2 rounded-lg flex items-center justify-center">
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalLocator;