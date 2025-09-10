// app/dashboard/patients/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

// Define patient type
type Patient = {
  id: number;
  name: string;
  age: number;
  gender: string;
  condition: string;
  lastVisit: string;
  nextAppointment: string;
  treatment: string;
  notes: string;
  status: string;
  avatar: string;
  dob: string;
  contact: string;
  abhaNo: string;
};

const Patients = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'details'>('cards');
  const [symptomSearch, setSymptomSearch] = useState("");
  
  // Sample patient data
  const patients = [
    {
      id: 1,
      name: "Rajesh Kumar",
      age: 45,
      gender: "M",
      condition: "Chronic Arthritis",
      lastVisit: "14/11/24",
      nextAppointment: "21/11/24",
      treatment: "Panchakarma Therapy",
      notes: "Patient responds well to Abhyanga massage. Continue with current herbal medications. Recommended dietary changes are being followed.",
      status: "Active",
      avatar: "RK",
      dob: "15/03/1994",
      contact: "+91 9876543210",
      abhaNo: "14-1234-5678-9012"
    },
    {
      id: 2,
      name: "Priya Sharma",
      age: 32,
      gender: "F",
      condition: "Migraine & Stress",
      lastVisit: "12/11/24",
      nextAppointment: "19/11/24",
      treatment: "Shirodhara Therapy",
      notes: "Significant improvement in sleep patterns. Continue meditation practices. Herbal tea blend helping with stress levels.",
      status: "Active",
      avatar: "PS",
      dob: "22/07/1992",
      contact: "+91 9876543211",
      abhaNo: "14-1234-5678-9013"
    },
    {
      id: 3,
      name: "Michael Chen",
      age: 38,
      gender: "M",
      condition: "Digestive Issues",
      lastVisit: "10/11/24",
      nextAppointment: "17/11/24",
      treatment: "Virechana Detox",
      notes: "Patient completing first phase of Panchakarma. Dietary restrictions being followed. Slight improvement in digestion.",
      status: "In Treatment",
      avatar: "MC",
      dob: "05/09/1987",
      contact: "+91 9876543212",
      abhaNo: "14-1234-5678-9014"
    },
    {
      id: 4,
      name: "Sarah Johnson",
      age: 29,
      gender: "F",
      condition: "Anxiety & Insomnia",
      lastVisit: "15/11/24",
      nextAppointment: "22/11/24",
      treatment: "Yoga & Meditation",
      notes: "Regular yoga practice established. Herbal supplements for sleep showing positive results. Stress levels decreasing.",
      status: "Active",
      avatar: "SJ",
      dob: "12/12/1995",
      contact: "+91 9876543213",
      abhaNo: "14-1234-5678-9015"
    },
    {
      id: 5,
      name: "David Wilson",
      age: 52,
      gender: "M",
      condition: "Lower Back Pain",
      lastVisit: "13/11/24",
      nextAppointment: "20/11/24",
      treatment: "Kati Basti",
      notes: "Localized oil treatment showing excellent results. Patient reports 60% pain reduction. Continue current protocol.",
      status: "Active",
      avatar: "DW",
      dob: "08/03/1973",
      contact: "+91 9876543214",
      abhaNo: "14-1234-5678-9016"
    },
    {
      id: 6,
      name: "Lisa Anderson",
      age: 41,
      gender: "F",
      condition: "Skin Disorders",
      lastVisit: "11/11/24",
      nextAppointment: "18/11/24",
      treatment: "Herbal Applications",
      notes: "Skin condition improving with Neem and Turmeric applications. Patient following dietary guidelines strictly.",
      status: "Active",
      avatar: "LA",
      dob: "25/06/1984",
      contact: "+91 9876543215",
      abhaNo: "14-1234-5678-9017"
    },
    {
      id: 7,
      name: "Jennifer Brown",
      age: 35,
      gender: "F",
      condition: "Hormonal Imbalance",
      lastVisit: "09/11/24",
      nextAppointment: "16/11/24",
      treatment: "Ayurvedic Medicines",
      notes: "Ashwagandha and Shatavari showing positive effects. Menstrual cycle regularizing. Continue for 2 more months.",
      status: "Active",
      avatar: "JB",
      dob: "18/04/1990",
      contact: "+91 9876543216",
      abhaNo: "14-1234-5678-9018"
    },
    {
      id: 8,
      name: "Robert Taylor",
      age: 47,
      gender: "M",
      condition: "High Blood Pressure",
      lastVisit: "08/11/24",
      nextAppointment: "15/11/24",
      treatment: "Lifestyle Modification",
      notes: "Blood pressure stabilizing with Arjuna and lifestyle changes. Meditation practice helping with stress management.",
      status: "Monitoring",
      avatar: "RT",
      dob: "30/11/1978",
      contact: "+91 9876543217",
      abhaNo: "14-1234-5678-9019"
    }
  ];

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleBackToCards = () => {
    setViewMode('cards');
    setSelectedPatient(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "In Treatment":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Monitoring":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Three-column details view
  if (viewMode === 'details') {
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
              
              <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
                <div className="w-7 h-7 flex items-center justify-center">
                  <Image src="/patients.png" alt="Patients" width={32} height={32} className="rounded" />
                </div>
                <span>Patients</span>
              </Link>
              
              <Link href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
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

          {/* Main Content - Three Column Layout */}
          <div className="flex-1 ml-64 p-6">
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={handleBackToCards}
                className="flex items-center space-x-2 text-teal-600 hover:text-teal-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Patients</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-120px)]">
              
              {/* Section 1: Patients List */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Patients</h2>
                
                {/* Patient List */}
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`p-4 rounded-lg cursor-pointer transition-all border ${
                        selectedPatient?.id === patient.id 
                          ? 'bg-teal-50 border-teal-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-800">{patient.name}</h3>
                          <p className="text-sm text-gray-500">{patient.age} {patient.gender}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                          {patient.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Patient Details */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Patient details</h2>
                  <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {selectedPatient ? (
                  <div className="space-y-6">
                    {/* Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Name</label>
                      <input
                        type="text"
                        value={selectedPatient.name}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* DOB Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">DOB</label>
                      <input
                        type="text"
                        value={selectedPatient.dob}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* Age Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Age</label>
                      <input
                        type="text"
                        value={`${selectedPatient.age} years`}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* Contact Info Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Contact Info</label>
                      <input
                        type="text"
                        value={selectedPatient.contact}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>

                    {/* ABHA No Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">ABHA No</label>
                      <input
                        type="text"
                        value={selectedPatient.abhaNo}
                        readOnly
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">Select a patient to view details</p>
                  </div>
                )}
              </div>

              {/* Section 3: Find ICD Code */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Find ICD Code</h2>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>

                {/* Symptom Search */}
                <div className="relative mb-6">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search symptoms"
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50"
                  />
                </div>

                {/* Results Area */}
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Details here</p>
                  <p className="text-gray-400 text-xs mt-1">Search for symptoms to find ICD codes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default cards view
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
            
            <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-7 h-7 flex items-center justify-center">
                <Image src="/patients.png" alt="Patients" width={32} height={32} className="rounded" />
              </div>
              <span>Patients</span>
            </Link>
            
            <Link href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
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
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Records</h1>
                <p className="text-gray-600">Manage and view all patient information</p>
              </div>
              <div className="flex space-x-4">
                <button className="bg-white border border-amber-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors">
                  Export
                </button>
                <button className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg">
                  Add New Patient
                </button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex space-x-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search patients..."
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <select className="px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option>All Status</option>
                <option>Active</option>
                <option>In Treatment</option>
                <option>Monitoring</option>
              </select>
              <select className="px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                <option>All Conditions</option>
                <option>Arthritis</option>
                <option>Migraine</option>
                <option>Digestive Issues</option>
                <option>Anxiety</option>
              </select>
            </div>
          </div>

          {/* Patient Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white rounded-2xl shadow-lg border border-amber-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {/* Patient Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                      {patient.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{patient.name}</h3>
                      <p className="text-sm text-gray-500">Age: {patient.age}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(patient.status)}`}>
                    {patient.status}
                  </span>
                </div>

                {/* Condition */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-1">Primary Condition</h4>
                  <p className="text-gray-600 text-sm">{patient.condition}</p>
                </div>

                {/* Treatment */}
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-700 mb-1">Current Treatment</h4>
                  <p className="text-teal-600 text-sm font-medium">{patient.treatment}</p>
                </div>

                {/* Dates */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Visit:</span>
                    <span className="text-gray-700 font-medium">{patient.lastVisit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Next Appointment:</span>
                    <span className="text-teal-600 font-medium">{patient.nextAppointment}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex space-x-2">
                  <button 
                    onClick={() => handleViewDetails(patient)}
                    className="flex-1 bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 py-2 px-3 rounded-lg hover:from-teal-100 hover:to-teal-200 transition-all text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 py-2 px-3 rounded-lg hover:from-amber-100 hover:to-amber-200 transition-all text-sm font-medium">
                    Edit Record
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div className="mt-8 text-center">
            <button className="bg-white border-2 border-teal-200 text-teal-600 px-8 py-3 rounded-lg hover:bg-teal-50 transition-colors font-medium">
              Load More Patients
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Patients;
