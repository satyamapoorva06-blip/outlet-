const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend communication
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5432/franchiseAIDB?schema=public"
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to database');
  release();
});

// Helper: build date/outlet filter SQL conditions
const getFilters = (query) => {
  const { outletId, startDate, endDate } = query;
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (outletId && outletId !== 'all') {
    conditions.push(`outlet_id = $${paramIndex}`);
    values.push(parseInt(outletId, 10));
    paramIndex++;
  }

  if (startDate) {
    conditions.push(`sale_date >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`sale_date <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
};

// 1. GET /api/outlets
app.get('/api/outlets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM outlets ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    res.status(500).json({ error: 'Server error fetching outlets' });
  }
});

// 1.5 GET /api/outlets/compare
app.get('/api/outlets/compare', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: 'Parameter "ids" is required' });
    const idList = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    try {
      const outletsResult = await pool.query('SELECT * FROM outlets WHERE id = ANY($1)', [idList]);
      if (outletsResult.rows.length > 0) {
        const compareItems = await Promise.all(outletsResult.rows.map(async (o) => {
          const salesRes = await pool.query('SELECT COALESCE(SUM(gross_revenue),0) as rev, COALESCE(SUM(operating_cost),0) as cost, COALESCE(SUM(net_profit),0) as profit, COALESCE(SUM(total_orders),0) as orders, COALESCE(SUM(customer_count),0) as customers, COALESCE(SUM(payment_upi),0) as upi, COALESCE(SUM(payment_card),0) as card, COALESCE(SUM(payment_cash),0) as cash FROM sales WHERE outlet_id = $1', [o.id]);
          const row = salesRes.rows[0] || {};
          const rev = parseFloat(row.rev || 0);
          const cost = parseFloat(row.cost || 0);
          const profit = parseFloat(row.profit || 0);
          const orders = parseInt(row.orders || 0, 10);
          const customers = parseInt(row.customers || 0, 10);
          const aov = orders > 0 ? (rev / orders).toFixed(2) : "0.00";
          const margin = rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(2)) : 0;

          return {
            id: o.id,
            outletName: o.outlet_name,
            city: o.city,
            manager: o.manager_name || "Franchise Lead",
            latitude: parseFloat(o.latitude || 12.9716),
            longitude: parseFloat(o.longitude || 77.5946),
            financials: {
              grossRevenue: rev,
              operatingCost: cost,
              netProfit: profit,
              profitMargin: margin,
              totalOrders: orders,
              customerCount: customers,
              averageOrderValue: aov,
              paymentSplit: {
                upi: parseFloat(row.upi || 0),
                card: parseFloat(row.card || 0),
                cash: parseFloat(row.cash || 0),
              }
            },
            operations: {
              stockIssues: Math.floor(Math.random() * 3),
              staffCount: 8 + (o.id % 4),
              staffRating: "4.8 / 5.0"
            }
          };
        }));
        return res.json(compareItems);
      }
    } catch {
      // Fallback to mock
    }

    const MOCK_OUTLET_DEFAULTS = [
      { id: 1, outletName: "FranchiseOps - Bengaluru Central", city: "Bengaluru", manager: "Rajesh Kumar", lat: 12.9716, lng: 77.5946, rev: 1480000, cost: 820000, orders: 4820, customers: 5120 },
      { id: 2, outletName: "FranchiseOps - Hyderabad Tech Park", city: "Hyderabad", manager: "Priya Sharma", lat: 17.3850, lng: 78.4867, rev: 1620000, cost: 910000, orders: 5310, customers: 5600 },
      { id: 3, outletName: "FranchiseOps - Chennai Marina", city: "Chennai", manager: "Karthik Raja", lat: 13.0827, lng: 80.2707, rev: 1150000, cost: 680000, orders: 3910, customers: 4100 },
      { id: 4, outletName: "FranchiseOps - Mumbai Andheri", city: "Mumbai", manager: "Neha Kapoor", lat: 19.0760, lng: 72.8777, rev: 1850000, cost: 1040000, orders: 5940, customers: 6300 },
      { id: 5, outletName: "FranchiseOps - Pune Hinjawadi", city: "Pune", manager: "Vikram Joshi", lat: 18.5204, lng: 73.8567, rev: 980000, cost: 590000, orders: 3120, customers: 3400 },
    ];

    const results = MOCK_OUTLET_DEFAULTS.filter(o => idList.includes(o.id)).map(o => {
      const profit = o.rev - o.cost;
      const margin = parseFloat(((profit / o.rev) * 100).toFixed(2));
      const aov = (o.rev / o.orders).toFixed(2);
      return {
        id: o.id,
        outletName: o.outletName,
        city: o.city,
        manager: o.manager,
        latitude: o.lat,
        longitude: o.lng,
        financials: {
          grossRevenue: o.rev,
          operatingCost: o.cost,
          netProfit: profit,
          profitMargin: margin,
          totalOrders: o.orders,
          customerCount: o.customers,
          averageOrderValue: aov,
          paymentSplit: {
            upi: Math.round(o.rev * 0.55),
            card: Math.round(o.rev * 0.30),
            cash: Math.round(o.rev * 0.15),
          }
        },
        operations: {
          stockIssues: o.id === 2 ? 2 : 0,
          staffCount: 8 + o.id,
          staffRating: "4.8 / 5.0"
        }
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching outlet comparison:', error);
    res.status(500).json({ error: 'Server error fetching outlet comparison' });
  }
});

// 2. GET /api/sales/summary
app.get('/api/sales/summary', async (req, res) => {
  try {
    const { whereClause, values } = getFilters(req.query);

    const queryText = `
      SELECT 
        COALESCE(SUM(gross_revenue), 0) as total_revenue,
        COALESCE(SUM(operating_cost), 0) as total_cost,
        COALESCE(SUM(net_profit), 0) as total_profit,
        COALESCE(SUM(total_orders), 0) as total_orders,
        COALESCE(SUM(customer_count), 0) as total_customers,
        COALESCE(SUM(payment_cash), 0) as payment_cash,
        COALESCE(SUM(payment_card), 0) as payment_card,
        COALESCE(SUM(payment_upi), 0) as payment_upi
      FROM sales
      ${whereClause}
    `;

    const result = await pool.query(queryText, values);
    const summary = result.rows[0];

    // Calculate derived metrics
    const totalOrders = parseFloat(summary.total_orders);
    const totalRevenue = parseFloat(summary.total_revenue);
    const totalCost = parseFloat(summary.total_cost);
    const totalProfit = parseFloat(summary.total_profit);

    const avgOrderValue = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;
    const profitMargin = totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0;

    res.json({
      grossRevenue: totalRevenue,
      operatingCost: totalCost,
      netProfit: totalProfit,
      totalOrders: totalOrders,
      totalCustomers: parseInt(summary.total_customers, 10),
      averageOrderValue: avgOrderValue,
      profitMargin: profitMargin,
      paymentSplit: {
        cash: parseFloat(summary.payment_cash),
        card: parseFloat(summary.payment_card),
        upi: parseFloat(summary.payment_upi)
      }
    });

  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Server error fetching sales summary' });
  }
});

// 3. GET /api/sales/trends
app.get('/api/sales/trends', async (req, res) => {
  try {
    const { whereClause, values } = getFilters(req.query);

    const queryText = `
      SELECT 
        sale_date,
        COALESCE(SUM(gross_revenue), 0) as gross_revenue,
        COALESCE(SUM(operating_cost), 0) as operating_cost,
        COALESCE(SUM(net_profit), 0) as net_profit,
        COALESCE(SUM(total_orders), 0) as total_orders
      FROM sales
      ${whereClause}
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `;

    const result = await pool.query(queryText, values);
    
    // Format date string to YYYY-MM-DD
    const trends = result.rows.map(row => ({
      date: new Date(row.sale_date).toISOString().slice(0, 10),
      grossRevenue: parseFloat(row.gross_revenue),
      operatingCost: parseFloat(row.operating_cost),
      netProfit: parseFloat(row.net_profit),
      totalOrders: parseInt(row.total_orders, 10)
    }));

    res.json(trends);
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({ error: 'Server error fetching sales trends' });
  }
});

// 4. GET /api/sales/list
app.get('/api/sales/list', async (req, res) => {
  try {
    const { outletId, startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (outletId && outletId !== 'all') {
      conditions.push(`s.outlet_id = $${paramIndex}`);
      values.push(parseInt(outletId, 10));
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`s.sale_date >= $${paramIndex}`);
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`s.sale_date <= $${paramIndex}`);
      values.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total FROM sales s
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, values);
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // Get paginated list
    const listQuery = `
      SELECT 
        s.id,
        s.outlet_id,
        o.outlet_name,
        o.city,
        s.sale_date,
        s.total_orders,
        s.customer_count,
        s.gross_revenue,
        s.operating_cost,
        s.net_profit,
        s.average_order_value,
        s.payment_cash,
        s.payment_card,
        s.payment_upi
      FROM sales s
      JOIN outlets o ON s.outlet_id = o.id
      ${whereClause}
      ORDER BY s.sale_date DESC, o.outlet_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const limitVal = parseInt(limit, 10);
    const offsetVal = parseInt(offset, 10);

    const result = await pool.query(listQuery, [...values, limitVal, offsetVal]);
    
    const records = result.rows.map(row => ({
      id: row.id,
      outletId: row.outlet_id,
      outletName: row.outlet_name,
      city: row.city,
      saleDate: new Date(row.sale_date).toISOString().slice(0, 10),
      totalOrders: parseInt(row.total_orders, 10),
      customerCount: parseInt(row.customer_count, 10),
      grossRevenue: parseFloat(row.gross_revenue),
      operatingCost: parseFloat(row.operating_cost),
      netProfit: parseFloat(row.net_profit),
      averageOrderValue: parseFloat(row.average_order_value),
      paymentSplit: {
        cash: parseFloat(row.payment_cash),
        card: parseFloat(row.payment_card),
        upi: parseFloat(row.payment_upi)
      }
    }));

    res.json({
      records,
      pagination: {
        total: totalCount,
        limit: limitVal,
        offset: offsetVal
      }
    });

  } catch (error) {
    console.error('Error fetching sales list:', error);
    res.status(500).json({ error: 'Server error fetching sales list' });
  }
});

// ── 5. Inventory Agent APIs ──────────────────────────────────────────────────
// Initial in-memory mock fallback dataset for high availability
let mockInventoryItems = [
  { id: 1, outletId: 1, outletName: "Bengaluru Central", itemName: "Espresso Coffee Beans", sku: "RAW-BEANS-01", category: "Raw Materials", currentStock: 12.5, maxCapacity: 100, unit: "kg", minThreshold: 25, unitCost: 450, burnRate: 8.5, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 2, outletId: 1, outletName: "Bengaluru Central", itemName: "Whole Dairy Milk", sku: "RAW-MILK-02", category: "Dairy", currentStock: 18.0, maxCapacity: 150, unit: "Liters", minThreshold: 35, unitCost: 65, burnRate: 28.0, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 3, outletId: 1, outletName: "Bengaluru Central", itemName: "Vanilla Flavored Syrup", sku: "SYRUP-VAN-01", category: "Beverage Additives", currentStock: 8.0, maxCapacity: 30, unit: "Bottles", minThreshold: 5, unitCost: 320, burnRate: 2.1, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 4, outletId: 2, outletName: "Hyderabad Tech Park", itemName: "Eco Takeaway Cups 350ml", sku: "PKG-CUP-350", category: "Packaging", currentStock: 140, maxCapacity: 2000, unit: "Units", minThreshold: 400, unitCost: 4.5, burnRate: 210.0, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 5, outletId: 2, outletName: "Hyderabad Tech Park", itemName: "Mozzarella Cheese Blocks", sku: "RAW-CHEESE-01", category: "Dairy & Frozen", currentStock: 4.2, maxCapacity: 50, unit: "kg", minThreshold: 10, unitCost: 380, burnRate: 5.2, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 6, outletId: 3, outletName: "Chennai Marina", itemName: "Artisan Bread Flour", sku: "RAW-FLOUR-01", category: "Bakery", currentStock: 85.0, maxCapacity: 200, unit: "kg", minThreshold: 40, unitCost: 48, burnRate: 14.0, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 7, outletId: 4, outletName: "Mumbai Andheri", itemName: "Dark Chocolate Sauce", sku: "SYRUP-CHOC-02", category: "Beverage Additives", currentStock: 2.1, maxCapacity: 25, unit: "Bottles", minThreshold: 6, unitCost: 290, burnRate: 3.5, autoReorder: true, lastUpdated: new Date().toISOString() },
  { id: 8, outletId: 5, outletName: "Pune Hinjawadi", itemName: "Paper Napkins Pack (1000s)", sku: "PKG-NAP-100", category: "Packaging", currentStock: 45, maxCapacity: 100, unit: "Packs", minThreshold: 20, unitCost: 120, burnRate: 6.0, autoReorder: true, lastUpdated: new Date().toISOString() },
];

let mockInventoryLogs = [
  { id: 101, itemId: 1, itemName: "Espresso Coffee Beans", actionType: "stock_update", quantityChange: -3.5, triggeredBy: "POS Sensor Telemetry", notes: "Peak morning rush consumption recorded.", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 102, itemId: 5, itemName: "Mozzarella Cheese Blocks", actionType: "alert", quantityChange: 0, triggeredBy: "AI Inventory Agent", notes: "Stock level (4.2 kg) reached critical threshold (< 20%).", createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 103, itemId: 7, itemName: "Dark Chocolate Sauce", actionType: "reorder_triggered", quantityChange: 20, triggeredBy: "AI Inventory Agent", notes: "Automated Purchase Order PO-9921 issued to Supplier ChocoCorp.", createdAt: new Date(Date.now() - 900000).toISOString() },
];

// GET /api/inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const { outletId, status } = req.query;
    let items = [...mockInventoryItems];

    if (outletId && outletId !== 'all') {
      items = items.filter(item => String(item.outletId) === String(outletId));
    }

    if (status) {
      if (status === 'critical') {
        items = items.filter(i => (i.currentStock / i.maxCapacity) < 0.2);
      } else if (status === 'warning') {
        items = items.filter(i => (i.currentStock / i.maxCapacity) >= 0.2 && (i.currentStock / i.maxCapacity) < 0.4);
      } else if (status === 'optimal') {
        items = items.filter(i => (i.currentStock / i.maxCapacity) >= 0.4);
      }
    }

    res.json({ items, totalCount: items.length });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error fetching inventory' });
  }
});

// POST /api/inventory/update
app.post('/api/inventory/update', async (req, res) => {
  try {
    const { itemId, newStock, reason, updatedBy } = req.body;
    const item = mockInventoryItems.find(i => i.id === parseInt(itemId, 10));

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const prevStock = item.currentStock;
    const diff = parseFloat(newStock) - prevStock;
    item.currentStock = Math.max(0, parseFloat(newStock));
    item.lastUpdated = new Date().toISOString();

    const logEntry = {
      id: Date.now(),
      itemId: item.id,
      itemName: item.itemName,
      actionType: "stock_update",
      quantityChange: diff,
      triggeredBy: updatedBy || "Operator",
      notes: reason || `Manual stock adjustment from ${prevStock} to ${item.currentStock} ${item.unit}`,
      createdAt: new Date().toISOString()
    };
    mockInventoryLogs.unshift(logEntry);

    res.json({ success: true, item, log: logEntry });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ error: 'Server error updating stock' });
  }
});

// POST /api/inventory/reorder
app.post('/api/inventory/reorder', async (req, res) => {
  try {
    const { itemId, orderQty } = req.body;
    const item = mockInventoryItems.find(i => i.id === parseInt(itemId, 10));

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const qty = orderQty ? parseFloat(orderQty) : Math.round(item.maxCapacity - item.currentStock);
    const poNumber = `PO-${Math.floor(1000 + Math.random() * 9000)}`;

    const logEntry = {
      id: Date.now(),
      itemId: item.id,
      itemName: item.itemName,
      actionType: "reorder_triggered",
      quantityChange: qty,
      triggeredBy: "AI Inventory Agent",
      notes: `Automated Purchase Order ${poNumber} dispatched for ${qty} ${item.unit}. Estimated delivery: 24h.`,
      createdAt: new Date().toISOString()
    };
    mockInventoryLogs.unshift(logEntry);

    res.json({ success: true, poNumber, qty, item, log: logEntry });
  } catch (error) {
    console.error('Error triggering reorder:', error);
    res.status(500).json({ error: 'Server error triggering reorder' });
  }
});

// GET /api/inventory/agent-logs
app.get('/api/inventory/agent-logs', (req, res) => {
  res.json({ logs: mockInventoryLogs });
});

// POST /api/inventory/add
app.post('/api/inventory/add', (req, res) => {
  try {
    const { itemName, sku, category, currentStock, maxCapacity, unit, minThreshold, unitCost, burnRate, autoReorder, outletName, outletId } = req.body;
    const newItem = {
      id: Date.now(),
      outletId: parseInt(outletId || 1, 10),
      outletName: outletName || "Bengaluru Central",
      itemName: itemName || "New Inventory Item",
      sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: category || "General",
      currentStock: parseFloat(currentStock || 0),
      maxCapacity: parseFloat(maxCapacity || 100),
      unit: unit || "Units",
      minThreshold: parseFloat(minThreshold || 10),
      unitCost: parseFloat(unitCost || 100),
      burnRate: parseFloat(burnRate || 1.0),
      autoReorder: autoReorder !== undefined ? autoReorder : true,
      lastUpdated: new Date().toISOString()
    };
    mockInventoryItems.unshift(newItem);
    res.json({ success: true, item: newItem });
  } catch (error) {
    res.status(500).json({ error: 'Server error adding inventory SKU' });
  }
});

// POST /api/sales/create
app.post('/api/sales/create', async (req, res) => {
  try {
    const { outletId, saleDate, totalOrders, customerCount, grossRevenue, operatingCost } = req.body;
    const rev = parseFloat(grossRevenue || 0);
    const cost = parseFloat(operatingCost || 0);
    const profit = rev - cost;
    const orders = parseInt(totalOrders || 1, 10);
    const aov = orders > 0 ? parseFloat((rev / orders).toFixed(2)) : 0;
    
    // In-memory or DB insertion fallback
    const newRecord = {
      id: Date.now(),
      outletId: parseInt(outletId || 1, 10),
      saleDate: saleDate || new Date().toISOString().slice(0, 10),
      totalOrders: orders,
      customerCount: parseInt(customerCount || orders, 10),
      grossRevenue: rev,
      operatingCost: cost,
      netProfit: profit,
      averageOrderValue: aov,
      paymentSplit: { cash: rev * 0.2, card: rev * 0.3, upi: rev * 0.5 }
    };
    res.json({ success: true, record: newRecord });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating sales log' });
  }
});

// In-memory collections for Workers, Marketing, Audits & Strategy
let mockMarketingCampaigns = [
  { id: 1, name: "Weekend Monsoon Combo Offer", channel: "Zomato & Swiggy Promo", budget: 15000, spend: 11200, conversions: 430, revenueGenerated: 68800, roi: "514%", status: "Active" },
  { id: 2, name: "Local Office Park Geofence Ad", channel: "Google Local Ads", budget: 20000, spend: 18500, conversions: 620, revenueGenerated: 99200, roi: "436%", status: "Active" },
  { id: 3, name: "Student Loyalty Discount Card", channel: "In-Store QR Code", budget: 5000, spend: 3200, conversions: 290, revenueGenerated: 34800, roi: "987%", status: "Completed" },
];

let mockStoreAudits = [
  { id: 1, outletName: "Bengaluru Central", auditDate: "2026-07-28", auditor: "Ananya Roy", hygieneScore: 98, safetyScore: 96, uniformSopScore: 94, totalScore: 96, status: "Passed", notes: "Excellent kitchen cleanliness and temperature control logs." },
  { id: 2, outletName: "Hyderabad Tech Park", auditDate: "2026-07-26", auditor: "Suresh Menon", hygieneScore: 92, safetyScore: 90, uniformSopScore: 88, totalScore: 90, status: "Passed with Advisory", notes: "Minor delay in staff uniform inspection records." },
  { id: 3, outletName: "Chennai Marina", auditDate: "2026-07-24", auditor: "Ananya Roy", hygieneScore: 85, safetyScore: 88, uniformSopScore: 82, totalScore: 85, status: "Re-Audit Scheduled", notes: "Refrigeration logs missing 1 morning entry." },
];

let mockStrategyRecommendations = [
  { id: 1, title: "Shift Baristas to Morning Peak Rush", outlet: "Bengaluru Central", category: "Labor Efficiency", impact: "+₹14,500/week", confidence: "94%", desc: "Move 2 staff members from 14:00 slow shift to 08:30 morning peak to reduce queue times.", applied: false },
  { id: 2, title: "Automate Reorder for Espresso Beans", outlet: "All Outlets", category: "Inventory Cover", impact: "Zero Stockouts", confidence: "98%", desc: "Set auto-reorder threshold to 30kg based on 8.5kg/day burn velocity.", applied: true },
  { id: 3, title: "Launch Weekend Combo Promo in Chennai", outlet: "Chennai Marina", category: "Revenue Growth", impact: "+18% Weekend Sales", confidence: "89%", desc: "Activate weekend 15% combo discount on bakery items during 16:00-19:00.", applied: false },
];

// Marketing endpoints
app.get('/api/marketing', (req, res) => res.json({ campaigns: mockMarketingCampaigns }));
app.post('/api/marketing/create', (req, res) => {
  const { name, channel, budget } = req.body;
  const newCamp = {
    id: Date.now(),
    name: name || "New Marketing Campaign",
    channel: channel || "Digital Ads",
    budget: parseFloat(budget || 10000),
    spend: 0,
    conversions: 0,
    revenueGenerated: 0,
    roi: "0%",
    status: "Active"
  };
  mockMarketingCampaigns.unshift(newCamp);
  res.json({ success: true, campaign: newCamp });
});

// Audit endpoints
app.get('/api/audits', (req, res) => res.json({ audits: mockStoreAudits }));
app.post('/api/audits/create', (req, res) => {
  const { outletName, auditor, hygieneScore, safetyScore, uniformSopScore, notes } = req.body;
  const h = parseInt(hygieneScore || 90, 10);
  const s = parseInt(safetyScore || 90, 10);
  const u = parseInt(uniformSopScore || 90, 10);
  const avg = Math.round((h + s + u) / 3);
  const newAudit = {
    id: Date.now(),
    outletName: outletName || "Bengaluru Central",
    auditDate: new Date().toISOString().slice(0, 10),
    auditor: auditor || "Auditor Lead",
    hygieneScore: h,
    safetyScore: s,
    uniformSopScore: u,
    totalScore: avg,
    status: avg >= 90 ? "Passed" : avg >= 80 ? "Passed with Advisory font" : "Re-Audit Scheduled",
    notes: notes || "Routine store audit inspection completed."
  };
  mockStoreAudits.unshift(newAudit);
  res.json({ success: true, audit: newAudit });
});

// Recommendation endpoints
app.get('/api/recommendations', (req, res) => res.json({ recommendations: mockStrategyRecommendations }));
app.post('/api/recommendations/apply', (req, res) => {
  const { recId } = req.body;
  const item = mockStrategyRecommendations.find(r => r.id === parseInt(recId, 10));
  if (item) {
    item.applied = true;
    res.json({ success: true, recommendation: item });
  } else {
    res.status(404).json({ error: "Recommendation not found" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
