"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Country Codes Data ────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+1", country: "US / Canada", flag: "🇺🇸", mask: "(555) 000-0000" },
  { code: "+91", country: "India", flag: "🇮🇳", mask: "98765 43210" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧", mask: "7911 123456" },
  { code: "+49", country: "Germany", flag: "🇩🇪", mask: "151 23456789" },
  { code: "+33", country: "France", flag: "🇫🇷", mask: "6 12 34 56 78" },
  { code: "+81", country: "Japan", flag: "🇯🇵", mask: "90 1234 5678" },
  { code: "+61", country: "Australia", flag: "🇦🇺", mask: "412 345 678" },
  { code: "+971", country: "UAE", flag: "🇦🇪", mask: "50 123 4567" },
  { code: "+65", country: "Singapore", flag: "🇸🇬", mask: "8123 4567" },
];

export default function SignInPage() {
  const router = useRouter();

  // Mode: 'phone' | 'google' | 'email'
  const [activeTab, setActiveTab] = useState<"phone" | "google" | "email">("phone");

  // Phone Form State
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneStep, setPhoneStep] = useState<"number" | "otp">("number");
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Common UX States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // OTP Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, otpTimer]);

  // Handle Send OTP
  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const cleanNum = phoneNumber.replace(/\D/g, "");
    if (cleanNum.length < 7) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg("Sending SMS verification code...");

    setTimeout(() => {
      setIsLoading(false);
      setLoadingMsg("");
      setPhoneStep("otp");
      setOtpValues(["1", "2", "3", "4", "5", "6"]); // Pre-fill with demo code for convenience
      setOtpTimer(30);
      setIsTimerActive(true);
      setSuccessMsg("SMS code sent! (Demo code pre-filled: 123456)");
    }, 1200);
  };

  // Handle OTP digit change
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto verify if all 6 digits entered
    if (newOtp.every((d) => d !== "") && digit !== "") {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = (codeToVerify?: string) => {
    const code = codeToVerify || otpValues.join("");
    if (code.length < 6) {
      setErrorMsg("Please enter all 6 digits of the code.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg("Verifying security code...");
    setErrorMsg("");

    setTimeout(() => {
      const userObj = {
        name: `User ${phoneNumber.slice(-4) || "8821"}`,
        phone: `${selectedCountry.code} ${phoneNumber}`,
        email: `phone_${phoneNumber.replace(/\D/g, "")}@franchiseops.ai`,
        method: "phone",
        loginTime: new Date().toISOString(),
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("franchiseOpsUser", JSON.stringify(userObj));
        document.cookie = "fo_token=demo_auth_token_xyz; path=/; max-age=864000";
      }

      setIsLoading(false);
      setSuccessMsg("Sign in successful! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 800);
    }, 1200);
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setLoadingMsg("Authenticating with Google...");
    setErrorMsg("");

    setTimeout(() => {
      const userObj = {
        name: "Alex Rivera",
        email: "alex.rivera@franchiseops.ai",
        method: "google",
        loginTime: new Date().toISOString(),
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("franchiseOpsUser", JSON.stringify(userObj));
        document.cookie = "fo_token=demo_auth_token_xyz; path=/; max-age=864000";
      }

      setIsLoading(false);
      setSuccessMsg("Google sign-in verified! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 800);
    }, 1400);
  };

  // Handle Email Sign-In
  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setLoadingMsg("Verifying credentials...");
    setErrorMsg("");

    setTimeout(() => {
      const userObj = {
        name: email.split("@")[0].replace(".", " "),
        email: email,
        method: "email",
        loginTime: new Date().toISOString(),
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("franchiseOpsUser", JSON.stringify(userObj));
        document.cookie = "fo_token=demo_auth_token_xyz; path=/; max-age=864000";
      }

      setIsLoading(false);
      setSuccessMsg("Welcome back! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 800);
    }, 1200);
  };

  // Quick Guest Login
  const handleGuestLogin = () => {
    setIsLoading(true);
    setLoadingMsg("Launching demo workspace...");
    setTimeout(() => {
      const userObj = {
        name: "Demo Operator",
        email: "demo@franchiseops.ai",
        method: "guest",
        loginTime: new Date().toISOString(),
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("franchiseOpsUser", JSON.stringify(userObj));
        document.cookie = "fo_token=demo_auth_token_xyz; path=/; max-age=864000";
      }
      router.push("/");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* ── Background Glow Effects ────────────────────────────────────────────── */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/25 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/20 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              FranchiseOps <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/50">AI</span>
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Operations Intelligence Platform</p>
          </div>
        </Link>

        <button
          onClick={handleGuestLogin}
          className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-xl transition-all shadow-sm backdrop-blur-md flex items-center space-x-1.5"
        >
          <span>Explore Demo Mode</span>
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </header>

      {/* ── Main Auth Section ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Side Info Panel (Desktop) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-8 pr-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                <span>Enterprise Agent Operations</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight">
                Empower your franchise operations with <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">Autonomous AI</span>
              </h2>
              <p className="mt-3 text-slate-400 text-sm leading-relaxed">
                Real-time POS telemetry analysis, automated labor schedule recommendations, anomaly detection, and AI inventory optimization.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Zero-Trust Authentication</h4>
                  <p className="text-[11px] text-slate-400">Instant OTP phone validation & Google OAuth 2.0 multi-factor standard.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Agent Intelligence Engine</h4>
                  <p className="text-[11px] text-slate-400">Step-by-step automated operational insights for 10+ location clusters.</p>
                </div>
              </div>
            </div>

            {/* Testimonial / Quote */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800">
              <p className="text-xs italic text-slate-300">
                "FranchiseOps AI reduced our labor variance by 18% in under two weeks across 14 outlets."
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                  SK
                </div>
                <span className="text-[11px] font-semibold text-slate-400">Sarah Jenkins — VP Operations</span>
              </div>
            </div>
          </div>

          {/* Right Side Sign-In Card Container */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">

              {/* Header Title */}
              <div className="text-center sm:text-left mb-6">
                <h1 className="text-2xl font-black text-white tracking-tight">Sign In to FranchiseOps</h1>
                <p className="text-slate-400 text-xs mt-1">Choose your preferred login method to access your dashboard</p>
              </div>

              {/* Status Notifications */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-800/60 text-red-300 text-xs flex items-center space-x-2 animate-shake">
                  <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs flex items-center space-x-2">
                  <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ── Direct Quick Google Sign In Button ──────────────────────────── */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-white/10 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  {isLoading && activeTab === "google" && (
                    <span className="ml-2 h-4 w-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="w-full border-t border-slate-800"></div>
                <span className="absolute bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Or Sign In With
                </span>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => { setActiveTab("phone"); setErrorMsg(""); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    activeTab === "phone"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Phone Number</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("google"); setErrorMsg(""); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    activeTab === "google"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Google Auth</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("email"); setErrorMsg(""); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    activeTab === "email"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Email SSO</span>
                </button>
              </div>

              {/* ── TAB 1: PHONE NUMBER SIGN IN ────────────────────────────────── */}
              {activeTab === "phone" && (
                <div>
                  {phoneStep === "number" ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Mobile Phone Number
                        </label>
                        <div className="flex items-center space-x-2">
                          {/* Country Selector */}
                          <div className="relative">
                            <select
                              value={selectedCountry.code}
                              onChange={(e) => {
                                const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                                if (found) setSelectedCountry(found);
                              }}
                              className="appearance-none bg-slate-950 border border-slate-800 text-slate-200 font-medium text-xs rounded-xl py-3 pl-3 pr-7 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                            >
                              {COUNTRY_CODES.map((item) => (
                                <option key={item.code + item.country} value={item.code}>
                                  {item.flag} {item.code}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Number Input */}
                          <div className="relative flex-1">
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder={selectedCountry.mask}
                              required
                              className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm font-semibold rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">
                          We will send a 6-digit SMS verification code to your phone.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-75"
                      >
                        {isLoading ? (
                          <>
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                            <span>{loadingMsg || "Processing..."}</span>
                          </>
                        ) : (
                          <>
                            <span>Send Verification Code</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* OTP Verification Step */
                    <div className="space-y-5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">Enter 6-Digit Code</h3>
                          <p className="text-xs text-slate-400">
                            Sent to <span className="text-indigo-300 font-semibold">{selectedCountry.code} {phoneNumber}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("number"); setErrorMsg(""); }}
                          className="text-xs text-indigo-400 hover:underline font-medium"
                        >
                          Change Number
                        </button>
                      </div>

                      {/* 6 Digit OTP Inputs */}
                      <div className="flex justify-between items-center gap-2">
                        {otpValues.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="w-11 h-12 text-center text-lg font-black bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Didn't receive the SMS code?</span>
                        {isTimerActive ? (
                          <span className="text-slate-500">Resend in <strong className="text-indigo-400">{otpTimer}s</strong></span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
                            className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                          >
                            Resend Code
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => verifyOtp()}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-75"
                      >
                        {isLoading ? (
                          <>
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                            <span>{loadingMsg || "Verifying..."}</span>
                          </>
                        ) : (
                          <>
                            <span>Verify Code & Sign In</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: GOOGLE AUTH EXPLANATION / ACTION ───────────────────── */}
              {activeTab === "google" && (
                <div className="space-y-4 text-center py-2 animate-fadeIn">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Google Workspace Single Sign-On</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Use your Google corporate account to access FranchiseOps AI instantly with single sign-on security.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-white/20 flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
                        <span>Connecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In With Google Account</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── TAB 3: EMAIL & PASSWORD SIGN IN ───────────────────────────── */}
              {activeTab === "email" && (
                <form onSubmit={handleEmailSignIn} className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Work Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.rivera@franchiseops.ai"
                      required
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm font-semibold rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">Password</label>
                      <button type="button" className="text-[11px] text-indigo-400 hover:underline font-medium">
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm font-semibold rounded-xl py-3 px-4 pr-10 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.03 10.03 0 014.122-.963c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/40 h-4 w-4"
                      />
                      <span className="text-xs text-slate-300 font-medium">Keep me signed in</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 active:scale-[0.99] disabled:opacity-75"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        <span>{loadingMsg || "Authenticating..."}</span>
                      </>
                    ) : (
                      <span>Sign In with Email</span>
                    )}
                  </button>
                </form>
              )}

              {/* Security Footer Note */}
              <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
                <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Protected by 256-bit Enterprise Encryption & SOC2 Type II Security</span>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-900">
        <p>© 2026 FranchiseOps AI Inc. All rights reserved.</p>
        <div className="flex items-center space-x-4 mt-2 sm:mt-0">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-300 transition-colors">Security & Compliance</a>
        </div>
      </footer>
    </div>
  );
}
