// app/dashboard/page.tsx
"use client";

import Link from "next/link";

const Dashboard = () => {
  // Sample data for the dashboard
  const todaysPatients = [
    { name: "Tyler Williamson", time: "09:00 AM", status: "confirmed", avatar: "TW", condition: "Skin consultation", type: "New Patient" },
    { name: "Samantha Williams", time: "10:15 AM", status: "pending", avatar: "SW", condition: "Panchakarma therapy", type: "Follow-up" },
    { name: "Amy White", time: "11:30 AM", status: "confirmed", avatar: "AW", condition: "Digestive issues", type: "New Patient" },
    { name: "Tyler Young", time: "02:00 PM", status: "completed", avatar: "TY", condition: "Stress management", type: "Follow-up" },
  ];

  const allPatients = [
    { name: "Dr. Rajesh Kumar", time: "Tomorrow 9:00 AM", status: "scheduled", avatar: "RK", condition: "Joint pain treatment" },
    { name: "Priya Sharma", time: "Tomorrow 2:30 PM", status: "scheduled", avatar: "PS", condition: "Migraine therapy" },
    { name: "Michael Chen", time: "Dec 8, 10:00 AM", status: "scheduled", avatar: "MC", condition: "Anxiety treatment" },
    { name: "Sarah Johnson", time: "Dec 8, 3:15 PM", status: "scheduled", avatar: "SJ", condition: "Back pain therapy" },
    { name: "David Wilson", time: "Dec 9, 11:00 AM", status: "scheduled", avatar: "DW", condition: "Sleep disorders" },
    { name: "Lisa Anderson", time: "Dec 9, 4:00 PM", status: "scheduled", avatar: "LA", condition: "Detox program" },
  ];

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
            
            <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-5 h-5 bg-teal-400 rounded"></div>
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
            
            <Link href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-5 h-5 bg-gray-600 rounded"></div>
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

          {/* Patient List Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Patient List</h2>
              <button className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-lg">
                View All Patients
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-50 to-amber-50 border-b border-amber-200">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Patient</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Appointment</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Condition</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPatients.map((patient, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-amber-25 hover:to-teal-25 transition-all duration-200">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
                              {patient.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{patient.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{patient.time}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-700">{patient.condition}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            patient.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-2">
                            <button className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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

            {/* Quick Analytics */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Quick Analytics</h3>
                  <Link 
                    href="/dashboard/schedule"
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium cursor-pointer"
                  >
                    View Schedule →
                  </Link>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-teal-50 to-amber-50 rounded-lg p-4 border border-teal-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Today&apos;s Performance</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Good</span>
                    </div>
                    <div className="text-2xl font-bold text-teal-600 mb-1">85%</div>
                    <div className="text-xs text-gray-600">Appointment completion rate</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Patient Satisfaction</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Excellent</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 mb-1">4.8/5</div>
                    <div className="text-xs text-gray-600">Average rating this week</div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Treatment Success</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">High</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">92%</div>
                    <div className="text-xs text-gray-600">Positive outcomes this month</div>
                  </div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-gray-800">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full bg-teal-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                      Add New Patient
                    </button>
                    <Link href="/dashboard/schedule">
                      <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                        Schedule Appointment
                      </button>
                    </Link>
                    <button className="w-full bg-amber-100 text-amber-800 py-2 px-4 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors">
                      Generate Report
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-teal-100 to-amber-100 rounded-lg border border-teal-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Today&apos;s Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium text-gray-800 ml-1">3/4</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium text-gray-800 ml-1">1</span>
                    </div>
                    <div>
                      <span className="text-gray-600">New Patients:</span>
                      <span className="font-medium text-gray-800 ml-1">2</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Follow-ups:</span>
                      <span className="font-medium text-gray-800 ml-1">2</span>
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
