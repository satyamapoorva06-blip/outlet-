"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Outlet {
  id: number;
  outlet_name: string;
  city: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useAuth();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [outletId, setOutletId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    api
      .get("/outlets")
      .then((res) => setOutlets(res.data))
      .catch(() => {});
  }, []);

  const passwordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (!pw) return { label: "", color: "bg-white/10", width: "0%" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "25%" };
    if (score === 2) return { label: "Fair", color: "bg-amber-500", width: "50%" };
    if (score === 3) return { label: "Good", color: "bg-blue-500", width: "75%" };
    return { label: "Strong", color: "bg-emerald-500", width: "100%" };
  };

  const strength = passwordStrength(password);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!email) errs.email = "Email address is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    if (!agreeTerms) errs.terms = "You must agree to the terms to continue.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post("/auth/signup", {
        name,
        email,
        password,
        role,
        outletId: outletId || null,
      });
      const { user, token } = res.data;
      login(user, token);
      router.replace("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
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
      <div className="hidden lg:flex lg:w-[45%] relative z-10 flex-col justify-between p-16">
        
        {/* Top bar logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => router.push('/')}>
            <span className="font-bold text-white text-xl tracking-tighter">FO</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">FranchiseOps AI</h1>
            <p className="text-xs text-white/40 uppercase tracking-widest font-medium">Enterprise Intelligence</p>
          </div>
        </div>

        {/* Center content */}
        <div className="space-y-8 max-w-md">
          <h2 className="text-5xl font-black leading-[1.1] tracking-tight">
            Join the network.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">Scale with AI.</span>
          </h2>
          
          <p className="text-lg text-white/50 leading-relaxed font-light">
            Register your franchise account and connect to the live operations intelligence platform managing outlets across the nation.
          </p>

          <div className="space-y-4 pt-4">
            {[
              { icon: "🏢", role: "HQ Admin", desc: "Full access across all outlets and reports" },
              { icon: "🧑‍💼", role: "Store Manager", desc: "Manage your outlet, staff, and inventory" },
              { icon: "👥", role: "Franchise Staff", desc: "View assigned tasks and shift schedules" },
            ].map((r, i) => (
              <div key={i} className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 backdrop-blur-sm cursor-default">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                  {r.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/90">{r.role}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-6 text-sm font-medium text-white/30">
          <p>© 2026 FranchiseOps AI</p>
        </div>
      </div>

      {/* ── Right Panel (Signup) ── */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] my-auto">
          
          {/* Form Container */}
          <div className="relative p-8 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/[0.05] shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none">
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Create account</h2>
              <p className="text-sm text-white/50">Register to access the operations platform</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm animate-[fadeIn_0.3s_ease-out]">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-indigo-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: "" })); }}
                    className={`w-full bg-black/40 border ${fieldErrors.name ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'} rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 ${fieldErrors.name ? 'focus:ring-red-500/10' : 'focus:ring-indigo-500/10'} transition-all`}
                    placeholder="e.g. Aarav Sharma"
                  />
                </div>
                {fieldErrors.name && <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

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
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: "" })); }}
                    className={`w-full bg-black/40 border ${fieldErrors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'} rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 ${fieldErrors.email ? 'focus:ring-red-500/10' : 'focus:ring-indigo-500/10'} transition-all`}
                    placeholder="you@company.com"
                  />
                </div>
                {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-indigo-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                    className={`w-full bg-black/40 border ${fieldErrors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'} rounded-xl py-3.5 pl-11 pr-12 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 ${fieldErrors.password ? 'focus:ring-red-500/10' : 'focus:ring-indigo-500/10'} transition-all`}
                    placeholder="Min 6 characters"
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
                {password && (
                  <div className="pt-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} transition-all duration-500`} style={{ width: strength.width }} />
                    </div>
                  </div>
                )}
                {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within:text-indigo-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: "" })); }}
                    className={`w-full bg-black/40 border ${fieldErrors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'} rounded-xl py-3.5 pl-11 pr-12 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 ${fieldErrors.confirmPassword ? 'focus:ring-red-500/10' : 'focus:ring-indigo-500/10'} transition-all`}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showConfirm ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
              </div>

              {/* Selects */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all appearance-none"
                  >
                    <option value="MANAGER" className="bg-slate-900">Store Manager</option>
                    <option value="ADMIN" className="bg-slate-900">HQ Admin</option>
                    <option value="STAFF" className="bg-slate-900">Franchise Staff</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Assigned Outlet</label>
                  <select
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all appearance-none"
                  >
                    <option value="" className="bg-slate-900">HQ Global (All)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id} className="bg-slate-900">
                        {o.city} — {o.outlet_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Terms */}
              <div className="pt-2 pb-1">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => { setAgreeTerms(!agreeTerms); setFieldErrors(p => ({ ...p, terms: "" })); }}
                    className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center transition-all ${agreeTerms ? 'bg-indigo-500 border-indigo-500' : 'bg-black/40 border-white/20 border'} focus:outline-none focus:ring-2 focus:ring-indigo-500/50`}
                  >
                    {agreeTerms && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <label onClick={() => { setAgreeTerms(!agreeTerms); setFieldErrors(p => ({ ...p, terms: "" })); }} className="text-sm text-white/50 cursor-pointer select-none leading-tight">
                    I agree to the <span className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Terms of Service</span> and <span className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Privacy Policy</span>
                  </label>
                </div>
                {fieldErrors.terms && <p className="text-red-400 text-xs mt-2">{fieldErrors.terms}</p>}
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
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Franchise Account</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </div>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-white/40">
              Already have an account?{' '}
              <button onClick={() => router.push("/login")} className="text-white hover:text-indigo-400 font-medium transition-colors">
                Sign in instead
              </button>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
