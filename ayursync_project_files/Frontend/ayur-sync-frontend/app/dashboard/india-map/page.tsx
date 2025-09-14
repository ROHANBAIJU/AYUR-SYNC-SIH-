// app/dashboard/india-map/page.tsx
"use client";

import Link from "next/link";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

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
        <div className={`bg-gray-900 text-white min-h-screen fixed left-0 top-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          {/* Header */}
          <div className={`${isSidebarCollapsed ? 'p-4' : 'p-6'} border-b border-gray-700`}>
            <div className="flex items-center justify-between">
              {/* Hamburger Menu */}
              <button
                onClick={toggleSidebar}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {!isSidebarCollapsed && (
                <div className="ml-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-semibold">AYUR-SYNC v1 beta</span>
                    <div className="mt-1">
                      <span className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">AI Powered</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className={`${isSidebarCollapsed ? 'p-2' : 'p-6'}`}>
            {!isSidebarCollapsed && <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">General</div>}
            <nav className="space-y-2">
              
              <Link href="/dashboard" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </Link>
              
              <Link href="/dashboard/schedule" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Schedule</span>}
              </Link>
              
              <Link href="/dashboard/patients" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Patients</span>}
              </Link>
              
              <Link href="/dashboard/india-map" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg bg-teal-600 text-white`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>India Map</span>}
              </Link>
              
              <Link href="/dashboard/chatbot" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Chatbot</span>}
              </Link>
              
              <Link href="/dashboard/profile" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>My profile</span>}
              </Link>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <Link href="/" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Home</span>}
              </Link>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <a href="#" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Settings</span>}
              </a>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <a href="#" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors text-red-400`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Log out</span>}
              </a>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 flex-1 p-8`}>
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
