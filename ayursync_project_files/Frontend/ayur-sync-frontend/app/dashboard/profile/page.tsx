// app/dashboard/profile/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type UserProfile = {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: string;
  license: string;
  location: string;
  bio: string;
  profileImage: string;
};

const Profile = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "Dr. Rajesh Kumar",
    email: "rajesh.kumar@ayursync.com",
    phone: "+91 9876543210",
    specialization: "Panchakarma Specialist",
    experience: "12 years",
    license: "AYU/2012/DEL/456",
    location: "New Delhi, India",
    bio: "Experienced Ayurvedic practitioner specializing in Panchakarma therapies and holistic wellness. Dedicated to providing authentic traditional treatments combined with modern healthcare approaches.",
    profileImage: "/doc_sym.png"
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile);
  };

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
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
              
              <Link href="/dashboard/profile" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg bg-teal-600 text-white`}>
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
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">My Profile</h1>
              <p className="text-gray-600">Manage your personal information and professional details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-teal-400 to-amber-400 p-1">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <Image 
                          src={profile.profileImage} 
                          alt="Profile" 
                          width={120} 
                          height={120} 
                          className="rounded-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-2">
                      <button className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-full shadow-lg transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-800 mb-1">{profile.name}</h2>
                  <p className="text-teal-600 font-medium mb-2">{profile.specialization}</p>
                  <p className="text-gray-500 text-sm mb-4">{profile.location}</p>
                  
                  <div className="flex justify-center space-x-4 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="font-semibold text-gray-800">{profile.experience}</div>
                      <div>Experience</div>
                    </div>
                    <div className="w-px bg-gray-300"></div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-800">4.8</div>
                      <div>Rating</div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Patients</span>
                      <span className="font-semibold text-gray-800">1,248</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">This Month</span>
                      <span className="font-semibold text-teal-600">87</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Success Rate</span>
                      <span className="font-semibold text-green-600">96%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-gray-800">Profile Information</h3>
                    {!isEditing ? (
                      <button
                        onClick={handleEdit}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                        <span>Edit Profile</span>
                      </button>
                    ) : (
                      <div className="space-x-3">
                        <button
                          onClick={handleCancel}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Personal Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedProfile.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.name}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                          {isEditing ? (
                            <input
                              type="email"
                              value={editedProfile.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.email}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              value={editedProfile.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.phone}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedProfile.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.location}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div>
                      <h4 className="font-medium text-gray-800 mb-4">Professional Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Specialization</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedProfile.specialization}
                              onChange={(e) => handleInputChange('specialization', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.specialization}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Experience</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedProfile.experience}
                              onChange={(e) => handleInputChange('experience', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.experience}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">License Number</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedProfile.license}
                              onChange={(e) => handleInputChange('license', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          ) : (
                            <p className="text-gray-800">{profile.license}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-800 mb-4">About Me</h4>
                    {isEditing ? (
                      <textarea
                        value={editedProfile.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      />
                    ) : (
                      <p className="text-gray-800 leading-relaxed">{profile.bio}</p>
                    )}
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mt-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6">Account Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-800">Email Notifications</h4>
                        <p className="text-sm text-gray-600">Receive updates about appointments and messages</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-800">SMS Notifications</h4>
                        <p className="text-sm text-gray-600">Receive appointment reminders via SMS</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
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

export default Profile;
