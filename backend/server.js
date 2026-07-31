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

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
