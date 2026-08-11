"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";

// Initial Mock Inventory Seed Data
const INITIAL_INVENTORY_ITEMS = [
  { id: 1, outletId: 1, outletName: "Bengaluru Central", itemName: "Espresso Coffee Beans", sku: "RAW-BEANS-01", category: "Raw Materials", currentStock: 12.5, maxCapacity: 100, unit: "kg", minThreshold: 25, unitCost: 450, burnRate: 8.5, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 2, outletId: 1, outletName: "Bengaluru Central", itemName: "Whole Dairy Milk", sku: "RAW-MILK-02", category: "Dairy", currentStock: 18.0, maxCapacity: 150, unit: "Liters", minThreshold: 35, unitCost: 65, burnRate: 28.0, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 3, outletId: 1, outletName: "Bengaluru Central", itemName: "Vanilla Flavored Syrup", sku: "SYRUP-VAN-01", category: "Beverage Additives", currentStock: 8.0, maxCapacity: 30, unit: "Bottles", minThreshold: 5, unitCost: 320, burnRate: 2.1, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 4, outletId: 2, outletName: "Hyderabad Tech Park", itemName: "Eco Takeaway Cups 350ml", sku: "PKG-CUP-350", category: "Packaging", currentStock: 140, maxCapacity: 2000, unit: "Units", minThreshold: 400, unitCost: 4.5, burnRate: 210.0, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 5, outletId: 2, outletName: "Hyderabad Tech Park", itemName: "Mozzarella Cheese Blocks", sku: "RAW-CHEESE-01", category: "Dairy & Frozen", currentStock: 4.2, maxCapacity: 50, unit: "kg", minThreshold: 10, unitCost: 380, burnRate: 5.2, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 6, outletId: 3, outletName: "Chennai Marina", itemName: "Artisan Bread Flour", sku: "RAW-FLOUR-01", category: "Bakery", currentStock: 85.0, maxCapacity: 200, unit: "kg", minThreshold: 40, unitCost: 48, burnRate: 14.0, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 7, outletId: 4, outletName: "Mumbai Andheri", itemName: "Dark Chocolate Sauce", sku: "SYRUP-CHOC-02", category: "Beverage Additives", currentStock: 2.1, maxCapacity: 25, unit: "Bottles", minThreshold: 6, unitCost: 290, burnRate: 3.5, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 8, outletId: 5, outletName: "Pune Hinjawadi", itemName: "Paper Napkins Pack (1000s)", sku: "PKG-NAP-100", category: "Packaging", currentStock: 45, maxCapacity: 100, unit: "Packs", minThreshold: 20, unitCost: 120, burnRate: 6.0, autoReorder: true, lastUpdated: new Date().toISOString() },
];

const INITIAL_AGENT_LOGS = [
  { id: 101, itemId: 1, itemName: "Espresso Coffee Beans", actionType: "stock_update", quantityChange: -3.5, triggeredBy: "POS Sensor Telemetry", notes: "Peak morning rush consumption recorded.", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 102, itemId: 5, itemName: "Mozzarella Cheese Blocks", actionType: "alert", quantityChange: 0, triggeredBy: "AI Inventory Agent", notes: "Stock level (4.2 kg) reached critical threshold (< 20%).", createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 103, itemId: 7, itemName: "Dark Chocolate Sauce", actionType: "reorder_triggered", quantityChange: 20, triggeredBy: "AI Inventory Agent", notes: "Automated Purchase Order PO-9921 issued to Supplier ChocoCorp.", createdAt: new Date(Date.now() - 900000).toISOString() },
];

export default function InventoryAgentPage() {
  const [items, setItems] = useState<any[]>(INITIAL_INVENTORY_ITEMS);
  const [agentLogs, setAgentLogs] = useState<any[]>(INITIAL_AGENT_LOGS);
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [activeItemForEdit, setActiveItemForEdit] = useState<any>(null);
  const [editNewStock, setEditNewStock] = useState("");
  const [editReason, setEditReason] = useState("");

  // Add SKU Modal State
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [newSkuData, setNewSkuData] = useState({
    itemName: "",
    sku: "",
    category: "Raw Materials",
    currentStock: "",
    maxCapacity: "",
    unit: "kg",
    minThreshold: "",
    unitCost: "",
    burnRate: "",
    outletName: "Bengaluru Central",
  });

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  // CSV Export Handler
  const exportInventoryToCsv = () => {
    if (filteredItems.length === 0) {
      showToast("No inventory records to export.", "warning");
      return;
    }
    const headers = ["ID", "Item Name", "SKU", "Category", "Location", "Current Stock", "Max Capacity", "Unit", "Unit Cost (INR)", "Burn Velocity", "Auto Reorder"];
    const rows = filteredItems.map((item) => [
      item.id,
      `"${item.itemName}"`,
      item.sku,
      item.category,
      `"${item.outletName}"`,
      item.currentStock,
      item.maxCapacity,
      item.unit,
      item.unitCost,
      item.burnRate,
      item.autoReorder ? "Yes" : "No",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FranchiseOps_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded Inventory CSV Report!", "success");
  };

  // Add SKU Submit Handler
  const handleAddSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkuData.itemName.trim() || !newSkuData.sku.trim()) {
      showToast("Please enter an Item Name and SKU.", "warning");
      return;
    }

    const newItem = {
      id: Date.now(),
      outletId: 1,
      outletName: newSkuData.outletName,
      itemName: newSkuData.itemName,
      sku: newSkuData.sku,
      category: newSkuData.category,
      currentStock: parseFloat(newSkuData.currentStock || "0"),
      maxCapacity: parseFloat(newSkuData.maxCapacity || "100"),
      unit: newSkuData.unit || "Units",
      minThreshold: parseFloat(newSkuData.minThreshold || "10"),
      unitCost: parseFloat(newSkuData.unitCost || "100"),
      burnRate: parseFloat(newSkuData.burnRate || "1.0"),
      autoReorder: true,
      lastUpdated: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);

    // Send API call if backend active
    try {
      axios.post("http://localhost:5000/api/inventory/add", newItem);
    } catch (e) {}

    setShowAddSkuModal(false);
    setNewSkuData({
      itemName: "",
      sku: "",
      category: "Raw Materials",
      currentStock: "",
      maxCapacity: "",
      unit: "kg",
      minThreshold: "",
      unitCost: "",
      burnRate: "",
      outletName: "Bengaluru Central",
    });
    showToast(`Added new SKU "${newItem.itemName}" to inventory!`, "success");
  };

  // Fetch Inventory from API if live
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/inventory");
        if (res.data && res.data.items && res.data.items.length > 0) {
          setItems(res.data.items);
        }
      } catch (err) {
        // Fallback to initial mock state if server offline
      }
    };
    loadInventory();
  }, []);

  const showToast = (message: string, type: "success" | "info" | "warning" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalItems = items.length;
    let criticalCount = 0;
    let warningCount = 0;
    let totalValue = 0;

    items.forEach((item) => {
      const pct = item.currentStock / item.maxCapacity;
      if (pct < 0.2) criticalCount++;
      else if (pct < 0.4) warningCount++;
      totalValue += item.currentStock * item.unitCost;
    });

    return { totalItems, criticalCount, warningCount, totalValue };
  }, [items]);

  // Filtered Inventory List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedOutlet !== "all" && String(item.outletId) !== String(selectedOutlet)) return false;

      const pct = item.currentStock / item.maxCapacity;
      if (selectedStatus === "critical" && pct >= 0.2) return false;
      if (selectedStatus === "warning" && (pct < 0.2 || pct >= 0.4)) return false;
      if (selectedStatus === "optimal" && pct < 0.4) return false;

      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.itemName.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchOutlet = item.outletName.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchOutlet) return false;
      }

      return true;
    });
  }, [items, selectedOutlet, selectedStatus, selectedCategory, searchQuery]);

  // Execute Autonomous AI Inventory Agent Optimization
  const handleRunAiAgent = () => {
    setIsAgentRunning(true);
    showToast("AI Inventory Agent analyzing stock burn rates across outlets...", "info");

    setTimeout(() => {
      let reorderedCount = 0;
      const updatedItems = items.map((item) => {
        const pct = item.currentStock / item.maxCapacity;
        if (pct < 0.25 && item.autoReorder) {
          reorderedCount++;
          const refillQty = Math.round(item.maxCapacity - item.currentStock);
          const poId = `PO-${Math.floor(1000 + Math.random() * 9000)}`;

          // Create agent log entry
          const newLog = {
            id: Date.now() + Math.random(),
            itemId: item.id,
            itemName: item.itemName,
            actionType: "reorder_triggered",
            quantityChange: refillQty,
            triggeredBy: "AI Inventory Agent",
            notes: `Automated ${poId} dispatched for ${refillQty} ${item.unit} (${item.outletName}).`,
            createdAt: new Date().toISOString(),
          };
          setAgentLogs((prev) => [newLog, ...prev]);

          return { ...item, currentStock: item.maxCapacity, lastUpdated: new Date().toISOString() };
        }
        return item;
      });

      setItems(updatedItems);
      setIsAgentRunning(false);

      if (reorderedCount > 0) {
        showToast(`AI Agent automatically dispatched Purchase Orders for ${reorderedCount} critical items!`, "success");
      } else {
        showToast("AI Agent Scan Complete: All stock levels are currently within safe operational limits.", "info");
      }
    }, 1500);
  };

  // Submit Manual Stock Update
  const handleStockUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForEdit) return;

    const newStockNum = parseFloat(editNewStock);
    if (isNaN(newStockNum) || newStockNum < 0) {
      showToast("Please enter a valid stock quantity.", "warning");
      return;
    }

    const prevStock = activeItemForEdit.currentStock;
    const diff = newStockNum - prevStock;

    // Update state
    setItems((prev) =>
      prev.map((item) => (item.id === activeItemForEdit.id ? { ...item, currentStock: newStockNum, lastUpdated: new Date().toISOString() } : item))
    );

    // Create log
    const logEntry = {
      id: Date.now(),
      itemId: activeItemForEdit.id,
      itemName: activeItemForEdit.itemName,
      actionType: "stock_update",
      quantityChange: diff,
      triggeredBy: "Store Manager",
      notes: editReason || `Manual inventory update from ${prevStock} to ${newStockNum} ${activeItemForEdit.unit}`,
      createdAt: new Date().toISOString(),
    };
    setAgentLogs((prev) => [logEntry, ...prev]);

    // Send API call if backend present
    try {
      axios.post("http://localhost:5000/api/inventory/update", {
        itemId: activeItemForEdit.id,
        newStock: newStockNum,
        reason: editReason,
        updatedBy: "Store Manager",
      });
    } catch (e) {}

    setActiveItemForEdit(null);
    setEditNewStock("");
    setEditReason("");
    showToast(`Updated stock for ${activeItemForEdit.itemName} to ${newStockNum} ${activeItemForEdit.unit}!`, "success");
  };

  // Toggle Auto Reorder
  const handleToggleAutoReorder = (id: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = !item.autoReorder;
          showToast(`Auto-reorder ${updated ? "enabled" : "disabled"} for ${item.itemName}`, "info");
          return { ...item, autoReorder: updated };
        }
        return item;
      })
    );
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white relative pb-12">
      {/* ── Background Glow ────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* ── Top Header Navigation ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  FranchiseOps <span className="text-indigo-400 font-extrabold text-xs uppercase tracking-wider">Inventory Agent</span>
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Telemetry Sync Active</span>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              <span>Back to Operations Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
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

      {/* ── Main Content Container ─────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8 relative z-10">

        {/* Banner Section */}
        <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-purple-900/60 border border-indigo-800/40 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-extrabold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>Autonomous Agent Step 4</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Real-Time Inventory Telemetry & Stock Prediction
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Monitors consumption velocity across all franchise locations, predicts stock depletion hours, and automatically triggers supplier purchase orders before stockout occurs.
            </p>
          </div>

          <button
            onClick={handleRunAiAgent}
            disabled={isAgentRunning}
            className="shrink-0 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl transition-all shadow-xl shadow-indigo-600/30 flex items-center space-x-2.5 active:scale-[0.98] disabled:opacity-75"
          >
            {isAgentRunning ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>AI Agent Scanning...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Run AI Stock Optimizer</span>
              </>
            )}
          </button>
        </div>

        {/* Summary KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active SKUs</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-2">{metrics.totalItems}</p>
            <p className="text-[11px] text-slate-400 mt-1">Tracked across 5 locations</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Critical Deficit (&lt;20%)</span>
              <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-black text-red-400 mt-2">{metrics.criticalCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Requires immediate stock order</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{metrics.warningCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Expected depletion within 48h</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock Value</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2">{formatCurrency(metrics.totalValue)}</p>
            <p className="text-[11px] text-slate-400 mt-1">Active inventory capital</p>
          </div>
        </div>

        {/* ── Control Bar & Filters ───────────────────────────────────────── */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search item, SKU, or location..."
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl py-2.5 pl-9 pr-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Outlet Filter */}
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Outlets (5)</option>
              <option value="1">Bengaluru Central</option>
              <option value="2">Hyderabad Tech Park</option>
              <option value="3">Chennai Marina</option>
              <option value="4">Mumbai Andheri</option>
              <option value="5">Pune Hinjawadi</option>
            </select>

            {/* Health Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Health Statuses</option>
              <option value="critical">🚨 Critical (&lt; 20%)</option>
              <option value="warning">⚠️ Low Warning (20-40%)</option>
              <option value="optimal">✅ Optimal (&gt;= 40%)</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Dairy">Dairy</option>
              <option value="Packaging">Packaging</option>
              <option value="Beverage Additives">Beverage Additives</option>
              <option value="Bakery">Bakery</option>
            </select>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 text-xs">
            <button
              onClick={exportInventoryToCsv}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-sm active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m0 0V4" />
              </svg>
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setShowAddSkuModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New SKU</span>
            </button>
          </div>
        </div>

        {/* ── Main Inventory Telemetry Table ─────────────────────────────────── */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Item & SKU</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Live Stock Telemetry</th>
                  <th className="py-3.5 px-4">Burn Velocity</th>
                  <th className="py-3.5 px-4">AI Days Remaining</th>
                  <th className="py-3.5 px-4">Auto Reorder</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredItems.map((item) => {
                  const pct = Math.round((item.currentStock / item.maxCapacity) * 100);
                  const isCritical = pct < 20;
                  const isWarning = pct >= 20 && pct < 40;
                  const daysLeft = (item.currentStock / item.burnRate).toFixed(1);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Item & SKU */}
                      <td className="py-4 px-4 font-medium">
                        <p className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{item.itemName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.sku}</p>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-300">{item.outletName}</span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </td>

                      {/* Live Telemetry Level Progress Bar */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-slate-200">
                              {item.currentStock} / {item.maxCapacity} {item.unit}
                            </span>
                            <span
                              className={`font-black ${
                                isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                              }`}
                            >
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isCritical
                                  ? "bg-gradient-to-r from-red-600 to-red-400 animate-pulse"
                                  : isWarning
                                  ? "bg-gradient-to-r from-amber-600 to-amber-400"
                                  : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Burn Velocity */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-slate-300">{item.burnRate} {item.unit}/day</span>
                      </td>

                      {/* AI Days Remaining */}
                      <td className="py-4 px-4">
                        <span
                          className={`font-extrabold ${
                            parseFloat(daysLeft) < 1.5 ? "text-red-400" : parseFloat(daysLeft) < 3 ? "text-amber-400" : "text-slate-300"
                          }`}
                        >
                          {daysLeft} Days
                        </span>
                      </td>

                      {/* Auto Reorder Switch */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAutoReorder(item.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.autoReorder ? "bg-indigo-600" : "bg-slate-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              item.autoReorder ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setActiveItemForEdit(item);
                              setEditNewStock(String(item.currentStock));
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Update Stock Quantity"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => {
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, currentStock: i.maxCapacity, lastUpdated: new Date().toISOString() } : i
                                )
                              );
                              showToast(`Dispatched PO for ${item.itemName} (${item.outletName})`, "success");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-[11px] transition-all flex items-center space-x-1"
                          >
                            <span>1-Click PO</span>
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

        {/* ── Live Agent Event Stream ────────────────────────────────────────── */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
              <h3 className="text-sm font-extrabold text-white">Live AI Agent Action Audit Trail</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Real-Time Event Stream</span>
          </div>

          <div className="space-y-3">
            {agentLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start space-x-3 text-xs">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{log.itemName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">{log.notes}</p>
                  <div className="mt-1 flex items-center space-x-2 text-[10px]">
                    <span className="text-indigo-400 font-semibold">Triggered by: {log.triggeredBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Quick Stock Update Modal ────────────────────────────────────────── */}
      {activeItemForEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-white">Update Stock Telemetry</h3>
                <p className="text-xs text-slate-400">{activeItemForEdit.itemName} ({activeItemForEdit.outletName})</p>
              </div>
              <button onClick={() => setActiveItemForEdit(null)} className="text-slate-500 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Stock Level ({activeItemForEdit.unit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={editNewStock}
                  onChange={(e) => setEditNewStock(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Audit Reason / Telemetry Source</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Physical stock count / Delivery shipment arrived"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveItemForEdit(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Save Stock Telemetry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add New SKU Item Modal ────────────────────────────────────────── */}
      {showAddSkuModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <h3 className="text-base font-black text-white">Add New Inventory SKU</h3>
                <p className="text-xs text-slate-400">Register new raw material or packaging item for tracking</p>
              </div>
              <button onClick={() => setShowAddSkuModal(false)} className="text-slate-500 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSkuSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={newSkuData.itemName}
                    onChange={(e) => setNewSkuData({ ...newSkuData, itemName: e.target.value })}
                    placeholder="e.g. Arabica Coffee Beans"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={newSkuData.sku}
                    onChange={(e) => setNewSkuData({ ...newSkuData, sku: e.target.value })}
                    placeholder="RAW-ARAB-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={newSkuData.category}
                    onChange={(e) => setNewSkuData({ ...newSkuData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Beverage Additives">Beverage Additives</option>
                    <option value="Bakery">Bakery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Outlet Location</label>
                  <select
                    value={newSkuData.outletName}
                    onChange={(e) => setNewSkuData({ ...newSkuData, outletName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Bengaluru Central">Bengaluru Central</option>
                    <option value="Hyderabad Tech Park">Hyderabad Tech Park</option>
                    <option value="Chennai Marina">Chennai Marina</option>
                    <option value="Mumbai Andheri">Mumbai Andheri</option>
                    <option value="Pune Hinjawadi">Pune Hinjawadi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newSkuData.currentStock}
                    onChange={(e) => setNewSkuData({ ...newSkuData, currentStock: e.target.value })}
                    placeholder="50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Max Capacity</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newSkuData.maxCapacity}
                    onChange={(e) => setNewSkuData({ ...newSkuData, maxCapacity: e.target.value })}
                    placeholder="200"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    value={newSkuData.unit}
                    onChange={(e) => setNewSkuData({ ...newSkuData, unit: e.target.value })}
                    placeholder="kg / Liters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    value={newSkuData.unitCost}
                    onChange={(e) => setNewSkuData({ ...newSkuData, unitCost: e.target.value })}
                    placeholder="450"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Daily Burn Velocity</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newSkuData.burnRate}
                    onChange={(e) => setNewSkuData({ ...newSkuData, burnRate: e.target.value })}
                    placeholder="8.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSkuModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Register SKU Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
