// app/dashboard/india-map/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

// Define state type
type StateInfo = {
  name: string;
  patients: number;
  ayurvedaCenters: number;
  practitioners: number;
};

const IndiaMap = () => {
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Sample data for different states
  const stateData: { [key: string]: StateInfo } = {
    "Maharashtra": { name: "Maharashtra", patients: 1250, ayurvedaCenters: 45, practitioners: 180 },
    "Karnataka": { name: "Karnataka", patients: 980, ayurvedaCenters: 38, practitioners: 142 },
    "Kerala": { name: "Kerala", patients: 1580, ayurvedaCenters: 62, practitioners: 220 },
    "Tamil Nadu": { name: "Tamil Nadu", patients: 1120, ayurvedaCenters: 52, practitioners: 195 },
    "Gujarat": { name: "Gujarat", patients: 890, ayurvedaCenters: 34, practitioners: 125 },
    "Rajasthan": { name: "Rajasthan", patients: 750, ayurvedaCenters: 28, practitioners: 98 },
    "Uttar Pradesh": { name: "Uttar Pradesh", patients: 2100, ayurvedaCenters: 78, practitioners: 285 },
    "West Bengal": { name: "West Bengal", patients: 920, ayurvedaCenters: 35, practitioners: 130 },
    "Madhya Pradesh": { name: "Madhya Pradesh", patients: 680, ayurvedaCenters: 25, practitioners: 89 },
    "Odisha": { name: "Odisha", patients: 540, ayurvedaCenters: 22, practitioners: 75 },
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
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">AS</span>
              </div>
              <span className="text-lg font-semibold">AYUR-SYNC</span>
            </div>
          </div>

          <nav className="space-y-2">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">General</div>
            
            <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Dashboard</span>
            </Link>
            
            <Link href="/dashboard/schedule" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Schedule</span>
            </Link>
            
            <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Patients</span>
            </Link>
            
            <Link href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-5 h-5 bg-teal-400 rounded"></div>
              <span>India Map</span>
            </Link>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Chatbot</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>My profile</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
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
                <div className="flex justify-center p-4">
                  <svg
                    width="500"
                    height="600"
                    viewBox="0 0 500 600"
                    className="w-full h-auto"
                  >
                    {/* Background */}
                    <rect width="500" height="600" fill="#ffffff" />
                    
                    {/* Maharashtra */}
                    <path
                      d="M 120 280 L 180 270 L 190 300 L 170 330 L 140 340 L 120 320 Z"
                      fill={hoveredState === "Maharashtra" ? "#10b981" : "#e5e7eb"}
                      stroke="#d1d5db"
                      strokeWidth="0.5"
                      className="cursor-pointer transition-colors hover:fill-emerald-500"
                      onMouseEnter={() => setHoveredState("Maharashtra")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Maharashtra")}
                    />
                    <text x="150" y="310" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Maharashtra
                    </text>

                    {/* Karnataka */}
                    <path
                      d="M 140 340 L 170 330 L 180 360 L 160 380 L 130 375 Z"
                      fill={hoveredState === "Karnataka" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Karnataka")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Karnataka")}
                    />
                    <text x="155" y="355" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Karnataka
                    </text>

                    {/* Kerala */}
                    <path
                      d="M 130 375 L 160 380 L 155 420 L 125 415 Z"
                      fill={hoveredState === "Kerala" ? "#14b8a6" : "#059669"}
                      stroke="#047857"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-green-500"
                      onMouseEnter={() => setHoveredState("Kerala")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Kerala")}
                    />
                    <text x="142" y="400" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Kerala
                    </text>

                    {/* Tamil Nadu */}
                    <path
                      d="M 160 380 L 200 375 L 210 410 L 180 420 L 155 420 Z"
                      fill={hoveredState === "Tamil Nadu" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Tamil Nadu")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Tamil Nadu")}
                    />
                    <text x="182" y="395" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Tamil Nadu
                    </text>

                    {/* Gujarat */}
                    <path
                      d="M 80 240 L 120 230 L 130 270 L 90 280 Z"
                      fill={hoveredState === "Gujarat" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Gujarat")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Gujarat")}
                    />
                    <text x="105" y="255" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Gujarat
                    </text>

                    {/* Rajasthan */}
                    <path
                      d="M 80 160 L 160 150 L 170 200 L 120 230 L 80 240 Z"
                      fill={hoveredState === "Rajasthan" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Rajasthan")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Rajasthan")}
                    />
                    <text x="125" y="190" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Rajasthan
                    </text>

                    {/* Uttar Pradesh */}
                    <path
                      d="M 170 150 L 280 140 L 290 180 L 240 190 L 170 200 Z"
                      fill={hoveredState === "Uttar Pradesh" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Uttar Pradesh")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Uttar Pradesh")}
                    />
                    <text x="230" y="170" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Uttar Pradesh
                    </text>

                    {/* West Bengal */}
                    <path
                      d="M 320 200 L 360 190 L 370 230 L 340 240 L 320 220 Z"
                      fill={hoveredState === "West Bengal" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("West Bengal")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("West Bengal")}
                    />
                    <text x="345" y="215" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      West Bengal
                    </text>

                    {/* Madhya Pradesh */}
                    <path
                      d="M 190 200 L 280 190 L 270 240 L 200 250 L 180 220 Z"
                      fill={hoveredState === "Madhya Pradesh" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Madhya Pradesh")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Madhya Pradesh")}
                    />
                    <text x="235" y="220" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Madhya Pradesh
                    </text>

                    {/* Odisha */}
                    <path
                      d="M 280 240 L 320 230 L 330 270 L 300 280 L 270 270 Z"
                      fill={hoveredState === "Odisha" ? "#14b8a6" : "#06b6d4"}
                      stroke="#0891b2"
                      strokeWidth="1"
                      className="cursor-pointer transition-colors hover:fill-teal-500"
                      onMouseEnter={() => setHoveredState("Odisha")}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => handleStateClick("Odisha")}
                    />
                    <text x="300" y="255" fill="#1f2937" fontSize="10" textAnchor="middle" className="pointer-events-none">
                      Odisha
                    </text>

                    {/* Legend */}
                    <g transform="translate(350, 450)">
                      <rect x="0" y="0" width="120" height="80" fill="white" stroke="#e5e7eb" strokeWidth="1" rx="4"/>
                      <text x="60" y="15" fill="#1f2937" fontSize="12" fontWeight="bold" textAnchor="middle">Legend</text>
                      <circle cx="15" cy="35" r="6" fill="#059669"/>
                      <text x="25" y="40" fill="#1f2937" fontSize="10">High Activity</text>
                      <circle cx="15" cy="55" r="6" fill="#06b6d4"/>
                      <text x="25" y="60" fill="#1f2937" fontSize="10">Medium Activity</text>
                    </g>
                  </svg>
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
