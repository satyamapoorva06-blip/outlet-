"use client";

import React, { useState, useEffect } from "react";

interface LocationData {
  id: number;
  name: string;
  manager: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  metrics: {
    revenue: number;
    profit: number;
    orders: number;
    avgAov: string;
    profitMargin: string;
    stockAlerts: number;
    staffCount: number;
  };
  healthScore: number;
  statusTag: "Optimal" | "Healthy" | "Warning" | "Critical";
}

interface MapComponentProps {
  locations: LocationData[];
  selectedLocationIds: number[];
  onToggleSelectLocation: (id: number) => void;
  onOpenCompare: () => void;
}

export default function MapComponent({
  locations,
  selectedLocationIds,
  onToggleSelectLocation,
  onOpenCompare
}: MapComponentProps) {
  const [activePopupId, setActivePopupId] = useState<number | null>(null);

  // Map coordinates normalization for India map bounding box view
  // Min Lat: 8.0, Max Lat: 22.0 | Min Lng: 72.0, Max Lng: 82.0
  const getMapCoordinates = (lat: number, lng: number) => {
    const minLat = 10.0;
    const maxLat = 20.5;
    const minLng = 71.5;
    const maxLng = 81.5;

    // Convert to percentage for relative positioning
    const x = Math.min(92, Math.max(8, ((lng - minLng) / (maxLng - minLng)) * 100));
    const y = Math.min(92, Math.max(8, (1 - (lat - minLat) / (maxLat - minLat)) * 100));

    return { x, y };
  };

  const getStatusBadgeColor = (tag: string) => {
    switch (tag) {
      case "Optimal":
        return "bg-emerald-500 text-white shadow-emerald-200";
      case "Healthy":
        return "bg-blue-500 text-white shadow-blue-200";
      case "Warning":
        return "bg-amber-500 text-white shadow-amber-200";
      case "Critical":
        return "bg-rose-500 text-white shadow-rose-200";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getPinColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald
    if (score >= 65) return "#3b82f6"; // Blue
    if (score >= 50) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  const activeLocation = locations.find((l) => l.id === activePopupId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Franchise Geographic Network Map</h3>
              <p className="text-xs text-slate-500">Real-time store performance, health scores & geographic metrics</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
            Selected: <span className="font-bold text-indigo-600">{selectedLocationIds.length} stores</span>
          </div>

          <button
            onClick={onOpenCompare}
            disabled={selectedLocationIds.length < 2}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 ${
              selectedLocationIds.length >= 2
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
            <span>Compare Selected ({selectedLocationIds.length})</span>
          </button>
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <div className="relative w-full h-[420px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
        {/* Map Grid / Topography background overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

        {/* Territory SVG Contour Map outline of South-Central India */}
        <svg className="absolute inset-0 w-full h-full text-slate-800 opacity-30 pointer-events-none" viewBox="0 0 800 500">
          <path fill="currentColor" d="M150,80 Q250,50 400,90 T650,120 Q700,250 620,380 T400,480 Q220,450 160,320 Z" />
          <path fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" d="M200,100 L600,100 M200,250 L600,250 M200,400 L600,400 M300,50 L300,450 M500,50 L500,450" />
        </svg>

        {/* Legend */}
        <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 text-white text-xs space-y-1.5 shadow-lg">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Health Score Map Pin</div>
          <div className="flex items-center space-x-3 text-[11px]">
            <div className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>≥80 Optimal</span></div>
            <div className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span>65-79 Healthy</span></div>
            <div className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>50-64 Warning</span></div>
            <div className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span>&lt;50 Critical</span></div>
          </div>
        </div>

        {/* Location Markers */}
        {locations.map((loc) => {
          const { x, y } = getMapCoordinates(loc.latitude, loc.longitude);
          const isSelected = selectedLocationIds.includes(loc.id);
          const isPopupOpen = activePopupId === loc.id;
          const pinColor = getPinColor(loc.healthScore);

          return (
            <div
              key={loc.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300"
            >
              {/* Pulsing ring for selected locations */}
              {isSelected && (
                <span className="absolute -inset-2 rounded-full bg-indigo-500/40 animate-ping"></span>
              )}

              {/* Pin Marker Button */}
              <button
                onClick={() => setActivePopupId(isPopupOpen ? null : loc.id)}
                className={`relative group flex items-center justify-center p-2 rounded-full shadow-lg transition-transform duration-200 cursor-pointer ${
                  isPopupOpen ? "scale-125 z-30" : "hover:scale-110"
                }`}
                style={{ backgroundColor: pinColor }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>

                {/* City Tooltip Label */}
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap border border-slate-700">
                  {loc.city} ({loc.healthScore})
                </div>
              </button>
            </div>
          );
        })}

        {/* Detailed Active Popup Card */}
        {activeLocation && (
          <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-30 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-4 border border-slate-700 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeColor(activeLocation.statusTag)}`}>
                  {activeLocation.statusTag} ({activeLocation.healthScore}/100)
                </span>
                <h4 className="text-base font-bold text-white mt-1">{activeLocation.name}</h4>
                <p className="text-xs text-slate-400">{activeLocation.city}, {activeLocation.state} • Manager: {activeLocation.manager}</p>
              </div>
              <button
                onClick={() => setActivePopupId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Gross Revenue</span>
                <span className="font-semibold text-emerald-400">₹{activeLocation.metrics.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Profit Margin</span>
                <span className="font-semibold text-cyan-400">{activeLocation.metrics.profitMargin}%</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Total Orders</span>
                <span className="font-semibold text-white">{activeLocation.metrics.orders.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block">Stock Alerts</span>
                <span className={`font-semibold ${activeLocation.metrics.stockAlerts > 0 ? "text-amber-400" : "text-slate-300"}`}>
                  {activeLocation.metrics.stockAlerts} Low Stock
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => onToggleSelectLocation(activeLocation.id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  selectedLocationIds.includes(activeLocation.id)
                    ? "bg-slate-700 hover:bg-slate-600 text-amber-300 border border-amber-400/40"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                <span>{selectedLocationIds.includes(activeLocation.id) ? "✓ Selected for Compare" : "+ Select for Compare"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outlet Selection Quick Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium text-slate-500 mr-1">Quick Select:</span>
        {locations.map((loc) => {
          const isSelected = selectedLocationIds.includes(loc.id);
          return (
            <button
              key={loc.id}
              onClick={() => onToggleSelectLocation(loc.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer border ${
                isSelected
                  ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-indigo-600" : "bg-slate-400"}`}></span>
              <span>{loc.city}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200/60 rounded text-slate-600 font-bold">{loc.healthScore}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
