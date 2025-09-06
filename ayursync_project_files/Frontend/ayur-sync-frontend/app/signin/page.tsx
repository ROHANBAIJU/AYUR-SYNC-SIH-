// app/signin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

const SignInPage = () => {
  const [isSignUp, setIsSignUp] = useState(false); // Tracks which panel is active
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sign In - Email:", email, "Password:", password);
    
    // TODO: Replace with actual backend API call
    try {
      // const response = await fetch('/api/auth/signin', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ email, password }),
      // });
      // 
      // if (response.ok) {
      //   const data = await response.json();
      //   // Handle successful sign in (e.g., store token, redirect)
      //   console.log('Sign in successful:', data);
      // } else {
      //   // Handle sign in error
      //   console.error('Sign in failed');
      // }
      
      // Placeholder: Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Sign In functionality will be connected to backend API');
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(
      "Sign Up - Name:",
      name,
      "Email:",
      email,
      "Password:",
      password
    );
    
    // TODO: Replace with actual backend API call
    try {
      // const response = await fetch('/api/auth/signup', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ name, email, password }),
      // });
      // 
      // if (response.ok) {
      //   const data = await response.json();
      //   // Handle successful sign up (e.g., redirect to sign in)
      //   console.log('Sign up successful:', data);
      // } else {
      //   // Handle sign up error
      //   console.error('Sign up failed');
      // }
      
      // Placeholder: Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Sign Up functionality will be connected to backend API');
    } catch (error) {
      console.error('Sign up error:', error);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#FAF3E0" }}
    >
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-amber-200 transition-all duration-500 ease-in-out animate-slideDown fixed top-0 left-0 right-0 z-[9999]">
        <div className="flex items-center space-x-2 animate-slideInLeft">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center hover:bg-teal-700 transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-12">
            <span className="text-white font-bold text-xs">AS</span>
          </div>
          <span className="font-semibold text-gray-800">
            AYUR-SYNC UI Client
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Home button */}
          <Link href="/">
            <button
              type="button"
              className="bg-gradient-to-r from-teal-100/30 via-green-100/30 to-teal-100/30 backdrop-blur-sm border-2 border-green-600 text-green-600 px-4 py-2 rounded-full hover:bg-green-50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              Home
            </button>
          </Link>
        </div>
      </nav>

      {/* Big White Card (Frame) - The Magic Sliding Window */}
      <div
        className={`container relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl min-h-[600px] overflow-hidden mt-20 ${
          isSignUp ? "right-panel-active" : ""
        }`}
      >
        {/* Layer 1: Sign Up Form */}
        <div className="form-container sign-up-container">
          <form
            onSubmit={handleSignUpSubmit}
            className="bg-white flex items-center justify-center flex-col px-12 text-center h-full"
          >
            <h1 className="font-bold text-3xl mb-4 text-teal-800">
              Create Account
            </h1>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="bg-gray-100 border-none p-3 my-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-gray-100 border-none p-3 my-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-gray-100 border-none p-3 my-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button className="rounded-full border mt-4 border-teal-600 bg-teal-600 text-white text-sm font-bold py-3 px-12 tracking-wider uppercase transition-transform duration-75 ease-in active:scale-95 focus:outline-none">
              Sign Up
            </button>
          </form>
        </div>

        {/* Layer 2: Sign In Form */}
        <div className="form-container sign-in-container">
          <form
            onSubmit={handleSignInSubmit}
            className="bg-white flex items-center justify-center flex-col px-12 text-center h-full"
          >
            <h1 className="font-bold text-3xl mb-4 text-teal-800">Sign In</h1>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-gray-100 border-none p-3 my-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-gray-100 border-none p-3 my-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <a href="#" className="text-sm my-4">
              Forgot your password?
            </a>
            <button className="rounded-full border border-teal-600 bg-teal-600 text-white text-sm font-bold py-3 px-12 tracking-wider uppercase transition-transform duration-75 ease-in active:scale-95 focus:outline-none">
              Sign In
            </button>
          </form>
        </div>

        {/* Layer 3: The Sliding Overlay */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1 className="font-bold text-3xl m-0 text-white">
                Welcome Back!
              </h1>
              <p className="text-sm font-thin leading-5 tracking-wider mt-5 mb-8">
                To keep connected with us please login with your personal info
              </p>
              <button
                className="ghost rounded-full border border-white bg-transparent text-white text-sm font-bold py-3 px-12 tracking-wider uppercase"
                onClick={() => setIsSignUp(false)}
              >
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1 className="font-bold text-3xl m-0 text-white">
                Hello, Friend!
              </h1>
              <p className="text-sm font-thin leading-5 tracking-wider mt-5 mb-8">
                Enter your personal details and start your journey with us
              </p>
              <button
                className="ghost rounded-full border border-white bg-transparent text-white text-sm font-bold py-3 px-12 tracking-wider uppercase"
                onClick={() => setIsSignUp(true)}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles for the animation */}
      <style jsx global>{`
        .container.right-panel-active .sign-in-container {
          transform: translateX(100%);
        }
        .container.right-panel-active .sign-up-container {
          transform: translateX(100%);
          opacity: 1;
          z-index: 5;
          animation: show 0.6s;
        }
        @keyframes show {
          0%,
          49.99% {
            opacity: 0;
            z-index: 1;
          }
          50%,
          100% {
            opacity: 1;
            z-index: 5;
          }
        }
        .container.right-panel-active .overlay-container {
          transform: translateX(-100%);
        }
        .container.right-panel-active .overlay {
          transform: translateX(50%);
        }
        .form-container {
          position: absolute;
          top: 0;
          height: 100%;
          width: 50%;
          transition: all 0.6s ease-in-out;
        }
        .sign-in-container {
          left: 0;
          width: 50%;
          z-index: 2;
        }
        .sign-up-container {
          left: 0;
          width: 50%;
          opacity: 0;
          z-index: 1;
        }
        .overlay-container {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 100%;
          overflow: hidden;
          transition: transform 0.6s ease-in-out;
          z-index: 100;
        }
        .overlay {
          background: linear-gradient(to right, #0d9488, #14b8a6);
          position: relative;
          left: -100%;
          height: 100%;
          width: 200%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
        }
        .overlay-panel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 40px;
          text-align: center;
          top: 0;
          height: 100%;
          width: 50%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
        }
        .overlay-left {
          transform: translateX(-20%);
        }
        .overlay-right {
          right: 0;
          transform: translateX(0);
        }
        .container.right-panel-active .overlay-left {
          transform: translateX(0);
        }
        .container.right-panel-active .overlay-right {
          transform: translateX(20%);
        }
      `}</style>
    </div>
  );
};

export default SignInPage;
