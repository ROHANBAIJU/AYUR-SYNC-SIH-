// app/dashboard/india-map/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import dynamic from "next/dynamic";
import React from "react";
import type { StateInfo, LeafletMapProps } from './LeafletMap';

// Dynamically import the map component to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-gray-500">Loading map...</div>
    </div>
  )
}) as React.ComponentType<LeafletMapProps>;

const IndiaMap = () => {
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);

  // Sample data for different states
  const stateData: { [key: string]: StateInfo } = {
    "Maharashtra": { name: "Maharashtra", patients: 1250, ayurvedaCenters: 45, practitioners: 180, coordinates: [19.7515, 75.7139] },
    "Karnataka": { name: "Karnataka", patients: 980, ayurvedaCenters: 38, practitioners: 142, coordinates: [15.3173, 75.7139] },
    "Kerala": { name: "Kerala", patients: 1580, ayurvedaCenters: 62, practitioners: 220, coordinates: [10.8505, 76.2711] },
    "Tamil Nadu": { name: "Tamil Nadu", patients: 1120, ayurvedaCenters: 52, practitioners: 195, coordinates: [11.1271, 78.6569] },
    "Gujarat": { name: "Gujarat", patients: 890, ayurvedaCenters: 34, practitioners: 125, coordinates: [23.0225, 72.5714] },
    "Rajasthan": { name: "Rajasthan", patients: 750, ayurvedaCenters: 28, practitioners: 98, coordinates: [27.0238, 74.2179] },
    "Uttar Pradesh": { name: "Uttar Pradesh", patients: 2100, ayurvedaCenters: 78, practitioners: 285, coordinates: [26.8467, 80.9462] },
    "West Bengal": { name: "West Bengal", patients: 920, ayurvedaCenters: 35, practitioners: 130, coordinates: [22.9868, 87.8550] },
    "Madhya Pradesh": { name: "Madhya Pradesh", patients: 680, ayurvedaCenters: 25, practitioners: 89, coordinates: [22.9734, 78.6569] },
    "Odisha": { name: "Odisha", patients: 540, ayurvedaCenters: 22, practitioners: 75, coordinates: [20.9517, 85.0985] },
  };

  const handleStateClick = (stateName: string) => {
    if (stateData[stateName]) {
      setSelectedState(stateData[stateName]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white min-h-screen p-4 fixed left-0 top-0">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex flex-col">
                <span className="text-lg font-semibold">AYUR-SYNC v1 beta</span>
                <div className="mt-1">
                  <span className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">AI Powered</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">General</div>
            
            <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/dashboard.png" alt="Dashboard" width={32} height={32} className="rounded" />
              </div>
              <span>Dashboard</span>
            </Link>
            
            <Link href="/dashboard/schedule" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/schedule.png" alt="Schedule" width={32} height={32} className="rounded" />
              </div>
              <span>Schedule</span>
            </Link>
            
            <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/patients.png" alt="Patients" width={32} height={32} className="rounded" />
              </div>
              <span>Patients</span>
            </Link>
            
            <Link href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/india map.png" alt="India Map" width={32} height={32} className="rounded" />
              </div>
              <span>India Map</span>
            </Link>
            
            <Link href="/dashboard/chatbot" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/chatbot.png" alt="Chatbot" width={32} height={32} className="rounded" />
              </div>
              <span>Chatbot</span>
            </Link>
            
            <Link href="/dashboard/profile" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/my profile.png" alt="My Profile" width={32} height={32} className="rounded" />
              </div>
              <span>My profile</span>
            </Link>

            <div className="border-t border-gray-700 my-4"></div>
            
            <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 bg-gray-600 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
              </div>
              <span>Home</span>
            </Link>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/settings.png" alt="Settings" width={32} height={32} className="rounded" />
              </div>
              <span>Settings</span>
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Ayurveda in India</h1>
                <p className="text-gray-600">Interactive map showing Ayurveda practitioners, centers, and patients across India</p>
              </div>
              <div className="flex space-x-4">
                <button className="bg-white border border-amber-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors">
                  Export Data
                </button>
                <button className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg">
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
                <div className="h-[600px]">
                  <LeafletMap 
                    stateData={stateData} 
                    onStateClick={handleStateClick}
                    selectedState={selectedState}
                  />
                </div>
              </div>
            </div>

            {/* State Information Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">State Information</h3>
                
                {selectedState ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
                      <h4 className="text-lg font-bold text-teal-800 mb-2">{selectedState.name}</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <span className="text-gray-700 font-medium">Total Patients</span>
                        <span className="text-amber-700 font-bold text-lg">{selectedState.patients.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-gray-700 font-medium">Ayurveda Centers</span>
                        <span className="text-green-700 font-bold text-lg">{selectedState.ayurvedaCenters}</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-gray-700 font-medium">Practitioners</span>
                        <span className="text-blue-700 font-bold text-lg">{selectedState.practitioners}</span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <button className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-2 px-4 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all">
                        View Detailed Report
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Click on a state in the map to view detailed information about Ayurveda practitioners and centers.</p>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-6 bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">National Overview</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Total States Covered</span>
                    <span className="text-gray-800 font-semibold">10</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Total Patients</span>
                    <span className="text-teal-600 font-semibold">10,860</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Active Centers</span>
                    <span className="text-green-600 font-semibold">419</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Certified Practitioners</span>
                    <span className="text-blue-600 font-semibold">1,537</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndiaMap;
