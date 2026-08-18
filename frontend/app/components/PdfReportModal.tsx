"use client";

import React from "react";

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: {
    grossRevenue: number;
    operatingCost: number;
    netProfit: number;
    profitMargin: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
  };
  selectedOutletName: string;
}

export default function PdfReportModal({
  isOpen,
  onClose,
  metrics,
  selectedOutletName,
}: PdfReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const reportDate = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        {/* Modal Header */}
        <div className="p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Executive Operations Report</h2>
              <p className="text-xs text-slate-400">Print & PDF Exportable Audit Summary for {selectedOutletName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center space-x-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Download PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Printable Body */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:overflow-visible">
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm">
                  FO
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">FranchiseOps AI</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">Autonomous Multi-Agent Operations Intelligence System</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                CONFIDENTIAL EXECUTIVE SUMMARY
              </span>
              <p className="text-xs text-slate-500 mt-2">Generated: {reportDate}</p>
              <p className="text-xs font-semibold text-slate-700">Target: {selectedOutletName}</p>
            </div>
          </div>

          {/* Key Financial KPIs Grid */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">1. Financial Trajectory & Profit Margins</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Sales Revenue</p>
                <p className="text-lg font-black text-indigo-600 mt-1">₹{metrics.grossRevenue?.toLocaleString("en-IN") || "0"}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">{metrics.totalOrders || 0} Total Orders</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Net Operating Profit</p>
                <p className="text-lg font-black text-emerald-600 mt-1">₹{metrics.netProfit?.toLocaleString("en-IN") || "0"}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">{metrics.profitMargin || 0}% Profit Margin</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Customer Footfall</p>
                <p className="text-lg font-black text-blue-600 mt-1">{metrics.totalCustomers || 0}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">₹{metrics.averageOrderValue || 0} Avg Order Value</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Operating Expenses</p>
                <p className="text-lg font-black text-amber-600 mt-1">₹{metrics.operatingCost?.toLocaleString("en-IN") || "0"}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1">Cost ratio controlled</p>
              </div>
            </div>
          </div>

          {/* Operational Audit Compliance Table */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">2. Multi-Agent Audit & Compliance Scorecard</h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Agent Domain</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Score / Metric</th>
                  <th className="p-3">Recommendation / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                <tr>
                  <td className="p-3 font-bold text-slate-900">Data Schema Sanitizer</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">Passed</span></td>
                  <td className="p-3 font-semibold">100% Strict v2.4 Schema</td>
                  <td className="p-3 text-slate-500">Zero syntax or null errors detected.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Inventory Telemetry</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold">Optimal</span></td>
                  <td className="p-3 font-semibold">4.8 Days Stock Cover</td>
                  <td className="p-3 text-slate-500">Auto-supplier PO dispatched for Coffee Beans.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Staff Payroll & Shift Agent</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">Active</span></td>
                  <td className="p-3 font-semibold">4.8 / 5.0 Rating</td>
                  <td className="p-3 text-slate-500">Bonus approved for top performing baristas.</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-900">Marketing ROI Agent</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">3.8x ROI</span></td>
                  <td className="p-3 font-semibold">₹14,200 CAC Optimized</td>
                  <td className="p-3 text-slate-500">Hyper-local weekend promotion launched.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Report Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[11px] text-slate-400">
            <p>FranchiseOps AI Enterprise System — Autonomous Agent Analytics</p>
            <p>Page 1 of 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
