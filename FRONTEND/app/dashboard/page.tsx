// app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

const Dashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Sample data for the dashboard
  const todaysPatients = [
    { name: "Tyler Williamson", time: "09:00 AM", status: "confirmed", avatar: "TW", condition: "Skin consultation", type: "New Patient" },
    { name: "Samantha Williams", time: "10:15 AM", status: "pending", avatar: "SW", condition: "Panchakarma therapy", type: "Follow-up" },
    { name: "Amy White", time: "11:30 AM", status: "confirmed", avatar: "AW", condition: "Digestive issues", type: "New Patient" },
    { name: "Tyler Young", time: "02:00 PM", status: "completed", avatar: "TY", condition: "Stress management", type: "Follow-up" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-gray-900 text-white min-h-screen fixed left-0 top-0 z-40 flex flex-col`}>
          {/* Header with hamburger menu */}
          <div className={`${isSidebarCollapsed ? 'p-3' : 'p-4'} border-b border-gray-700`}>
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-semibold">AYUR-SYNC v1 beta</span>
                  <div className="mt-1">
                    <span className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded-full border border-gray-700 opacity-80">AI Powered</span>
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${isSidebarCollapsed ? 'mx-auto' : 'ml-auto'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2 py-4' : 'p-4'} space-y-1`}>
            {!isSidebarCollapsed && <div className="text-gray-400 text-xs uppercase tracking-wider mb-4">General</div>}
            
            <Link href="/dashboard" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg bg-teal-600 text-white`}>
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
            
            <Link href="/dashboard/india-map" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
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

        {/* Main Content */}
        <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 p-6 space-y-6 min-h-screen`}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Good morning, Dr. Olivia</h1>
              <p className="text-gray-600">Have a nice day at work! Here are your upcoming patient appointments today. You also have one new patient notification for attention.</p>
            </div>
            <div className="flex space-x-2">
              <button className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6v10H9z" />
                </svg>
              </button>
              <button className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Today's Patients Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Today&apos;s Patients</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {todaysPatients.map((patient, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-amber-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {patient.avatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg">{patient.name}</h3>
                      <p className="text-sm text-gray-600">{patient.time}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-amber-50 to-teal-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Condition</p>
                      <p className="text-sm text-gray-600">{patient.condition}</p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                        {patient.type}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        patient.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        patient.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        patient.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Patients Card */}
            <div className="bg-gradient-to-br from-yellow-100 to-amber-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-700 font-semibold mb-4">Patients:</h3>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-800">14 <span className="text-sm font-normal">visits</span></div>
                  <div className="text-2xl font-bold text-gray-800">8 <span className="text-sm font-normal">new</span></div>
                  <div className="text-2xl font-bold text-gray-800">2 <span className="text-sm font-normal">return</span></div>
                </div>
                <div className="w-16 h-20 bg-gray-800 rounded-lg flex items-end justify-center p-2">
                  <div className="flex space-x-1 items-end">
                    <div className="w-2 bg-yellow-400 rounded-t" style={{height: '60%'}}></div>
                    <div className="w-2 bg-yellow-400 rounded-t" style={{height: '80%'}}></div>
                    <div className="w-2 bg-yellow-400 rounded-t" style={{height: '40%'}}></div>
                    <div className="w-2 bg-yellow-400 rounded-t" style={{height: '90%'}}></div>
                    <div className="w-2 bg-yellow-400 rounded-t" style={{height: '30%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visits Summary Card */}
            <div className="bg-gradient-to-br from-purple-100 to-pink-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-700 font-semibold mb-4">Visits summary:</h3>
              <div className="space-y-2 mb-4">
                <div className="text-lg font-bold text-gray-800">24 <span className="text-sm font-normal">visits</span></div>
                <div className="text-sm text-gray-600">16 hours 00:00</div>
                <div className="text-sm text-gray-600">03:01</div>
              </div>
              <div className="h-12 bg-white/50 rounded-lg flex items-center px-3">
                <svg className="w-full h-8" viewBox="0 0 200 50">
                  <polyline
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="2"
                    points="0,40 20,35 40,38 60,32 80,28 100,25 120,30 140,22 160,18 180,15 200,12"
                  />
                </svg>
              </div>
            </div>

            {/* By Condition Card */}
            <div className="bg-gradient-to-br from-green-100 to-teal-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-700 font-semibold mb-4">By condition:</h3>
              <div className="space-y-2 mb-4">
                <div className="text-lg font-bold text-gray-800">14 <span className="text-sm font-normal">visits</span></div>
                <div className="text-lg font-bold text-gray-800">8 <span className="text-sm font-normal">new</span></div>
                <div className="text-lg font-bold text-gray-800">1 <span className="text-sm font-normal">return</span></div>
              </div>
            </div>

            {/* Sessions Card */}
            <div className="bg-gradient-to-br from-blue-100 to-cyan-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-gray-700 font-semibold mb-4">Sessions:</h3>
              <div className="space-y-2 mb-4">
                <div className="text-lg font-bold text-gray-800">08:40 <span className="text-sm font-normal">02:00 hrs</span></div>
                <div className="text-lg font-bold text-gray-800">00:34 <span className="text-sm font-normal">min</span></div>
              </div>
              <div className="flex justify-end">
                <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 gap-6">

            {/* Visit Details */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-pink-100 to-rose-200 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Visit details</h3>
                
                <div className="space-y-4">
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Next appointment</div>
                    <div className="font-semibold text-gray-800">Tyler Williamson</div>
                    <div className="text-sm text-gray-600">09:00 AM - 10:00 AM</div>
                    <div className="text-xs text-gray-500 mt-2">Skin consultation</div>
                  </div>
                  
                  <div className="bg-white/50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Treatment: 2 hours ago</div>
                    <div className="font-semibold text-gray-800">Panchakarma - 5 days ago</div>
                    <div className="text-xs text-gray-500">Duration: The next high priority listing</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
    </div>
  );
};

export default Dashboard;