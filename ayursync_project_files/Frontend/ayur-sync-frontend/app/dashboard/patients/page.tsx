// app/dashboard/patients/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";

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

// Isolated form component to prevent re-rendering issues
const PatientForm = memo(({ onSave, onClose }: { onSave: (patient: any) => void; onClose: () => void }) => {
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    age: "",
    gender: "",
    contact: "",
    abhaNo: "",
    condition: "",
    notes: "",
    consentFlag: false
  });

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
        NAME AND BASIC DETAILS WITH CONSENT FLAG
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Enter patient name"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Birth *
          </label>
          <input
            type="text"
            value={formData.dob}
            onChange={(e) => updateField('dob', e.target.value)}
            onFocus={(e) => e.target.type = 'date'}
            onBlur={(e) => {
              if (!e.target.value) {
                e.target.type = 'text';
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="DD/MM/YYYY or use date picker"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Age
          </label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => updateField('age', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Age"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender *
          </label>
          <select
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Select Gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="O">Other</option>
          </select>
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Number *
          </label>
          <input
            type="tel"
            value={formData.contact}
            onChange={(e) => updateField('contact', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="+91 XXXXXXXXXX"
          />
        </div>

        {/* ABHA Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ABHA Number
          </label>
          <input
            type="text"
            value={formData.abhaNo}
            onChange={(e) => updateField('abhaNo', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="14-XXXX-XXXX-XXXX"
          />
        </div>
      </div>

      {/* Consent Flag */}
      <div className="mt-6">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="consent"
            checked={formData.consentFlag}
            onChange={(e) => updateField('consentFlag', e.target.checked)}
            className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <label htmlFor="consent" className="text-sm font-medium text-gray-700">
            Patient has provided consent for data collection and treatment
          </label>
        </div>
      </div>

      {/* Condition Field */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Condition
        </label>
        <input
          type="text"
          value={formData.condition}
          onChange={(e) => updateField('condition', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="Enter primary condition"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end mt-8 space-x-4">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Save Patient
        </button>
      </div>
    </div>
  );
});

PatientForm.displayName = 'PatientForm';

const initialPatients: Patient[] = [
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

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'details'>('cards');
  const [symptomSearch, setSymptomSearch] = useState("");
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    dob: "",
    age: "",
    gender: "",
    contact: "",
    abhaNo: "",
    condition: "",
    notes: "",
    consentFlag: false
  });

  useEffect(() => {
    try {
      const storedPatients = localStorage.getItem('patients');
      if (storedPatients) {
        setPatients(JSON.parse(storedPatients));
      } else {
        localStorage.setItem('patients', JSON.stringify(initialPatients));
        setPatients(initialPatients);
      }
    } catch (error) {
      console.error("Failed to parse patients from localStorage", error);
      localStorage.setItem('patients', JSON.stringify(initialPatients));
      setPatients(initialPatients);
    }
  }, []);

  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setViewMode('details');
  };

  const handleBackToCards = () => {
    setViewMode('cards');
    setSelectedPatient(null);
  };

  const handleAddPatient = () => {
    setShowAddPatientModal(true);
  };

  const handleCloseModal = () => {
    setShowAddPatientModal(false);
    setShowEditPatientModal(false);
    setEditingPatient(null);
    setNewPatient({
      name: "",
      dob: "",
      age: "",
      gender: "",
      contact: "",
      abhaNo: "",
      condition: "",
      notes: "",
      consentFlag: false
    });
  };

  // Stable handlers to prevent focus loss
  const handleNewPatientChange = useCallback((field: string, value: any) => {
    setNewPatient(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleEditPatientChange = useCallback((field: string, value: any) => {
    setEditingPatient(prev => prev ? ({
      ...prev,
      [field]: value
    }) : prev);
  }, []);

  // Individual stable handlers for better performance
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, name: e.target.value }));
  }, []);

  const handleDobChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, dob: e.target.value }));
  }, []);

  const handleAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, age: e.target.value }));
  }, []);

  const handleGenderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setNewPatient(prev => ({ ...prev, gender: e.target.value }));
  }, []);

  const handleContactChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, contact: e.target.value }));
  }, []);

  const handleAbhaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, abhaNo: e.target.value }));
  }, []);

  const handleConditionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, condition: e.target.value }));
  }, []);

  const handleConsentChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPatient(prev => ({ ...prev, consentFlag: e.target.checked }));
  }, []);

  const handleSavePatient = () => {
    const getInitials = (name: string) => {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts[0] && nameParts[0].length > 1) {
            return nameParts[0].substring(0, 2).toUpperCase();
        }
        return '??';
    };

    const newId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1;

    const patientToAdd: Patient = {
        ...newPatient,
        id: newId,
        age: parseInt(newPatient.age, 10) || 0,
        avatar: getInitials(newPatient.name),
        lastVisit: new Date().toLocaleDateString('en-GB'),
        nextAppointment: 'N/A',
        treatment: 'Initial Consultation',
        status: 'Active',
    };

    const newPatientsList = [...patients, patientToAdd];
    setPatients(newPatientsList);
    localStorage.setItem('patients', JSON.stringify(newPatientsList));
    handleCloseModal();
  };
  
  const handleEditClick = (patient: Patient) => {
    setEditingPatient(patient);
    setShowEditPatientModal(true);
  };

  const handleUpdatePatient = () => {
    if (!editingPatient) return;

    const getInitials = (name: string) => {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts[0] && nameParts[0].length > 1) {
            return nameParts[0].substring(0, 2).toUpperCase();
        }
        return '??';
    };
    
    const updatedPatient = {
      ...editingPatient,
      avatar: getInitials(editingPatient.name)
    };

    const updatedPatients = patients.map(p =>
        p.id === updatedPatient.id ? updatedPatient : p
    );

    setPatients(updatedPatients);
    localStorage.setItem('patients', JSON.stringify(updatedPatients));
    handleCloseModal();
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

  // Add Patient Modal Component
  const AddPatientModal = () => {
    if (!showAddPatientModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Patients Interface</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSavePatient}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                SAVE PATIENT CARD BUTTON
              </button>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Top Section - Name and Basic Details */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                NAME AND BASIC DETAILS WITH CONSENT FLAG
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter patient name"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="text"
                    value={newPatient.dob}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, dob: e.target.value }))}
                    onFocus={(e) => e.target.type = 'date'}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        e.target.type = 'text';
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="DD/MM/YYYY or use date picker"
                  />
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, age: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Age"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    value={newPatient.gender}
                    onChange={handleGenderChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    value={newPatient.contact}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, contact: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>

                {/* ABHA Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ABHA Number
                  </label>
                  <input
                    type="text"
                    value={newPatient.abhaNo}
                    onChange={handleAbhaChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="14-XXXX-XXXX-XXXX"
                  />
                </div>
              </div>

              {/* Consent Flag */}
              <div className="mt-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={newPatient.consentFlag}
                    onChange={handleConsentChange}
                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="consent" className="text-sm font-medium text-gray-700">
                    Patient has provided consent for data collection and treatment
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Section - Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column - ICD Diagnosis */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">ICD DIAGNOSIS +</h3>
                </div>
                
                {/* Primary Condition Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Condition
                  </label>
                   <div className="relative">
                    <input
                      type="text"
                      value={newPatient.condition}
                      onChange={handleConditionChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Search primary condition"
                    />
                    <svg
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>

                {/* ICD Code Display Area */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ICD Code
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 min-h-[46px]">
                    <span className="italic">ICD codes will appear here...</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Notes
                  </label>
                  <textarea
                    value={newPatient.notes}
                    onChange={(e) => setNewPatient(p => ({...p, notes: e.target.value}))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter clinical notes and observations..."
                  />
                </div>
              </div>

              {/* Right Column - ICD to Namaste Translation */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">TRANSLATION</h3>
                </div>

                {/* Namaste Code Output */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Namaste Code
                  </label>
                  <textarea
                    readOnly
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    placeholder="Namaste code will appear here..."
                  />
                </div>

                {/* Translation Controls */}
                <div className="flex space-x-3">
                  <button className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Translate Code</span>
                  </button>
                  <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Edit Patient Modal Component
  const EditPatientModal = () => {
    if (!showEditPatientModal || !editingPatient) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Edit Patient Details</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleUpdatePatient}
                className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                UPDATE PATIENT
              </button>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">PATIENT INFORMATION</h3>
                    {/* Name */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={editingPatient.name}
                        onChange={(e) => handleEditPatientChange('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    {/* DOB */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                      <input
                        type="text"
                        value={editingPatient.dob}
                        onChange={(e) => handleEditPatientChange('dob', e.target.value)}
                        onFocus={(e) => e.target.type = 'date'}
                        onBlur={(e) => {
                          if (!e.target.value) {
                            e.target.type = 'text';
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="DD/MM/YYYY or use date picker"
                      />
                    </div>
                     {/* Age */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                        <input
                            type="number"
                            value={editingPatient.age}
                            onChange={(e) => handleEditPatientChange('age', parseInt(e.target.value,10) || 0)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    {/* Gender */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                      <select
                        value={editingPatient.gender}
                        onChange={(e) => handleEditPatientChange('gender', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>
                    {/* Contact */}
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
                        <input
                            type="tel"
                            value={editingPatient.contact}
                            onChange={(e) => handleEditPatientChange('contact', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    {/* ABHA */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">ABHA Number</label>
                        <input
                            type="text"
                            value={editingPatient.abhaNo}
                            onChange={(e) => handleEditPatientChange('abhaNo', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>
                {/* Right Column */}
                <div>
                     <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">MEDICAL INFORMATION</h3>
                    {/* Condition */}
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Condition</label>
                        <input
                            type="text"
                            value={editingPatient.condition}
                            onChange={(e) => handleEditPatientChange('condition', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    {/* Treatment */}
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Treatment</label>
                        <input
                            type="text"
                            value={editingPatient.treatment}
                            onChange={(e) => handleEditPatientChange('treatment', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    {/* Status */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={editingPatient.status}
                        onChange={(e) => handleEditPatientChange('status', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option>Active</option>
                        <option>In Treatment</option>
                        <option>Monitoring</option>
                      </select>
                    </div>
                     {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Notes</label>
                        <textarea
                            value={editingPatient.notes}
                            onChange={(e) => handleEditPatientChange('notes', e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  // Three-column details view
  if (viewMode === 'details') {
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
              
              <a href="/dashboard" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </a>
              
              <a href="/dashboard/schedule" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Schedule</span>}
              </a>
              
              <a href="/dashboard/patients" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg bg-teal-600 text-white`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Patients</span>}
              </a>
              
              <a href="/dashboard/india-map" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>India Map</span>}
              </a>
              
              <a href="/dashboard/chatbot" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Chatbot</span>}
              </a>
              
              <a href="/dashboard/profile" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>My profile</span>}
              </a>

              {!isSidebarCollapsed && <div className="border-t border-gray-700 my-4"></div>}
              {isSidebarCollapsed && <div className="w-full h-px bg-gray-700 my-3"></div>}
              
              <a href="/" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg hover:bg-gray-800 transition-colors`}>
                <div className={`${isSidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'} flex items-center justify-center`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                {!isSidebarCollapsed && <span>Home</span>}
              </a>

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

          {/* Main Content - Three Column Layout */}
          <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 flex-1 p-6`}>
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
        
        {/* Add Patient Modal */}
        <AddPatientModal />
        <EditPatientModal />
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
            
            <a href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <span>Dashboard</span>
            </a>
            
            <a href="/dashboard/schedule" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Schedule</span>
            </a>
            
            <a href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
              </div>
              <span>Patients</span>
            </a>
            
            <a href="/dashboard/india-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>India Map</span>
            </a>
            
            <a href="/dashboard/chatbot" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>Chatbot</span>
            </a>
            
            <a href="/dashboard/profile" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <span>My profile</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 bg-gray-600 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                </svg>
              </div>
              <span>Home</span>
            </a>

            <div className="border-t border-gray-700 my-4"></div>
            
            <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="w-7 h-7 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
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
                <button 
                  onClick={handleAddPatient}
                  className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg"
                >
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
                  <button onClick={() => handleEditClick(patient)} className="flex-1 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 py-2 px-3 rounded-lg hover:from-amber-100 hover:to-amber-200 transition-all text-sm font-medium">
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
      
      {/* Add/Edit Patient Modals */}
      <AddPatientModal />
      <EditPatientModal />
    </div>
  );
};

export default Patients;


