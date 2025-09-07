// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link"; // Import the Link component
import Image from "next/image"; // Import the Image component

const HomePage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heroRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeInUp");
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      statsObserver.observe(statsRef.current);
    }

    return () => {
      observer.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  const animateCounters = () => {
    const counters = document.querySelectorAll(".counter");
    counters.forEach((counter) => {
      const targetAttr = counter.getAttribute("data-target");
      if (!targetAttr) return;
      const target = parseInt(targetAttr);
      const duration = 2000;
      const increment = target / (duration / 16);
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent =
            target + (counter.getAttribute("data-suffix") || "");
          clearInterval(timer);
        } else {
          counter.textContent =
            Math.floor(current) + (counter.getAttribute("data-suffix") || "");
        }
      }, 16);
    });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#FAF3E0",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-amber-200 transition-all duration-500 ease-in-out animate-slideDown fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center space-x-2 animate-slideInLeft">
          <div className="w-8 h-8 bg-[#1A5A5A] rounded-full flex items-center justify-center hover:bg-[#134444] transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-12">
            <span className="text-white font-bold text-xs">AS</span>
          </div>
          <span className="font-semibold text-gray-800">
            AYUR-SYNC UI Client
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-6 animate-slideInRight">
          {/* Main Sign In button */}
          <Link href="/signin">
            <button
              type="button"
              className="bg-[#1A5A5A] text-white px-3 py-1.5 border-2 border-transparent rounded-full hover:bg-[#134444] transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              Sign In
            </button>
          </Link>
          <Link href="/dashboard">
            <button
              type="button"
              className="bg-teal-600 text-white px-3 py-1.5 border-2 border-transparent rounded-full hover:bg-teal-700 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              View Dashboard
            </button>
          </Link>
          <button className="bg-gradient-to-r from-teal-100/30 via-green-100/30 to-teal-100/30 backdrop-blur-sm border-2 border-[#1A5A5A] text-[#1A5A5A] px-3 py-1.5 rounded-full hover:bg-green-50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95 animate-fluid">
            Learn More
          </button>
          <div className="w-8 h-8 bg-gray-300 rounded-full hover:bg-gray-400 transition-all duration-300 ease-in-out transform hover:scale-110"></div>
        </div>

        <button
          className={`md:hidden text-gray-600 transition-all duration-300 ease-in-out ${
            isMenuOpen ? "rotate-90" : "rotate-0"
          }`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg
            className="w-6 h-6 transition-transform duration-300 ease-in-out"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>

        <div
          className={`md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-amber-200 transition-all duration-300 ease-in-out ${
            isMenuOpen
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="px-6 py-4 space-y-3">
            {/* Mobile Sign In button */}
            <Link href="/signin">
              <button
                type="button"
                className="block w-full text-center bg-[#1A5A5A] text-white px-4 py-2 rounded-lg hover:bg-[#134444] transition-all duration-200 ease-in-out"
              >
                Sign In
              </button>
            </Link>
            <Link href="/dashboard">
              <button
                type="button"
                className="block w-full text-center bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all duration-200 ease-in-out"
              >
                View Dashboard
              </button>
            </Link>
            <button className="block w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 ease-in-out">
              Learn More
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <section
        ref={heroRef}
        className="relative px-6 py-16 text-center overflow-hidden"
        style={{
          position: "sticky",
          top: "80px",
          zIndex: 10,
          backgroundColor: "#FAF3E0",
          marginTop: "80px",
        }}
      >
        {/* Floating Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="floating-element absolute top-20 left-10 w-4 h-4 bg-teal-200 rounded-full opacity-60"></div>
          <div className="floating-element-delayed absolute top-40 right-20 w-6 h-6 bg-amber-300 rounded-full opacity-40"></div>
          <div className="floating-element absolute bottom-32 left-1/4 w-3 h-3 bg-green-300 rounded-full opacity-50"></div>
          <div className="floating-element-delayed absolute bottom-20 right-1/3 w-5 h-5 bg-blue-200 rounded-full opacity-30"></div>
        </div>

        {/* Watermark Image */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none"
          style={{ top: "-90px" }}
        >
          <Image
            src="/doc_sym.png"
            alt="Watermark"
            width={460}
            height={460}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-teal-700 mb-4 tracking-tight animate-slideInUp hover:text-teal-600 transition-all duration-500 ease-in-out cursor-default">
            AYUR-SYNC
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 font-light animate-slideInUp animation-delay-200 hover:text-gray-700 transition-all duration-300 ease-in-out">
            Unifying Ayurveda and Modern Medicine for You
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16 animate-slideInUp animation-delay-400">
            <Link href="/signin">
              <button className="bg-[#1A5A5A] text-white font-medium px-8 py-3 rounded-full hover:bg-[#134444] transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl active:scale-95 pulse-on-hover">
                Get Started
              </button>
            </Link>
            <button className="bg-gradient-to-r from-teal-100/30 via-green-100/30 to-teal-100/30 backdrop-blur-sm border-2 border-[#1A5A5A] text-[#1A5A5A] font-medium px-8 py-3 rounded-full hover:bg-green-50 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl active:scale-95 animate-fluid">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Masterpiece Showcase Section with STICKY effect */}
      <section
        className="relative px-6 py-16"
        style={{
          position: "sticky",
          top: "80px",
          zIndex: 10,
          backgroundColor: "#FAF3E0",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-amber-200 hover:shadow-3xl transition-all duration-500 ease-in-out transform hover:scale-[1.02]">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-10 flex items-center justify-center border border-white/20 backdrop-blur-sm shadow-inner transition-all duration-500 ease-in-out hover:from-gray-100 hover:to-gray-200">
              <div className="text-center space-y-8 w-full">
                <div className="w-28 h-28 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg transform rotate-3 transition-all duration-500 ease-in-out hover:rotate-6 hover:scale-110 hover:shadow-2xl">
                  <svg
                    className="w-14 h-14 text-white transition-all duration-300 ease-in-out hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-4xl md:text-5xl font-semibold text-gray-800 mb-6 transition-all duration-500 ease-in-out hover:text-teal-700 cursor-default">
                    A place to display your masterpieces
                  </h3>
                  <p className="text-xl md:text-2xl text-gray-600 transition-all duration-500 ease-in-out hover:text-gray-700">
                    Showcase your medical innovations and Ayurvedic solutions
                  </p>
                </div>
                <div className="w-full">
                  <video
                    controls
                    className="w-full h-auto rounded-lg transition-all duration-500 ease-in-out hover:shadow-2xl transform hover:scale-[1.02]"
                  >
                    <source src="path/to/your/video.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section that scrolls OVER the masterpiece section */}
      <section
        className="px-6 py-16 bg-white/50 backdrop-blur-sm"
        style={{ position: "relative", zIndex: 20 }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-12 animate-slideInUp hover:text-gray-900 transition-all duration-300 ease-in-out cursor-default">
            THE PROBLEM
          </h2>

          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 md:p-12 border border-amber-200 hover:shadow-2xl transition-all duration-500 ease-in-out transform hover:scale-[1.01]">
            {/* Quote decorations */}
            <div className="absolute top-4 left-4 animate-bounce-slow">
              <svg
                className="w-12 h-12 text-teal-200 hover:text-teal-300 transition-all duration-300 ease-in-out transform hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
              </svg>
            </div>

            <div className="relative z-10">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6 italic animate-fadeInUp animation-delay-200 hover:text-gray-800 transition-all duration-300 ease-in-out">
                &quot;Doctors in India struggle to record diagnoses and treatment
                information due to complex ICD-11, TMN, etc. The standards exist
                but remain hard to access in daily practice. This gap leads to
                inefficient data use and poor compliance with EHR standards.&quot;
              </p>

              <button className="text-teal-600 font-medium hover:text-teal-700 transition-all duration-300 ease-in-out inline-flex items-center space-x-2 transform hover:scale-105 active:scale-95 group">
                <span>Read More</span>
                <svg
                  className="w-4 h-4 transition-all duration-300 ease-in-out group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="absolute bottom-4 right-4 animate-bounce-slow animation-delay-100">
              <svg
                className="w-12 h-12 text-teal-200 transform rotate-180 hover:text-teal-300 transition-all duration-300 ease-in-out hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Our Solution Section with Stagger Animation */}
      <section
        className="px-6 py-16 bg-gradient-to-b from-white/50 to-amber-50/50 animate-fadeInUp"
        style={{ position: "relative", zIndex: 5 }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 animate-slideInUp hover:text-gray-900 transition-all duration-300 ease-in-out cursor-default">
              Our Solution
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-transparent bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text animate-slideInUp animation-delay-100 hover:from-teal-500 hover:to-teal-400 transition-all duration-500 ease-in-out cursor-default">
              AYUR-SYNC
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Card - One API for all Ayurveda */}
            <div className="animate-slideInUp animation-delay-200">
              <div
                ref={(el) => {
                  cardRefs.current[0] = el;
                }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-amber-200 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform hover:-translate-y-2 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:from-teal-200 group-hover:to-teal-300 transition-all duration-300 ease-in-out transform group-hover:rotate-6 group-hover:scale-110">
                  <svg
                    className="w-8 h-8 text-teal-600 transition-all duration-300 ease-in-out group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 text-center group-hover:text-teal-700 transition-all duration-300 ease-in-out">
                  One API for all Ayurveda
                </h3>
                <p className="text-gray-600 text-center group-hover:text-gray-700 transition-all duration-300 ease-in-out">
                  Comprehensive integration of traditional Ayurvedic practices
                  with modern medical systems through a unified API interface.
                </p>
              </div>
            </div>

            {/* Card - Patient records, simplified */}
            <div className="animate-slideInUp animation-delay-300">
              <div
                ref={(el) => {
                  cardRefs.current[1] = el;
                }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-amber-200 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform hover:-translate-y-2 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 ease-in-out transform group-hover:rotate-6 group-hover:scale-110">
                  <svg
                    className="w-8 h-8 text-blue-600 transition-all duration-300 ease-in-out group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 text-center group-hover:text-blue-700 transition-all duration-300 ease-in-out">
                  Patient records, simplified
                </h3>
                <p className="text-gray-600 text-center group-hover:text-gray-700 transition-all duration-300 ease-in-out">
                  Streamlined patient management system integrating both
                  traditional and modern medical records.
                </p>
              </div>
            </div>

            {/* Card - Smart Analytics */}
            <div className="animate-slideInUp animation-delay-400">
              <div
                ref={(el) => {
                  cardRefs.current[2] = el;
                }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-amber-200 hover:shadow-2xl hover:scale-105 transition-all duration-300 ease-in-out transform hover:-translate-y-2 group cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 ease-in-out transform group-hover:rotate-6 group-hover:scale-110">
                  <svg
                    className="w-8 h-8 text-green-600 transition-all duration-300 ease-in-out group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 text-center group-hover:text-green-700 transition-all duration-300 ease-in-out">
                  Smart Analytics
                </h3>
                <p className="text-gray-600 text-center group-hover:text-gray-700 transition-all duration-300 ease-in-out">
                  Advanced data analytics to improve treatment outcomes and
                  medical decision making.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section with Counter Animation */}
      <section
        ref={statsRef}
        className="bg-[#1A5A5A] py-20 text-white text-center relative overflow-hidden animate-fadeInUp"
        style={{ position: "relative", zIndex: 5 }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full floating-element"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white rounded-full floating-element-delayed"></div>
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white rounded-full floating-element"></div>
          <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-white rounded-full floating-element-delayed"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="mb-8 animate-slideInUp">
            <h2 className="text-6xl md:text-8xl font-black mb-4 hover:scale-105 transition-all duration-500 ease-in-out cursor-default">
              <span className="counter" data-target="1" data-suffix="k+">
                1k+
              </span>
            </h2>
            <p className="text-xl md:text-2xl font-medium opacity-90 hover:opacity-100 transition-all duration-300 ease-in-out">
              Total Doctors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 ease-in-out transform hover:scale-105 hover:-translate-y-2 animate-slideInUp animation-delay-200">
              <h4 className="text-3xl font-bold mb-2">
                <span className="counter" data-target="500" data-suffix="+">
                  500+
                </span>
              </h4>
              <p className="text-teal-100">Active Users</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 ease-in-out transform hover:scale-105 hover:-translate-y-2 animate-slideInUp animation-delay-300">
              <h4 className="text-3xl font-bold mb-2">
                <span className="counter" data-target="50" data-suffix="+">
                  50+
                </span>
              </h4>
              <p className="text-teal-100">Hospitals</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 ease-in-out transform hover:scale-105 hover:-translate-y-2 animate-slideInUp animation-delay-400">
              <h4 className="text-3xl font-bold mb-2">
                <span className="counter" data-target="10000" data-suffix="k+">
                  10k+
                </span>
              </h4>
              <p className="text-teal-100">Patients Served</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Hover Effects */}
      <footer
        className="bg-gray-200 py-8 text-gray-700 animate-fadeInUp"
        style={{ position: "relative", zIndex: 5 }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0 animate-slideInLeft">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-4 hover:bg-gray-700 transition-all duration-500 ease-in-out transform hover:scale-110 hover:rotate-12 cursor-pointer">
              <span className="text-white font-bold text-xl">Logo</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-12 text-center md:text-left animate-slideInRight">
            <div className="animate-slideInUp animation-delay-100">
              <h4 className="font-semibold mb-2 hover:text-teal-600 transition-all duration-300 ease-in-out">
                Dashboard
              </h4>
              <a
                href="#"
                className="block hover:text-teal-600 transition-all duration-300 ease-in-out transform hover:translate-x-2"
              >
                Codes
              </a>
              <a
                href="#"
                className="block hover:text-teal-600 transition-all duration-300 ease-in-out transform hover:translate-x-2"
              >
                Patients
              </a>
              <a
                href="#"
                className="block hover:text-teal-600 transition-all duration-300 ease-in-out transform hover:translate-x-2"
              >
                Map
              </a>
            </div>
            <div className="animate-slideInUp animation-delay-200">
              <h4 className="font-semibold mb-2 hover:text-teal-600 transition-all duration-300 ease-in-out">
                About Us
              </h4>
              <a
                href="#"
                className="block hover:text-teal-600 transition-all duration-300 ease-in-out transform hover:translate-x-2"
              >
                Team
              </a>
              <a
                href="#"
                className="block hover:text-teal-600 transition-all duration-300 ease-in-out transform hover:translate-x-2"
              >
                Vision
              </a>
            </div>
            <div className="animate-slideInUp animation-delay-300">
              <h4 className="font-semibold mb-2 hover:text-teal-600 transition-all duration-300 ease-in-out">
                Ayur-SYNC
              </h4>
              <a
                href="#"
                className="block hover:text-teal-600 transition-all duration-300 ease-in-out transform hover:translate-x-2"
              >
                Our Mission
              </a>
            </div>
          </div>
        </div>
        <div className="text-center mt-6 text-gray-500 text-sm hover:text-gray-600 transition-all duration-500 ease-in-out animate-fadeInUp animation-delay-500">
          © AYUR NEXUS
        </div>
      </footer>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes stackIn {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes floating {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(2deg);
          }
          66% {
            transform: translateY(5px) rotate(-1deg);
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.02);
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }
        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        @keyframes fluid-flow {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 0%;
          }
          100% {
            background-position: 0% 0%;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.8s ease-out;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.8s ease-out;
        }
        .animate-slideInRight {
          animation: slideInRight 0.8s ease-out;
        }
        .animate-slideInUp {
          animation: slideInUp 0.8s ease-out forwards;
        }
        .animate-stackIn {
          animation: stackIn 1.2s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-spin-slower:hover {
          animation: spin-slow 10s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .floating-element {
          animation: floating 6s ease-in-out infinite;
        }
        .floating-element-delayed {
          animation: floating 6s ease-in-out infinite;
          animation-delay: 3s;
        }
        .pulse-on-hover {
          position: relative;
          overflow: hidden;
        }
        .pulse-on-hover:hover {
          animation: pulse 1s infinite;
        }
        .pulse-on-hover:before {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .pulse-on-hover:hover:before {
          width: 300px;
          height: 300px;
        }
        .animation-delay-100 {
          animation-delay: 0.1s;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        .bg-gradient-to-r {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        .animate-fluid {
          background-size: 200% 100%;
          animation: fluid-flow 4s ease infinite;
        }
        .hover\\:shadow-3xl:hover {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
        html {
          scroll-behavior: smooth;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        ::-webkit-scrollbar-thumb {
          background: #0d9488;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #0f766e;
        }
        .shimmer {
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
        .interactive:hover {
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }
        .glow-on-hover:hover {
          box-shadow: 0 0 20px rgba(13, 148, 136, 0.5);
          transition: all 0.3s ease;
        }
        @media (min-width: 768px) {
          .magnetic {
            transition: transform 0.3s ease;
          }
          .magnetic:hover {
            transform: scale(1.05);
          }
        }
        .parallax {
          transform: translateZ(0);
          will-change: transform;
        }
        .text-reveal {
          overflow: hidden;
        }
        .text-reveal span {
          display: inline-block;
          transform: translateY(100%);
          animation: textReveal 0.8s ease forwards;
        }
        @keyframes textReveal {
          to {
            transform: translateY(0);
          }
        }
        .morph {
          transition: all 0.5s ease;
        }
        .morph:hover {
          border-radius: 50% 20% 80% 30%;
        }
        .glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .neon-glow:hover {
          text-shadow: 0 0 10px #0d9488, 0 0 20px #0d9488, 0 0 30px #0d9488;
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default HomePage;