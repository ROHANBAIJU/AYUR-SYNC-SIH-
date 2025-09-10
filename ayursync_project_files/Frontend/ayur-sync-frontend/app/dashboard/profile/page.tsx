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
            
            <Link href="/dashboard/patients" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
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
            
            <Link href="/dashboard/profile" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
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
