"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import MapComponent from "./components/MapComponent";
import CompareModal from "./components/CompareModal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

// ─── Interfaces & Types ───────────────────────────────────────────────────────
interface UserState {
  name: string;
  email: string;
  role?: string;
  method?: string;
  avatar?: string;
}

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  reorderPoint: number;
  weeklySales: number;
  daysInStock: number;
  unitPrice: number;
  status: "Overstock" | "Optimal" | "Low stock";
  recommendedDiscount: number;
  applied: boolean;
}

interface AiInsight {
  title: string;
  value: string;
  subtext: string;
  tag: string;
  tagColor: string;
  icon: "TrendUp" | "TrendDown" | "Stable" | "Warning" | "Sparkle";
}

interface AttendanceRecord {
  date: string;
  shift: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  status: "Present" | "Late" | "Absent" | "Half Day";
  bonusEarned: number;
  deduction: number;
  deductionReason?: string;
}

interface Worker {
  id: number;
  name: string;
  employeeId: string;
  role: string;
  outletName: string;
  phone: string;
  email: string;
  avatar: string;
  baseSalary: number;
  bonus: number;
  salaryCut: number;
  salaryCutReason: string;
  clockIn: string;
  clockOut: string;
  status: "Present" | "Late" | "Absent" | "Half Day" | "Off";
  attendanceHistory: AttendanceRecord[];
}

const BACKEND_URL = "http://localhost:5000/api";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Workflow: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  Trend: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Database: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s-8 1.79-8-4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Inventory: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Staff: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Marketing: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  Audit: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Intelligence: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Recommend: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  Dashboard: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17l9.2-9.2M17 17V7H7" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 7l-9.2 9.2M7 7v10h10" />
    </svg>
  ),
  Stable: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  ),
  Sparkle: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

// ─── 10 Workflow Steps Metadata ───────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { id: 1,  name: "Franchise Data",           icon: "Database",      category: "input",  desc: "Aggregates sales logs, inventory status, staff shifts, marketing spends, and store audit logs.", active: true },
  { id: 2,  name: "Data Validation",          icon: "Check",         category: "process",desc: "Validates schema compliance, handles missing values, cleans transaction records, and processes inputs.", active: true },
  { id: 3,  name: "Outlet Performance Agent", icon: "Trend",         category: "agent",  desc: "Monitors sales, runs linear regression trend forecasting, and measures operational efficiency.", active: true },
  { id: 4,  name: "Inventory Agent",          icon: "Inventory",     category: "agent",  desc: "Tracks stock cover, detects overstock vs low stock, and automates reorder POs.", active: true },
  { id: 5,  name: "Staff & Attendance Agent", icon: "Staff",         category: "agent",  desc: "Tracks daily working start/end times, attendance history, salary cuts, bonuses & worker profiles.", active: true },
  { id: 6,  name: "Marketing Agent",          icon: "Marketing",     category: "agent",  desc: "Computes campaign ROI, tracks promotion conversions, and optimizes discount allocations.", active: true },
  { id: 7,  name: "Audit Agent",              icon: "Audit",         category: "agent",  desc: "Validates compliance with brand guidelines, analyzes safety audits, and flags non-compliance.", active: true },
  { id: 8,  name: "Franchise Intelligence",   icon: "Intelligence",  category: "engine", desc: "Fuses domain-specific insights into a centralized reasoning engine to find correlations.", active: true },
  { id: 9,  name: "Business Recommendations", icon: "Recommend",     category: "engine", desc: "Generates actionable strategy recommendations for managers to reduce costs and boost sales.", active: true },
  { id: 10, name: "Dashboard & Alerts",       icon: "Dashboard",     category: "output", desc: "Serves high-level summaries for the franchisor and triggers real-time alerts for critical anomalies.", active: true },
];

// ─── Mathematical Analysis Engine Helpers ─────────────────────────────────────
function computeLinearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  values.forEach((y, x) => {
    sumX  += x;
    sumY  += y;
    sumXY += x * y;
    sumX2 += x * x;
  });
  const denom = n * sumX2 - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

function computeCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return (Math.sqrt(variance) / mean) * 100;
}

function computeAiInsights(trendsData: any[], salesRecords: any[], outletName: string): AiInsight[] {
  if (trendsData.length < 3) return [];
  const revenues = trendsData.map((d: any) => d.grossRevenue as number);
  const profits  = trendsData.map((d: any) => d.netProfit    as number);
  const margins  = trendsData.map((d: any) => d.grossRevenue > 0 ? (d.netProfit / d.grossRevenue) * 100 : 0);

  const insights: AiInsight[] = [];
  const n = revenues.length;

  // 1. Linear Regression Revenue Slope
  const revenueSlope = computeLinearRegressionSlope(revenues);
  const slopePercent = revenues[0] > 0 ? (revenueSlope / revenues[0]) * 100 : 0;
  const momentumLabel = slopePercent > 1.5 ? "Strong Uptrend" : slopePercent > -1.5 ? "Stable Trend" : "Declining Trend";
  insights.push({
    title: "Revenue Momentum",
    value: `${slopePercent >= 0 ? "+" : ""}${slopePercent.toFixed(2)}% / day`,
    subtext: `Linear regression slope β₁ = ₹${revenueSlope.toFixed(0)}/day across ${n} days. ${momentumLabel} for ${outletName}.`,
    tag: momentumLabel,
    tagColor: slopePercent > 1.5 ? "bg-emerald-100 text-emerald-800" : slopePercent > -1.5 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800",
    icon: slopePercent > 1.5 ? "TrendUp" : slopePercent > -1.5 ? "Stable" : "TrendDown",
  });

  // 2. Coefficient of Variation (Volatility)
  const cv = computeCV(revenues);
  const volatilityLabel = cv < 10 ? "Low Volatility" : cv < 25 ? "Moderate Volatility" : "High Volatility";
  insights.push({
    title: "Revenue Volatility (CV)",
    value: `${cv.toFixed(1)}%`,
    subtext: `Coefficient of Variation (σ/μ × 100) is ${cv.toFixed(1)}%, indicating ${volatilityLabel.toLowerCase()} in daily sales.`,
    tag: volatilityLabel,
    tagColor: cv < 10 ? "bg-emerald-100 text-emerald-800" : cv < 25 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800",
    icon: cv < 10 ? "Stable" : cv < 25 ? "Warning" : "TrendDown",
  });

  // 3. Period-over-Period Growth
  const half = Math.floor(n / 2);
  const firstHalfAvg  = revenues.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
  const secondHalfAvg = revenues.slice(half).reduce((a, b) => a + b, 0) / (revenues.slice(half).length || 1);
  const momGrowth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
  insights.push({
    title: "Period-over-Period Growth",
    value: `${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%`,
    subtext: `Compares first half avg (₹${firstHalfAvg.toFixed(0)}) vs second half avg (₹${secondHalfAvg.toFixed(0)}).`,
    tag: momGrowth > 2 ? "Growing" : momGrowth < -2 ? "Declining" : "Flat",
    tagColor: momGrowth > 2 ? "bg-emerald-100 text-emerald-800" : momGrowth < -2 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800",
    icon: momGrowth > 2 ? "TrendUp" : momGrowth < -2 ? "TrendDown" : "Stable",
  });

  // 4. Profit Margin Drift
  const marginSlope = computeLinearRegressionSlope(margins);
  const avgMargin   = margins.reduce((a, b) => a + b, 0) / (margins.length || 1);
  const marginDrift = marginSlope * n;
  insights.push({
    title: "Profit Margin Drift",
    value: `${avgMargin.toFixed(1)}% avg margin`,
    subtext: `Margin slope = ${marginSlope >= 0 ? "+" : ""}${marginSlope.toFixed(3)} pp/day. Net shift: ${marginDrift >= 0 ? "+" : ""}${marginDrift.toFixed(1)} pp.`,
    tag: marginDrift > 0.5 ? "Improving" : marginDrift < -0.5 ? "Eroding" : "Stable",
    tagColor: marginDrift > 0.5 ? "bg-emerald-100 text-emerald-800" : marginDrift < -0.5 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800",
    icon: marginDrift > 0.5 ? "TrendUp" : marginDrift < -0.5 ? "TrendDown" : "Stable",
  });

  // 5. Peak Revenue Day (Z-Score)
  const mean = revenues.reduce((a, b) => a + b, 0) / (n || 1);
  const std  = Math.sqrt(revenues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n || 1));
  let peakIdx = 0, peakZ = -Infinity;
  revenues.forEach((v, i) => {
    const z = std > 0 ? (v - mean) / std : 0;
    if (z > peakZ) { peakZ = z; peakIdx = i; }
  });
  insights.push({
    title: "Peak Revenue Outlier",
    value: trendsData[peakIdx]?.date ?? "N/A",
    subtext: `Z-score z = +${peakZ.toFixed(2)}. Peak gross sales of ₹${(revenues[peakIdx] || 0).toLocaleString("en-IN")} recorded.`,
    tag: peakZ > 2 ? "Spike Outlier" : "Peak Day",
    tagColor: peakZ > 2 ? "bg-purple-100 text-purple-800" : "bg-indigo-100 text-indigo-800",
    icon: "Sparkle",
  });

  // 6. Cost Ratio Efficiency
  const costRatios   = trendsData.map((d: any) => d.grossRevenue > 0 ? (d.operatingCost / d.grossRevenue) * 100 : 0);
  const avgCostRatio = costRatios.reduce((a, b) => a + b, 0) / (costRatios.length || 1);
  const costSlope    = computeLinearRegressionSlope(costRatios);
  insights.push({
    title: "Cost Efficiency Trend",
    value: `${avgCostRatio.toFixed(1)}% of Revenue`,
    subtext: `OpEx ratio slope = ${costSlope >= 0 ? "+" : ""}${costSlope.toFixed(3)} pp/day. ${costSlope < -0.05 ? "Costs shrinking positively." : "Cost structure steady."}`,
    tag: costSlope < -0.05 ? "Improving" : costSlope > 0.05 ? "Rising Cost" : "Steady",
    tagColor: costSlope < -0.05 ? "bg-emerald-100 text-emerald-800" : costSlope > 0.05 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800",
    icon: costSlope < -0.05 ? "TrendUp" : costSlope > 0.05 ? "TrendDown" : "Stable",
  });

  return insights;
}

// ─── Initial Worker Staff Seed Dataset ─────────────────────────────────────────
const INITIAL_WORKERS: Worker[] = [
  {
    id: 101,
    name: "Aarav Sharma",
    employeeId: "EMP-BLR-041",
    role: "Head Barista & Store Lead",
    outletName: "Bengaluru Central",
    phone: "+91 98450 12345",
    email: "aarav.sharma@franchiseops.ai",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    baseSalary: 32000,
    bonus: 4500,
    salaryCut: 500,
    salaryCutReason: "Late clock-in by 45 mins on 2026-07-24 (Traffic delay)",
    clockIn: "08:45 AM",
    clockOut: "05:30 PM",
    status: "Present",
    attendanceHistory: [
      { date: "2026-07-31", shift: "Morning (09:00 - 17:30)", clockIn: "08:45 AM", clockOut: "05:30 PM", totalHours: 8.75, status: "Present", bonusEarned: 250, deduction: 0 },
      { date: "2026-07-30", shift: "Morning (09:00 - 17:30)", clockIn: "08:52 AM", clockOut: "05:40 PM", totalHours: 8.8, status: "Present", bonusEarned: 200, deduction: 0 },
      { date: "2026-07-29", shift: "Morning (09:00 - 17:30)", clockIn: "08:58 AM", clockOut: "05:30 PM", totalHours: 8.5, status: "Present", bonusEarned: 300, deduction: 0 },
      { date: "2026-07-28", shift: "Morning (09:00 - 17:30)", clockIn: "09:00 AM", clockOut: "05:30 PM", totalHours: 8.5, status: "Present", bonusEarned: 150, deduction: 0 },
      { date: "2026-07-27", shift: "Off Day", clockIn: "--:--", clockOut: "--:--", totalHours: 0, status: "Absent", bonusEarned: 0, deduction: 0 },
      { date: "2026-07-26", shift: "Morning (09:00 - 17:30)", clockIn: "08:50 AM", clockOut: "06:00 PM", totalHours: 9.1, status: "Present", bonusEarned: 500, deduction: 0 },
      { date: "2026-07-25", shift: "Morning (09:00 - 17:30)", clockIn: "08:55 AM", clockOut: "05:30 PM", totalHours: 8.55, status: "Present", bonusEarned: 200, deduction: 0 },
      { date: "2026-07-24", shift: "Morning (09:00 - 17:30)", clockIn: "09:45 AM", clockOut: "05:30 PM", totalHours: 7.75, status: "Late", bonusEarned: 0, deduction: 500, deductionReason: "Late clock-in > 45 mins" },
    ]
  },
  {
    id: 102,
    name: "Priya Sundaram",
    employeeId: "EMP-HYD-018",
    role: "Shift Supervisor",
    outletName: "Hyderabad Tech Park",
    phone: "+91 97110 88234",
    email: "priya.sundaram@franchiseops.ai",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
    baseSalary: 38000,
    bonus: 6200,
    salaryCut: 0,
    salaryCutReason: "No deductions (Perfect Attendance Record)",
    clockIn: "09:00 AM",
    clockOut: "06:00 PM",
    status: "Present",
    attendanceHistory: [
      { date: "2026-07-31", shift: "Day (09:00 - 18:00)", clockIn: "09:00 AM", clockOut: "06:00 PM", totalHours: 9.0, status: "Present", bonusEarned: 350, deduction: 0 },
      { date: "2026-07-30", shift: "Day (09:00 - 18:00)", clockIn: "08:55 AM", clockOut: "06:15 PM", totalHours: 9.33, status: "Present", bonusEarned: 400, deduction: 0 },
      { date: "2026-07-29", shift: "Day (09:00 - 18:00)", clockIn: "08:50 AM", clockOut: "06:00 PM", totalHours: 9.16, status: "Present", bonusEarned: 300, deduction: 0 },
      { date: "2026-07-28", shift: "Day (09:00 - 18:00)", clockIn: "08:58 AM", clockOut: "06:00 PM", totalHours: 9.03, status: "Present", bonusEarned: 250, deduction: 0 },
      { date: "2026-07-27", shift: "Day (09:00 - 18:00)", clockIn: "08:50 AM", clockOut: "06:30 PM", totalHours: 9.66, status: "Present", bonusEarned: 500, deduction: 0 },
    ]
  },
  {
    id: 103,
    name: "Rohan Varma",
    employeeId: "EMP-MAA-009",
    role: "Inventory & POS Cashier",
    outletName: "Chennai Marina",
    phone: "+91 94440 33112",
    email: "rohan.varma@franchiseops.ai",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
    baseSalary: 26000,
    bonus: 2100,
    salaryCut: 1200,
    salaryCutReason: "Unexcused absence on 2026-07-25 (Half day salary cut enforced)",
    clockIn: "09:35 AM",
    clockOut: "06:00 PM",
    status: "Late",
    attendanceHistory: [
      { date: "2026-07-31", shift: "Day (09:00 - 18:00)", clockIn: "09:35 AM", clockOut: "06:00 PM", totalHours: 8.41, status: "Late", bonusEarned: 0, deduction: 200, deductionReason: "Late arrival 35 mins" },
      { date: "2026-07-30", shift: "Day (09:00 - 18:00)", clockIn: "09:05 AM", clockOut: "06:00 PM", totalHours: 8.91, status: "Present", bonusEarned: 150, deduction: 0 },
      { date: "2026-07-29", shift: "Day (09:00 - 18:00)", clockIn: "09:00 AM", clockOut: "06:00 PM", totalHours: 9.0, status: "Present", bonusEarned: 200, deduction: 0 },
      { date: "2026-07-28", shift: "Day (09:00 - 18:00)", clockIn: "09:12 AM", clockOut: "06:00 PM", totalHours: 8.8, status: "Present", bonusEarned: 100, deduction: 0 },
      { date: "2026-07-25", shift: "Day (09:00 - 18:00)", clockIn: "--:--", clockOut: "--:--", totalHours: 0, status: "Absent", bonusEarned: 0, deduction: 1000, deductionReason: "Unexcused Absence" },
    ]
  },
  {
    id: 104,
    name: "Kavya Patel",
    employeeId: "EMP-BOM-052",
    role: "Senior Kitchen Specialist",
    outletName: "Mumbai Andheri",
    phone: "+91 98200 44991",
    email: "kavya.patel@franchiseops.ai",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    baseSalary: 35000,
    bonus: 5100,
    salaryCut: 300,
    salaryCutReason: "Uniform SOP non-compliance during audit on 2026-07-22",
    clockIn: "08:30 AM",
    clockOut: "05:00 PM",
    status: "Present",
    attendanceHistory: [
      { date: "2026-07-31", shift: "Early (08:30 - 17:00)", clockIn: "08:30 AM", clockOut: "05:00 PM", totalHours: 8.5, status: "Present", bonusEarned: 300, deduction: 0 },
      { date: "2026-07-30", shift: "Early (08:30 - 17:00)", clockIn: "08:25 AM", clockOut: "05:15 PM", totalHours: 8.83, status: "Present", bonusEarned: 350, deduction: 0 },
      { date: "2026-07-29", shift: "Early (08:30 - 17:00)", clockIn: "08:30 AM", clockOut: "05:00 PM", totalHours: 8.5, status: "Present", bonusEarned: 250, deduction: 0 },
    ]
  },
  {
    id: 105,
    name: "Vikram Joshi",
    employeeId: "EMP-PUN-023",
    role: "Store Operations Assistant",
    outletName: "Pune Hinjawadi",
    phone: "+91 99220 77123",
    email: "vikram.joshi@franchiseops.ai",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    baseSalary: 28000,
    bonus: 1800,
    salaryCut: 0,
    salaryCutReason: "No deductions recorded",
    clockIn: "10:00 AM",
    clockOut: "07:00 PM",
    status: "Present",
    attendanceHistory: [
      { date: "2026-07-31", shift: "Late Shift (10:00 - 19:00)", clockIn: "10:00 AM", clockOut: "07:00 PM", totalHours: 9.0, status: "Present", bonusEarned: 200, deduction: 0 },
      { date: "2026-07-30", shift: "Late Shift (10:00 - 19:00)", clockIn: "09:55 AM", clockOut: "07:10 PM", totalHours: 9.25, status: "Present", bonusEarned: 250, deduction: 0 },
    ]
  }
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStep, setSelectedStep] = useState(5); // Default to Worker Attendance / Staff Agent
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Live Clock & Command Palette States
  const [currentTime, setCurrentTime] = useState("");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");

  // GIS Map & Outlet Compare States
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([1, 2]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const toggleSelectLocation = (id: number) => {
    setSelectedLocationIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const mapLocations = useMemo(() => [
    { id: 1, name: "FranchiseOps - Bengaluru Central", manager: "Rajesh Kumar", address: "MG Road, Brigade Corridor", city: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946, metrics: { revenue: 1480000, profit: 660000, orders: 4820, avgAov: "₹307.05", profitMargin: "44.6%", stockAlerts: 0, staffCount: 12 }, healthScore: 96, statusTag: "Optimal" as const },
    { id: 2, name: "FranchiseOps - Hyderabad Tech Park", manager: "Priya Sharma", address: "HITEC City Phase 2", city: "Hyderabad", state: "Telangana", latitude: 17.3850, longitude: 78.4867, metrics: { revenue: 1620000, profit: 710000, orders: 5310, avgAov: "₹305.08", profitMargin: "43.8%", stockAlerts: 2, staffCount: 14 }, healthScore: 78, statusTag: "Warning" as const },
    { id: 3, name: "FranchiseOps - Chennai Marina", manager: "Karthik Raja", address: "Anna Salai, Marina Bay", city: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, metrics: { revenue: 1150000, profit: 470000, orders: 3910, avgAov: "₹294.11", profitMargin: "40.8%", stockAlerts: 1, staffCount: 10 }, healthScore: 88, statusTag: "Healthy" as const },
    { id: 4, name: "FranchiseOps - Mumbai Andheri", manager: "Neha Kapoor", address: "Link Road, Andheri West", city: "Mumbai", state: "Maharashtra", latitude: 19.0760, longitude: 72.8777, metrics: { revenue: 1850000, profit: 810000, orders: 5940, avgAov: "₹311.45", profitMargin: "43.7%", stockAlerts: 0, staffCount: 16 }, healthScore: 95, statusTag: "Optimal" as const },
    { id: 5, name: "FranchiseOps - Pune Hinjawadi", manager: "Vikram Joshi", address: "IT Park Phase 1", city: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, metrics: { revenue: 980000, profit: 390000, orders: 3120, avgAov: "₹314.10", profitMargin: "39.8%", stockAlerts: 0, staffCount: 9 }, healthScore: 92, statusTag: "Healthy" as const },
  ], []);

  // Worker Attendance State
  const [workers, setWorkers] = useState<Worker[]>(INITIAL_WORKERS);
  const [selectedWorkerModal, setSelectedWorkerModal] = useState<Worker | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffOutletFilter, setStaffOutletFilter] = useState("all");
  const [staffShiftFilter, setStaffShiftFilter] = useState("all");

  // Filter States
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "saleDate", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Data States
  const [outlets, setOutlets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    grossRevenue: 0, operatingCost: 0, netProfit: 0, totalOrders: 0, totalCustomers: 0, averageOrderValue: 0, profitMargin: 0, paymentSplit: { cash: 0, card: 0, upi: 0 }
  });
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [salesRecords, setSalesRecords] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserState | null>(null);

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "warning" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Step 1: Live Ingestion Stream State
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [isStreamingLiveEvents, setIsStreamingLiveEvents] = useState(true);
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  const [csvRawInput, setCsvRawInput] = useState("");
  const [liveEventsLog, setLiveEventsLog] = useState([
    { id: 1, time: "19:18:04", text: "POS Ingestion Pipe #4: Processed Sale #99102 for ₹850.00 at Bengaluru Central", type: "pos" },
    { id: 2, time: "19:18:01", text: "Inventory Sensor Depletion: -2.5 kg Mozzarella Cheese (Hyderabad Tech Park)", type: "inventory" },
    { id: 3, time: "19:17:58", text: "Staff Shift Punch: Shift Started for Ritu Sharma (EMP-BEN-089) at 08:30 AM", type: "shift" },
    { id: 4, time: "19:17:52", text: "Zomato Marketing Webhook: +1 Promo Conversion recorded (Code: MONSOON20)", type: "marketing" },
  ]);

  // Step 3: Sales Entry Modal State
  const [showRecordSalesModal, setShowRecordSalesModal] = useState(false);
  const [newSalesForm, setNewSalesForm] = useState({
    outletId: "1",
    saleDate: new Date().toISOString().slice(0, 10),
    grossRevenue: "45000",
    operatingCost: "24000",
    totalOrders: "210",
    customerCount: "250"
  });

  // Step 5: Worker Clock In & Registration Modals
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInForm, setClockInForm] = useState({
    workerId: 101,
    status: "Present" as "Present" | "Late" | "Absent" | "Half Day",
    clockIn: "08:45 AM",
    clockOut: "05:30 PM",
    deduction: "0",
    deductionReason: ""
  });

  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({
    name: "",
    role: "Barista & Cashier",
    outletName: "Bengaluru Central",
    phone: "+91 98765 43210",
    email: "",
    baseSalary: "28000",
    bonus: "2000"
  });

  // Step 6: Marketing & Scenario Simulator State
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [simulatedMarketingBudget, setSimulatedMarketingBudget] = useState(25000);
  const [marketingCampaigns, setMarketingCampaigns] = useState([
    { id: 1, name: "Weekend Monsoon Combo Offer", channel: "Zomato & Swiggy Promo", budget: 15000, spend: 11200, conversions: 430, revenueGenerated: 68800, roi: "514%", status: "Active" },
    { id: 2, name: "Local Office Park Geofence Ad", channel: "Google Local Ads", budget: 20000, spend: 18500, conversions: 620, revenueGenerated: 99200, roi: "436%", status: "Active" },
    { id: 3, name: "Student Loyalty Discount Card", channel: "In-Store QR Code", budget: 5000, spend: 3200, conversions: 290, revenueGenerated: 34800, roi: "987%", status: "Completed" },
  ]);
  const [newMarketingForm, setNewMarketingForm] = useState({ name: "", channel: "Google Ads", budget: "15000" });

  // Step 7: Audit State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [storeAudits, setStoreAudits] = useState([
    { id: 1, outletName: "Bengaluru Central", auditDate: "2026-07-28", auditor: "Ananya Roy", hygieneScore: 98, safetyScore: 96, uniformSopScore: 94, totalScore: 96, status: "Passed", notes: "Excellent kitchen cleanliness and temperature control logs." },
    { id: 2, outletName: "Hyderabad Tech Park", auditDate: "2026-07-26", auditor: "Suresh Menon", hygieneScore: 92, safetyScore: 90, uniformSopScore: 88, totalScore: 90, status: "Passed with Advisory", notes: "Minor delay in staff uniform inspection records." },
    { id: 3, outletName: "Chennai Marina", auditDate: "2026-07-24", auditor: "Ananya Roy", hygieneScore: 85, safetyScore: 88, uniformSopScore: 82, totalScore: 85, status: "Re-Audit Scheduled", notes: "Refrigeration logs missing 1 morning entry." },
  ]);
  const [newAuditForm, setNewAuditForm] = useState({ outletName: "Bengaluru Central", auditor: "Lead Auditor", hygieneScore: "95", safetyScore: "92", uniformSopScore: "94", notes: "Routine store inspection passed." });

  // Step 8: AI Scenario Simulator
  const [simulatedRainImpact, setSimulatedRainImpact] = useState(15);

  // Step 9: Strategy Recommendations State
  const [strategyCategoryFilter, setStrategyCategoryFilter] = useState("all");
  const [strategyRecommendations, setStrategyRecommendations] = useState([
    { id: 1, title: "Shift Baristas to Morning Peak Rush", outlet: "Bengaluru Central", category: "Labor Efficiency", impact: "+₹14,500/week", confidence: "94%", desc: "Move 2 staff members from 14:00 slow shift to 08:30 morning peak to reduce queue times.", applied: false },
    { id: 2, title: "Automate Reorder for Espresso Beans", outlet: "All Outlets", category: "Inventory Cover", impact: "Zero Stockouts", confidence: "98%", desc: "Set auto-reorder threshold to 30kg based on 8.5kg/day burn velocity.", applied: true },
    { id: 3, title: "Launch Weekend Combo Promo in Chennai", outlet: "Chennai Marina", category: "Revenue Growth", impact: "+18% Weekend Sales", confidence: "89%", desc: "Activate weekend 15% combo discount on bakery items during 16:00-19:00.", applied: false },
  ]);

  // Step 10: System Alerts State
  const [alertFilter, setAlertFilter] = useState("all");
  const [systemAlerts, setSystemAlerts] = useState([
    { id: 101, level: "critical", title: "Mozzarella Cheese Deficit (< 10%)", desc: "Stock depleted to 4.2 kg at Hyderabad Tech Park outlet.", outlet: "Hyderabad Tech Park", resolved: false },
    { id: 102, level: "warning", title: "Staff Late Clock-in Cluster Detected", desc: "3 workers recorded > 30 min delays this week in Chennai Marina.", outlet: "Chennai Marina", resolved: false },
    { id: 103, level: "info", title: "Weekly Revenue Benchmark Exceeded", desc: "Bengaluru Central gross revenue reached ₹4.2L (+14% vs target).", outlet: "Bengaluru Central", resolved: false }
  ]);

  // Live Digital Clock & Keyboard Shortcuts
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " IST · " + now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Live Telemetry Event Simulator (Step 1)
  useEffect(() => {
    if (!isStreamingLiveEvents) return;
    const interval = setInterval(() => {
      const outletsArr = ["Bengaluru Central", "Hyderabad Tech Park", "Chennai Marina", "Mumbai Andheri", "Pune Hinjawadi"];
      const randOutlet = outletsArr[Math.floor(Math.random() * outletsArr.length)];
      const randAmount = (Math.floor(Math.random() * 800) + 250).toFixed(2);
      const randOrder = Math.floor(Math.random() * 90000) + 10000;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLiveEventsLog(prev => [
        { id: Date.now(), time: nowStr, text: `POS Telemetry Stream: Sale #${randOrder} recorded for ₹${randAmount} at ${randOutlet}`, type: "pos" },
        ...prev.slice(0, 7)
      ]);
    }, 4500);
    return () => clearInterval(interval);
  }, [isStreamingLiveEvents]);

  // Inline Actions for Workers: Approve Bonus & Waive Salary Cut
  const handleGiveWorkerBonus = (workerId: number) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        const bonusAmt = 1000;
        showToast(`Approved ₹${bonusAmt.toLocaleString()} performance bonus for ${w.name}!`, "success");
        return { ...w, bonus: w.bonus + bonusAmt };
      }
      return w;
    }));
  };

  const handleWaiveSalaryCut = (workerId: number) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        showToast(`Waived salary cut of ₹${w.salaryCut} for ${w.name}!`, "success");
        return { ...w, salaryCut: 0, salaryCutReason: "Salary cut waived by Operations Manager" };
      }
      return w;
    }));
  };

  // Handler: Export Filtered Sales to CSV
  const exportSalesToCsv = () => {
    if (salesRecords.length === 0) {
      showToast("No sales records available to export.", "warning");
      return;
    }
    const headers = ["ID", "Outlet Name", "City", "Sale Date", "Total Orders", "Customer Count", "Gross Revenue (INR)", "Operating Cost (INR)", "Net Profit (INR)", "Average Order Value (INR)"];
    const rows = salesRecords.map(r => [
      r.id, `"${r.outletName}"`, `"${r.city}"`, r.saleDate, r.totalOrders, r.customerCount, r.grossRevenue, r.operatingCost, r.netProfit, r.averageOrderValue
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FranchiseOps_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Sales Report CSV downloaded successfully!", "success");
  };

  // Handler: Database Sync Simulation
  const handleDatabaseSync = () => {
    setIsSyncingDb(true);
    showToast("Pinging multi-source POS & IoT sensors...", "info");
    setTimeout(() => {
      setIsSyncingDb(false);
      showToast("Telemetry Sync Complete: 5 Franchise Locations fully updated!", "success");
    }, 1200);
  };

  // Handler: CSV Payload Upload
  const handleCsvUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvRawInput.trim()) {
      showToast("Please enter or paste CSV content.", "warning");
      return;
    }
    const lines = csvRawInput.trim().split("\n");
    let count = 0;
    const newRecords: any[] = [];
    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes("date")) return;
      const parts = line.split(",");
      if (parts.length >= 3) {
        count++;
        const rev = parseFloat(parts[2] || "35000");
        const cost = parseFloat(parts[3] || "20000");
        newRecords.push({
          id: Date.now() + idx,
          outletId: 1,
          outletName: parts[0]?.trim() || "Bengaluru Central",
          city: "Bengaluru",
          saleDate: parts[1]?.trim() || new Date().toISOString().slice(0, 10),
          totalOrders: parseInt(parts[4] || "180", 10),
          customerCount: parseInt(parts[5] || "210", 10),
          grossRevenue: rev,
          operatingCost: cost,
          netProfit: rev - cost,
          averageOrderValue: 185,
          paymentSplit: { cash: rev * 0.2, card: rev * 0.3, upi: rev * 0.5 }
        });
      }
    });
    setSalesRecords(prev => [...newRecords, ...prev]);
    setShowCsvUploadModal(false);
    setCsvRawInput("");
    showToast(`Successfully ingested ${count || 1} sales telemetry records from CSV!`, "success");
  };

  // Handler: Manual Sales Entry
  const handleRecordSalesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rev = parseFloat(newSalesForm.grossRevenue);
    const cost = parseFloat(newSalesForm.operatingCost);
    const orders = parseInt(newSalesForm.totalOrders, 10);
    const selectedO = outlets.find(o => String(o.id) === String(newSalesForm.outletId)) || { outlet_name: "Bengaluru Central", city: "Bengaluru" };

    const newRecord = {
      id: Date.now(),
      outletId: parseInt(newSalesForm.outletId, 10),
      outletName: selectedO.outlet_name,
      city: selectedO.city,
      saleDate: newSalesForm.saleDate,
      totalOrders: orders,
      customerCount: parseInt(newSalesForm.customerCount, 10),
      grossRevenue: rev,
      operatingCost: cost,
      netProfit: rev - cost,
      averageOrderValue: orders > 0 ? parseFloat((rev / orders).toFixed(2)) : 0,
      paymentSplit: { cash: rev * 0.2, card: rev * 0.3, upi: rev * 0.5 }
    };

    setSalesRecords(prev => [newRecord, ...prev]);
    try { axios.post(`${BACKEND_URL}/sales/create`, newRecord); } catch {}

    setShowRecordSalesModal(false);
    showToast(`Recorded ₹${rev.toLocaleString("en-IN")} sales for ${selectedO.outlet_name}!`, "success");
  };

  // Handler: Clock In / Out Submit
  const handleClockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = clockInForm.workerId;
    const deductionVal = parseFloat(clockInForm.deduction || "0");

    setWorkers(prev => prev.map(w => {
      if (w.id === wId) {
        const newAttHistory = [
          {
            date: new Date().toISOString().slice(0, 10),
            shift: "Day Shift (09:00 - 18:00)",
            clockIn: clockInForm.clockIn,
            clockOut: clockInForm.clockOut,
            totalHours: 8.5,
            status: clockInForm.status,
            bonusEarned: clockInForm.status === "Present" ? 300 : 0,
            deduction: deductionVal,
            deductionReason: clockInForm.deductionReason
          },
          ...w.attendanceHistory
        ];
        return {
          ...w,
          status: clockInForm.status,
          clockIn: clockInForm.clockIn,
          clockOut: clockInForm.clockOut,
          salaryCut: w.salaryCut + deductionVal,
          salaryCutReason: clockInForm.deductionReason || w.salaryCutReason,
          attendanceHistory: newAttHistory
        };
      }
      return w;
    }));

    setShowClockInModal(false);
    showToast(`Attendance & punch clock updated!`, "success");
  };

  // Handler: Register New Worker
  const handleAddWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerForm.name.trim()) return;

    const newW: Worker = {
      id: Date.now(),
      name: newWorkerForm.name,
      employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      role: newWorkerForm.role,
      outletName: newWorkerForm.outletName,
      phone: newWorkerForm.phone,
      email: newWorkerForm.email || `${newWorkerForm.name.toLowerCase().replace(" ", ".")}@franchiseops.ai`,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`,
      baseSalary: parseFloat(newWorkerForm.baseSalary || "28000"),
      bonus: parseFloat(newWorkerForm.bonus || "2000"),
      salaryCut: 0,
      salaryCutReason: "No deductions recorded",
      clockIn: "09:00 AM",
      clockOut: "06:00 PM",
      status: "Present",
      attendanceHistory: [
        { date: new Date().toISOString().slice(0, 10), shift: "Day (09:00 - 18:00)", clockIn: "09:00 AM", clockOut: "06:00 PM", totalHours: 9.0, status: "Present", bonusEarned: 200, deduction: 0 }
      ]
    };

    setWorkers(prev => [newW, ...prev]);
    setShowAddWorkerModal(false);
    setNewWorkerForm({ name: "", role: "Barista & Cashier", outletName: "Bengaluru Central", phone: "+91 98765 43210", email: "", baseSalary: "28000", bonus: "2000" });
    showToast(`Registered new staff worker ${newW.name}!`, "success");
  };

  // Handler: Launch Marketing Campaign
  const handleLaunchCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketingForm.name.trim()) return;

    const b = parseFloat(newMarketingForm.budget || "10000");
    const newCamp = {
      id: Date.now(),
      name: newMarketingForm.name,
      channel: newMarketingForm.channel,
      budget: b,
      spend: b * 0.3,
      conversions: Math.round(b / 30),
      revenueGenerated: b * 4.2,
      roi: "420%",
      status: "Active"
    };

    setMarketingCampaigns(prev => [newCamp, ...prev]);
    try { axios.post(`${BACKEND_URL}/marketing/create`, newCamp); } catch {}
    setShowMarketingModal(false);
    setNewMarketingForm({ name: "", channel: "Google Ads", budget: "15000" });
    showToast(`Launched marketing campaign "${newCamp.name}"!`, "success");
  };

  // Handler: Log Store Audit
  const handleLogAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(newAuditForm.hygieneScore, 10);
    const s = parseInt(newAuditForm.safetyScore, 10);
    const u = parseInt(newAuditForm.uniformSopScore, 10);
    const avg = Math.round((h + s + u) / 3);

    const newAudit = {
      id: Date.now(),
      outletName: newAuditForm.outletName,
      auditDate: new Date().toISOString().slice(0, 10),
      auditor: newAuditForm.auditor,
      hygieneScore: h,
      safetyScore: s,
      uniformSopScore: u,
      totalScore: avg,
      status: avg >= 90 ? "Passed" : avg >= 80 ? "Passed with Advisory" : "Re-Audit Scheduled",
      notes: newAuditForm.notes
    };

    setStoreAudits(prev => [newAudit, ...prev]);
    try { axios.post(`${BACKEND_URL}/audits/create`, newAudit); } catch {}
    setShowAuditModal(false);
    showToast(`Logged store audit inspection for ${newAudit.outletName} (Score: ${avg}%)!`, "success");
  };

  // Handler: Apply Strategy Recommendation
  const handleApplyRecommendation = (recId: number) => {
    setStrategyRecommendations(prev => prev.map(r => r.id === recId ? { ...r, applied: true } : r));
    try { axios.post(`${BACKEND_URL}/recommendations/apply`, { recId }); } catch {}
    showToast(`Applied AI strategy recommendation! Operational parameters updated.`, "success");
  };

  // Handler: Resolve Alert
  const handleResolveAlert = (alertId: number) => {
    setSystemAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    showToast(`Alert resolved & archived by operator.`, "info");
  };

  // Check auth user from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("franchiseOpsUser");
      if (saved) {
        try { setCurrentUser(JSON.parse(saved)); } catch {}
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("franchiseOpsUser");
      localStorage.removeItem("franchiseops_token");
    }
    setCurrentUser(null);
  };

  // Date filters
  const dateFilters = useMemo(() => {
    const today = new Date("2026-07-28");
    const end = today.toISOString().slice(0, 10);
    const start = new Date(today);
    start.setDate(today.getDate() - parseInt(dateRange, 10));
    return { startDate: start.toISOString().slice(0, 10), endDate: end };
  }, [dateRange]);

  // Local Seed Data Generator
  const localMockData = useMemo(() => {
    const mockOutlets = [
      { id: 1, outlet_name: "FranchiseOps - Bengaluru Central", manager_name: "Rahul Sharma", city: "Bengaluru" },
      { id: 2, outlet_name: "FranchiseOps - Hyderabad Tech Park", manager_name: "Priya Reddy", city: "Hyderabad" },
      { id: 3, outlet_name: "FranchiseOps - Chennai Marina", manager_name: "Arjun Kumar", city: "Chennai" },
      { id: 4, outlet_name: "FranchiseOps - Mumbai Andheri", manager_name: "Neha Patel", city: "Mumbai" },
      { id: 5, outlet_name: "FranchiseOps - Pune Hinjawadi", manager_name: "Vikram Joshi", city: "Pune" },
    ];
    const today = new Date("2026-07-28");
    const records: any[] = [];
    mockOutlets.forEach(outlet => {
      let seed = outlet.id;
      const random = () => { const x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
      for (let i = 60; i >= 1; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;
        let baseOrders = 150, baseAOV = 150, boost = 1.0;
        if (outlet.city === "Bengaluru") { baseOrders = 180; baseAOV = 160; boost = isWeekend ? 1.25 : 1.0; }
        else if (outlet.city === "Hyderabad") { baseOrders = 190; baseAOV = 145; boost = isWeekend ? 0.70 : 1.30; }
        else if (outlet.city === "Chennai") { baseOrders = 140; baseAOV = 135; boost = isWeekend ? 1.40 : 1.0; }
        else if (outlet.city === "Mumbai") { baseOrders = 210; baseAOV = 170; boost = isWeekend ? 1.15 : 1.0; }
        else if (outlet.city === "Pune") { baseOrders = 150; baseAOV = 140; boost = isWeekend ? 0.80 : 1.20; }
        const randM = 0.9 + random() * 0.2;
        const orders = Math.round(baseOrders * boost * randM);
        const customers = Math.round(orders * (1.1 + random() * 0.15));
        const aov = parseFloat((baseAOV * (0.95 + random() * 0.1)).toFixed(2));
        const revenue = parseFloat((orders * aov).toFixed(2));
        const costPct = 0.58 + random() * 0.10;
        const cost = parseFloat((revenue * costPct).toFixed(2));
        const profit = parseFloat((revenue - cost).toFixed(2));
        const upi = parseFloat((revenue * (0.50 + random() * 0.10)).toFixed(2));
        const card = parseFloat((revenue * (0.25 + random() * 0.10)).toFixed(2));
        const cash = parseFloat((revenue - upi - card).toFixed(2));
        records.push({
          id: outlet.id * 1000 + i, outletId: outlet.id, outletName: outlet.outlet_name, city: outlet.city,
          saleDate: date.toISOString().slice(0, 10), totalOrders: orders, customerCount: customers,
          grossRevenue: revenue, operatingCost: cost, netProfit: profit, averageOrderValue: aov,
          paymentSplit: { cash, card, upi }
        });
      }
    });
    return { outlets: mockOutlets, records };
  }, []);

  // Fetch / Sync Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { startDate, endDate } = dateFilters;
      const outletParam = selectedOutlet !== "all" ? `&outletId=${selectedOutlet}` : "";

      try {
        const resOutlets = await axios.get(`${BACKEND_URL}/outlets`);
        setOutlets(resOutlets.data);
        const resSummary = await axios.get(`${BACKEND_URL}/sales/summary?startDate=${startDate}&endDate=${endDate}${outletParam}`);
        setMetrics(resSummary.data);
        const resTrends = await axios.get(`${BACKEND_URL}/sales/trends?startDate=${startDate}&endDate=${endDate}${outletParam}`);
        setTrendsData(resTrends.data);
        const resList = await axios.get(`${BACKEND_URL}/sales/list?startDate=${startDate}&endDate=${endDate}${outletParam}&limit=200`);
        setSalesRecords(resList.data.records);
        setIsUsingFallback(false);
      } catch {
        setIsUsingFallback(true);
        setOutlets(localMockData.outlets);
        const filtered = localMockData.records.filter(r => {
          const inRange = r.saleDate >= startDate && r.saleDate <= endDate;
          const matchOutlet = selectedOutlet === "all" || r.outletId === parseInt(selectedOutlet, 10);
          return inRange && matchOutlet;
        });
        let grossRevenue = 0, operatingCost = 0, netProfit = 0, totalOrders = 0, totalCustomers = 0, cash = 0, card = 0, upi = 0;
        filtered.forEach(r => {
          grossRevenue += r.grossRevenue; operatingCost += r.operatingCost; netProfit += r.netProfit;
          totalOrders += r.totalOrders; totalCustomers += r.customerCount;
          cash += r.paymentSplit.cash; card += r.paymentSplit.card; upi += r.paymentSplit.upi;
        });
        const averageOrderValue = totalOrders > 0 ? parseFloat((grossRevenue / totalOrders).toFixed(2)) : 0;
        const profitMargin = grossRevenue > 0 ? parseFloat(((netProfit / grossRevenue) * 100).toFixed(2)) : 0;
        setMetrics({ grossRevenue, operatingCost, netProfit, totalOrders, totalCustomers, averageOrderValue, profitMargin, paymentSplit: { cash, card, upi } });

        const tMap: Record<string, any> = {};
        filtered.forEach(r => {
          if (!tMap[r.saleDate]) tMap[r.saleDate] = { date: r.saleDate, grossRevenue: 0, operatingCost: 0, netProfit: 0, totalOrders: 0 };
          tMap[r.saleDate].grossRevenue += r.grossRevenue;
          tMap[r.saleDate].operatingCost += r.operatingCost;
          tMap[r.saleDate].netProfit += r.netProfit;
          tMap[r.saleDate].totalOrders += r.totalOrders;
        });
        setTrendsData(Object.values(tMap).sort((a: any, b: any) => a.date.localeCompare(b.date)));
        setSalesRecords(filtered);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedOutlet, dateFilters, localMockData]);

  // Formatters
  const formatCurrency = (val: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat("en-IN").format(val);

  // Sorting and Pagination
  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  };

  const processedRecords = useMemo(() => {
    let records = [...salesRecords];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      records = records.filter(r => r.outletName.toLowerCase().includes(term) || r.city.toLowerCase().includes(term) || r.saleDate.includes(term));
    }
    records.sort((a, b) => {
      const aVal = a[sortConfig.key], bVal = b[sortConfig.key];
      if (typeof aVal === "string") return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
    return records;
  }, [salesRecords, searchTerm, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedRecords.slice(start, start + itemsPerPage);
  }, [processedRecords, currentPage]);

  const totalPages = Math.ceil(processedRecords.length / itemsPerPage);

  const selectedOutletName = useMemo(() => {
    if (selectedOutlet === "all") return "All Outlets";
    const o = outlets.find((o: any) => String(o.id) === String(selectedOutlet));
    return o ? o.outlet_name.replace("FranchiseOps - ", "") : "Selected Outlet";
  }, [selectedOutlet, outlets]);

  const aiInsights = useMemo(() => {
    if (loading || trendsData.length < 3) return [];
    return computeAiInsights(trendsData, salesRecords, selectedOutletName);
  }, [trendsData, salesRecords, loading, selectedOutletName]);

  // Filtered Workers for Step 5
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (staffOutletFilter !== "all" && !w.outletName.toLowerCase().includes(staffOutletFilter.toLowerCase())) return false;
      if (staffSearch.trim()) {
        const q = staffSearch.toLowerCase();
        const matchName = w.name.toLowerCase().includes(q);
        const matchRole = w.role.toLowerCase().includes(q);
        const matchEmail = w.email.toLowerCase().includes(q);
        const matchPhone = w.phone.includes(q);
        if (!matchName && !matchRole && !matchEmail && !matchPhone) return false;
      }
      return true;
    });
  }, [workers, staffOutletFilter, staffSearch]);

  return (
    <div className="flex h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased overflow-hidden font-sans">

      {/* ── macOS Dark Zinc Sidebar Navigation ──────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20"
        style={{ width: sidebarOpen ? "270px" : "68px", minWidth: sidebarOpen ? "270px" : "68px" }}
      >
        <div className="flex flex-col h-full bg-[#0c1017] text-slate-200 border-r border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            {sidebarOpen ? (
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-white tracking-tight leading-tight">FranchiseOps</p>
                  <p className="text-[10px] text-slate-400 font-medium">Apple-Grade AI Ops</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
            </button>
          </div>

          {/* Sidebar Search Bar */}
          {sidebarOpen && (
            <div className="px-3 pt-3">
              <input
                type="text"
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Search 10 workflow steps..."
                className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Section Label */}
          {sidebarOpen && (
            <div className="px-4 pt-3 pb-1 flex items-center justify-between">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Agent Workflow Modules</p>
              <span className="text-[9px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">10 Active</span>
            </div>
          )}

          {/* Workflow Steps List */}
          <nav className="flex-1 overflow-y-auto py-2 space-y-1 px-2.5">
            {WORKFLOW_STEPS.filter(s => sidebarSearch.trim() === "" || s.name.toLowerCase().includes(sidebarSearch.toLowerCase()) || s.desc.toLowerCase().includes(sidebarSearch.toLowerCase())).map(step => {
              const isSelected = selectedStep === step.id;
              return (
                <button
                  key={step.id}
                  title={!sidebarOpen ? `Step ${step.id}: ${step.name}` : undefined}
                  onClick={() => { setSelectedStep(step.id); setCurrentPage(1); }}
                  className={`w-full flex items-center rounded-xl transition-all duration-200 group ${
                    sidebarOpen ? "px-3 py-2.5 space-x-3" : "px-0 py-2.5 justify-center"
                  } ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <div className={`shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold border transition-all ${
                    isSelected
                      ? "bg-white/20 border-white/30 text-white"
                      : "bg-slate-800/80 border-slate-700/80 text-slate-300 group-hover:border-slate-600"
                  }`}>
                    {step.id}
                  </div>

                  {sidebarOpen && (
                    <div className="flex-1 text-left overflow-hidden">
                      <p className={`text-xs font-bold leading-tight truncate ${isSelected ? "text-white" : "text-slate-200"}`}>{step.name}</p>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">{step.category.toUpperCase()}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="px-4 py-3 border-t border-white/10 bg-slate-950/40">
              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-slate-300">Live API Server: Online</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">{currentTime || "Live Telemetry Connected"}</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main View Container ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Floating Apple Frosted Glass Header */}
        <header className="shrink-0 z-10 apple-glass border-b border-slate-200/80 shadow-sm">
          <div className="h-16 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors lg:hidden"
              >
                <Icons.Menu />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-[#1d1d1f] tracking-tight leading-tight flex items-center gap-2">
                  <span>Step {selectedStep}: {WORKFLOW_STEPS[selectedStep - 1].name}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Live Interactive Agent
                  </span>
                </h1>
                <p className="text-xs text-slate-500 truncate max-w-xl">{WORKFLOW_STEPS[selectedStep - 1].desc}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Quick Spotlight Command Search */}
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="hidden md:flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 transition-all shadow-inner"
              >
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Quick Search...</span>
                <kbd className="bg-white px-1.5 py-0.5 rounded border text-[10px] font-mono text-slate-400">⌘K</kbd>
              </button>

              <button
                onClick={() => setSelectedStep(5)}
                className={`flex items-center space-x-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm transition-all ${
                  selectedStep === 5 ? "bg-indigo-600 text-white shadow-indigo-600/20" : "bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200"
                }`}
              >
                <Icons.Staff />
                <span>Worker Attendance & Payroll</span>
              </button>

              <Link
                href="/inventory"
                className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3.5 py-1.5 rounded-full shadow-sm transition-all"
              >
                <Icons.Inventory />
                <span>Inventory Agent</span>
              </Link>

              {/* User State Pill */}
              {currentUser ? (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-blue-300 bg-blue-50 shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center font-bold text-blue-700 text-xs">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.name || "Operator"}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{currentUser.role || currentUser.method || "User"}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-full transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden sm:inline-block bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-full transition-all"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Scrollable View */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto px-6 py-8">

            {/* ── STEP 5: WORKER ATTENDANCE & PAYROLL INTELLIGENCE AGENT ───────── */}
            {selectedStep === 5 && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Header Banner */}
                <div className="apple-card p-6 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Step 5 · Worker Attendance & Payroll Intelligence</span>
                    <h2 className="text-2xl font-black text-[#1d1d1f] mt-1">Staff Attendance, Start/End Timings & Salary Tracker</h2>
                    <p className="text-xs text-slate-600 mt-1">Track daily clock-in/clock-out timings, inspect attendance logs, bonus allocations, and salary cuts with reasons.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowClockInModal(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Punch Clock In / Out</span>
                    </button>

                    <button
                      onClick={() => setShowAddWorkerModal(true)}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Register New Worker</span>
                    </button>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Active Workers", val: workers.length, sub: "5 Franchise Locations", color: "text-indigo-600" },
                    { label: "Present Today", val: workers.filter(w => w.status === "Present").length, sub: "100% On-Time Target", color: "text-emerald-600" },
                    { label: "Late Clock-ins", val: workers.filter(w => w.status === "Late").length, sub: "Flagged by POS Terminal", color: "text-amber-600" },
                    { label: "Total Monthly Salary Budget", val: formatCurrency(workers.reduce((acc, w) => acc + w.baseSalary + w.bonus - w.salaryCut, 0)), sub: "Includes Bonuses & Salary Cuts", color: "text-purple-600" },
                  ].map(c => (
                    <div key={c.label} className="apple-card apple-card-hover p-5">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{c.label}</p>
                      <p className={`text-2xl font-black mt-2 tracking-tight ${c.color}`}>{c.val}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1.5">{c.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Worker Controls & Filters */}
                <div className="apple-card p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Click Any Worker Row to View Full Attendance & Salary Cut History
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search worker name, email, role, or phone..."
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72"
                    />

                    <select
                      value={staffOutletFilter}
                      onChange={e => setStaffOutletFilter(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                    >
                      <option value="all">All Locations</option>
                      <option value="Bengaluru">Bengaluru Central</option>
                      <option value="Hyderabad">Hyderabad Tech Park</option>
                      <option value="Chennai">Chennai Marina</option>
                      <option value="Mumbai">Mumbai Andheri</option>
                      <option value="Pune">Pune Hinjawadi</option>
                    </select>
                  </div>
                </div>

                {/* Main Worker Attendance Table */}
                <div className="apple-card overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="font-extrabold text-[#1d1d1f] text-sm">Daily Worker Attendance & Start/End Timings</h3>
                      <p className="text-xs text-slate-500">Live POS clock-in telemetry with salary breakdown</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
                      Real-time Punch Sync
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                        <tr>
                          <th className="px-5 py-3.5">Worker Name & Role</th>
                          <th className="px-4 py-3.5">Outlet Location</th>
                          <th className="px-4 py-3.5 text-center">Start Time (Clock In)</th>
                          <th className="px-4 py-3.5 text-center">End Time (Clock Out)</th>
                          <th className="px-4 py-3.5">Today Status</th>
                          <th className="px-4 py-3.5 text-right">Base Salary</th>
                          <th className="px-4 py-3.5 text-right">Bonus</th>
                          <th className="px-4 py-3.5 text-right">Salary Cut</th>
                          <th className="px-5 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredWorkers.map(worker => {
                          const statusBg = worker.status === "Present" ? "bg-emerald-100 text-emerald-800" : worker.status === "Late" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
                          return (
                            <tr
                              key={worker.id}
                              onClick={() => setSelectedWorkerModal(worker)}
                              className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center space-x-3">
                                  <img src={worker.avatar} alt={worker.name} className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0" />
                                  <div>
                                    <p className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{worker.name}</p>
                                    <p className="text-[11px] text-slate-500">{worker.role} · <span className="font-mono text-slate-400">{worker.employeeId}</span></p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 font-semibold text-slate-700">{worker.outletName}</td>

                              <td className="px-4 py-4 text-center font-mono font-bold text-emerald-700 bg-emerald-50/60 rounded-xl">
                                {worker.clockIn}
                              </td>

                              <td className="px-4 py-4 text-center font-mono font-bold text-slate-700 bg-slate-100/60 rounded-xl">
                                {worker.clockOut}
                              </td>

                              <td className="px-4 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${statusBg}`}>{worker.status}</span>
                              </td>

                              <td className="px-4 py-4 text-right font-bold text-slate-900">{formatCurrency(worker.baseSalary)}</td>

                              <td className="px-4 py-4 text-right font-extrabold text-emerald-600">+{formatCurrency(worker.bonus)}</td>

                              <td className="px-4 py-4 text-right font-extrabold text-red-600">
                                {worker.salaryCut > 0 ? `-${formatCurrency(worker.salaryCut)}` : "₹0"}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end space-x-1.5" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleGiveWorkerBonus(worker.id)}
                                    title="Approve ₹1,000 Bonus"
                                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] border border-emerald-200 transition-all"
                                  >
                                    +₹1k Bonus
                                  </button>
                                  {worker.salaryCut > 0 && (
                                    <button
                                      onClick={() => handleWaiveSalaryCut(worker.id)}
                                      title="Waive Salary Cut"
                                      className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[10px] border border-amber-200 transition-all"
                                    >
                                      Waive Cut
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedWorkerModal(worker)}
                                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] shadow-sm transition-all"
                                  >
                                    Inspect Profile
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Other Steps render appropriately */}
            {selectedStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-50/50 to-white">
                  <div>
                    <span className="text-xs font-black text-cyan-600 uppercase tracking-widest">Step 1 · Data Ingestion Engine</span>
                    <h2 className="text-xl font-black text-[#1d1d1f] mt-1">Multi-Source Franchise Telemetry Stream</h2>
                    <p className="text-xs text-slate-500 mt-1">Ingests raw POS logs, inventory telemetry, staff shift punches, and audit scores.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDatabaseSync}
                      disabled={isSyncingDb}
                      className="bg-white border border-slate-200 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      {isSyncingDb ? (
                        <>
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></span>
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <span>Sync Database</span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowCsvUploadModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m0 0V4" />
                      </svg>
                      <span>Upload CSV Payload</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "POS Sales Ingestion Rate", val: "1,420 events/min", status: "Live Feed", color: "text-emerald-600" },
                    { label: "Active Outlet Pipes", val: "5 Locations Connected", status: "100% Up", color: "text-blue-600" },
                    { label: "Inventory Sensor Telemetry", val: "Real-time depletion", status: "Synced", color: "text-indigo-600" },
                    { label: "Ingestion Latency", val: "14ms Avg", status: "Optimal", color: "text-purple-600" },
                  ].map(c => (
                    <div key={c.label} className="apple-card p-5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                      <p className={`text-xl font-black mt-2 ${c.color}`}>{c.val}</p>
                      <span className="mt-2 inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.status}</span>
                    </div>
                  ))}
                </div>

                {/* Live Real-Time Telemetry Event Log */}
                <div className="apple-card p-6 bg-slate-900 text-white">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${isStreamingLiveEvents ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`}></span>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                        Live Socket Telemetry Feed ({liveEventsLog.length} events active)
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsStreamingLiveEvents(prev => !prev)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
                    >
                      {isStreamingLiveEvents ? "Pause Stream" : "Resume Stream"}
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto pr-1">
                    {liveEventsLog.map(e => (
                      <div key={e.id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-slate-300">
                        <span className="truncate mr-3">[{e.time}] {e.text}</span>
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded shrink-0 border border-indigo-800">
                          RAW_WEBSOCKET
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: OUTLET PERFORMANCE AGENT (FULL DASHBOARD) ────────────── */}
            {selectedStep === 3 && (
              <div className="space-y-8 animate-fade-in">
                {/* Apple Controls Toolbar */}
                <div className="apple-card p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Outlet Performance Intelligence Command Center
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={exportSalesToCsv}
                      className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m0 0V4" />
                      </svg>
                      <span>Export CSV</span>
                    </button>

                    <button
                      onClick={() => setShowRecordSalesModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Record Daily Sales</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <label htmlFor="outlet-select" className="text-xs font-bold text-slate-500">Outlet:</label>
                      <select
                        id="outlet-select"
                        value={selectedOutlet}
                        onChange={e => { setSelectedOutlet(e.target.value); setCurrentPage(1); }}
                        className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                      >
                        <option value="all">All Outlets (Consolidated)</option>
                        {outlets.map((o: any) => (
                          <option key={o.id} value={o.id}>{o.outlet_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <label htmlFor="date-select" className="text-xs font-bold text-slate-500">Timeframe:</label>
                      <select
                        id="date-select"
                        value={dateRange}
                        onChange={e => { setDateRange(e.target.value); setCurrentPage(1); }}
                        className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                      >
                        <option value="7">Last 7 Days</option>
                        <option value="14">Last 14 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="60">Last 60 Days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Key Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Gross Sales Revenue", val: formatCurrency(metrics.grossRevenue), detail: `${formatNumber(metrics.totalOrders)} Total Orders`, color: "text-blue-600" },
                    { label: "Net Operating Profit", val: formatCurrency(metrics.netProfit), detail: `${metrics.profitMargin}% Profit Margin`, color: "text-emerald-600" },
                    { label: "Total Customer Visits", val: formatNumber(metrics.totalCustomers), detail: `₹${metrics.averageOrderValue} Avg Order Value`, color: "text-indigo-600" },
                    { label: "Total Operating Expenses", val: formatCurrency(metrics.operatingCost), detail: `${metrics.grossRevenue > 0 ? ((metrics.operatingCost / metrics.grossRevenue) * 100).toFixed(1) : 0}% Cost Ratio`, color: "text-amber-600" },
                  ].map(card => (
                    <div key={card.label} className="apple-card apple-card-hover p-5">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{card.label}</p>
                      <p className={`text-2xl font-black mt-2 tracking-tight ${card.color}`}>{card.val}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-2">{card.detail}</p>
                    </div>
                  ))}
                </div>

                {/* Revenue Trend Area Chart */}
                <div className="apple-card p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                    <div>
                      <h3 className="font-black text-[#1d1d1f] text-base">Revenue & Operating Cost Trend</h3>
                      <p className="text-xs text-slate-500">Daily financial trajectory for {selectedOutletName}</p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-bold">
                      <span className="flex items-center text-blue-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-600 mr-1.5"></span> Gross Revenue</span>
                      <span className="flex items-center text-emerald-600"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600 mr-1.5"></span> Net Profit</span>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34c759" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: "rgba(255, 255, 255, 0.9)", borderRadius: "1rem", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                        <Area type="monotone" dataKey="grossRevenue" stroke="#0071e3" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="netProfit" stroke="#34c759" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Geographic GIS Map & Multi-Outlet Compare Matrix ──────────────── */}
                <MapComponent
                  locations={mapLocations}
                  selectedLocationIds={selectedLocationIds}
                  onToggleSelectLocation={toggleSelectLocation}
                  onOpenCompare={() => setCompareModalOpen(true)}
                />

                <CompareModal
                  isOpen={compareModalOpen}
                  onClose={() => setCompareModalOpen(false)}
                  selectedLocationIds={selectedLocationIds}
                />
              </div>
            )}

            {/* ── STEP 2: DATA VALIDATION & SCHEMA AGENT ───────────────────────── */}
            {selectedStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Step 2 · Data Validation & Schema Processing</span>
                    <h2 className="text-2xl font-black text-[#1d1d1f] mt-1">Autonomous Data Cleaning & Schema Compliance</h2>
                    <p className="text-xs text-slate-600 mt-1">Validates schema compliance, converts currency formats, removes duplicate transactions, and handles null values.</p>
                  </div>
                  <button
                    onClick={() => showToast("Schema Sanitizer executed: 0 syntax anomalies found!", "success")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Run Schema Sanitizer</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Passed Records", val: `${salesRecords.length} / ${salesRecords.length}`, sub: "100% Validated", color: "text-emerald-600" },
                    { label: "Corrupted Rows Cleaned", val: "0 Rows", sub: "Auto-repaired in pipeline", color: "text-blue-600" },
                    { label: "Currency Normalization", val: "INR (₹) Standard", sub: "Cleaned ISO 4217", color: "text-indigo-600" },
                    { label: "Schema Compliance", val: "v2.4 Strict", status: "Active", color: "text-purple-600" }
                  ].map(c => (
                    <div key={c.label} className="apple-card p-5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
                      <p className={`text-2xl font-black mt-2 tracking-tight ${c.color}`}>{c.val}</p>
                      <p className="text-xs text-slate-500 mt-1">{c.sub || c.status}</p>
                    </div>
                  ))}
                </div>

                <div className="apple-card p-6">
                  <h3 className="font-extrabold text-slate-900 text-sm mb-3">Live Validation Audit Log</h3>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-between">
                      <span>[2026-08-11 10:42:01] PASS: Checked {salesRecords.length} sales records. Zero duplicate transaction IDs.</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">STATUS_OK</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-between">
                      <span>[2026-08-11 10:42:02] PASS: All outlet_id references match master relational table.</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">STATUS_OK</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: INVENTORY TELEMETRY AGENT ───────────────────────────── */}
            {selectedStep === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Step 4 · Inventory Telemetry Agent</span>
                    <h2 className="text-2xl font-black text-[#1d1d1f] mt-1">Real-Time Stock Cover & Auto-Reorder PO Engine</h2>
                    <p className="text-xs text-slate-600 mt-1">Tracks stock consumption velocity, calculates burn rates, and dispatches supplier POs.</p>
                  </div>
                  <Link
                    href="/inventory"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all shrink-0 flex items-center space-x-1.5"
                  >
                    <span>Open Full Inventory Agent View</span>
                    <Icons.ChevronRight />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="apple-card p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Deficit Items</p>
                    <p className="text-3xl font-black text-red-600 mt-2">1 Item</p>
                    <p className="text-xs text-slate-500 mt-1">Mozzarella Cheese (4.2 kg left at Hyderabad)</p>
                    <button
                      onClick={() => showToast("Dispatched PO-9921 for Mozzarella Cheese to Supplier!", "success")}
                      className="mt-3 w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-sm"
                    >
                      1-Click PO Reorder
                    </button>
                  </div>

                  <div className="apple-card p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
                    <p className="text-3xl font-black text-amber-600 mt-2">2 Items</p>
                    <p className="text-xs text-slate-500 mt-1">Espresso Coffee Beans, Chocolate Sauce</p>
                    <button
                      onClick={() => showToast("Pre-ordered Coffee Beans & Chocolate Sauce stock!", "info")}
                      className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-sm"
                    >
                      Pre-Order Batch
                    </button>
                  </div>

                  <div className="apple-card p-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Auto Reorder Rules</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2">8 / 8 SKUs</p>
                    <p className="text-xs text-slate-500 mt-1">AI agent monitors burn rates 24/7</p>
                    <Link
                      href="/inventory"
                      className="mt-3 block text-center py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-extrabold rounded-xl border border-indigo-200"
                    >
                      Manage Telemetry Rules
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 6: MARKETING & CAMPAIGN ROI AGENT ──────────────────────── */}
            {selectedStep === 6 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-pink-50/60 via-purple-50/40 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-pink-600 uppercase tracking-widest">Step 6 · Marketing & Campaign ROI Agent</span>
                    <h2 className="text-2xl font-black text-[#1d1d1f] mt-1">Campaign Performance, CAC & Stock-Aware Discounts</h2>
                    <p className="text-xs text-slate-600 mt-1">Tracks digital promotion ROI, customer acquisition cost (CAC), and allocates discounts dynamically.</p>
                  </div>
                  <button
                    onClick={() => setShowMarketingModal(true)}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Launch New Campaign</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {marketingCampaigns.map(c => (
                    <div key={c.id} className="apple-card apple-card-hover p-5">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold text-pink-600 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">{c.channel}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{c.status}</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm mt-3">{c.name}</h3>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-bold">Total Budget</p>
                          <p className="font-black text-slate-900">{formatCurrency(c.budget)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase font-bold">Revenue ROI</p>
                          <p className="font-black text-emerald-600">{c.roi}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 7: BRAND AUDIT & COMPLIANCE AGENT ───────────────────────── */}
            {selectedStep === 7 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Step 7 · Brand Audit & Compliance Agent</span>
                    <h2 className="text-2xl font-black text-[#1d1d1f] mt-1">Outlet Hygiene, Safety & SOP Compliance Scorecard</h2>
                    <p className="text-xs text-slate-600 mt-1">Analyzes store audit scores, inspects refrigeration logs, and enforces brand uniform standards.</p>
                  </div>
                  <button
                    onClick={() => setShowAuditModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Log Store Audit Inspection</span>
                  </button>
                </div>

                <div className="apple-card overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500">
                      <tr>
                        <th className="p-4">Outlet Location</th>
                        <th className="p-4">Auditor</th>
                        <th className="p-4 text-center">Hygiene</th>
                        <th className="p-4 text-center">Safety</th>
                        <th className="p-4 text-center">Uniform SOP</th>
                        <th className="p-4 text-center">Total Score</th>
                        <th className="p-4">Compliance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {storeAudits.map(audit => (
                        <tr key={audit.id} className="hover:bg-slate-50">
                          <td className="p-4 font-extrabold text-slate-900">{audit.outletName}</td>
                          <td className="p-4 text-slate-600">{audit.auditor}</td>
                          <td className="p-4 text-center font-bold text-emerald-600">{audit.hygieneScore}%</td>
                          <td className="p-4 text-center font-bold text-blue-600">{audit.safetyScore}%</td>
                          <td className="p-4 text-center font-bold text-purple-600">{audit.uniformSopScore}%</td>
                          <td className="p-4 text-center font-black text-slate-900 text-sm">{audit.totalScore}%</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              audit.totalScore >= 90 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {audit.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STEP 8: FRANCHISE INTELLIGENCE ENGINE ───────────────────────── */}
            {selectedStep === 8 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Step 8 · Central Franchise Intelligence Engine</span>
                    <h2 className="text-2xl font-black mt-1">Multi-Domain Agent Correlation Matrix</h2>
                    <p className="text-xs text-indigo-200 mt-1">Fuses sales telemetry, marketing spend, staff attendance, and inventory depletion into centralized AI insights.</p>
                  </div>
                  <button
                    onClick={() => showToast("AI Correlation Engine recalculated across 5 outlets!", "success")}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shrink-0"
                  >
                    Recalculate Correlations
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="apple-card p-5 border-l-4 border-l-emerald-500">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Marketing vs Footfall Correlation</h4>
                    <p className="text-2xl font-black text-emerald-600 mt-2">+0.88 Strong Pos</p>
                    <p className="text-xs text-slate-500 mt-1">Zomato Monsoon promo directly drove +430 customer visits in Bengaluru & Hyderabad.</p>
                  </div>

                  <div className="apple-card p-5 border-l-4 border-l-amber-500">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Staff Delays vs Order Rush Bottleneck</h4>
                    <p className="text-2xl font-black text-amber-600 mt-2">-0.64 Inverse Impact</p>
                    <p className="text-xs text-slate-500 mt-1">Late clock-ins at Chennai Marina increased peak customer wait times by 4.5 minutes.</p>
                  </div>

                  <div className="apple-card p-5 border-l-4 border-l-purple-500">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Stockout Variance vs Sales Margin</h4>
                    <p className="text-2xl font-black text-purple-600 mt-2">Zero Stockout Loss</p>
                    <p className="text-xs text-slate-500 mt-1">Autonomous PO agent prevented projected ₹18,000 lost revenue from coffee bean depletion.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 9: BUSINESS STRATEGY RECOMMENDATIONS ENGINE ───────────── */}
            {selectedStep === 9 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-emerald-50/60 via-indigo-50/40 to-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Step 9 · Business Strategy Recommendations Engine</span>
                    <h2 className="text-2xl font-black text-[#1d1d1f] mt-1">Actionable Operational Strategies & ROI Optimizer</h2>
                    <p className="text-xs text-slate-600 mt-1">AI-generated recommendations to boost sales, reduce labor waste, and prevent inventory deficits.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {strategyRecommendations.map(rec => (
                    <div key={rec.id} className="apple-card apple-card-hover p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">{rec.category}</span>
                          <span className="text-[10px] font-bold text-slate-500">{rec.outlet}</span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{rec.title}</h3>
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{rec.desc}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400">Projected Impact</p>
                          <p className="font-black text-emerald-600 text-sm">{rec.impact}</p>
                        </div>

                        {rec.applied ? (
                          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl">
                            ✓ Strategy Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyRecommendation(rec.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
                          >
                            Apply Recommendation
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 10: DASHBOARD & REAL-TIME ALERTS COMMAND CENTER ────────── */}
            {selectedStep === 10 && (
              <div className="space-y-6 animate-fade-in">
                <div className="apple-card p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Step 10 · Executive Dashboard & Anomaly Alerts</span>
                    <h2 className="text-2xl font-black mt-1">Real-Time Operational Anomaly Alert Center</h2>
                    <p className="text-xs text-indigo-200 mt-1">Monitors critical anomalies across inventory, labor clock-ins, and outlet revenue benchmarks.</p>
                  </div>
                  <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
                    ● Telemetry Stream 100% Operational
                  </span>
                </div>

                <div className="space-y-3">
                  {systemAlerts.map(a => (
                    <div
                      key={a.id}
                      className={`apple-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        a.resolved ? "opacity-60 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className={`h-3 w-3 rounded-full mt-1 shrink-0 ${
                          a.level === "critical" ? "bg-red-500 animate-ping" : a.level === "warning" ? "bg-amber-500" : "bg-blue-500"
                        }`}></span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-extrabold text-slate-900 text-sm">{a.title}</h4>
                            <span className="text-[10px] font-bold text-slate-500">({a.outlet})</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{a.desc}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {a.resolved ? (
                          <span className="text-xs font-extrabold text-slate-500 bg-slate-200 px-3 py-1 rounded-xl">Resolved</span>
                        ) : (
                          <button
                            onClick={() => handleResolveAlert(a.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all"
                          >
                            Resolve Alert
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 apple-glass border-t border-slate-200/80 py-3.5 px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-medium">
            <span>© 2026 FranchiseOps AI Inc. Designed with Apple-grade precision.</span>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Support Center</a>
            </div>
          </div>
        </footer>

      </div>

      {/* ── WORKER PROFILE & ATTENDANCE DETAIL MODAL ─────────────────────────── */}
      {selectedWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5 mb-6">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedWorkerModal.avatar}
                  alt={selectedWorkerModal.name}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-indigo-200 shadow-md shrink-0"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-black text-slate-900">{selectedWorkerModal.name}</h3>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                      {selectedWorkerModal.employeeId}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{selectedWorkerModal.role} · <span className="text-slate-800 font-bold">{selectedWorkerModal.outletName}</span></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWorkerModal(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Worker Contact & Timings Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Phone Number</p>
                <p className="text-xs font-bold text-slate-900 mt-1">{selectedWorkerModal.phone}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Email Address</p>
                <p className="text-xs font-bold text-slate-900 mt-1 truncate">{selectedWorkerModal.email}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Today Working Shift</p>
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  Start: {selectedWorkerModal.clockIn} | End: {selectedWorkerModal.clockOut}
                </p>
              </div>
            </div>

            {/* Salary Breakdown (Base, Bonus, Salary Cut with Reason) */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 mb-6 shadow-md">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 mb-3">Monthly Salary & Compensation Structure</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Base Salary</p>
                  <p className="text-lg font-black mt-0.5">{formatCurrency(selectedWorkerModal.baseSalary)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Performance Bonus</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">+{formatCurrency(selectedWorkerModal.bonus)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Salary Cut (Deductions)</p>
                  <p className="text-lg font-black text-red-400 mt-0.5">
                    {selectedWorkerModal.salaryCut > 0 ? `-${formatCurrency(selectedWorkerModal.salaryCut)}` : "₹0"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Net Take-Home Pay</p>
                  <p className="text-lg font-black text-indigo-300 mt-0.5">
                    {formatCurrency(selectedWorkerModal.baseSalary + selectedWorkerModal.bonus - selectedWorkerModal.salaryCut)}
                  </p>
                </div>
              </div>

              {/* Salary Cut Reason Notice */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-start space-x-2 text-xs">
                <span className="font-extrabold text-amber-400 shrink-0">Salary Cut Reason:</span>
                <span className="text-slate-300 italic">{selectedWorkerModal.salaryCutReason}</span>
              </div>
            </div>

            {/* Previous Attendance Log Table */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                Complete Attendance History & Daily Punch Log
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Assigned Shift</th>
                      <th className="px-4 py-3 text-center">Clock In</th>
                      <th className="px-4 py-3 text-center">Clock Out</th>
                      <th className="px-4 py-3 text-right">Total Hours</th>
                      <th className="px-4 py-3">Attendance Status</th>
                      <th className="px-4 py-3 text-right">Deduction / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {selectedWorkerModal.attendanceHistory.map((att, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{att.date}</td>
                        <td className="px-4 py-3 text-slate-600">{att.shift}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50 rounded-lg">{att.clockIn}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 bg-slate-100/50 rounded-lg">{att.clockOut}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{att.totalHours > 0 ? `${att.totalHours} hrs` : "--"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            att.status === "Present" ? "bg-emerald-100 text-emerald-800" : att.status === "Late" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                          }`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {att.deduction > 0 ? (
                            <div>
                              <span className="font-extrabold text-red-600">-{formatCurrency(att.deduction)}</span>
                              {att.deductionReason && <p className="text-[10px] text-slate-500 italic mt-0.5">{att.deductionReason}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedWorkerModal(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all"
              >
                Close Worker Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBAL TOAST NOTIFICATION ─────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center space-x-2.5 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-700/80 text-emerald-200"
                : toast.type === "warning"
                ? "bg-amber-950/90 border-amber-700/80 text-amber-200"
                : "bg-indigo-950/90 border-indigo-700/80 text-indigo-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current animate-ping"></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── MODAL 1: CSV PAYLOAD UPLOAD ────────────────────────────────────── */}
      {showCsvUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Upload Sales CSV Payload</h3>
                <p className="text-xs text-slate-500">Paste raw CSV logs or import sales telemetry records</p>
              </div>
              <button onClick={() => setShowCsvUploadModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCsvUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">CSV Format (Outlet, Date, Revenue, Cost, Orders, Customers)</label>
                <textarea
                  rows={5}
                  value={csvRawInput}
                  onChange={e => setCsvRawInput(e.target.value)}
                  placeholder={`Outlet,Date,Revenue,Cost,Orders,Customers\nBengaluru Central,2026-08-01,48000,26000,230,260\nHyderabad Tech Park,2026-08-01,52000,28000,240,280`}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCsvUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Ingest CSV Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RECORD DAILY SALES ENTRY ─────────────────────────────── */}
      {showRecordSalesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Record Daily Sales Entry</h3>
                <p className="text-xs text-slate-500">Manual POS entry for outlet operations</p>
              </div>
              <button onClick={() => setShowRecordSalesModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSalesSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Outlet Location</label>
                <select
                  value={newSalesForm.outletId}
                  onChange={e => setNewSalesForm({ ...newSalesForm, outletId: e.target.value })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">FranchiseOps - Bengaluru Central</option>
                  <option value="2">FranchiseOps - Hyderabad Tech Park</option>
                  <option value="3">FranchiseOps - Chennai Marina</option>
                  <option value="4">FranchiseOps - Mumbai Andheri</option>
                  <option value="5">FranchiseOps - Pune Hinjawadi</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sale Date</label>
                  <input
                    type="date"
                    value={newSalesForm.saleDate}
                    onChange={e => setNewSalesForm({ ...newSalesForm, saleDate: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Orders</label>
                  <input
                    type="number"
                    value={newSalesForm.totalOrders}
                    onChange={e => setNewSalesForm({ ...newSalesForm, totalOrders: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gross Revenue (₹)</label>
                  <input
                    type="number"
                    value={newSalesForm.grossRevenue}
                    onChange={e => setNewSalesForm({ ...newSalesForm, grossRevenue: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operating Cost (₹)</label>
                  <input
                    type="number"
                    value={newSalesForm.operatingCost}
                    onChange={e => setNewSalesForm({ ...newSalesForm, operatingCost: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordSalesModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Save Sales Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: WORKER PUNCH CLOCK IN / OUT ───────────────────────────── */}
      {showClockInModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Punch Clock In / Out</h3>
                <p className="text-xs text-slate-500">Record staff shift attendance & salary deductions</p>
              </div>
              <button onClick={() => setShowClockInModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleClockInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Staff Worker</label>
                <select
                  value={clockInForm.workerId}
                  onChange={e => setClockInForm({ ...clockInForm, workerId: parseInt(e.target.value, 10) })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.role} - {w.outletName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clock In Time</label>
                  <input
                    type="text"
                    value={clockInForm.clockIn}
                    onChange={e => setClockInForm({ ...clockInForm, clockIn: e.target.value })}
                    placeholder="08:45 AM"
                    className="w-full text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clock Out Time</label>
                  <input
                    type="text"
                    value={clockInForm.clockOut}
                    onChange={e => setClockInForm({ ...clockInForm, clockOut: e.target.value })}
                    placeholder="05:30 PM"
                    className="w-full text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Status</label>
                <select
                  value={clockInForm.status}
                  onChange={e => setClockInForm({ ...clockInForm, status: e.target.value as any })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Present">Present (On Time)</option>
                  <option value="Late">Late Clock-In</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              {clockInForm.status === "Late" || clockInForm.status === "Half Day" || clockInForm.status === "Absent" ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div>
                    <label className="block text-[11px] font-extrabold text-red-800">Deduction Amount (₹)</label>
                    <input
                      type="number"
                      value={clockInForm.deduction}
                      onChange={e => setClockInForm({ ...clockInForm, deduction: e.target.value })}
                      placeholder="500"
                      className="w-full text-xs font-bold bg-white border border-red-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-red-800">Reason for Salary Cut</label>
                    <input
                      type="text"
                      value={clockInForm.deductionReason}
                      onChange={e => setClockInForm({ ...clockInForm, deductionReason: e.target.value })}
                      placeholder="Traffic delay > 45 mins"
                      className="w-full text-xs bg-white border border-red-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClockInModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Submit Shift Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: REGISTER NEW WORKER ───────────────────────────────────── */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Register New Staff Worker</h3>
                <p className="text-xs text-slate-500">Add barista, store lead, or cashier to payroll</p>
              </div>
              <button onClick={() => setShowAddWorkerModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Worker Name *</label>
                  <input
                    type="text"
                    value={newWorkerForm.name}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
                    placeholder="e.g. Vikram Sharma"
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role / Designation</label>
                  <input
                    type="text"
                    value={newWorkerForm.role}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, role: e.target.value })}
                    placeholder="Head Barista"
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Outlet Location</label>
                  <select
                    value={newWorkerForm.outletName}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, outletName: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Bengaluru Central">Bengaluru Central</option>
                    <option value="Hyderabad Tech Park">Hyderabad Tech Park</option>
                    <option value="Chennai Marina">Chennai Marina</option>
                    <option value="Mumbai Andheri">Mumbai Andheri</option>
                    <option value="Pune Hinjawadi">Pune Hinjawadi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newWorkerForm.phone}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, phone: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={newWorkerForm.baseSalary}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, baseSalary: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Bonus (₹)</label>
                  <input
                    type="number"
                    value={newWorkerForm.bonus}
                    onChange={e => setNewWorkerForm({ ...newWorkerForm, bonus: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: LAUNCH MARKETING CAMPAIGN ────────────────────────────── */}
      {showMarketingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Launch Marketing Campaign</h3>
                <p className="text-xs text-slate-500">Set campaign parameters & allocated budget</p>
              </div>
              <button onClick={() => setShowMarketingModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleLaunchCampaignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={newMarketingForm.name}
                  onChange={e => setNewMarketingForm({ ...newMarketingForm, name: e.target.value })}
                  placeholder="e.g. Festival Season Combo Pack"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Channel / Platform</label>
                <select
                  value={newMarketingForm.channel}
                  onChange={e => setNewMarketingForm({ ...newMarketingForm, channel: e.target.value })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Google Local Ads">Google Local Ads</option>
                  <option value="Zomato & Swiggy Promo">Zomato & Swiggy Promo</option>
                  <option value="In-Store QR Code">In-Store QR Code</option>
                  <option value="Instagram Geofence">Instagram Geofence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Allocated Budget (₹)</label>
                <input
                  type="number"
                  value={newMarketingForm.budget}
                  onChange={e => setNewMarketingForm({ ...newMarketingForm, budget: e.target.value })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMarketingModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: LOG STORE AUDIT ───────────────────────────────────────── */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Log Store Audit Inspection</h3>
                <p className="text-xs text-slate-500">Record hygiene, safety & SOP compliance</p>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-800 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleLogAuditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Outlet Location</label>
                <select
                  value={newAuditForm.outletName}
                  onChange={e => setNewAuditForm({ ...newAuditForm, outletName: e.target.value })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Bengaluru Central">Bengaluru Central</option>
                  <option value="Hyderabad Tech Park">Hyderabad Tech Park</option>
                  <option value="Chennai Marina">Chennai Marina</option>
                  <option value="Mumbai Andheri">Mumbai Andheri</option>
                  <option value="Pune Hinjawadi">Pune Hinjawadi</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Hygiene %</label>
                  <input
                    type="number"
                    value={newAuditForm.hygieneScore}
                    onChange={e => setNewAuditForm({ ...newAuditForm, hygieneScore: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Safety %</label>
                  <input
                    type="number"
                    value={newAuditForm.safetyScore}
                    onChange={e => setNewAuditForm({ ...newAuditForm, safetyScore: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Uniform %</label>
                  <input
                    type="number"
                    value={newAuditForm.uniformSopScore}
                    onChange={e => setNewAuditForm({ ...newAuditForm, uniformSopScore: e.target.value })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Notes & Findings</label>
                <input
                  type="text"
                  value={newAuditForm.notes}
                  onChange={e => setNewAuditForm({ ...newAuditForm, notes: e.target.value })}
                  placeholder="Refrigeration logs clean. Uniform compliant."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                >
                  Save Audit Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SPOTLIGHT COMMAND PALETTE MODAL (⌘K) ─────────────────────────── */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-20 p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-4 w-full max-w-2xl shadow-2xl animate-fade-in text-white">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3 mb-3 px-2">
              <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={commandPaletteQuery}
                onChange={e => setCommandPaletteQuery(e.target.value)}
                placeholder="Type a step name, worker, action, or command (e.g. 'sales', 'payroll', 'export')..."
                className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
              />
              <kbd className="bg-slate-800 text-slate-400 text-[10px] font-mono px-2 py-1 rounded border border-slate-700">ESC</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 px-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2">Matching Workflow Modules</p>
              {WORKFLOW_STEPS.filter(s => commandPaletteQuery.trim() === "" || s.name.toLowerCase().includes(commandPaletteQuery.toLowerCase()) || s.desc.toLowerCase().includes(commandPaletteQuery.toLowerCase())).map(step => (
                <button
                  key={step.id}
                  onClick={() => {
                    setSelectedStep(step.id);
                    setCommandPaletteOpen(false);
                    showToast(`Navigated to Step ${step.id}: ${step.name}`, "info");
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 hover:bg-indigo-600/80 transition-all border border-slate-800 text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="h-7 w-7 rounded-xl bg-slate-800 group-hover:bg-white/20 flex items-center justify-center font-extrabold text-xs text-indigo-300 group-hover:text-white">
                      {step.id}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-100 group-hover:text-white">{step.name}</p>
                      <p className="text-[10px] text-slate-400 group-hover:text-indigo-100 truncate max-w-md">{step.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-white">Jump →</span>
                </button>
              ))}

              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 px-2 pt-2">Quick System Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { exportSalesToCsv(); setCommandPaletteOpen(false); }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-left text-xs font-bold transition-all border border-slate-700"
                >
                  📥 Export Sales CSV
                </button>
                <button
                  onClick={() => { setShowRecordSalesModal(true); setCommandPaletteOpen(false); }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-left text-xs font-bold transition-all border border-slate-700"
                >
                  📊 Record Sales Entry
                </button>
                <button
                  onClick={() => { setShowClockInModal(true); setCommandPaletteOpen(false); }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-left text-xs font-bold transition-all border border-slate-700"
                >
                  ⏱️ Punch Clock In/Out
                </button>
                <button
                  onClick={() => { setShowAddWorkerModal(true); setCommandPaletteOpen(false); }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-left text-xs font-bold transition-all border border-slate-700"
                >
                  👤 Register New Worker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
