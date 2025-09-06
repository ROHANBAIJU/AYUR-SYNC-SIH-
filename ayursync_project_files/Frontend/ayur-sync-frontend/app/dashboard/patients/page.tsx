// app/dashboard/patients/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

// Define patient type
type Patient = {
  id: number;
  name: string;
  age: number;
  condition: string;
  lastVisit: string;
  nextAppointment: string;
  treatment: string;
  notes: string;
  status: string;
  avatar: string;
};

const Patients = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  // Sample patient data based on the layout shown in the image
  const patients = [
    {
      id: 1,
      name: "Rajesh Kumar",
      age: 45,
      condition: "Chronic Arthritis",
      lastVisit: "14/11/24",
      nextAppointment: "21/11/24",
      treatment: "Panchakarma Therapy",
      notes: "Patient responds well to Abhyanga massage. Continue with current herbal medications. Recommended dietary changes are being followed.",
      status: "Active",
      avatar: "RK"
    },
    {
      id: 2,
      name: "Priya Sharma",
      age: 32,
      condition: "Migraine & Stress",
      lastVisit: "12/11/24",
      nextAppointment: "19/11/24",
      treatment: "Shirodhara Therapy",
      notes: "Significant improvement in sleep patterns. Continue meditation practices. Herbal tea blend helping with stress levels.",
      status: "Active",
      avatar: "PS"
    },
    {
      id: 3,
      name: "Michael Chen",
      age: 38,
      condition: "Digestive Issues",
      lastVisit: "10/11/24",
      nextAppointment: "17/11/24",
      treatment: "Virechana Detox",
      notes: "Patient completing first phase of Panchakarma. Dietary restrictions being followed. Slight improvement in digestion.",
      status: "In Treatment",
      avatar: "MC"
    },
    {
      id: 4,
      name: "Sarah Johnson",
      age: 29,
      condition: "Anxiety & Insomnia",
      lastVisit: "15/11/24",
      nextAppointment: "22/11/24",
      treatment: "Yoga & Meditation",
      notes: "Regular yoga practice established. Herbal supplements for sleep showing positive results. Stress levels decreasing.",
      status: "Active",
      avatar: "SJ"
    },
    {
      id: 5,
      name: "David Wilson",
      age: 52,
      condition: "Lower Back Pain",
      lastVisit: "13/11/24",
      nextAppointment: "20/11/24",
      treatment: "Kati Basti",
      notes: "Localized oil treatment showing excellent results. Patient reports 60% pain reduction. Continue current protocol.",
      status: "Active",
      avatar: "DW"
    },
    {
      id: 6,
      name: "Lisa Anderson",
      age: 41,
      condition: "Skin Disorders",
      lastVisit: "11/11/24",
      nextAppointment: "18/11/24",
      treatment: "Herbal Applications",
      notes: "Skin condition improving with Neem and Turmeric applications. Patient following dietary guidelines strictly.",
      status: "Active",
      avatar: "LA"
    },
    {
      id: 7,
      name: "Jennifer Brown",
      age: 35,
      condition: "Hormonal Imbalance",
      lastVisit: "09/11/24",
      nextAppointment: "16/11/24",
      treatment: "Ayurvedic Medicines",
      notes: "Ashwagandha and Shatavari showing positive effects. Menstrual cycle regularizing. Continue for 2 more months.",
      status: "Active",
      avatar: "JB"
    },
    {
      id: 8,
      name: "Robert Taylor",
      age: 47,
      condition: "High Blood Pressure",
      lastVisit: "08/11/24",
      nextAppointment: "15/11/24",
      treatment: "Lifestyle Modification",
      notes: "Blood pressure stabilizing with Arjuna and lifestyle changes. Meditation practice helping with stress management.",
      status: "Monitoring",
      avatar: "RT"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200";
      case "In Treatment":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Monitoring":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
            
            <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-5 h-5 bg-teal-400 rounded"></div>
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
                    onClick={() => setSelectedPatient(patient)}
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

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {selectedPatient.avatar}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedPatient.name}</h2>
                  <p className="text-gray-600">Age: {selectedPatient.age}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mt-2 ${getStatusColor(selectedPatient.status)}`}>
                    {selectedPatient.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Primary Condition</h3>
                  <p className="text-gray-700">{selectedPatient.condition}</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Current Treatment</h3>
                  <p className="text-teal-700 font-medium">{selectedPatient.treatment}</p>
                </div>
              </div>

              {/* Appointment Information */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4">Appointment Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Last Visit</p>
                    <p className="text-lg font-medium text-gray-800">{selectedPatient.lastVisit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Appointment</p>
                    <p className="text-lg font-medium text-teal-600">{selectedPatient.nextAppointment}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Notes */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4">Latest Clinical Notes</h3>
                <div className="prose prose-sm text-gray-700 leading-relaxed">
                  <p>{selectedPatient.notes}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <button className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 px-6 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all font-medium">
                  Schedule Appointment
                </button>
                <button className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 px-6 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all font-medium">
                  Edit Record
                </button>
                <button className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-all font-medium">
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
