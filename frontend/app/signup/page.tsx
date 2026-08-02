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
    if (!pw) return { label: "", color: "bg-slate-700", width: "0%" };
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* ── Left Panel: Branding ──────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #1d4ed8 100%)" }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-0 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center font-black text-white text-lg backdrop-blur-sm">
            FO
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-tight">FranchiseOps AI</div>
            <div className="text-indigo-300 text-xs">Enterprise Operations Intelligence</div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Join the network.<br />
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(90deg, #a5b4fc, #38bdf8)" }}
              >
                Scale with AI.
              </span>
            </h2>
            <p className="text-indigo-200/70 text-sm leading-relaxed">
              Register your franchise account and connect to the live operations
              intelligence platform managing outlets across India.
            </p>
          </div>

          {/* Role cards */}
          <div className="space-y-3">
            {[
              { icon: "🏢", role: "HQ Admin", desc: "Full access across all outlets and reports" },
              { icon: "🧑‍💼", role: "Store Manager", desc: "Manage your outlet, staff, and inventory" },
              { icon: "👥", role: "Franchise Staff", desc: "View assigned tasks and shift schedules" },
            ].map((r) => (
              <div key={r.role} className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-lg">{r.icon}</span>
                <div>
                  <div className="text-white text-xs font-bold">{r.role}</div>
                  <div className="text-indigo-300/70 text-[11px]">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom sign-in link */}
        <div className="relative z-10">
          <p className="text-indigo-300/60 text-xs">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-indigo-300 hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Sign in →
            </button>
          </p>
        </div>
      </div>

      {/* ── Right Panel: Signup Form ──────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-lg space-y-7 py-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-lg">
              FO
            </div>
            <div>
              <div className="text-white font-bold text-base">FranchiseOps AI</div>
              <div className="text-slate-400 text-xs">Create your account</div>
            </div>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Create account</h1>
            <p className="text-slate-400 text-sm mt-1">Register to access the franchise operations platform</p>
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

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: "" })); }}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-900 border rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.name ? "border-red-500/60 focus:ring-red-500/20" : "border-slate-800 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                  }`}
                />
              </div>
              {fieldErrors.name && <p className="text-red-400 text-xs pl-1">{fieldErrors.name}</p>}
            </div>

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
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: "" })); }}
                  placeholder="you@company.ai"
                  className={`w-full pl-11 pr-4 py-3.5 bg-slate-900 border rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.email ? "border-red-500/60 focus:ring-red-500/20" : "border-slate-800 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                  }`}
                />
              </div>
              {fieldErrors.email && <p className="text-red-400 text-xs pl-1">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: "" })); }}
                  placeholder="Min 6 characters"
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-900 border rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.password ? "border-red-500/60 focus:ring-red-500/20" : "border-slate-800 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                  }`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {/* Password strength bar */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} rounded-full transition-all duration-500`} style={{ width: strength.width }} />
                  </div>
                  <p className="text-xs text-slate-500">Password strength: <span className="font-semibold text-slate-300">{strength.label}</span></p>
                </div>
              )}
              {fieldErrors.password && <p className="text-red-400 text-xs pl-1">{fieldErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Confirm Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  id="signup-confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: "" })); }}
                  placeholder="Re-enter password"
                  className={`w-full pl-11 pr-12 py-3.5 bg-slate-900 border rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.confirmPassword ? "border-red-500/60 focus:ring-red-500/20" : "border-slate-800 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                  {showConfirm
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              {fieldErrors.confirmPassword && <p className="text-red-400 text-xs pl-1">{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Role + Outlet */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300">Account Role</label>
                <select
                  id="signup-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 cursor-pointer transition-all"
                >
                  <option value="MANAGER">Store Manager</option>
                  <option value="ADMIN">HQ Admin</option>
                  <option value="STAFF">Franchise Staff</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300">Assigned Outlet</label>
                <select
                  id="signup-outlet"
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 cursor-pointer transition-all"
                >
                  <option value="">HQ Global (All)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.city} — {o.outlet_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Terms */}
            <div className="space-y-1">
              <div className="flex items-start space-x-3">
                <button
                  type="button"
                  onClick={() => { setAgreeTerms(!agreeTerms); setFieldErrors(p => ({ ...p, terms: "" })); }}
                  className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    agreeTerms ? "bg-indigo-600 border-indigo-600" : "border-slate-600 bg-transparent"
                  }`}
                >
                  {agreeTerms && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <label
                  onClick={() => { setAgreeTerms(!agreeTerms); setFieldErrors(p => ({ ...p, terms: "" })); }}
                  className="text-sm text-slate-400 cursor-pointer select-none leading-snug"
                >
                  I agree to the{" "}
                  <span className="text-indigo-400 font-semibold">Terms of Service</span> and{" "}
                  <span className="text-indigo-400 font-semibold">Privacy Policy</span>
                </label>
              </div>
              {fieldErrors.terms && <p className="text-red-400 text-xs pl-1">{fieldErrors.terms}</p>}
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isSubmitting ? "#4338ca" : "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create Franchise Account</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
            >
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
