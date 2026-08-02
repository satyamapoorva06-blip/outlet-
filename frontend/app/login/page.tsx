"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, router]);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email) errs.email = "Email address is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 6) errs.password = "Password must be at least 6 characters.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { user, token } = res.data;
      login(user, token);
      router.replace("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#030303] text-white selection:bg-indigo-500/30 font-sans overflow-hidden">
      {/* ── Background Effects ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-fuchsia-600/10 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* ── Left Panel (Branding) ── */}
      <div className="hidden lg:flex lg:w-[55%] relative z-10 flex-col justify-between p-16">
        
        {/* Top bar logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-transform duration-300">
            <span className="font-bold text-white text-xl tracking-tighter">FO</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">FranchiseOps AI</h1>
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium">Enterprise Intelligence</p>
          </div>
        </div>

        {/* Center content */}
        <div className="space-y-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-white/80">System Live & Operational</span>
          </div>
          
          <h2 className="text-6xl font-black leading-[1.1] tracking-tight">
            Scale your operations with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">precision</span>.
          </h2>
          
          <p className="text-lg text-white/50 leading-relaxed font-light">
            Monitor real-time sales, automate inventory restocking, and maximize profit margins across your entire franchise network—all powered by multi-agent AI.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Real-time Analytics', desc: 'Live revenue & profit tracking', icon: '⚡' },
              { label: 'AI Forecasting', desc: 'Predictive inventory agents', icon: '🧠' },
              { label: 'Network Health', desc: 'Automated performance scoring', icon: '📈' },
              { label: 'Smart Alerts', desc: 'Proactive issue resolution', icon: '🎯' },
            ].map((feature, i) => (
              <div key={i} className="group p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 backdrop-blur-sm cursor-default">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-lg group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white/90">{feature.label}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-6 text-sm font-medium text-white/30">
          <p>© 2026 FranchiseOps AI</p>
          <div className="w-1 h-1 rounded-full bg-white/20"></div>
          <p>Enterprise Grade Security</p>
        </div>
      </div>

      {/* ── Right Panel (Login) ── */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          
          {/* Form Container */}
          <div className="relative p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.05] shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none">
            
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h2>
              <p className="text-sm text-white/50">Enter your credentials to access your dashboard</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-[fadeIn_0.3s_ease-out]">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-indigo-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                    className={`w-full bg-black/40 border ${fieldErrors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'} rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 ${fieldErrors.email ? 'focus:ring-red-500/10' : 'focus:ring-indigo-500/10'} transition-all`}
                    placeholder="you@company.com"
                  />
                </div>
                {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Forgot password?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-indigo-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                    className={`w-full bg-black/40 border ${fieldErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'} rounded-xl py-3.5 pl-11 pr-12 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 ${fieldErrors.password ? 'focus:ring-red-500/10' : 'focus:ring-indigo-500/10'} transition-all`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-3 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${rememberMe ? 'bg-indigo-500 border-indigo-500' : 'bg-black/40 border-white/20 border'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                >
                  {rememberMe && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <span className="text-sm text-white/50 cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>Keep me signed in</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full py-4 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] group-hover:bg-[100%_auto] transition-all duration-500"></div>
                <div className="relative flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="mt-8 mb-6 relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center"><span className="bg-[#0b0b0b] px-4 text-xs font-medium text-white/30 uppercase tracking-widest">Demo Access</span></div>
            </div>

            {/* Demo Button */}
            <button
              type="button"
              onClick={() => { setEmail("admin@franchiseops.ai"); setPassword("admin123"); setFieldErrors({}); }}
              className="w-full group p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">admin@franchiseops.ai</div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5">Password: admin123</div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all">Auto-Fill</span>
            </button>

            <p className="mt-8 text-center text-sm text-white/40">
              New to FranchiseOps?{' '}
              <button onClick={() => router.push("/signup")} className="text-white hover:text-indigo-400 font-medium transition-colors">
                Request an account
              </button>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
