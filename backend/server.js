const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'franchiseops_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5432/franchiseAIDB?schema=public"
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring PostgreSQL client:', err.stack);
  } else {
    console.log('Successfully connected to PostgreSQL database');
    release();
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

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

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'MANAGER', outletId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, outlet_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, outlet_id, created_at`,
      [name, email.toLowerCase(), hashedPassword, role.toUpperCase(), outletId ? parseInt(outletId, 10) : null]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outlet_id: user.outlet_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Account created successfully', token, user });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error creating account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.outlet_id, o.outlet_name, o.city
       FROM users u
       LEFT JOIN outlets o ON u.outlet_id = o.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outlet_id: user.outlet_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;
    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error authenticating user' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.outlet_id, o.outlet_name, o.city
       FROM users u
       LEFT JOIN outlets o ON u.outlet_id = o.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// ==========================================
// 2. OUTLET PERFORMANCE, HEALTH SCORE & MAP COMPARISON ENDPOINTS
// ==========================================
app.get('/api/outlets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM outlets WHERE is_active = true ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    res.status(500).json({ error: 'Server error fetching outlets' });
  }
});

app.get('/api/outlets/locations', authenticateToken, async (req, res) => {
  try {
    const queryText = `
      SELECT 
        o.id,
        o.outlet_name,
        o.manager_name,
        o.address,
        o.city,
        o.state,
        o.latitude,
        o.longitude,
        COALESCE(SUM(s.gross_revenue), 0) as total_revenue,
        COALESCE(SUM(s.net_profit), 0) as total_profit,
        COALESCE(SUM(s.total_orders), 0) as total_orders,
        COALESCE(AVG(s.average_order_value), 0) as avg_aov,
        (SELECT COUNT(*) FROM inventory i WHERE i.outlet_id = o.id AND i.status IN ('Low Stock', 'Critical')) as stock_alerts,
        (SELECT COUNT(*) FROM staff st WHERE st.outlet_id = o.id AND st.status = 'Active') as staff_count
      FROM outlets o
      LEFT JOIN sales s ON o.id = s.outlet_id
      WHERE o.is_active = true
      GROUP BY o.id
      ORDER BY o.id
    `;
    const result = await pool.query(queryText);

    const locations = result.rows.map(row => {
      const revenue = parseFloat(row.total_revenue);
      const profit = parseFloat(row.total_profit);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockAlerts = parseInt(row.stock_alerts, 10);

      let score = 50;
      if (margin >= 35) score += 25;
      else if (margin >= 25) score += 18;
      else if (margin >= 15) score += 10;

      if (revenue > 1000000) score += 20;
      else if (revenue > 700000) score += 14;
      else score += 8;

      if (stockAlerts === 0) score += 15;
      else if (stockAlerts <= 2) score += 8;

      const healthScore = Math.min(100, Math.round(score));
      const statusTag = healthScore >= 80 ? 'Optimal' : healthScore >= 65 ? 'Healthy' : healthScore >= 50 ? 'Warning' : 'Critical';

      return {
        id: row.id,
        name: row.outlet_name,
        manager: row.manager_name,
        address: row.address,
        city: row.city,
        state: row.state,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        metrics: {
          revenue,
          profit,
          orders: parseInt(row.total_orders, 10),
          avgAov: parseFloat(row.avg_aov).toFixed(2),
          profitMargin: margin.toFixed(1),
          stockAlerts,
          staffCount: parseInt(row.staff_count, 10)
        },
        healthScore,
        statusTag
      };
    });

    res.json(locations);
  } catch (error) {
    console.error('Error fetching location map data:', error);
    res.status(500).json({ error: 'Server error fetching location map data' });
  }
});

app.get('/api/outlets/health-scores', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.outlet_name,
        o.city,
        COALESCE(SUM(s.gross_revenue), 0) as total_revenue,
        COALESCE(SUM(s.operating_cost), 0) as total_cost,
        COALESCE(SUM(s.net_profit), 0) as total_profit,
        COALESCE(SUM(s.total_orders), 0) as total_orders,
        COALESCE(AVG(s.average_order_value), 0) as avg_aov,
        (SELECT COUNT(*) FROM inventory i WHERE i.outlet_id = o.id AND i.status IN ('Low Stock', 'Critical')) as stock_issues,
        (SELECT COALESCE(AVG(st.performance_rating), 4.0) FROM staff st WHERE st.outlet_id = o.id) as avg_staff_rating
      FROM outlets o
      LEFT JOIN sales s ON o.id = s.outlet_id
      WHERE o.is_active = true
      GROUP BY o.id
    `);

    const healthScores = result.rows.map(row => {
      const revenue = parseFloat(row.total_revenue);
      const profit = parseFloat(row.total_profit);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockIssues = parseInt(row.stock_issues, 10);
      const staffRating = parseFloat(row.avg_staff_rating);

      let finScore = Math.min(40, Math.max(0, (margin / 45) * 40));
      let revScore = Math.min(20, Math.max(0, (revenue / 1500000) * 20));
      let invScore = Math.max(0, 20 - stockIssues * 6);
      let stfScore = Math.min(20, Math.max(0, ((staffRating - 3.0) / 2.0) * 20));

      const totalScore = Math.round(finScore + revScore + invScore + stfScore);
      
      let badge = 'Optimal';
      let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      if (totalScore < 55) {
        badge = 'Underperforming';
        badgeColor = 'bg-red-100 text-red-800 border-red-300';
      } else if (totalScore < 75) {
        badge = 'Needs Attention';
        badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      } else if (totalScore < 88) {
        badge = 'Healthy';
        badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
      }

      return {
        outletId: row.id,
        outletName: row.outlet_name,
        city: row.city,
        healthScore: totalScore,
        badge,
        badgeColor,
        metrics: {
          grossRevenue: revenue,
          netProfit: profit,
          profitMargin: parseFloat(margin.toFixed(1)),
          stockIssues,
          staffRating: parseFloat(staffRating.toFixed(2))
        }
      };
    });

    healthScores.sort((a, b) => b.healthScore - a.healthScore);
    res.json(healthScores);
  } catch (error) {
    console.error('Error calculating health scores:', error);
    res.status(500).json({ error: 'Server error computing health scores' });
  }
});

app.get('/api/outlets/underperforming', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.outlet_name,
        o.city,
        o.manager_name,
        COALESCE(SUM(s.gross_revenue), 0) as total_revenue,
        COALESCE(SUM(s.operating_cost), 0) as total_cost,
        COALESCE(SUM(s.net_profit), 0) as total_profit,
        COALESCE(SUM(s.total_orders), 0) as total_orders,
        COALESCE(AVG(s.average_order_value), 0) as avg_aov,
        (SELECT COUNT(*) FROM inventory i WHERE i.outlet_id = o.id AND i.status IN ('Low Stock', 'Critical')) as stock_alerts,
        (SELECT COALESCE(AVG(st.performance_rating), 4.0) FROM staff st WHERE st.outlet_id = o.id) as avg_staff_rating
      FROM outlets o
      LEFT JOIN sales s ON o.id = s.outlet_id
      WHERE o.is_active = true
      GROUP BY o.id
    `);

    const underperformingStores = [];
    result.rows.forEach(row => {
      const revenue = parseFloat(row.total_revenue);
      const profit = parseFloat(row.total_profit);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockAlerts = parseInt(row.stock_alerts, 10);
      const staffRating = parseFloat(row.avg_staff_rating);

      const issues = [];
      if (margin < 25) issues.push(`High operating cost ratio (${(100 - margin).toFixed(1)}% cost burden)`);
      if (revenue < 800000) issues.push(`Low sales volume relative to network baseline`);
      if (stockAlerts > 0) issues.push(`${stockAlerts} inventory stockout alerts active`);
      if (staffRating < 4.0) issues.push(`Staff efficiency rating below threshold (${staffRating.toFixed(1)}/5.0)`);

      if (issues.length >= 2 || margin < 25) {
        underperformingStores.push({
          outletId: row.id,
          outletName: row.outlet_name,
          city: row.city,
          manager: row.manager_name,
          metrics: {
            revenue,
            profit,
            profitMargin: margin.toFixed(1),
            orders: parseInt(row.total_orders, 10),
            stockAlerts,
            staffRating: staffRating.toFixed(1)
          },
          primaryDiagnostic: issues[0] || 'Sub-optimal operational performance',
          allIssues: issues,
          actionPlan: [
            "Audit vendor supply contracts to lower raw material cost percentage by 4-6%",
            "Realign staff scheduling to match customer footfall peak hours",
            "Restock critical inventory items to eliminate order cancellations",
            "Launch targeted hyper-local marketing campaign to boost weekday order volume"
          ]
        });
      }
    });

    res.json(underperformingStores);
  } catch (error) {
    console.error('Error fetching underperforming stores:', error);
    res.status(500).json({ error: 'Server error analyzing underperforming stores' });
  }
});

app.get('/api/outlets/compare', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'Parameter "ids" (comma separated outlet IDs) is required' });
    }

    const idList = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    const result = await pool.query(
      `SELECT 
        o.id,
        o.outlet_name,
        o.city,
        o.manager_name,
        o.latitude,
        o.longitude,
        COALESCE(SUM(s.gross_revenue), 0) as gross_revenue,
        COALESCE(SUM(s.operating_cost), 0) as operating_cost,
        COALESCE(SUM(s.net_profit), 0) as net_profit,
        COALESCE(SUM(s.total_orders), 0) as total_orders,
        COALESCE(AVG(s.average_order_value), 0) as avg_aov,
        COALESCE(SUM(s.payment_upi), 0) as upi_sales,
        COALESCE(SUM(s.payment_card), 0) as card_sales,
        COALESCE(SUM(s.payment_cash), 0) as cash_sales,
        (SELECT COUNT(*) FROM inventory i WHERE i.outlet_id = o.id AND i.status IN ('Low Stock', 'Critical')) as stock_issues,
        (SELECT COUNT(*) FROM staff st WHERE st.outlet_id = o.id AND st.status = 'Active') as staff_count,
        (SELECT COALESCE(AVG(st.performance_rating), 4.0) FROM staff st WHERE st.outlet_id = o.id) as avg_staff_rating
       FROM outlets o
       LEFT JOIN sales s ON o.id = s.outlet_id
       WHERE o.id = ANY($1::int[])
       GROUP BY o.id`,
      [idList]
    );

    const comparisonData = result.rows.map(row => {
      const revenue = parseFloat(row.gross_revenue);
      const profit = parseFloat(row.net_profit);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: row.id,
        outletName: row.outlet_name,
        city: row.city,
        manager: row.manager_name,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        financials: {
          grossRevenue: revenue,
          operatingCost: parseFloat(row.operating_cost),
          netProfit: profit,
          profitMargin: parseFloat(margin.toFixed(2)),
          totalOrders: parseInt(row.total_orders, 10),
          averageOrderValue: parseFloat(row.avg_aov).toFixed(2),
          paymentSplit: {
            upi: parseFloat(row.upi_sales),
            card: parseFloat(row.card_sales),
            cash: parseFloat(row.cash_sales)
          }
        },
        operations: {
          stockIssues: parseInt(row.stock_issues, 10),
          staffCount: parseInt(row.staff_count, 10),
          staffRating: parseFloat(row.avg_staff_rating).toFixed(1)
        }
      };
    });

    res.json(comparisonData);
  } catch (error) {
    console.error('Error fetching outlet comparison:', error);
    res.status(500).json({ error: 'Server error comparing outlets' });
  }
});

app.get('/api/sales/summary', authenticateToken, async (req, res) => {
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

app.get('/api/sales/trends', authenticateToken, async (req, res) => {
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

app.get('/api/sales/list', authenticateToken, async (req, res) => {
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
    
    const countQuery = `SELECT COUNT(*) as total FROM sales s ${whereClause}`;
    const countRes = await pool.query(countQuery, values);
    const totalCount = parseInt(countRes.rows[0].total, 10);

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

    res.json({ records, pagination: { total: totalCount, limit: limitVal, offset: offsetVal } });
  } catch (error) {
    console.error('Error fetching sales list:', error);
    res.status(500).json({ error: 'Server error fetching sales list' });
  }
});

// ==========================================
// 3. STOCK INVENTORY AGENT ENDPOINTS
// ==========================================
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { outletId, category, status } = req.query;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (outletId && outletId !== 'all') {
      conditions.push(`i.outlet_id = $${paramIndex}`);
      values.push(parseInt(outletId, 10));
      paramIndex++;
    }

    if (category && category !== 'all') {
      conditions.push(`i.category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }

    if (status && status !== 'all') {
      conditions.push(`i.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        i.id,
        i.outlet_id,
        o.outlet_name,
        o.city,
        i.item_name,
        i.category,
        i.current_stock,
        i.min_threshold,
        i.max_capacity,
        i.unit,
        i.unit_price,
        i.status,
        i.last_restocked
      FROM inventory i
      JOIN outlets o ON i.outlet_id = o.id
      ${whereClause}
      ORDER BY 
        CASE WHEN i.status = 'Critical' THEN 1 WHEN i.status = 'Low Stock' THEN 2 ELSE 3 END,
        i.item_name ASC
    `;

    const result = await pool.query(queryText, values);

    const items = result.rows.map(r => ({
      id: r.id,
      outletId: r.outlet_id,
      outletName: r.outlet_name,
      city: r.city,
      itemName: r.item_name,
      category: r.category,
      currentStock: parseFloat(r.current_stock),
      minThreshold: parseFloat(r.min_threshold),
      maxCapacity: parseFloat(r.max_capacity),
      unit: r.unit,
      unitPrice: parseFloat(r.unit_price),
      status: r.status,
      lastRestocked: r.last_restocked ? new Date(r.last_restocked).toISOString().slice(0, 10) : null
    }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error fetching inventory' });
  }
});

app.get('/api/inventory/agent-insights', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const { whereClause, values } = getFilters(req.query);

    const queryText = `
      SELECT i.*, o.outlet_name, o.city
      FROM inventory i
      JOIN outlets o ON i.outlet_id = o.id
      ${whereClause}
    `;

    const result = await pool.query(queryText, values);
    const items = result.rows;

    let totalValuation = 0;
    let criticalCount = 0;
    let lowCount = 0;
    const restockRecommendations = [];
    const depletionForecasts = [];

    items.forEach(r => {
      const stock = parseFloat(r.current_stock);
      const min = parseFloat(r.min_threshold);
      const max = parseFloat(r.max_capacity);
      const price = parseFloat(r.unit_price);

      totalValuation += stock * price;
      if (r.status === 'Critical') criticalCount++;
      else if (r.status === 'Low Stock') lowCount++;

      const dailyBurnRate = r.category === 'Coffee' ? 2.5 : r.category === 'Dairy' ? 12 : 5;
      const daysRemaining = dailyBurnRate > 0 ? (stock / dailyBurnRate).toFixed(1) : 10;

      depletionForecasts.push({
        id: r.id,
        itemName: r.item_name,
        city: r.city,
        currentStock: stock,
        unit: r.unit,
        dailyBurnRate,
        daysRemaining: parseFloat(daysRemaining),
        riskLevel: parseFloat(daysRemaining) < 3 ? 'High' : parseFloat(daysRemaining) < 7 ? 'Medium' : 'Low'
      });

      if (stock <= min) {
        const recommendedQty = Math.ceil(max - stock);
        restockRecommendations.push({
          id: r.id,
          outletId: r.outlet_id,
          outletName: r.outlet_name,
          city: r.city,
          itemName: r.item_name,
          category: r.category,
          currentStock: stock,
          unit: r.unit,
          recommendedQuantity: recommendedQty,
          estimatedCost: parseFloat((recommendedQty * price).toFixed(2)),
          urgency: r.status === 'Critical' ? 'Immediate' : 'Upcoming'
        });
      }
    });

    res.json({
      summary: {
        totalItems: items.length,
        totalValuation: parseFloat(totalValuation.toFixed(2)),
        criticalItems: criticalCount,
        lowStockItems: lowCount,
        healthIndex: items.length > 0 ? Math.round(((items.length - criticalCount - lowCount) / items.length) * 100) : 100
      },
      restockRecommendations,
      depletionForecasts: depletionForecasts.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 8)
    });
  } catch (error) {
    console.error('Error fetching inventory agent insights:', error);
    res.status(500).json({ error: 'Server error computing inventory agent insights' });
  }
});

// ==========================================
// 4. STAFF AGENT ENDPOINTS (Top/Bottom 5 Performers, Job Allocation, Login/Logoff Times)
// ==========================================
app.get('/api/staff', authenticateToken, async (req, res) => {
  try {
    const { outletId, shift, role } = req.query;
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (outletId && outletId !== 'all') {
      conditions.push(`st.outlet_id = $${paramIndex}`);
      values.push(parseInt(outletId, 10));
      paramIndex++;
    }

    if (shift && shift !== 'all') {
      conditions.push(`st.shift_type = $${paramIndex}`);
      values.push(shift);
      paramIndex++;
    }

    if (role && role !== 'all') {
      conditions.push(`st.role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT 
        st.id,
        st.outlet_id,
        o.outlet_name,
        o.city,
        st.name,
        st.role,
        st.assigned_job,
        st.shift_type,
        st.login_time,
        st.logoff_time,
        st.hourly_rate,
        st.hours_worked,
        st.performance_rating,
        st.status,
        st.email,
        st.phone
      FROM staff st
      JOIN outlets o ON st.outlet_id = o.id
      ${whereClause}
      ORDER BY st.performance_rating DESC, st.name ASC
    `;

    const result = await pool.query(queryText, values);

    const members = result.rows.map(r => ({
      id: r.id,
      outletId: r.outlet_id,
      outletName: r.outlet_name,
      city: r.city,
      name: r.name,
      role: r.role,
      assignedJob: r.assigned_job,
      shiftType: r.shift_type,
      loginTime: r.login_time,
      logoffTime: r.logoff_time,
      hourlyRate: parseFloat(r.hourly_rate),
      hoursWorked: parseFloat(r.hours_worked),
      monthlyWages: parseFloat((parseFloat(r.hourly_rate) * parseFloat(r.hours_worked)).toFixed(2)),
      performanceRating: parseFloat(r.performance_rating),
      status: r.status,
      email: r.email,
      phone: r.phone
    }));

    res.json(members);
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ error: 'Server error fetching staff members' });
  }
});

// GET /api/staff/performers (Top 5 & Bottom 5 performant employees + Available Jobs list)
app.get('/api/staff/performers', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const conditions = [];
    const values = [];
    
    if (outletId && outletId !== 'all') {
      conditions.push(`st.outlet_id = $1`);
      values.push(parseInt(outletId, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Top 5 Performers
    const topRes = await pool.query(`
      SELECT st.*, o.outlet_name, o.city
      FROM staff st
      JOIN outlets o ON st.outlet_id = o.id
      ${whereClause}
      ORDER BY st.performance_rating DESC, st.hours_worked DESC
      LIMIT 5
    `, values);

    // Bottom 5 Underperformers
    const bottomRes = await pool.query(`
      SELECT st.*, o.outlet_name, o.city
      FROM staff st
      JOIN outlets o ON st.outlet_id = o.id
      ${whereClause}
      ORDER BY st.performance_rating ASC, st.hours_worked ASC
      LIMIT 5
    `, values);

    const availableJobs = [
      "Store Operations & Inventory Audit",
      "Lead Espresso Barista & Quality Check",
      "Floor Supervisor & Customer Service",
      "Front Desk POS & Cashier Lead",
      "Cold Brew & Beverage Specialist",
      "Pastry Heating & Sandwich Line",
      "Table Clearing & Order Runner",
      "Sanitization Lead & Inventory Restock"
    ];

    const mapStaff = (r) => ({
      id: r.id,
      outletId: r.outlet_id,
      outletName: r.outlet_name,
      city: r.city,
      name: r.name,
      role: r.role,
      assignedJob: r.assigned_job,
      shiftType: r.shift_type,
      loginTime: r.login_time,
      logoffTime: r.logoff_time,
      hourlyRate: parseFloat(r.hourly_rate),
      hoursWorked: parseFloat(r.hours_worked),
      performanceRating: parseFloat(r.performance_rating),
      status: r.status,
      email: r.email,
      phone: r.phone
    });

    res.json({
      top5: topRes.rows.map(mapStaff),
      bottom5: bottomRes.rows.map(r => ({
        ...mapStaff(r),
        diagnosticNote: `Rating ${r.performance_rating}/5.0 - Needs training in peak hour speed & order accuracy.`,
        recommendedJobAllocation: "Table Clearing & Order Runner"
      })),
      availableJobs
    });

  } catch (error) {
    console.error('Error fetching staff performers:', error);
    res.status(500).json({ error: 'Server error computing staff performers' });
  }
});

// PUT /api/staff/:id/allocate-job (Allocate / Update job assignment for a staff member)
app.put('/api/staff/:id/allocate-job', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedJob, shiftType, loginTime, logoffTime } = req.body;

    if (!assignedJob) {
      return res.status(400).json({ error: 'assignedJob parameter is required' });
    }

    const result = await pool.query(
      `UPDATE staff
       SET assigned_job = $1,
           shift_type = COALESCE($2, shift_type),
           login_time = COALESCE($3, login_time),
           logoff_time = COALESCE($4, logoff_time),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [assignedJob, shiftType, loginTime, logoffTime, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({ message: 'Job successfully allocated to staff member', staff: result.rows[0] });
  } catch (error) {
    console.error('Error allocating job to staff member:', error);
    res.status(500).json({ error: 'Server error allocating job' });
  }
});

app.get('/api/staff/agent-insights', authenticateToken, async (req, res) => {
  try {
    const { whereClause, values } = getFilters(req.query);

    const staffRes = await pool.query(`
      SELECT st.*, o.outlet_name, o.city
      FROM staff st
      JOIN outlets o ON st.outlet_id = o.id
      ${whereClause}
    `, values);

    const salesRes = await pool.query(`
      SELECT COALESCE(SUM(gross_revenue), 0) as total_revenue
      FROM sales
      ${whereClause}
    `, values);

    const staffMembers = staffRes.rows;
    const totalRevenue = parseFloat(salesRes.rows[0].total_revenue);

    let totalPayroll = 0;
    let sumRating = 0;
    const shiftDistribution = { Morning: 0, Evening: 0, Night: 0 };

    staffMembers.forEach(s => {
      const rate = parseFloat(s.hourly_rate);
      const hours = parseFloat(s.hours_worked);
      const rating = parseFloat(s.performance_rating);
      totalPayroll += rate * hours;
      sumRating += rating;

      if (shiftDistribution[s.shift_type] !== undefined) {
        shiftDistribution[s.shift_type]++;
      }
    });

    const avgRating = staffMembers.length > 0 ? (sumRating / staffMembers.length).toFixed(2) : '4.00';
    const laborCostRatio = totalRevenue > 0 ? ((totalPayroll / totalRevenue) * 100).toFixed(1) : '18.5';

    res.json({
      summary: {
        totalStaff: staffMembers.length,
        totalMonthlyPayroll: parseFloat(totalPayroll.toFixed(2)),
        averageRating: parseFloat(avgRating),
        laborCostRatioPercentage: parseFloat(laborCostRatio),
        shiftDistribution
      },
      optimizationSuggestions: [
        `Labor cost ratio stands at ${laborCostRatio}% of revenue (Target benchmark: <22%).`,
        `Morning shift holds ${shiftDistribution.Morning || 0} active staff to handle 8 AM - 11 AM peak coffee rushes.`,
        `Recommended: Re-allocate top-rated Senior Baristas to underperforming stores to uplift order throughput and customer satisfaction.`
      ]
    });
  } catch (error) {
    console.error('Error fetching staff agent insights:', error);
    res.status(500).json({ error: 'Server error computing staff agent insights' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`FranchiseOps AI Server running on port ${PORT}`);
});
