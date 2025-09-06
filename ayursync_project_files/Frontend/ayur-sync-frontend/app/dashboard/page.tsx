// app/dashboard/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(15);
  const currentMonth = "May 2024";

  // Sample data for the dashboard
  const patients = [
    { name: "Tyler Williamson", time: "09:00 AM", status: "confirmed", avatar: "TW" },
    { name: "Samantha Williams", time: "10:15 AM", status: "pending", avatar: "SW" },
    { name: "Amy White", time: "11:30 AM", status: "confirmed", avatar: "AW" },
    { name: "Tyler Young", time: "02:00 PM", status: "completed", avatar: "TY" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-amber-200 fixed top-0 left-0 right-0 z-[9999]">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">AS</span>
          </div>
          <span className="font-semibold text-gray-800">AYUR-SYNC Dashboard</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/">
            <button className="bg-gradient-to-r from-teal-100/30 via-green-100/30 to-teal-100/30 backdrop-blur-sm border-2 border-green-600 text-green-600 px-4 py-2 rounded-full hover:bg-green-50 transition-all duration-300 ease-in-out transform hover:scale-105">
              Home
            </button>
          </Link>
        </div>
      </nav>

      <div className="flex pt-20">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white min-h-screen p-4 fixed left-0 top-20">
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
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-5 h-5 bg-teal-400 rounded"></div>
              <span>Dashboard</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Schedule</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Patients</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Messages & reports</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Education</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>My profile</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Charts & data</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Billing</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Documentation base</span>
            </a>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
              <span>Settings</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-red-400">
              <div className="w-5 h-5 bg-red-600 rounded"></div>
              <span>Log out</span>
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 p-6 space-y-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Patient&apos;s list</h3>
                  <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors">
                    See all
                  </button>
                </div>
                
                <div className="space-y-4">
                  {patients.map((patient, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {patient.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{patient.name}</div>
                          <div className="text-sm text-gray-600">{patient.time}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        patient.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

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

            {/* Calendar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">{currentMonth}</h3>
                  <div className="flex space-x-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: 35}, (_, i) => {
                    const day = i - 6; // Start from previous month
                    const isCurrentMonth = day > 0 && day <= 31;
                    const isSelected = day === selectedDate;
                    const hasEvent = [8, 15, 22].includes(day);
                    
                    return (
                      <button
                        key={i}
                        onClick={() => isCurrentMonth && setSelectedDate(day)}
                        className={`p-2 text-sm rounded-lg transition-colors ${
                          !isCurrentMonth ? 'text-gray-300' :
                          isSelected ? 'bg-teal-500 text-white' :
                          hasEvent ? 'bg-orange-100 text-orange-800' :
                          'hover:bg-gray-100'
                        }`}
                      >
                        {isCurrentMonth ? day : day <= 0 ? 30 + day : day - 31}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6">
                  <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                    Add event
                  </button>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-sm font-semibold text-gray-800">May 15</div>
                    <div className="text-xs text-gray-600">Today&apos;s timeline</div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span>Consultation call</span>
                        <span className="text-gray-500">9:00 AM</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span>Diagnostic test</span>
                        <span className="text-gray-500">11:30 AM</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Team daily planning session - 2 hours</span>
                        <span className="text-gray-500">2:00 PM</span>
                      </div>
                    </div>
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

export default Dashboard;
