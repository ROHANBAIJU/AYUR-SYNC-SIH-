// app/dashboard/chatbot/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type Message = {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
};

const Chatbot = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm your AYUR-SYNC AI assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: messages.length + 2,
        text: "Thank you for your message. I'm here to assist you with AYUR-SYNC related queries. This is a demo response.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
              
              <Link href="/dashboard/chatbot" className={`flex items-center ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3 space-x-3'} rounded-lg bg-teal-600 text-white`}>
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
        </div>

        {/* Main Content */}
        <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300 flex-1 p-8`}>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Chatbot Assistant</h1>
              <p className="text-gray-600">Get instant help and support for your AYUR-SYNC queries</p>
            </div>

            {/* Chat Container */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Chat Header */}
              <div className="px-6 py-4" style={{backgroundColor: '#1a5a5a'}}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <Image src="/chatbot.png" alt="AI Assistant" width={24} height={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">AYUR-SYNC AI Assistant</h3>
                    <p className="text-blue-100 text-sm">Always here to help</p>
                  </div>
                  <div className="ml-auto">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.sender === "user"
                          ? "bg-teal-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === "user" ? "text-teal-100" : "text-gray-500"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-3">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here..."
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    rows={1}
                    disabled={isTyping}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isTyping}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl transition-colors duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                    </svg>
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setInputText("How do I schedule an appointment?")}
                  className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left"
                >
                  <div className="text-teal-600 font-medium">Schedule Appointment</div>
                  <div className="text-gray-600 text-sm mt-1">Learn how to book consultations</div>
                </button>
                
                <button
                  onClick={() => setInputText("Tell me about Ayurvedic treatments")}
                  className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left"
                >
                  <div className="text-amber-600 font-medium">Treatment Info</div>
                  <div className="text-gray-600 text-sm mt-1">Explore Ayurvedic therapies</div>
                </button>
                
                <button
                  onClick={() => setInputText("How do I access my patient records?")}
                  className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left"
                >
                  <div className="text-green-600 font-medium">Patient Records</div>
                  <div className="text-gray-600 text-sm mt-1">Access your medical history</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
