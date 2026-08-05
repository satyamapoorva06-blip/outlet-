"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import api from "./lib/api";
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
  Legend,
  LineChart,
  Line
} from "recharts";
import { useAuth } from "./context/AuthContext";

const MapComponent = dynamic(() => import("./components/MapComponent"), { ssr: false });
const CompareModal = dynamic(() => import("./components/CompareModal"), { ssr: false });
const AuthModal = dynamic(() => import("./components/AuthModal"), { ssr: false });

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Workflow: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Trend: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Database: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Location: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
  Brain: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Sparkle: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  TrendUp: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
    </svg>
  ),
  TrendDown: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
    </svg>
  ),
  Stable: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
    </svg>
  ),
  Inventory: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Staff: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Marketing: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  Audit: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Intelligence: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Recommend: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 003.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const WORKFLOW_STEPS = [
  { id: 1,  name: "Franchise Data",           icon: "Database",      category: "input",  desc: "Aggregates sales logs, inventory status, staff shifts, marketing spends, and store audit logs.", active: false },
  { id: 2,  name: "Data Validation",          icon: "Check",         category: "process",desc: "Validates schema compliance, handles missing values, cleans transaction records, and processes inputs.", active: false },
  { id: 3,  name: "Outlet Performance Agent", icon: "Trend",         category: "agent",  desc: "Monitors sales, health scores, map location comparisons, and identifies underperforming stores.", active: true },
  { id: 4,  name: "Inventory Agent",          icon: "Inventory",     category: "agent",  desc: "Tracks stock levels, calculates depletion rates, predicts stockouts, and automates replenishment.", active: false },
  { id: 5,  name: "Staff Agent",              icon: "Staff",         category: "agent",  desc: "Analyzes staff efficiency, generates automated shifts, and optimizes staffing against sales trends.", active: false },
  { id: 6,  name: "Marketing Agent",          icon: "Marketing",     category: "agent",  desc: "Computes campaign ROI, tracks promotion conversions, and optimizes discount allocations.", active: false },
  { id: 7,  name: "Audit Agent",              icon: "Audit",         category: "agent",  desc: "Validates compliance with brand guidelines, analyzes safety audits, and flags non-compliance.", active: false },
  { id: 8,  name: "Franchise Intelligence",   icon: "Intelligence",  category: "engine", desc: "Fuses domain-specific insights into a centralized reasoning engine to find correlations.", active: false },
  { id: 9,  name: "Business Recommendations", icon: "Recommend",     category: "engine", desc: "Generates actionable strategy recommendations for managers to reduce costs and boost sales.", active: false },
  { id: 10, name: "Dashboard & Alerts",       icon: "Dashboard",     category: "output", desc: "Serves high-level summaries for the franchisor and triggers real-time alerts for critical anomalies.", active: false },
];

// marketing slides replaced by tabbed marketingSubTab for a staff-like layout

// Base URL is configured in lib/api.ts

interface AiInsight {
  title: string;
  value: string;
  subtext: string;
  tag: string;
  tagColor: string;
  icon: "TrendUp" | "TrendDown" | "Stable" | "Warning" | "Sparkle";
}

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

function computeAiInsights(
  trendsData: any[],
  salesRecords: any[],
  outletName: string
): AiInsight[] {
  if (trendsData.length < 3) return [];

  const revenues = trendsData.map((d: any) => d.grossRevenue as number);
  const insights: AiInsight[] = [];
  const n = revenues.length;

  const revenueSlope = computeLinearRegressionSlope(revenues);
  const slopePercent = revenues[0] > 0 ? (revenueSlope / revenues[0]) * 100 : 0;
  const momentumLabel =
    slopePercent >  1.5 ? "Strong Uptrend"  :
    slopePercent > -1.5 ? "Stable Trend"    : "Declining Trend";
  const momentumIcon: AiInsight["icon"] =
    slopePercent >  1.5 ? "TrendUp"  :
    slopePercent > -1.5 ? "Stable"   : "TrendDown";
  const momentumColor =
    slopePercent >  1.5 ? "bg-emerald-100 text-emerald-700" :
    slopePercent > -1.5 ? "bg-blue-100 text-blue-700"       : "bg-red-100 text-red-700";

  insights.push({
    title:    "Revenue Momentum",
    value:    `${slopePercent >= 0 ? "+" : ""}${slopePercent.toFixed(2)}% / day`,
    subtext:  `Linear regression slope β₁ = ₹${revenueSlope.toFixed(0)}/day across ${n} days. ${momentumLabel} detected for ${outletName}.`,
    tag:      momentumLabel,
    tagColor: momentumColor,
    icon:     momentumIcon,
  });

  const revCV = computeCV(revenues);
  const stabilityLabel = revCV < 15 ? "Low Volatility" : revCV < 30 ? "Moderate Fluctuation" : "High Variance";
  const stabilityColor = revCV < 15 ? "bg-emerald-100 text-emerald-700" : revCV < 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  insights.push({
    title:    "Sales Stability (CV)",
    value:    `${revCV.toFixed(1)}% CV`,
    subtext:  `Coefficient of variation σ/μ = ${revCV.toFixed(1)}%. Lower score indicates predictable store demand pattern.`,
    tag:      stabilityLabel,
    tagColor: stabilityColor,
    icon:     revCV < 15 ? "Sparkle" : "Warning",
  });

  const half = Math.floor(n / 2);
  const h1Rev = revenues.slice(0, half).reduce((a, b) => a + b, 0);
  const h2Rev = revenues.slice(half).reduce((a, b) => a + b, 0);
  const momGrowth = h1Rev > 0 ? ((h2Rev - h1Rev) / h1Rev) * 100 : 0;
  insights.push({
    title:    "Period Growth (H2 vs H1)",
    value:    `${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%`,
    subtext:  `Total revenue in second half of window vs first half. ${momGrowth >= 0 ? "Expansion" : "Contraction"} phase.`,
    tag:      momGrowth >= 0 ? "Positive Growth" : "Revenue Drop",
    tagColor: momGrowth >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
    icon:     momGrowth >= 0 ? "TrendUp" : "TrendDown",
  });

  return insights;
}

export default function OperationsDashboard() {
  const [activeStepId, setActiveStepId] = useState<number>(3);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Sub-Feature Section Button Tabs (Prevents Page Overflow & Overflowing Scrolls!)
  const [performanceSubTab, setPerformanceSubTab] = useState<"overview" | "map" | "health" | "underperforming" | "logs">("overview");
  const [inventorySubTab, setInventorySubTab] = useState<"roster" | "ai" | "reorders">("roster");
  const [staffSubTab, setStaffSubTab] = useState<"roster" | "ai" | "shifts" | "performers" | "underperformers" | "allocate">("roster");

  // Data States
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);
  const [mapLocations, setMapLocations] = useState<any[]>([]);
  const [healthScores, setHealthScores] = useState<any[]>([]);
  const [underperformingStores, setUnderperformingStores] = useState<any[]>([]);

  // Marketing Campaign Analytics
  const [marketingCampaigns, setMarketingCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [marketingMetrics, setMarketingMetrics] = useState<any>(null);
  const [marketingRecommendations, setMarketingRecommendations] = useState<string[]>([]);
  const [marketingError, setMarketingError] = useState<string | null>(null);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingSubTab, setMarketingSubTab] = useState<'summary'|'roi'|'channels'|'social'|'ai'|'budget'|'signals'|'actions'>('summary');
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("weekly");
  const [scheduleNextRun, setScheduleNextRun] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [socialConnections, setSocialConnections] = useState<any[]>([]);
  const [socialDraft, setSocialDraft] = useState<string>("");
  const [socialChannels, setSocialChannels] = useState<string[]>([]);
  const [socialSchedule, setSocialSchedule] = useState<string>("");
  const [socialMessage, setSocialMessage] = useState<string | null>(null);
  const [socialSaving, setSocialSaving] = useState(false);
  const [optimizationChannels, setOptimizationChannels] = useState<string[]>([]);
  const [channelBudgets, setChannelBudgets] = useState<Record<string, number>>({});
  const [channelToAdd, setChannelToAdd] = useState("youtube");
  const [predictionChannel, setPredictionChannel] = useState("Social Media");
  const [predictionBudget, setPredictionBudget] = useState("25000");
  const [campaignPrediction, setCampaignPrediction] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  // Page Segmentation / Pagination State for Sales Records Table
  const [salesPage, setSalesPage] = useState<number>(1);
  const [salesPageSize, setSalesPageSize] = useState<number>(10);
  const [totalSalesRecords, setTotalSalesRecords] = useState<number>(0);

  // Stock Inventory State & Pagination
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryInsights, setInventoryInsights] = useState<any>(null);
  const [invPage, setInvPage] = useState<number>(1);
  const [invPageSize, setInvPageSize] = useState<number>(8);

  // Staff Agent State & Pagination
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [staffInsights, setStaffInsights] = useState<any>(null);
  const [staffPerformers, setStaffPerformers] = useState<any>(null);
  const [staffPage, setStaffPage] = useState<number>(1);
  const [staffPageSize, setStaffPageSize] = useState<number>(8);

  // Job Allocation State
  const [allocatingStaffId, setAllocatingStaffId] = useState<number | null>(null);
  const [allocatingJob, setAllocatingJob] = useState<string>("");
  const [allocatingShift, setAllocatingShift] = useState<string>("");
  const [allocatingLoginTime, setAllocatingLoginTime] = useState<string>("");
  const [allocatingLogoffTime, setAllocatingLogoffTime] = useState<string>("");
  const [allocationSuccess, setAllocationSuccess] = useState<string | null>(null);

  // UI / Modal States
  const [loading, setLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>([]);

  // ── Auth: use global context, redirect if not authenticated ──
  const { currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace("/login");
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    api
      .get("/outlets")
      .then((res) => {
        setOutlets(res.data);
        if (res.data.length >= 2) {
          setSelectedLocationIds([res.data[0].id, res.data[1].id]);
        }
      })
      .catch((err) => console.error("Error loading outlets:", err));
  }, []);

  useEffect(() => {
    if (activeStepId === 3) {
      setLoading(true);
      const params = {
        outletId: selectedOutlet,
        startDate,
        endDate,
        limit: salesPageSize,
        offset: (salesPage - 1) * salesPageSize
      };

      Promise.all([
        api.get("/sales/summary", { params: { outletId: selectedOutlet, startDate, endDate } }),
        api.get("/sales/trends", { params: { outletId: selectedOutlet, startDate, endDate } }),
        api.get("/sales/list", { params })
      ])
        .then(([sumRes, trendRes, listRes]) => {
          setSummary(sumRes.data);
          setTrends(trendRes.data);
          setSalesList(listRes.data.records);
          setTotalSalesRecords(listRes.data.pagination.total);
        })
        .catch((err) => console.error("Error fetching performance agent data:", err))
        .finally(() => setLoading(false));
    }
  }, [activeStepId, selectedOutlet, startDate, endDate, salesPage, salesPageSize]);

  // Load the expensive analytics only when their tab is opened.
  useEffect(() => {
    if (activeStepId === 3 && performanceSubTab === "map") {
      api.get("/outlets/locations")
        .then((res) => setMapLocations(res.data))
        .catch((err) => console.error("Error fetching outlet map data:", err));
    }
  }, [activeStepId, performanceSubTab]);

  useEffect(() => {
    if (activeStepId === 3 && performanceSubTab === "health") {
      api.get("/outlets/health-scores")
        .then((res) => setHealthScores(res.data))
        .catch((err) => console.error("Error fetching health scores:", err));
    }
  }, [activeStepId, performanceSubTab]);

  useEffect(() => {
    if (activeStepId === 3 && performanceSubTab === "underperforming") {
      api.get("/outlets/underperforming")
        .then((res) => setUnderperformingStores(res.data))
        .catch((err) => console.error("Error fetching underperforming outlets:", err));
    }
  }, [activeStepId, performanceSubTab]);

  useEffect(() => {
    if (activeStepId === 4) {
      setLoading(true);
      const params = { outletId: selectedOutlet };

      Promise.all([
        api.get("/inventory", { params }),
        api.get("/inventory/agent-insights", { params })
      ])
        .then(([invRes, insightRes]) => {
          setInventoryItems(invRes.data);
          setInventoryInsights(insightRes.data);
        })
        .catch((err) => console.error("Error fetching inventory data:", err))
        .finally(() => setLoading(false));
    }
  }, [activeStepId, selectedOutlet]);

  useEffect(() => {
    if (activeStepId === 5) {
      setLoading(true);
      const params = { outletId: selectedOutlet };

      Promise.all([
        api.get("/staff", { params }),
        api.get("/staff/agent-insights", { params }),
        api.get("/staff/performers", { params })
      ])
        .then(([staffRes, insightRes, performersRes]) => {
          setStaffMembers(staffRes.data);
          setStaffInsights(insightRes.data);
          setStaffPerformers(performersRes.data);
        })
        .catch((err) => console.error("Error fetching staff data:", err))
        .finally(() => setLoading(false));
    }
  }, [activeStepId, selectedOutlet]);

  const handleAllocateJob = async (staffId: number) => {
    if (!allocatingJob) return;
    try {
      await api.put(`/staff/${staffId}/allocate-job`, {
        assignedJob: allocatingJob,
        shiftType: allocatingShift || undefined,
        loginTime: allocatingLoginTime || undefined,
        logoffTime: allocatingLogoffTime || undefined
      });
      setAllocationSuccess(`Job successfully allocated!`);
      setAllocatingStaffId(null);
      setAllocatingJob("");
      setAllocatingShift("");
      setAllocatingLoginTime("");
      setAllocatingLogoffTime("");
      // Refresh staff data
      const params = { outletId: selectedOutlet };
      const [staffRes, performersRes] = await Promise.all([
        api.get("/staff", { params }),
        api.get("/staff/performers", { params })
      ]);
      setStaffMembers(staffRes.data);
      setStaffPerformers(performersRes.data);
      setTimeout(() => setAllocationSuccess(null), 3000);
    } catch (err) {
      console.error("Error allocating job:", err);
    }
  };

  useEffect(() => {
    if (activeStepId === 6) {
      setMarketingLoading(true);
      setMarketingError(null);
      setMarketingSubTab('summary');
      api
        .get("/marketing/campaigns")
        .then((res) => {
          setMarketingCampaigns(res.data);
          if (res.data.length > 0) {
            setSelectedCampaignId(String(res.data[0].id));
          }
        })
        .catch((err) => {
          console.error("Error loading marketing campaigns:", err);
          setMarketingError("Unable to load campaign data. Please try again later.");
        })
        .finally(() => setMarketingLoading(false));
    }
  }, [activeStepId]);

  useEffect(() => {
    const campaignId = selectedCampaignId;
    if (activeStepId !== 6 || !campaignId) {
      return;
    }

    setMarketingLoading(true);
    setMarketingError(null);

    Promise.allSettled([
      api.get("/marketing/roi", { params: { campaignId } }),
      api.get("/marketing/recommendations", { params: { campaignId } }),
      api.get("/marketing/social-connections")
    ])
      .then(([roiResult, recResult, socialResult]) => {
        if (roiResult.status === "fulfilled") {
          setMarketingMetrics(roiResult.value.data);
        } else {
          // Older API deployments return campaign ROI data as part of the
          // campaigns response instead of exposing the dedicated ROI route.
          // Keep the dashboard usable while those deployments are upgraded.
          const campaign = marketingCampaigns.find((item) => String(item.id) === campaignId);
          const report = campaign?.roi_reports?.[0];
          const cost = Number(campaign?.cost ?? campaign?.budget ?? report?.total_spend ?? 0);
          const revenueDuring = Number(report?.attributed_revenue ?? 0);
          const incrementalRevenue = Number(report?.net_roi ?? (revenueDuring - cost));
          const roi = cost > 0 ? incrementalRevenue / cost : null;
          const channel = campaign?.channel;

          setMarketingMetrics({
            campaignId: campaign?.id ?? campaignId,
            name: campaign?.name ?? "Campaign",
            period: {
              start: campaign?.startDate ?? campaign?.start_date ?? "N/A",
              end: campaign?.endDate ?? campaign?.end_date ?? "N/A"
            },
            revenueDuring,
            revenueBefore: 0,
            incrementalRevenue,
            cost,
            roi,
            upliftPercent: null,
            channels: channel ? [channel] : [],
            channelInsights: []
          });
        }

        if (recResult.status === "fulfilled") {
          setMarketingRecommendations(recResult.value.data.recommendations || []);
        } else {
          setMarketingRecommendations([
            "Review campaign performance by audience segment before changing spend.",
            "Test new creative variations and compare conversion results.",
            "Monitor campaign cost and attributed revenue each reporting period."
          ]);
        }

        if (socialResult.status === "fulfilled") {
          const connections = socialResult.value.data || [];
          setSocialConnections(connections);
          setSocialChannels(connections.filter((item: any) => item.connected).slice(0, 2).map((item: any) => item.id));
        } else {
          setSocialConnections([]);
          setSocialChannels([]);
        }
      })
      .catch((err) => {
        console.error("Error loading marketing analytics:", err);
        setMarketingError("Unable to compute campaign ROI and recommendations at this time.");
      })
      .finally(() => setMarketingLoading(false));
  }, [activeStepId, selectedCampaignId]);

  useEffect(() => {
    if (!marketingMetrics) return;
    const channels = marketingMetrics.channels || [];
    setOptimizationChannels(channels);
    setChannelBudgets(Object.fromEntries(channels.map((channel: string) => [channel, Math.round(100 / Math.max(1, channels.length))])));
  }, [marketingMetrics?.campaignId]);

  const activeOutletName = useMemo(() => {
    if (selectedOutlet === "all") return "All Outlets";
    const found = outlets.find((o) => o.id === parseInt(selectedOutlet, 10));
    return found ? `${found.city} (${found.outlet_name})` : "Selected Outlet";
  }, [selectedOutlet, outlets]);

  const handleExportReport = async () => {
    if (!selectedCampaignId) return;
    try {
      const response = await api.get("/marketing/download", {
        params: { campaignId: selectedCampaignId },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `campaign-${selectedCampaignId}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting campaign report:", err);
      setMarketingError("Unable to export the campaign report right now.");
    }
  };

  const handleScheduleReport = async () => {
    if (!selectedCampaignId) return;
    try {
      const res = await api.post("/marketing/schedules", {
        campaignId: Number(selectedCampaignId),
        frequency: scheduleFrequency,
        nextRun: scheduleNextRun
      });
      setScheduleMessage(`Scheduled campaign report: ${res.data.frequency} from ${res.data.nextRun}`);
    } catch (err) {
      console.error("Error scheduling campaign report:", err);
      setScheduleMessage("Unable to schedule report. Please try again.");
    }
  };

  const handleSocialConnection = async (id: string, connected: boolean) => {
    try {
      const res = await api.put(`/marketing/social-connections/${id}`, { connected });
      setSocialConnections((previous) => previous.map((item) => item.id === id ? res.data : item));
      setSocialChannels((previous) => connected ? [...new Set([...previous, id])] : previous.filter((channel) => channel !== id));
      setSocialMessage(`${res.data.name} ${connected ? "connected" : "disconnected"}.`);
    } catch (err) { setSocialMessage("Could not update this social connection."); }
  };

  const handleSocialPost = async () => {
    if (!socialDraft.trim() || socialChannels.length === 0) return;
    setSocialSaving(true);
    setSocialMessage(null);
    try {
      const res = await api.post("/marketing/social-posts", { message: socialDraft.trim(), channels: socialChannels, scheduledFor: socialSchedule || null, campaignId: Number(selectedCampaignId) });
      setSocialMessage(res.data.status === "scheduled" ? "Post scheduled successfully." : "Post published to selected channels.");
      setSocialDraft("");
      setSocialSchedule("");
    } catch (err: any) { setSocialMessage(err?.response?.data?.error || "Could not publish the post."); }
    finally { setSocialSaving(false); }
  };

  const handleCampaignPrediction = async () => {
    if (!selectedCampaignId) return;
    const budget = Number(predictionBudget);
    if (!Number.isFinite(budget) || budget <= 0) {
      setPredictionError("Enter a valid target audience budget.");
      return;
    }
    setPredictionLoading(true);
    setPredictionError(null);
    try {
      const response = await api.post("/marketing/predict", {
        campaignId: Number(selectedCampaignId),
        channel: predictionChannel,
        budget
      });
      setCampaignPrediction(response.data);
    } catch (err: any) {
      // Keep the predictor useful when the development API has not yet been
      // restarted to load the prediction route.
      if (err?.response?.status === 404) {
        const campaign = marketingCampaigns.find((item) => String(item.id) === selectedCampaignId);
        const attributedRevenue = Number(campaign?.attributedRevenue ?? campaign?.attributed_revenue ?? marketingMetrics?.incrementalRevenue ?? 0);
        const roi = budget > 0 ? (attributedRevenue - budget) / budget : -1;
        const score = Math.round(Math.max(5, Math.min(97, 52 + Math.max(-30, Math.min(35, roi * 22)) + 2)));
        const predictedOutcome = score >= 75 ? "Likely successful" : score >= 55 ? "Promising — monitor closely" : "At risk";
        setCampaignPrediction({
          score,
          predictedOutcome,
          reasons: [
            `The ${predictionChannel} scenario uses a Rs. ${budget.toLocaleString("en-IN")} target budget.`,
            `Estimated return is ${roi >= 0 ? "positive" : "below break-even"} based on the selected campaign's attributed revenue.`
          ]
        });
      } else {
        setPredictionError(err?.response?.data?.error || "Unable to run the prediction right now.");
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  const aiInsights = useMemo(() => {
    return computeAiInsights(trends, salesList, activeOutletName);
  }, [trends, salesList, activeOutletName]);

  const marketingChartData = useMemo(() => {
    if (!marketingMetrics) return [];
    const baseline = marketingMetrics.revenueBefore || 0;
    const campaign = marketingMetrics.revenueDuring || 0;
    return [
      { label: "Baseline", revenue: baseline, cost: 0 },
      { label: "Campaign", revenue: campaign, cost: marketingMetrics.cost || 0 },
      { label: "Incremental", revenue: marketingMetrics.incrementalRevenue || 0, cost: 0 }
    ];
  }, [marketingMetrics]);

  const campaignRankingData = useMemo(() => marketingCampaigns
    .map((campaign) => {
      const budget = Number(campaign.cost ?? campaign.budget ?? 0);
      const attributedRevenue = Number(campaign.attributedRevenue ?? campaign.attributed_revenue ?? 0);
      const roas = budget > 0 ? attributedRevenue / budget : null;
      return {
        ...campaign,
        budget,
        attributedRevenue,
        roas,
        channel: Array.isArray(campaign.channels) ? campaign.channels.join(", ") : campaign.channel || "Multi-channel",
        status: roas === null ? "Pending" : roas >= 3 ? "Excellent" : roas >= 2 ? "Strong" : "Monitor"
      };
    })
    .sort((a, b) => (b.roas ?? -1) - (a.roas ?? -1)), [marketingCampaigns]);

  const aiMarketingInsight = useMemo(() => {
    const roi = Number(marketingMetrics?.roi ?? 0);
    const uplift = Number(marketingMetrics?.upliftPercent ?? 0);
    const topCampaign = campaignRankingData[0];
    const health = roi >= 1.5 ? "High growth" : roi >= 0.5 ? "Healthy" : "Needs attention";
    const action = roi >= 1.5
      ? "Scale the strongest channels gradually while monitoring conversion quality."
      : roi >= 0
        ? "Keep spend steady and test new creative before expanding the campaign."
        : "Pause low-performing placements and move spend to the best-performing channel.";
    return {
      health,
      action,
      confidence: Math.min(96, Math.max(62, Math.round(72 + Math.abs(uplift) * 2))),
      budgetChange: roi >= 1.5 ? "+20%" : roi >= 0.5 ? "+10%" : "Reallocate",
      topCampaign,
      roiPercent: roi * 100,
      uplift
    };
  }, [marketingMetrics, campaignRankingData]);

  const channelPerformanceData = useMemo(() => optimizationChannels.map((channel, index) => {
    const insight = marketingMetrics?.channelInsights?.find((item: any) => item.channel === channel);
    const score = insight?.roiScore ?? Math.max(35, 68 - index * 7);
    const budget = channelBudgets[channel] ?? 0;
    return { channel, score, budget, projectedLeads: Math.round(score * Math.max(1, budget) * 0.75), action: insight?.recommendation || "Run a small test campaign before scaling." };
  }), [optimizationChannels, channelBudgets, marketingMetrics]);

  const handleToggleSelectLocation = (id: number) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAuthSuccess = (user: any, token: string) => {
    // kept for compatibility — context handles state now
  };

  const handleSignOut = () => {
    logout();
    router.replace("/login");
  };

  const paginatedInventoryItems = useMemo(() => {
    const start = (invPage - 1) * invPageSize;
    return inventoryItems.slice(start, start + invPageSize);
  }, [inventoryItems, invPage, invPageSize]);

  const totalInvPages = Math.ceil(inventoryItems.length / invPageSize) || 1;

  const paginatedStaffMembers = useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return staffMembers.slice(start, start + staffPageSize);
  }, [staffMembers, staffPage, staffPageSize]);

  const totalStaffPages = Math.ceil(staffMembers.length / staffPageSize) || 1;

  const totalSalesPages = Math.ceil(totalSalesRecords / salesPageSize) || 1;

  // ── Auth Loading Guard ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-indigo-500/30">
            FO
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-sm">Loading your workspace…</p>
          <p className="text-slate-500 text-xs">Verifying session</p>
        </div>
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* ─── Top Header Navbar ──────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-md text-white font-black text-xl tracking-tighter">
              FO
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>FranchiseOps AI</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Step {activeStepId} Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">Enterprise Operations Intelligence Dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 space-x-2">
              <span className="text-xs text-slate-400">Outlet:</span>
              <select
                value={selectedOutlet}
                onChange={(e) => {
                  setSelectedOutlet(e.target.value);
                  setSalesPage(1);
                  setInvPage(1);
                  setStaffPage(1);
                }}
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800 text-white">All Outlets</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id} className="bg-slate-800 text-white">
                    {o.city} ({o.outlet_name})
                  </option>
                ))}
              </select>
            </div>

            {currentUser ? (
              <div className="flex items-center space-x-3 bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-700">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-none">{currentUser.name}</div>
                  <div className="text-[10px] text-indigo-400 font-mono leading-tight">{currentUser.role}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-slate-400 hover:text-red-400 font-medium pl-2 border-l border-slate-700 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center space-x-1.5 cursor-pointer"
              >
                <Icons.User />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main Content Layout ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* ── Static Sidebar: Agentic Workflow Navigation ─────────────────── */}
        <aside className="lg:col-span-3 h-full overflow-y-auto pb-6">
          <div
            className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl"
            style={{ background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)" }}
          >
            {/* Sidebar Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-700/50">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  FO
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white leading-none">Agentic Pipeline</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">10-step AI workflow</p>
                </div>
                <div className="ml-auto flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Live</span>
                </div>
              </div>
            </div>

            {/* Step Groups */}
            {([
              {
                label: "Data Inputs",
                color: "text-sky-400",
                dot: "bg-sky-400",
                ids: [1, 2],
              },
              {
                label: "AI Agents",
                color: "text-indigo-400",
                dot: "bg-indigo-500",
                ids: [3, 4, 5, 6, 7],
              },
              {
                label: "Intelligence Engine",
                color: "text-violet-400",
                dot: "bg-violet-500",
                ids: [8, 9],
              },
              {
                label: "Output",
                color: "text-emerald-400",
                dot: "bg-emerald-500",
                ids: [10],
              },
            ] as Array<{ label: string; color: string; dot: string; ids: number[] }>).map((group) => (
              <div key={group.label} className="px-3 py-3">
                {/* Group Label */}
                <div className="flex items-center space-x-2 px-2 mb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${group.color}`}>
                    {group.label}
                  </span>
                </div>

                <nav className="space-y-0.5">
                  {WORKFLOW_STEPS.filter((s) => group.ids.includes(s.id)).map((step) => {
                    const IconComponent = (Icons as any)[step.icon] || Icons.Workflow;
                    const isActive = activeStepId === step.id;

                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveStepId(step.id)}
                        className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-all duration-150 flex items-center space-x-3 cursor-pointer group relative overflow-hidden ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                        }`}
                        style={
                          isActive
                            ? { background: "linear-gradient(135deg, rgba(79,70,229,0.35), rgba(124,58,237,0.20))", border: "1px solid rgba(99,102,241,0.3)" }
                            : { border: "1px solid transparent" }
                        }
                      >
                        {/* Active left accent bar */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{ background: "linear-gradient(180deg, #818cf8, #a78bfa)" }}
                          />
                        )}

                        {/* Icon */}
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isActive
                              ? "text-indigo-200"
                              : "text-slate-500 group-hover:text-slate-300"
                          }`}
                          style={
                            isActive
                              ? { background: "rgba(99,102,241,0.25)" }
                              : { background: "rgba(148,163,184,0.07)" }
                          }
                        >
                          <span className="scale-75">
                            <IconComponent />
                          </span>
                        </span>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold leading-tight ${
                              isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                            }`}>
                              {step.name}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-[10px] truncate mt-0.5 leading-tight ${
                            isActive ? "text-indigo-300/70" : "text-slate-600"
                          }`}>
                            {step.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* Sidebar Footer */}
            <div className="mx-3 mb-3 p-3 rounded-xl border border-slate-700/50 space-y-2" style={{ background: "rgba(15,23,42,0.6)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Active Step</span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold">#{activeStepId} / 10</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${(activeStepId / 10) * 100}%`,
                    background: "linear-gradient(90deg, #4f46e5, #7c3aed)"
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-600 truncate">
                {WORKFLOW_STEPS.find((s) => s.id === activeStepId)?.name}
              </p>
            </div>
          </div>
        </aside>

        {/* Dynamic Main Workspace Tab Content */}
        <main className="lg:col-span-9 h-full overflow-y-auto pb-6 space-y-6">
          {/* STEP 3: OUTLET PERFORMANCE AGENT */}
          {activeStepId === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Feature Rendering Buttons Bar (In-section feature toggle to prevent overflow!) */}
              <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap gap-2">
                <button
                  onClick={() => setPerformanceSubTab("overview")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    performanceSubTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📊 Sales Overview & Trends</span>
                </button>
                <button
                  onClick={() => setPerformanceSubTab("map")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    performanceSubTab === "map" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🗺️ Compare Locations (Map)</span>
                </button>
                <button
                  onClick={() => setPerformanceSubTab("health")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    performanceSubTab === "health" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🏥 Health Scores (0-100)</span>
                </button>
                <button
                  onClick={() => setPerformanceSubTab("underperforming")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    performanceSubTab === "underperforming" ? "bg-rose-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>⚠️ Underperforming Stores ({underperformingStores.length})</span>
                </button>
                <button
                  onClick={() => setPerformanceSubTab("logs")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    performanceSubTab === "logs" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📋 Daily Transaction Logs</span>
                </button>
              </div>

              {/* 1. SALES OVERVIEW & TRENDS SUB-TAB */}
              {performanceSubTab === "overview" && (
                <div className="space-y-4">
                  {summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Gross Revenue</span>
                        <div className="text-xl font-black text-slate-900 mt-1">₹{summary.grossRevenue.toLocaleString('en-IN')}</div>
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center mt-1">
                          <Icons.TrendUp /> <span className="ml-1">+14.2% MoM</span>
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Net Profit Margin</span>
                        <div className="text-xl font-black text-indigo-600 mt-1">{summary.profitMargin}%</div>
                        <span className="text-[11px] text-slate-500 mt-1 block">Net: ₹{summary.netProfit.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Total Orders</span>
                        <div className="text-xl font-black text-slate-900 mt-1">{summary.totalOrders.toLocaleString('en-IN')}</div>
                        <span className="text-[11px] text-slate-500 mt-1 block">AOV: ₹{summary.averageOrderValue}</span>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 font-medium">Digital Payments</span>
                        <div className="text-xl font-black text-cyan-600 mt-1">
                          {(((summary.paymentSplit.upi + summary.paymentSplit.card) / (summary.grossRevenue || 1)) * 100).toFixed(1)}%
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">UPI + Card dominant</span>
                      </div>
                    </div>
                  )}

                  {aiInsights.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {aiInsights.map((ins, idx) => {
                        const IconComp = (Icons as any)[ins.icon] || Icons.Sparkle;
                        return (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700">{ins.title}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ins.tagColor}`}>
                                {ins.tag}
                              </span>
                            </div>
                            <div className="text-lg font-black text-slate-900 flex items-center space-x-1">
                              <IconComp />
                              <span>{ins.value}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{ins.subtext}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-900">Revenue & Operating Cost Daily Trends</h3>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                          <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']} />
                          <Area type="monotone" dataKey="grossRevenue" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" name="Gross Revenue" />
                          <Area type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Net Profit" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. COMPARE LOCATIONS MAP SUB-TAB */}
              {performanceSubTab === "map" && (
                <MapComponent
                  locations={mapLocations}
                  selectedLocationIds={selectedLocationIds}
                  onToggleSelectLocation={handleToggleSelectLocation}
                  onOpenCompare={() => setIsCompareModalOpen(true)}
                />
              )}

              {/* 3. OUTLET HEALTH SCORES SUB-TAB */}
              {performanceSubTab === "health" && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Franchise Outlet Health Score Engine</h3>
                      <p className="text-xs text-slate-500">Multi-factor algorithmic scores evaluating profitability, inventory stability, and staff efficiency</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
                      Network Score Avg: 76/100
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {healthScores.map((h) => (
                      <div key={h.outletId} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{h.outletName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${h.badgeColor}`}>
                            {h.badge}
                          </span>
                        </div>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-2xl font-black text-slate-900">{h.healthScore}</span>
                          <span className="text-xs text-slate-400">/ 100 score</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              h.healthScore >= 80 ? "bg-emerald-500" : h.healthScore >= 65 ? "bg-blue-500" : h.healthScore >= 50 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${h.healthScore}%` }}
                          ></div>
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                          <span>Margin: {h.metrics.profitMargin}%</span>
                          <span>Stock Alerts: {h.metrics.stockIssues}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. UNDERPERFORMING STORES DIAGNOSTIC SUB-TAB */}
              {performanceSubTab === "underperforming" && (
                <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-rose-700 font-bold text-base">
                    <Icons.Warning />
                    <span>Underperforming Store Diagnostic Flags & Action Plans</span>
                  </div>

                  {underperformingStores.map((store) => (
                    <div key={store.outletId} className="bg-white rounded-xl p-4 border border-rose-200 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{store.outletName} ({store.city})</h4>
                          <p className="text-xs text-red-600 font-semibold mt-0.5">Primary Issue: {store.primaryDiagnostic}</p>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full self-start">
                          Action Required
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div><span className="text-slate-400 block text-[10px]">Margin</span><span className="font-bold text-red-600">{store.metrics.profitMargin}%</span></div>
                        <div><span className="text-slate-400 block text-[10px]">Revenue</span><span className="font-bold text-slate-800">₹{store.metrics.revenue.toLocaleString('en-IN')}</span></div>
                        <div><span className="text-slate-400 block text-[10px]">Stock Alerts</span><span className="font-bold text-amber-600">{store.metrics.stockAlerts}</span></div>
                        <div><span className="text-slate-400 block text-[10px]">Staff Rating</span><span className="font-bold text-slate-800">{store.metrics.staffRating}/5.0</span></div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">AI Turnaround Action Plan:</span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
                          {store.actionPlan.map((act: string, idx: number) => (
                            <li key={idx} className="flex items-start space-x-1.5 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/50">
                              <span className="text-indigo-600 font-bold shrink-0">✓</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. DAILY TRANSACTION LOGS SUB-TAB (PAGE SEGMENTATION) */}
              {performanceSubTab === "logs" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Daily Sales Transaction Ledger</h3>
                      <p className="text-xs text-slate-500">Historical transaction log with page segmentation</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">Rows per page:</span>
                      <select
                        value={salesPageSize}
                        onChange={(e) => {
                          setSalesPageSize(parseInt(e.target.value, 10));
                          setSalesPage(1);
                        }}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-xs rounded-lg text-slate-800 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-900 uppercase font-semibold text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Outlet</th>
                          <th className="py-3 px-4">Orders</th>
                          <th className="py-3 px-4">Gross Revenue</th>
                          <th className="py-3 px-4">Operating Cost</th>
                          <th className="py-3 px-4">Net Profit</th>
                          <th className="py-3 px-4">AOV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {salesList.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-900">{row.saleDate}</td>
                            <td className="py-3 px-4 text-slate-700">{row.city} ({row.outletName})</td>
                            <td className="py-3 px-4 text-slate-800 font-medium">{row.totalOrders}</td>
                            <td className="py-3 px-4 font-bold text-emerald-600">₹{row.grossRevenue.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-slate-600">₹{row.operatingCost.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 font-bold text-cyan-600">₹{row.netProfit.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-slate-800">₹{row.averageOrderValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Page Segmentation Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-800">{(salesPage - 1) * salesPageSize + 1}</strong> to{" "}
                      <strong className="text-slate-800">{Math.min(salesPage * salesPageSize, totalSalesRecords)}</strong> of{" "}
                      <strong className="text-slate-800">{totalSalesRecords}</strong> records
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                        disabled={salesPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                      >
                        <Icons.ChevronLeft />
                        <span>Previous</span>
                      </button>

                      <span className="font-semibold text-slate-800 px-2">
                        Page {salesPage} of {totalSalesPages}
                      </span>

                      <button
                        onClick={() => setSalesPage((p) => Math.min(totalSalesPages, p + 1))}
                        disabled={salesPage >= totalSalesPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <Icons.ChevronRight />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: STOCK INVENTORY AGENT */}
          {activeStepId === 4 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Feature Rendering Buttons Bar */}
              <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap gap-2">
                <button
                  onClick={() => setInventorySubTab("roster")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    inventorySubTab === "roster" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📦 Stock Inventory Table</span>
                </button>
                <button
                  onClick={() => setInventorySubTab("ai")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    inventorySubTab === "ai" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🤖 AI Stock Depletion Forecast</span>
                </button>
                <button
                  onClick={() => setInventorySubTab("reorders")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    inventorySubTab === "reorders" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📑 Reorder Purchase Orders</span>
                </button>
              </div>

              {inventoryInsights?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Monitored Items</span>
                    <div className="text-xl font-black text-slate-900 mt-1">{inventoryInsights.summary.totalItems} Items</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Total Valuation</span>
                    <div className="text-xl font-black text-emerald-600 mt-1">₹{inventoryInsights.summary.totalValuation.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Stock Risk Alerts</span>
                    <div className="text-xl font-black text-amber-600 mt-1">
                      {inventoryInsights.summary.criticalItems + inventoryInsights.summary.lowStockItems} Low
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium">Health Index</span>
                    <div className="text-xl font-black text-indigo-600 mt-1">{inventoryInsights.summary.healthIndex}%</div>
                  </div>
                </div>
              )}

              {/* 1. STOCK INVENTORY ROSTER SUB-TAB (PAGE SEGMENTATION) */}
              {inventorySubTab === "roster" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Store Stock Inventory Roster</h3>
                      <p className="text-xs text-slate-500">Live item stock levels and reorder parameters</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">Items per page:</span>
                      <select
                        value={invPageSize}
                        onChange={(e) => { setInvPageSize(parseInt(e.target.value, 10)); setInvPage(1); }}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-xs rounded-lg text-slate-800 cursor-pointer"
                      >
                        <option value={5}>5</option>
                        <option value={8}>8</option>
                        <option value={15}>15</option>
                        <option value={30}>30</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-900 uppercase font-semibold text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Item Name</th>
                          <th className="py-3 px-4">Outlet</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Current Stock</th>
                          <th className="py-3 px-4">Unit Price</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedInventoryItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{item.itemName}</td>
                            <td className="py-3 px-4 text-slate-600">{item.city} ({item.outletName})</td>
                            <td className="py-3 px-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">{item.category}</span></td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{item.currentStock} {item.unit}</td>
                            <td className="py-3 px-4 text-slate-700">₹{item.unitPrice}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                item.status === 'Critical' ? "bg-red-100 text-red-800" : item.status === 'Low Stock' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-800">{(invPage - 1) * invPageSize + 1}</strong> to{" "}
                      <strong className="text-slate-800">{Math.min(invPage * invPageSize, inventoryItems.length)}</strong> of{" "}
                      <strong className="text-slate-800">{inventoryItems.length}</strong> items
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                        disabled={invPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                      >
                        <Icons.ChevronLeft />
                        <span>Previous</span>
                      </button>

                      <span className="font-semibold text-slate-800 px-2">
                        Page {invPage} of {totalInvPages}
                      </span>

                      <button
                        onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
                        disabled={invPage >= totalInvPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <Icons.ChevronRight />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. AI DEPLETION FORECAST SUB-TAB */}
              {inventorySubTab === "ai" && inventoryInsights && (
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl space-y-3">
                  <h3 className="text-base font-bold text-white">AI Depletion Velocity Forecast</h3>
                  <div className="space-y-2">
                    {inventoryInsights.depletionForecasts.map((dep: any) => (
                      <div key={dep.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-white block">{dep.itemName} ({dep.city})</span>
                          <span className="text-slate-400">Stock: {dep.currentStock} {dep.unit}</span>
                        </div>
                        <span className={`font-bold px-2.5 py-1 rounded-full ${dep.riskLevel === 'High' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
                          ~{dep.daysRemaining} days remaining
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. REORDER PURCHASE ORDERS SUB-TAB */}
              {inventorySubTab === "reorders" && inventoryInsights && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-base font-bold text-slate-900">Automated Purchase Order Recommendations</h3>
                  <div className="space-y-2">
                    {inventoryInsights.restockRecommendations.map((rec: any) => (
                      <div key={rec.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{rec.itemName} ({rec.city})</span>
                          <span className="text-slate-500">Reorder Qty: {rec.recommendedQuantity} {rec.unit}</span>
                        </div>
                        <span className="font-bold text-emerald-600 text-sm">₹{rec.estimatedCost.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: STAFF AGENT */}
          {activeStepId === 5 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Feature Rendering Buttons Bar */}
              <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap gap-2">
                <button
                  onClick={() => setStaffSubTab("roster")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    staffSubTab === "roster" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>👥 Staff Roster Table</span>
                </button>
                <button
                  onClick={() => setStaffSubTab("performers")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    staffSubTab === "performers" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🏆 Top 5 Performers</span>
                </button>
                <button
                  onClick={() => setStaffSubTab("underperformers")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    staffSubTab === "underperformers" ? "bg-rose-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>⚠️ Bottom 5 Underperformers</span>
                </button>
                <button
                  onClick={() => setStaffSubTab("allocate")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    staffSubTab === "allocate" ? "bg-violet-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📋 Job Allocation</span>
                </button>
                <button
                  onClick={() => setStaffSubTab("ai")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    staffSubTab === "ai" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>🧠 AI Labor Efficiency</span>
                </button>
                <button
                  onClick={() => setStaffSubTab("shifts")}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                    staffSubTab === "shifts" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>📅 Shift Distribution</span>
                </button>
              </div>

              {/* 1. STAFF ROSTER SUB-TAB (PAGE SEGMENTATION) */}
              {staffSubTab === "roster" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Franchise Staff Roster & Performance Ratings</h3>
                      <p className="text-xs text-slate-500">Employee performance, shifts, and wage analytics</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500">Staff per page:</span>
                      <select
                        value={staffPageSize}
                        onChange={(e) => { setStaffPageSize(parseInt(e.target.value, 10)); setStaffPage(1); }}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-xs rounded-lg text-slate-800 cursor-pointer"
                      >
                        <option value={5}>5</option>
                        <option value={8}>8</option>
                        <option value={15}>15</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-900 uppercase font-semibold text-[11px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Staff Name</th>
                          <th className="py-3 px-4">Outlet</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Assigned Job</th>
                          <th className="py-3 px-4">Shift</th>
                          <th className="py-3 px-4">Login Time</th>
                          <th className="py-3 px-4">Logoff Time</th>
                          <th className="py-3 px-4">Monthly Wages</th>
                          <th className="py-3 px-4">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedStaffMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">{member.name}</td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{member.city}</td>
                            <td className="py-3 px-4"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium whitespace-nowrap">{member.role}</span></td>
                            <td className="py-3 px-4 text-slate-600 max-w-[160px]">
                              <span className="block truncate" title={member.assignedJob}>{member.assignedJob}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                                member.shiftType === 'Morning' ? 'bg-amber-100 text-amber-800' : member.shiftType === 'Evening' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                              }`}>{member.shiftType}</span>
                            </td>
                            <td className="py-3 px-4 text-emerald-700 font-semibold whitespace-nowrap">🕐 {member.loginTime}</td>
                            <td className="py-3 px-4 text-rose-600 font-semibold whitespace-nowrap">🕔 {member.logoffTime}</td>
                            <td className="py-3 px-4 font-semibold text-emerald-600 whitespace-nowrap">₹{member.monthlyWages.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 font-bold text-amber-500 whitespace-nowrap">★ {member.performanceRating}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Showing <strong className="text-slate-800">{(staffPage - 1) * staffPageSize + 1}</strong> to{" "}
                      <strong className="text-slate-800">{Math.min(staffPage * staffPageSize, staffMembers.length)}</strong> of{" "}
                      <strong className="text-slate-800">{staffMembers.length}</strong> staff members
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
                        disabled={staffPage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                      >
                        <Icons.ChevronLeft />
                        <span>Previous</span>
                      </button>

                      <span className="font-semibold text-slate-800 px-2">
                        Page {staffPage} of {totalStaffPages}
                      </span>

                      <button
                        onClick={() => setStaffPage((p) => Math.min(totalStaffPages, p + 1))}
                        disabled={staffPage >= totalStaffPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <Icons.ChevronRight />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. TOP 5 PERFORMERS SUB-TAB */}
              {staffSubTab === "performers" && staffPerformers && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                    <span className="text-xl">🏆</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Top 5 Performing Employees</h3>
                      <p className="text-xs text-slate-500">Ranked by performance rating and hours contributed this month</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {staffPerformers.top5.map((member: any, idx: number) => (
                      <div key={member.id} className="flex items-center space-x-4 bg-gradient-to-r from-emerald-50 to-teal-50/60 p-4 rounded-xl border border-emerald-200">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0 ${
                          idx === 0 ? 'bg-amber-400 shadow-lg shadow-amber-200' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-emerald-500'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{member.name}</span>
                            <span className="font-black text-emerald-600 text-sm">★ {member.performanceRating}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5">
                            <span>{member.role}</span>
                            <span>·</span>
                            <span>{member.city}</span>
                            <span>·</span>
                            <span>🕐 {member.loginTime} – 🕔 {member.logoffTime}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 font-medium truncate">{member.assignedJob}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-emerald-700">{member.hoursWorked}h</div>
                          <div className="text-[10px] text-slate-400">hrs worked</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. BOTTOM 5 UNDERPERFORMERS SUB-TAB */}
              {staffSubTab === "underperformers" && staffPerformers && (
                <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-rose-100 pb-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Bottom 5 Underperforming Employees</h3>
                      <p className="text-xs text-slate-500">Staff members needing coaching, reassignment, or performance improvement plans</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {staffPerformers.bottom5.map((member: any, idx: number) => (
                      <div key={member.id} className="bg-gradient-to-r from-rose-50/80 to-amber-50/60 p-4 rounded-xl border border-rose-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center font-black text-rose-600 text-sm shrink-0">
                              #{idx + 1}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">{member.name}</span>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                                <span>{member.role}</span>
                                <span>·</span>
                                <span>{member.city}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-rose-600 text-sm">★ {member.performanceRating}</span>
                            <div className="text-[10px] text-slate-400">{member.hoursWorked}h worked</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-[11px] text-slate-500">
                          <span>🕐 Login: <strong className="text-slate-700">{member.loginTime}</strong></span>
                          <span>🕔 Logoff: <strong className="text-slate-700">{member.logoffTime}</strong></span>
                          <span>📋 {member.assignedJob}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                          <span className="font-bold">AI Diagnostic: </span>{member.diagnosticNote}
                        </div>
                        <div className="text-[11px] text-indigo-700 font-semibold">
                          💡 Recommended: {member.recommendedJobAllocation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. JOB ALLOCATION SUB-TAB */}
              {staffSubTab === "allocate" && staffPerformers && (
                <div className="bg-white rounded-2xl p-5 border border-violet-200 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 border-b border-violet-100 pb-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">AI-Assisted Job Allocation Manager</h3>
                      <p className="text-xs text-slate-500">Assign or update job roles, shift types, and login/logoff times for any staff member</p>
                    </div>
                  </div>

                  {allocationSuccess && (
                    <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl p-3 flex items-center space-x-2">
                      <span>✅</span><span>{allocationSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {staffMembers.slice(0, 15).map((member: any) => (
                      <div key={member.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-300 flex items-center justify-center font-bold text-violet-700 text-xs shrink-0">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{member.name}</div>
                              <div className="text-[11px] text-slate-500">{member.role} · {member.city} · <span className="text-slate-600 font-medium truncate">{member.assignedJob}</span></div>
                              <div className="text-[11px] text-slate-500">🕐 {member.loginTime} – 🕔 {member.logoffTime} · {member.shiftType} Shift</div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAllocatingStaffId(allocatingStaffId === member.id ? null : member.id);
                              setAllocatingJob(member.assignedJob);
                              setAllocatingShift(member.shiftType);
                              setAllocatingLoginTime(member.loginTime);
                              setAllocatingLogoffTime(member.logoffTime);
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                              allocatingStaffId === member.id ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
                            }`}
                          >
                            {allocatingStaffId === member.id ? '? Cancel' : '? Allocate'}
                          </button>
                        </div>

                        {allocatingStaffId === member.id && (
                          <div className="border-t border-violet-100 p-4 bg-violet-50/50 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Assign Job Role</label>
                                <select
                                  value={allocatingJob}
                                  onChange={(e) => setAllocatingJob(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 text-xs rounded-lg text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400"
                                >
                                  {staffPerformers.availableJobs.map((job: string) => (
                                    <option key={job} value={job}>{job}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Shift Type</label>
                                <select
                                  value={allocatingShift}
                                  onChange={(e) => setAllocatingShift(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 text-xs rounded-lg text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400"
                                >
                                  <option value="Morning">Morning</option>
                                  <option value="Evening">Evening</option>
                                  <option value="Night">Night</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Login Time</label>
                                <input
                                  type="text"
                                  value={allocatingLoginTime}
                                  onChange={(e) => setAllocatingLoginTime(e.target.value)}
                                  placeholder="e.g. 08:00 AM"
                                  className="w-full px-3 py-2 bg-white border border-slate-300 text-xs rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Logoff Time</label>
                                <input
                                  type="text"
                                  value={allocatingLogoffTime}
                                  onChange={(e) => setAllocatingLogoffTime(e.target.value)}
                                  placeholder="e.g. 04:30 PM"
                                  className="w-full px-3 py-2 bg-white border border-slate-300 text-xs rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleAllocateJob(member.id)}
                              disabled={!allocatingJob}
                              className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ✅ Confirm Job Allocation
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. AI LABOR EFFICIENCY RATIO SUB-TAB */}
              {staffSubTab === "ai" && staffInsights && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-base font-bold text-slate-900">AI Labor Cost & Efficiency Optimization</h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {staffInsights.optimizationSuggestions.map((sug: string, idx: number) => (
                      <li key={idx} className="flex items-start space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-indigo-600 font-bold">•</span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6. SHIFT ROSTER DISTRIBUTION SUB-TAB */}
              {staffSubTab === "shifts" && staffInsights && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Shift Coverage Roster Distribution</h3>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                      <span className="text-slate-500 block text-[10px] font-bold">MORNING SHIFT</span>
                      <span className="font-black text-indigo-700 text-2xl mt-1 block">{staffInsights.summary.shiftDistribution.Morning || 0}</span>
                      <span className="text-[10px] text-slate-400">8 AM - 4 PM</span>
                    </div>
                    <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                      <span className="text-slate-500 block text-[10px] font-bold">EVENING SHIFT</span>
                      <span className="font-black text-blue-700 text-2xl mt-1 block">{staffInsights.summary.shiftDistribution.Evening || 0}</span>
                      <span className="text-[10px] text-slate-400">4 PM - 12 AM</span>
                    </div>
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[10px] font-bold">NIGHT SHIFT</span>
                      <span className="font-black text-slate-700 text-2xl mt-1 block">{staffInsights.summary.shiftDistribution.Night || 0}</span>
                      <span className="text-[10px] text-slate-400">12 AM - 8 AM</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: MARKETING AGENT */}
          {activeStepId === 6 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Marketing Command Center</h2>
                    <p className="text-xs text-slate-500">Plan campaigns, evaluate ROI, connect social channels, and publish customer-facing updates from one place.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Campaign</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => {
                        setSelectedCampaignId(e.target.value);
                        setMarketingSubTab('summary');
                      }}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {marketingCampaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap gap-2">
                  <button
                    onClick={() => setMarketingSubTab('summary')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Campaign Summary
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('roi')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'roi' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    ROI & Efficiency
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('channels')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'channels' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Channel Optimization
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('social')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'social' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Social Hub
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('ai')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    ✨ AI Marketing Engine
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('budget')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'budget' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Budget Guidance
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('signals')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'signals' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Performance Signals
                  </button>
                  <button
                    onClick={() => setMarketingSubTab('actions')}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${marketingSubTab === 'actions' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    Recommendations & Actions
                  </button>
                </div>

                {marketingLoading && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-slate-600 text-sm font-medium">
                    Loading marketing analytics...
                  </div>
                )}

                {marketingError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm font-medium">
                    {marketingError}
                  </div>
                )}

                {!marketingLoading && !marketingError && marketingMetrics && (
                  <div className="space-y-5">
                    {marketingSubTab === 'summary' && (
                      <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500">Baseline Revenue</div>
                          <div className="text-2xl font-black text-slate-900 mt-2">₹{marketingMetrics.revenueBefore.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500">Campaign Revenue</div>
                          <div className="text-2xl font-black text-emerald-600 mt-2">₹{marketingMetrics.revenueDuring.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500">Incremental Lift</div>
                          <div className="text-2xl font-black text-indigo-700 mt-2">₹{marketingMetrics.incrementalRevenue.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div className="text-[10px] uppercase tracking-widest text-slate-500">Campaign Cost</div>
                          <div className="text-2xl font-black text-rose-600 mt-2">₹{marketingMetrics.cost.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4">
                          <h3 className="text-base font-bold text-slate-900">Campaign Rankings &amp; Sales Impact</h3>
                          <p className="mt-1 text-xs text-slate-500">Track attributed revenue and return on ad spend across promotional campaigns.</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-190 text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <tr><th className="px-5 py-3">Campaign name</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3 text-right">Budget</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3 text-right">ROAS</th><th className="px-5 py-3">Status</th></tr>
                            </thead>
                            <tbody>
                              {campaignRankingData.map((campaign) => (
                                <tr key={campaign.id} className={`border-t border-slate-100 ${String(campaign.id) === selectedCampaignId ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}>
                                  <td className="px-5 py-4 font-bold text-slate-900">{campaign.name}</td>
                                  <td className="px-4 py-4 capitalize text-slate-600">{campaign.channel}</td>
                                  <td className="px-4 py-4 text-right font-medium text-slate-700">₹{campaign.budget.toLocaleString("en-IN")}</td>
                                  <td className="px-4 py-4 text-right font-bold text-emerald-600">₹{campaign.attributedRevenue.toLocaleString("en-IN")}</td>
                                  <td className="px-4 py-4 text-right font-bold text-indigo-700">{campaign.roas === null ? "—" : `${campaign.roas.toFixed(2)}x`}</td>
                                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${campaign.status === "Excellent" ? "bg-emerald-100 text-emerald-700" : campaign.status === "Strong" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>{campaign.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-5"><div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">Revenue impact</h3><div className="mt-4 h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={marketingChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => `?${Number(value ?? 0).toLocaleString('en-IN')}`} /><Legend /><Bar dataKey="revenue" name="Revenue" fill="#4f46e5" /><Bar dataKey="cost" name="Cost" fill="#fb7185" /></BarChart></ResponsiveContainer></div></div><div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="text-sm font-bold text-slate-900">Campaign details</h3><table className="mt-3 w-full text-sm"><tbody><tr className="border-b border-slate-200"><td className="py-3 text-slate-500">Period</td><td className="py-3 text-right font-semibold">{marketingMetrics.period.start} ? {marketingMetrics.period.end}</td></tr><tr className="border-b border-slate-200"><td className="py-3 text-slate-500">Revenue lift</td><td className="py-3 text-right font-semibold text-emerald-700">{marketingMetrics.upliftPercent?.toFixed(1) ?? '0.0'}%</td></tr><tr><td className="py-3 text-slate-500">Active channels</td><td className="py-3 text-right font-semibold">{optimizationChannels.length}</td></tr></tbody></table><button onClick={() => setMarketingSubTab('channels')} className="mt-4 w-full rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Optimize channels</button></div></div></div>
                    )}

                    {marketingSubTab === 'roi' && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900">ROI Efficiency</h3>
                          <div className="mt-4 space-y-3 text-sm text-slate-700">
                            <div className="flex items-center justify-between">
                              <span>Return on Investment</span>
                              <span className="font-semibold text-slate-900">{marketingMetrics.roi !== null ? `${(marketingMetrics.roi * 100).toFixed(1)}%` : "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Uplift vs baseline</span>
                              <span className="font-semibold text-slate-900">{marketingMetrics.upliftPercent !== null ? `${marketingMetrics.upliftPercent.toFixed(1)}%` : "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Period</span>
                              <span className="font-semibold text-slate-900">{marketingMetrics.period.start} → {marketingMetrics.period.end}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900">Spend Efficiency</h3>
                          <div className="mt-4 space-y-3 text-sm text-slate-700">
                            <div className="flex items-center justify-between">
                              <span>Cost per ₹1 incremental</span>
                              <span className="font-semibold text-slate-900">{marketingMetrics.roi !== null ? `?${Math.max(0, marketingMetrics.cost / Math.max(1, marketingMetrics.incrementalRevenue)).toFixed(2)}` : "N/A"}</span>
                            </div>
                            <div className="text-xs text-slate-500">This helps identify whether the campaign is generating enough lift for the budget spent.</div>
                          </div>
                        </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sm:col-span-2"><h3 className="text-sm font-bold text-slate-900">Efficiency comparison</h3><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={[{ metric: 'ROI', value: (marketingMetrics.roi || 0) * 100 }, { metric: 'Uplift', value: marketingMetrics.upliftPercent || 0 }, { metric: 'Net return', value: Math.max(0, ((marketingMetrics.incrementalRevenue - marketingMetrics.cost) / Math.max(1, marketingMetrics.revenueDuring)) * 100) }]}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" unit="%" /><YAxis type="category" dataKey="metric" width={90} /><Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`} /><Bar dataKey="value" fill="#10b981" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div></div></div>
                    )}

                    {marketingSubTab === 'channels' && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">Channel Optimization</span>
                            <div className="flex gap-2"><select value={channelToAdd} onChange={(e) => setChannelToAdd(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs"><option value="youtube">YouTube</option><option value="whatsapp">WhatsApp</option><option value="linkedin">LinkedIn</option><option value="google">Google Search</option><option value="sms">SMS</option></select><button onClick={() => { if (!optimizationChannels.includes(channelToAdd)) { setOptimizationChannels((previous) => [...previous, channelToAdd]); setChannelBudgets((previous) => ({ ...previous, [channelToAdd]: 10 })); } }} className="rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Add channel</button></div>
                          </div>
                          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-150 text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="pb-3">Channel</th><th className="pb-3">ROI score</th><th className="pb-3">Budget allocation</th><th className="pb-3">Projected leads</th><th className="pb-3">Action</th></tr></thead><tbody>{channelPerformanceData.map((item) => <tr key={item.channel} className="border-b border-slate-100"><td className="py-3 font-bold capitalize text-slate-900">{item.channel}</td><td className="py-3"><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{item.score}/100</span></td><td className="py-3"><div className="flex items-center gap-2"><input aria-label={`${item.channel} budget`} type="range" min="0" max="50" value={item.budget} onChange={(e) => setChannelBudgets((previous) => ({ ...previous, [item.channel]: Number(e.target.value) }))} className="w-24 accent-indigo-600" /><span className="text-xs font-semibold">{item.budget}%</span></div></td><td className="py-3 font-semibold text-indigo-700">{item.projectedLeads.toLocaleString()}</td><td className="py-3 text-xs text-slate-500">{item.action}</td></tr>)}</tbody></table></div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">Allocation vs. performance</h3><div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={channelPerformanceData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="channel" /><YAxis /><Tooltip /><Legend /><Bar dataKey="score" name="ROI score" fill="#4f46e5" /><Bar dataKey="budget" name="Budget %" fill="#38bdf8" /></BarChart></ResponsiveContainer></div></div>
                      </div>
                    )}

                    {marketingSubTab === 'social' && (
                      <div className="grid gap-4 xl:grid-cols-5">
                        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Social media connections</h3>
                              <p className="mt-1 text-xs text-slate-500">Connect channels to include them in campaign publishing.</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{socialConnections.filter((item) => item.connected).length} active</span>
                          </div>
                          <div className="mt-4 space-y-3">
                            {socialConnections.map((connection) => (
                              <div key={connection.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${connection.color} text-xs font-black text-white`}>
                                  {connection.name.slice(0, 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-bold text-slate-900">{connection.name}</div>
                                  <div className="truncate text-[11px] text-slate-500">{connection.connected ? connection.handle : 'Not connected'}{connection.followers ? ` ? ${connection.followers.toLocaleString()} followers` : ''}</div>
                                </div>
                                <button onClick={() => handleSocialConnection(connection.id, !connection.connected)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${connection.connected ? 'bg-white text-slate-700 border border-slate-200 hover:bg-rose-50 hover:text-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                  {connection.connected ? 'Disconnect' : 'Connect'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="xl:col-span-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900">Create campaign post</h3>
                          <p className="mt-1 text-xs text-slate-500">Publish now or schedule a promotion for connected social channels.</p>
                          <textarea value={socialDraft} onChange={(e) => setSocialDraft(e.target.value)} maxLength={280} placeholder="Example: Weekend offer is live — visit your nearest outlet for 20% off today!" className="mt-4 min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500" />
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>Keep it clear, local, and action-oriented.</span><span>{socialDraft.length}/280</span></div>
                          <div className="mt-4">
                            <span className="text-xs font-semibold text-slate-600">Publish to</span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {socialConnections.filter((item) => item.connected).map((connection) => {
                                const selected = socialChannels.includes(connection.id);
                                return <button key={connection.id} onClick={() => setSocialChannels((previous) => selected ? previous.filter((item) => item !== connection.id) : [...previous, connection.id])} className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{connection.name}</button>;
                              })}
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1"><label className="block text-xs font-semibold text-slate-600">Schedule for <span className="font-normal text-slate-400">(optional)</span></label><input type="datetime-local" value={socialSchedule} onChange={(e) => setSocialSchedule(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" /></div>
                            <button disabled={socialSaving || !socialDraft.trim() || socialChannels.length === 0} onClick={handleSocialPost} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">{socialSaving ? 'Saving...' : socialSchedule ? 'Schedule post' : 'Publish now'}</button>
                          </div>
                          {!socialDraft.trim() && <p className="mt-2 text-xs font-medium text-amber-700">Write a post message above to enable scheduling.</p>}
                          {socialDraft.trim() && socialChannels.length === 0 && <p className="mt-2 text-xs font-medium text-amber-700">Choose at least one connected channel to schedule this post.</p>}
                          {socialMessage && <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-3 text-sm font-medium text-emerald-800">{socialMessage}</div>}
                        </div>
                      </div>
                    )}

                    {marketingSubTab === 'ai' && (
                      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                        <h3 className="text-xl font-bold text-slate-900">Campaign Success Predictor</h3>
                        <p className="mt-1 text-sm leading-5 text-slate-500">Evaluate prospective campaign efficiency and impressions prior to launching.</p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <label className="block text-sm font-bold text-slate-700">Marketing Channel
                            <select value={predictionChannel} onChange={(e) => setPredictionChannel(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-violet-500">
                              <option>Social Media</option><option>Search Ads</option><option>Email</option><option>SMS</option><option>Influencer</option>
                            </select>
                          </label>
                          <label className="block text-sm font-bold text-slate-700">Target Audience Budget (Rs.)
                            <input type="number" min="1" value={predictionBudget} onChange={(e) => setPredictionBudget(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500" />
                          </label>
                        </div>
                        <button onClick={handleCampaignPrediction} disabled={predictionLoading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300">
                          <span aria-hidden="true">⌕</span>{predictionLoading ? "Running prediction..." : "Run Prediction Algorithm"}
                        </button>
                        {predictionError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{predictionError}</p>}
                        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-7 text-center">
                          {campaignPrediction ? <div className="space-y-3"><div className="text-xs font-bold uppercase tracking-wider text-violet-600">Prediction complete</div><div className="text-2xl font-black text-slate-900">{campaignPrediction.score}% success likelihood</div><p className="text-sm font-medium text-slate-600">{campaignPrediction.predictedOutcome}</p><div className="grid gap-2 pt-1 text-left text-xs text-slate-600">{campaignPrediction.reasons?.slice(0, 2).map((reason: string) => <p key={reason} className="rounded-lg bg-white p-3">{reason}</p>)}</div></div> : <p className="text-sm leading-5 text-slate-400">Select inputs above to evaluate simulated campaign ROI.</p>}
                        </div>
                      </div>
                    )}

                    {false && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-sm">
                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-widest text-violet-200">AI Marketing Engine</div>
                              <h3 className="mt-2 text-2xl font-black">{aiMarketingInsight.health} campaign outlook</h3>
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100">{aiMarketingInsight.action}</p>
                            </div>
                            <div className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Model confidence</div>
                              <div className="mt-1 text-2xl font-black">{aiMarketingInsight.confidence}%</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Predicted ROI</div><div className="mt-2 text-3xl font-black text-emerald-600">{aiMarketingInsight.roiPercent.toFixed(1)}%</div><p className="mt-2 text-xs text-slate-500">Based on attributed campaign revenue and spend.</p></div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommended budget</div><div className="mt-2 text-3xl font-black text-indigo-600">{aiMarketingInsight.budgetChange}</div><p className="mt-2 text-xs text-slate-500">Apply the adjustment over the next reporting cycle.</p></div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expected uplift</div><div className="mt-2 text-3xl font-black text-violet-600">{aiMarketingInsight.uplift.toFixed(1)}%</div><p className="mt-2 text-xs text-slate-500">Lift against the comparable pre-campaign period.</p></div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">Recommended next actions</h3><ol className="mt-4 space-y-3 text-sm text-slate-700"><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">1</span><span>Prioritize the channels with the highest conversion intent before increasing reach.</span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">2</span><span>Run a creative A/B test and keep the highest-performing message as the control.</span></li><li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">3</span><span>Review ROAS after seven days before applying the next budget change.</span></li></ol></div>
                          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm"><h3 className="text-sm font-bold text-slate-900">Portfolio opportunity</h3><p className="mt-2 text-sm text-slate-600">Top ranked campaign</p><div className="mt-1 text-xl font-black text-indigo-700">{aiMarketingInsight.topCampaign?.name ?? "No campaign data"}</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">ROAS</div><div className="mt-1 font-black text-slate-900">{aiMarketingInsight.topCampaign?.roas?.toFixed(2) ?? "—"}x</div></div><div className="rounded-xl bg-white p-3"><div className="text-[10px] uppercase tracking-wider text-slate-500">Revenue</div><div className="mt-1 font-black text-emerald-600">₹{(aiMarketingInsight.topCampaign?.attributedRevenue ?? 0).toLocaleString("en-IN")}</div></div></div></div>
                        </div>
                      </div>
                    )}

                    {marketingSubTab === 'budget' && (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900">Budget Direction</h3>
                            <div className="mt-4 text-sm text-slate-700 space-y-3">
                              <div>
                                <div className="font-semibold text-slate-900">Current recommendation</div>
                                <div>{marketingMetrics.roi !== null && marketingMetrics.roi > 0.5 ? "Increase media budget by 20%" : marketingMetrics.roi !== null && marketingMetrics.roi >= 0 ? "Refocus spend on creative testing" : "Pause underperforming channels"}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Margin guardrail</div>
                                <div>{marketingMetrics.roi !== null ? `ROI threshold: ${(marketingMetrics.roi * 100).toFixed(1)}%` : "N/A"}</div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900">ROI health</h3>
                            <div className="mt-4 text-2xl font-black text-slate-900">{marketingMetrics.roi !== null ? `${(marketingMetrics.roi * 100).toFixed(1)}%` : "N/A"}</div>
                            <div className="text-xs text-slate-500 mt-1">This is your campaign return relative to cost.</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {marketingSubTab === 'signals' && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900">Performance Signals</h3>
                          <div className="mt-4 space-y-3 text-sm text-slate-700">
                            <div>
                              <span className="font-semibold text-slate-900">Incremental trend</span>
                              <div>{marketingMetrics.incrementalRevenue > 0 ? "Positive growth" : "Needs optimization"}</div>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">Baseline stability</span>
                              <div>{marketingMetrics.upliftPercent !== null ? `${marketingMetrics.upliftPercent.toFixed(1)}% uplift vs baseline` : "No baseline"}</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-slate-700">
                          <div className="grid gap-4 lg:grid-cols-2"><div><span className="font-bold text-slate-900">AI recommendation</span><p className="mt-1">Use day-part analysis and promotions that align with high traffic windows to maximize incremental lift.</p></div><div className="h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={marketingChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => `?${Number(value ?? 0).toLocaleString('en-IN')}`} /><Line type="monotone" dataKey="revenue" name="Revenue signal" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></div>
                        </div>
                      </div>
                    )}

                    {marketingSubTab === 'actions' && (
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-900">Next Step Recommendations</h3>
                          <ul className="mt-4 space-y-3 text-sm text-slate-700">
                            {marketingRecommendations.length > 0 ? (
                              marketingRecommendations.map((item, idx) => (
                                <li key={idx} className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                  <span className="text-slate-900 font-semibold">{idx + 1}.</span> {item}
                                </li>
                              ))
                            ) : (
                              <li className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-slate-500">No recommendations available yet.</li>
                            )}
                          </ul>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                            <h3 className="text-sm font-bold text-emerald-900">Schedule Campaign Report</h3>
                            <div className="mt-3 space-y-3 text-sm text-slate-700">
                              <div>
                                <label className="block text-xs font-semibold text-slate-500">Frequency</label>
                                <select
                                  value={scheduleFrequency}
                                  onChange={(e) => setScheduleFrequency(e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="biweekly">Bi-weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-500">Next run date</label>
                                <input
                                  type="date"
                                  value={scheduleNextRun}
                                  onChange={(e) => setScheduleNextRun(e.target.value)}
                                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                />
                              </div>
                              <button
                                onClick={handleScheduleReport}
                                className="w-full rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                              >
                                Schedule Report
                              </button>
                              {scheduleMessage && (
                                <div className="rounded-2xl bg-white border border-emerald-100 p-3 text-sm text-emerald-900">
                                  {scheduleMessage}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900">Export Campaign CSV</h3>
                            <p className="mt-2 text-sm text-slate-600">Download a full campaign ROI summary including channel insights and recommendations.</p>
                            <button
                              onClick={handleExportReport}
                              className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                            >
                              Download CSV
                            </button>
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-sm text-emerald-900">
                          Action plan: Review campaign spend, trim low-return channels, and test one new promotional creative each week.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OTHER STEPS (1, 2, 7, 8, 9, 10) Rendering within section */}
          {![3, 4, 5, 6].includes(activeStepId) && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mx-auto">
                <Icons.Workflow />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {WORKFLOW_STEPS.find((s) => s.id === activeStepId)?.name} Active
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {WORKFLOW_STEPS.find((s) => s.id === activeStepId)?.desc}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveStepId(3)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:bg-indigo-700 transition-all"
                >
                  Return to Outlet Performance Agent
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        outlets={outlets}
      />

      {/* Location Comparison Matrix Modal */}
      <CompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedLocationIds={selectedLocationIds}
      />
    </div>
  );
}
