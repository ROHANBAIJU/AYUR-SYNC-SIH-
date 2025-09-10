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
        <div className="w-64 bg-gray-900 text-white min-h-screen p-4 fixed left-0 top-0">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex flex-col">
                <span className="text-lg font-semibold">AYUR-SYNC v1 beta</span>
                <div className="mt-1">
                  <span className="text-xs text-gray-100 bg-gray-600 px-2 py-1 rounded-full border border-gray-500">AI Powered</span>
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
            
            <Link href="/dashboard/chatbot" className="flex items-center space-x-3 p-3 rounded-lg bg-teal-600 text-white">
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
