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

  // If already authenticated, redirect straight to dashboard
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Left Panel: Branding ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1d4ed8 100%)" }}>

        {/* Decorative background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center font-black text-white text-lg tracking-tight backdrop-blur-sm">
            FO
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-tight">FranchiseOps AI</div>
            <div className="text-indigo-300 text-xs">Enterprise Operations Intelligence</div>
          </div>
        </div>

        {/* Center Content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-indigo-200 text-xs font-semibold backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>Agentic AI Platform — Live</span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Intelligent Ops,<br />
              <span className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #a5b4fc, #60a5fa)" }}>
                Zero Guesswork
              </span>
            </h2>
            <p className="text-indigo-200/80 text-sm leading-relaxed max-w-sm">
              Multi-agent AI monitoring every outlet — from stock levels and staff performance
              to revenue trends and underperforming locations — all in one command center.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: "📊", label: "Real-time outlet performance analytics" },
              { icon: "🤖", label: "Autonomous stock & staff AI agents" },
              { icon: "🗺️", label: "Multi-location comparison with live map" },
              { icon: "🏥", label: "Outlet health scores & turnaround plans" },
            ].map((f) => (
              <div key={f.label} className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center text-sm shrink-0 group-hover:bg-white/20 transition-colors">
                  {f.icon}
                </div>
                <span className="text-indigo-100 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: "5", label: "Active Outlets" },
            { value: "300+", label: "Daily Records" },
            { value: "10", label: "AI Agents" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-indigo-300 text-[11px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Login Form ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-950">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-lg">
              FO
            </div>
            <div>
              <div className="text-white font-bold text-base">FranchiseOps AI</div>
              <div className="text-slate-400 text-xs">Enterprise Operations Intelligence</div>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to your operations command center</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-2xl p-4">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Email address</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  placeholder="you@franchiseops.ai"
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-900 border rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email
                      ? "border-red-500/60 focus:ring-red-500/20"
                      : "border-slate-800 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                  }`}
                />
              </div>
              {fieldErrors.email && <p className="text-red-400 text-xs pl-1">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-300">Password</label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-900 border rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password
                      ? "border-red-500/60 focus:ring-red-500/20"
                      : "border-slate-800 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-400 text-xs pl-1">{fieldErrors.password}</p>}
            </div>

            {/* Remember me */}
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                id="remember-me"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                  rememberMe ? "bg-indigo-600 border-indigo-600" : "border-slate-600 bg-transparent"
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className="text-sm text-slate-400 cursor-pointer select-none"
              >
                Keep me signed in
              </label>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isSubmitting ? "#4338ca" : "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-600 text-xs font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Demo credentials */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>Demo Credentials</span>
            </div>
            <button
              type="button"
              onClick={() => { setEmail("admin@franchiseops.ai"); setPassword("admin123"); setFieldErrors({}); }}
              className="w-full text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono text-indigo-400 group-hover:text-indigo-300 transition-colors">admin@franchiseops.ai</div>
                  <div className="text-xs font-mono text-slate-500 group-hover:text-slate-400 transition-colors">admin123</div>
                </div>
                <span className="text-[10px] text-slate-600 group-hover:text-indigo-400 font-semibold transition-colors">Click to fill →</span>
              </div>
            </button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-slate-500">
            No account yet?{" "}
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
            >
              Create a franchise account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
