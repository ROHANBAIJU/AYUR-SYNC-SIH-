"use client";

import { useState } from "react";
import Link from "next/link";

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState(15);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const currentMonth = "May 2024";

  // Sample schedule data
  const scheduleEvents = [
    { time: "9:00 AM", event: "Consultation call", type: "consultation", color: "orange" },
    { time: "11:30 AM", event: "Diagnostic test", type: "diagnostic", color: "blue" },
    { time: "2:00 PM", event: "Team daily planning session - 2 hours", type: "meeting", color: "green" },
    { time: "4:00 PM", event: "Panchakarma therapy session", type: "treatment", color: "purple" },
    { time: "5:30 PM", event: "Patient follow-up calls", type: "followup", color: "teal" },
  ];

  const weeklySchedule = [
    { day: "Monday", date: "May 13", appointments: 8, events: ["Morning consultations", "Afternoon treatments"] },
    { day: "Tuesday", date: "May 14", appointments: 6, events: ["Team meeting", "Patient reviews"] },
    { day: "Wednesday", date: "May 15", appointments: 10, events: ["Full schedule", "New patient consultations"] },
    { day: "Thursday", date: "May 16", appointments: 5, events: ["Half day", "Training session"] },
    { day: "Friday", date: "May 17", appointments: 7, events: ["Regular consultations", "Documentation"] },
    { day: "Saturday", date: "May 18", appointments: 3, events: ["Weekend clinic", "Emergency only"] },
    { day: "Sunday", date: "May 19", appointments: 0, events: ["Rest day"] },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50">
      <div className="flex">
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
            
            <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <span>Dashboard</span>
            </Link>
            
            <Link href="/dashboard/schedule" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Schedule</span>
            </Link>
            
            <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <span>Patients</span>
            </Link>
            
            <Link href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>India Map</span>
            </Link>
            
            <Link href="/dashboard/chatbot" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Chatbot</span>
            </Link>
            
            <Link href="/dashboard/profile" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>My profile</span>
            </Link>

            <div className="border-t border-gray-700 my-4"></div>
            
            <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span>Home</span>
            </Link>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Settings</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-red-400">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Log out</span>
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 flex-1 p-6 space-y-6`}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Schedule Management</h1>
              <p className="text-gray-600">Manage your appointments, meetings, and treatment sessions efficiently.</p>
            </div>
            <div className="flex space-x-2">
              <button className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-lg">
                Add Appointment
              </button>
              <button className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Weekly Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {weeklySchedule.map((day, index) => (
                <div key={index} className={`p-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                  day.day === 'Wednesday' ? 'bg-gradient-to-br from-teal-100 to-amber-100 border-2 border-teal-300' :
                  day.appointments === 0 ? 'bg-gray-100' :
                  'bg-gradient-to-br from-amber-50 to-teal-50 border border-amber-200'
                }`}>
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-800 text-sm">{day.day}</h3>
                    <p className="text-xs text-gray-600 mb-2">{day.date}</p>
                    <div className={`text-2xl font-bold mb-2 ${
                      day.appointments === 0 ? 'text-gray-400' : 'text-teal-600'
                    }`}>
                      {day.appointments}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">appointments</p>
                    <div className="space-y-1">
                      {day.events.map((event, eventIndex) => (
                        <div key={eventIndex} className="text-xs bg-white/70 px-2 py-1 rounded-md">
                          {event}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Schedule Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{currentMonth}</h3>
                <div className="flex space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
                <button className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-lg">
                  Add Event
                </button>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Today&apos;s Schedule</h3>
                <span className="text-sm text-gray-500">May 15, 2024</span>
              </div>
              
              <div className="space-y-4">
                {scheduleEvents.map((event, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-amber-50 to-teal-50 rounded-lg border border-amber-200 hover:shadow-md transition-all duration-300">
                    <div className={`w-4 h-4 rounded-full ${
                      event.color === 'orange' ? 'bg-orange-400' :
                      event.color === 'blue' ? 'bg-blue-400' :
                      event.color === 'green' ? 'bg-green-400' :
                      event.color === 'purple' ? 'bg-purple-400' :
                      'bg-teal-400'
                    }`}></div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">{event.event}</div>
                      <div className="text-xs text-gray-600">{event.time}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-teal-100 to-amber-100 rounded-lg border border-teal-200">
                <h4 className="font-semibold text-gray-800 mb-2">Schedule Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Events:</span>
                    <span className="font-medium text-gray-800 ml-2">{scheduleEvents.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Busy Hours:</span>
                    <span className="font-medium text-gray-800 ml-2">8 hours</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Next Event:</span>
                    <span className="font-medium text-gray-800 ml-2">9:00 AM</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Free Time:</span>
                    <span className="font-medium text-gray-800 ml-2">2 hours</span>
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

export default Schedule;
