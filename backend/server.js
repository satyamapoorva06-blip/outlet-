const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'franchiseops_super_secret_jwt_key_2026';
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Test DB connection on startup
prisma.$connect()
  .then(() => console.log('Successfully connected to SQLite database'))
  .catch(err => console.error('Database connection failed:', err));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
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
    const existing = await prisma.users.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role.toUpperCase(),
        outlet_id: outletId ? parseInt(outletId, 10) : null
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, outlet_id: user.outlet_id }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash: _, ...safeUser } = user;
    res.status(201).json({ message: 'Account created successfully', token, user: safeUser });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error creating account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      include: { outlets: { select: { outlet_name: true, city: true } } }
    });

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, outlet_id: user.outlet_id }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    const responseUser = {
      ...safeUser,
      outlet_name: user.outlets?.outlet_name || null,
      city: user.outlets?.city || null,
    };
    res.json({ message: 'Login successful', token, user: responseUser });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error authenticating user' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      include: { outlets: { select: { outlet_name: true, city: true } } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safeUser } = user;
    res.json({ ...safeUser, outlet_name: user.outlets?.outlet_name, city: user.outlets?.city });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// ==========================================
// 2. OUTLETS ENDPOINTS
// ==========================================
app.get('/api/outlets', async (req, res) => {
  try {
    const outlets = await prisma.outlets.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
    res.json(outlets);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    res.status(500).json({ error: 'Server error fetching outlets' });
  }
});

app.get('/api/outlets/locations', authenticateToken, async (req, res) => {
  try {
    const outlets = await prisma.outlets.findMany({
      where: { is_active: true },
      include: {
        sales: { select: { gross_revenue: true, net_profit: true, total_orders: true, average_order_value: true } },
        inventory: { where: { status: { in: ['Low Stock', 'Critical'] } }, select: { id: true } },
        staff: { where: { status: 'Active' }, select: { id: true } }
      },
      orderBy: { id: 'asc' }
    });

    const locations = outlets.map(o => {
      const revenue = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const orders = o.sales.reduce((s, r) => s + r.total_orders, 0);
      const avgAov = o.sales.length > 0 ? o.sales.reduce((s, r) => s + r.average_order_value, 0) / o.sales.length : 0;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockAlerts = o.inventory.length;
      let score = 50;
      if (margin >= 35) score += 25; else if (margin >= 25) score += 18; else if (margin >= 15) score += 10;
      if (revenue > 1000000) score += 20; else if (revenue > 700000) score += 14; else score += 8;
      if (stockAlerts === 0) score += 15; else if (stockAlerts <= 2) score += 8;
      const healthScore = Math.min(100, Math.round(score));
      const statusTag = healthScore >= 80 ? 'Optimal' : healthScore >= 65 ? 'Healthy' : healthScore >= 50 ? 'Warning' : 'Critical';
      return {
        id: o.id, name: o.outlet_name, manager: o.manager_name, address: o.address,
        city: o.city, state: o.state, latitude: o.latitude, longitude: o.longitude,
        metrics: { revenue, profit, orders, avgAov: avgAov.toFixed(2), profitMargin: margin.toFixed(1), stockAlerts, staffCount: o.staff.length },
        healthScore, statusTag
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
    const outlets = await prisma.outlets.findMany({
      where: { is_active: true },
      include: {
        sales: { select: { gross_revenue: true, operating_cost: true, net_profit: true, total_orders: true, average_order_value: true } },
        inventory: { where: { status: { in: ['Low Stock', 'Critical'] } }, select: { id: true } },
        staff: { select: { performance_rating: true } }
      }
    });
    const healthScores = outlets.map(o => {
      const revenue = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockIssues = o.inventory.length;
      const staffRating = o.staff.length > 0 ? o.staff.reduce((s, r) => s + r.performance_rating, 0) / o.staff.length : 4.0;
      const finScore = Math.min(40, Math.max(0, (margin / 45) * 40));
      const revScore = Math.min(20, Math.max(0, (revenue / 1500000) * 20));
      const invScore = Math.max(0, 20 - stockIssues * 6);
      const stfScore = Math.min(20, Math.max(0, ((staffRating - 3.0) / 2.0) * 20));
      const totalScore = Math.round(finScore + revScore + invScore + stfScore);
      let badge = 'Optimal', badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      if (totalScore < 55) { badge = 'Underperforming'; badgeColor = 'bg-red-100 text-red-800 border-red-300'; }
      else if (totalScore < 75) { badge = 'Needs Attention'; badgeColor = 'bg-amber-100 text-amber-800 border-amber-300'; }
      else if (totalScore < 88) { badge = 'Healthy'; badgeColor = 'bg-blue-100 text-blue-800 border-blue-300'; }
      return { outletId: o.id, outletName: o.outlet_name, city: o.city, healthScore: totalScore, badge, badgeColor, metrics: { grossRevenue: revenue, netProfit: profit, profitMargin: parseFloat(margin.toFixed(1)), stockIssues, staffRating: parseFloat(staffRating.toFixed(2)) } };
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
    const outlets = await prisma.outlets.findMany({
      where: { is_active: true },
      include: {
        sales: { select: { gross_revenue: true, operating_cost: true, net_profit: true, total_orders: true, average_order_value: true } },
        inventory: { where: { status: { in: ['Low Stock', 'Critical'] } }, select: { id: true } },
        staff: { select: { performance_rating: true } }
      }
    });
    const underperformingStores = [];
    outlets.forEach(o => {
      const revenue = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const orders = o.sales.reduce((s, r) => s + r.total_orders, 0);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockAlerts = o.inventory.length;
      const staffRating = o.staff.length > 0 ? o.staff.reduce((s, r) => s + r.performance_rating, 0) / o.staff.length : 4.0;
      const issues = [];
      if (margin < 25) issues.push(`High operating cost ratio (${(100 - margin).toFixed(1)}% cost burden)`);
      if (revenue < 800000) issues.push('Low sales volume relative to network baseline');
      if (stockAlerts > 0) issues.push(`${stockAlerts} inventory stockout alerts active`);
      if (staffRating < 4.0) issues.push(`Staff efficiency rating below threshold (${staffRating.toFixed(1)}/5.0)`);
      if (issues.length >= 2 || margin < 25) {
        underperformingStores.push({ outletId: o.id, outletName: o.outlet_name, city: o.city, manager: o.manager_name, metrics: { revenue, profit, profitMargin: margin.toFixed(1), orders, stockAlerts, staffRating: staffRating.toFixed(1) }, primaryDiagnostic: issues[0] || 'Sub-optimal operational performance', allIssues: issues, actionPlan: ["Audit vendor supply contracts to lower raw material cost percentage by 4-6%", "Realign staff scheduling to match customer footfall peak hours", "Restock critical inventory items to eliminate order cancellations", "Launch targeted hyper-local marketing campaign to boost weekday order volume"] });
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
    if (!ids) return res.status(400).json({ error: 'Parameter "ids" is required' });
    const idList = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    const outlets = await prisma.outlets.findMany({
      where: { id: { in: idList } },
      include: {
        sales: true,
        inventory: { where: { status: { in: ['Low Stock', 'Critical'] } }, select: { id: true } },
        staff: { select: { id: true, performance_rating: true } }
      }
    });
    const comparisonData = outlets.map(o => {
      const revenue = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const cost = o.sales.reduce((s, r) => s + r.operating_cost, 0);
      const profit = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const orders = o.sales.reduce((s, r) => s + r.total_orders, 0);
      const avgAov = o.sales.length > 0 ? o.sales.reduce((s, r) => s + r.average_order_value, 0) / o.sales.length : 0;
      const upi = o.sales.reduce((s, r) => s + r.payment_upi, 0);
      const card = o.sales.reduce((s, r) => s + r.payment_card, 0);
      const cash = o.sales.reduce((s, r) => s + r.payment_cash, 0);
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const staffRating = o.staff.length > 0 ? o.staff.reduce((s, r) => s + r.performance_rating, 0) / o.staff.length : 4.0;
      return { id: o.id, outletName: o.outlet_name, city: o.city, manager: o.manager_name, latitude: o.latitude, longitude: o.longitude, financials: { grossRevenue: revenue, operatingCost: cost, netProfit: profit, profitMargin: parseFloat(margin.toFixed(2)), totalOrders: orders, averageOrderValue: avgAov.toFixed(2), paymentSplit: { upi, card, cash } }, operations: { stockIssues: o.inventory.length, staffCount: o.staff.length, staffRating: staffRating.toFixed(1) } };
    });
    res.json(comparisonData);
  } catch (error) {
    console.error('Error fetching outlet comparison:', error);
    res.status(500).json({ error: 'Server error comparing outlets' });
  }
});

// ==========================================
// 3. SALES ENDPOINTS
// ==========================================
function buildSalesWhere(query) {
  const { outletId, startDate, endDate } = query;
  const where = {};
  if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);
  if (startDate || endDate) {
    where.sale_date = {};
    if (startDate) where.sale_date.gte = startDate;
    if (endDate) where.sale_date.lte = endDate;
  }
  return where;
}

app.get('/api/sales/summary', authenticateToken, async (req, res) => {
  try {
    const where = buildSalesWhere(req.query);
    const sales = await prisma.sales.findMany({ where });
    const totalOrders = sales.reduce((s, r) => s + r.total_orders, 0);
    const totalRevenue = sales.reduce((s, r) => s + r.gross_revenue, 0);
    const totalCost = sales.reduce((s, r) => s + r.operating_cost, 0);
    const totalProfit = sales.reduce((s, r) => s + r.net_profit, 0);
    const totalCustomers = sales.reduce((s, r) => s + r.customer_count, 0);
    const paymentCash = sales.reduce((s, r) => s + r.payment_cash, 0);
    const paymentCard = sales.reduce((s, r) => s + r.payment_card, 0);
    const paymentUpi = sales.reduce((s, r) => s + r.payment_upi, 0);
    const avgOrderValue = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;
    const profitMargin = totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0;
    res.json({ grossRevenue: totalRevenue, operatingCost: totalCost, netProfit: totalProfit, totalOrders, totalCustomers, averageOrderValue: avgOrderValue, profitMargin, paymentSplit: { cash: paymentCash, card: paymentCard, upi: paymentUpi } });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Server error fetching sales summary' });
  }
});

app.get('/api/sales/trends', authenticateToken, async (req, res) => {
  try {
    const where = buildSalesWhere(req.query);
    const sales = await prisma.sales.findMany({ where, orderBy: { sale_date: 'asc' } });
    // Group by date
    const byDate = {};
    for (const r of sales) {
      const d = r.sale_date.slice(0, 10);
      if (!byDate[d]) byDate[d] = { date: d, grossRevenue: 0, operatingCost: 0, netProfit: 0, totalOrders: 0 };
      byDate[d].grossRevenue += r.gross_revenue;
      byDate[d].operatingCost += r.operating_cost;
      byDate[d].netProfit += r.net_profit;
      byDate[d].totalOrders += r.total_orders;
    }
    res.json(Object.values(byDate));
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({ error: 'Server error fetching sales trends' });
  }
});

app.get('/api/sales/list', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const where = buildSalesWhere(req.query);
    const totalCount = await prisma.sales.count({ where });
    const rows = await prisma.sales.findMany({
      where,
      include: { outlets: { select: { outlet_name: true, city: true } } },
      orderBy: [{ sale_date: 'desc' }],
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10)
    });
    const records = rows.map(r => ({ id: r.id, outletId: r.outlet_id, outletName: r.outlets.outlet_name, city: r.outlets.city, saleDate: r.sale_date.slice(0, 10), totalOrders: r.total_orders, customerCount: r.customer_count, grossRevenue: r.gross_revenue, operatingCost: r.operating_cost, netProfit: r.net_profit, averageOrderValue: r.average_order_value, paymentSplit: { cash: r.payment_cash, card: r.payment_card, upi: r.payment_upi } }));
    res.json({ records, pagination: { total: totalCount, limit: parseInt(limit, 10), offset: parseInt(offset, 10) } });
  } catch (error) {
    console.error('Error fetching sales list:', error);
    res.status(500).json({ error: 'Server error fetching sales list' });
  }
});

// ==========================================
// 4. INVENTORY ENDPOINTS
// ==========================================
app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const { outletId, category, status } = req.query;
    const where = {};
    if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);
    if (category && category !== 'all') where.category = category;
    if (status && status !== 'all') where.status = status;

    const rows = await prisma.inventory.findMany({
      where,
      include: { outlets: { select: { outlet_name: true, city: true } } },
      orderBy: [{ status: 'asc' }, { item_name: 'asc' }]
    });

    // Sort by status priority
    const statusOrder = { 'Critical': 1, 'Low Stock': 2, 'In Stock': 3 };
    rows.sort((a, b) => (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3));

    const items = rows.map(r => ({ id: r.id, outletId: r.outlet_id, outletName: r.outlets.outlet_name, city: r.outlets.city, itemName: r.item_name, category: r.category, currentStock: r.current_stock, minThreshold: r.min_threshold, maxCapacity: r.max_capacity, unit: r.unit, unitPrice: r.unit_price, status: r.status, lastRestocked: r.last_restocked || null }));
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error fetching inventory' });
  }
});

app.get('/api/inventory/agent-insights', authenticateToken, async (req, res) => {
  try {
    const where = {};
    if (req.query.outletId && req.query.outletId !== 'all') where.outlet_id = parseInt(req.query.outletId, 10);
    const rows = await prisma.inventory.findMany({ where, include: { outlets: { select: { outlet_name: true, city: true } } } });

    let totalValuation = 0, criticalCount = 0, lowCount = 0;
    const restockRecommendations = [], depletionForecasts = [];

    rows.forEach(r => {
      const stock = r.current_stock, min = r.min_threshold, max = r.max_capacity, price = r.unit_price;
      totalValuation += stock * price;
      if (r.status === 'Critical') criticalCount++;
      else if (r.status === 'Low Stock') lowCount++;
      const dailyBurnRate = r.category === 'Coffee' ? 2.5 : r.category === 'Dairy' ? 12 : 5;
      const daysRemaining = dailyBurnRate > 0 ? parseFloat((stock / dailyBurnRate).toFixed(1)) : 10;
      depletionForecasts.push({ id: r.id, itemName: r.item_name, city: r.outlets.city, currentStock: stock, unit: r.unit, dailyBurnRate, daysRemaining, riskLevel: daysRemaining < 3 ? 'High' : daysRemaining < 7 ? 'Medium' : 'Low' });
      if (stock <= min) {
        const recommendedQty = Math.ceil(max - stock);
        restockRecommendations.push({ id: r.id, outletId: r.outlet_id, outletName: r.outlets.outlet_name, city: r.outlets.city, itemName: r.item_name, category: r.category, currentStock: stock, unit: r.unit, recommendedQuantity: recommendedQty, estimatedCost: parseFloat((recommendedQty * price).toFixed(2)), urgency: r.status === 'Critical' ? 'Immediate' : 'Upcoming' });
      }
    });

    res.json({ summary: { totalItems: rows.length, totalValuation: parseFloat(totalValuation.toFixed(2)), criticalItems: criticalCount, lowStockItems: lowCount, healthIndex: rows.length > 0 ? Math.round(((rows.length - criticalCount - lowCount) / rows.length) * 100) : 100 }, restockRecommendations, depletionForecasts: depletionForecasts.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 8) });
  } catch (error) {
    console.error('Error fetching inventory agent insights:', error);
    res.status(500).json({ error: 'Server error computing inventory agent insights' });
  }
});

// ==========================================
// 5. STAFF ENDPOINTS
// ==========================================
app.get('/api/staff', authenticateToken, async (req, res) => {
  try {
    const { outletId, shift, role } = req.query;
    const where = {};
    if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);
    if (shift && shift !== 'all') where.shift_type = shift;
    if (role && role !== 'all') where.role = role;

    const rows = await prisma.staff.findMany({
      where,
      include: { outlets: { select: { outlet_name: true, city: true } } },
      orderBy: [{ performance_rating: 'desc' }, { name: 'asc' }]
    });

    const members = rows.map(r => ({ id: r.id, outletId: r.outlet_id, outletName: r.outlets.outlet_name, city: r.outlets.city, name: r.name, role: r.role, assignedJob: r.assigned_job, shiftType: r.shift_type, loginTime: r.login_time, logoffTime: r.logoff_time, hourlyRate: r.hourly_rate, hoursWorked: r.hours_worked, monthlyWages: parseFloat((r.hourly_rate * r.hours_worked).toFixed(2)), performanceRating: r.performance_rating, status: r.status, email: r.email, phone: r.phone }));
    res.json(members);
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ error: 'Server error fetching staff members' });
  }
});

app.get('/api/staff/performers', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const where = {};
    if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);

    const mapStaff = (r) => ({ id: r.id, outletId: r.outlet_id, outletName: r.outlets.outlet_name, city: r.outlets.city, name: r.name, role: r.role, assignedJob: r.assigned_job, shiftType: r.shift_type, loginTime: r.login_time, logoffTime: r.logoff_time, hourlyRate: r.hourly_rate, hoursWorked: r.hours_worked, performanceRating: r.performance_rating, status: r.status, email: r.email, phone: r.phone });

    const top5 = await prisma.staff.findMany({ where, include: { outlets: { select: { outlet_name: true, city: true } } }, orderBy: [{ performance_rating: 'desc' }, { hours_worked: 'desc' }], take: 5 });
    const bottom5 = await prisma.staff.findMany({ where, include: { outlets: { select: { outlet_name: true, city: true } } }, orderBy: [{ performance_rating: 'asc' }, { hours_worked: 'asc' }], take: 5 });

    const availableJobs = ["Store Operations & Inventory Audit", "Lead Espresso Barista & Quality Check", "Floor Supervisor & Customer Service", "Front Desk POS & Cashier Lead", "Cold Brew & Beverage Specialist", "Pastry Heating & Sandwich Line", "Table Clearing & Order Runner", "Sanitization Lead & Inventory Restock"];

    res.json({ top5: top5.map(mapStaff), bottom5: bottom5.map(r => ({ ...mapStaff(r), diagnosticNote: `Rating ${r.performance_rating}/5.0 - Needs training in peak hour speed & order accuracy.`, recommendedJobAllocation: "Table Clearing & Order Runner" })), availableJobs });
  } catch (error) {
    console.error('Error fetching staff performers:', error);
    res.status(500).json({ error: 'Server error computing staff performers' });
  }
});

app.put('/api/staff/:id/allocate-job', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { assignedJob, shiftType, loginTime, logoffTime } = req.body;
    if (!assignedJob) return res.status(400).json({ error: 'assignedJob parameter is required' });

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Staff member not found' });

    const updated = await prisma.staff.update({
      where: { id },
      data: { assigned_job: assignedJob, shift_type: shiftType || existing.shift_type, login_time: loginTime || existing.login_time, logoff_time: logoffTime || existing.logoff_time, updated_at: new Date() }
    });
    res.json({ message: 'Job successfully allocated to staff member', staff: updated });
  } catch (error) {
    console.error('Error allocating job to staff member:', error);
    res.status(500).json({ error: 'Server error allocating job' });
  }
});

app.get('/api/staff/agent-insights', authenticateToken, async (req, res) => {
  try {
    const where = {};
    if (req.query.outletId && req.query.outletId !== 'all') where.outlet_id = parseInt(req.query.outletId, 10);

    const salesWhere = {};
    if (req.query.outletId && req.query.outletId !== 'all') salesWhere.outlet_id = parseInt(req.query.outletId, 10);

    const [staffMembers, salesRows] = await Promise.all([
      prisma.staff.findMany({ where }),
      prisma.sales.findMany({ where: salesWhere, select: { gross_revenue: true } })
    ]);

    const totalRevenue = salesRows.reduce((s, r) => s + r.gross_revenue, 0);
    let totalPayroll = 0, sumRating = 0;
    const shiftDistribution = { Morning: 0, Evening: 0, Night: 0 };
    staffMembers.forEach(s => {
      totalPayroll += s.hourly_rate * s.hours_worked;
      sumRating += s.performance_rating;
      if (shiftDistribution[s.shift_type] !== undefined) shiftDistribution[s.shift_type]++;
    });
    const avgRating = staffMembers.length > 0 ? (sumRating / staffMembers.length).toFixed(2) : '4.00';
    const laborCostRatio = totalRevenue > 0 ? ((totalPayroll / totalRevenue) * 100).toFixed(1) : '18.5';

    res.json({ summary: { totalStaff: staffMembers.length, totalMonthlyPayroll: parseFloat(totalPayroll.toFixed(2)), averageRating: parseFloat(avgRating), laborCostRatioPercentage: parseFloat(laborCostRatio), shiftDistribution }, optimizationSuggestions: [`Labor cost ratio stands at ${laborCostRatio}% of revenue (Target benchmark: <22%).`, `Morning shift holds ${shiftDistribution.Morning || 0} active staff to handle 8 AM - 11 AM peak coffee rushes.`, `Recommended: Re-allocate top-rated Senior Baristas to underperforming stores to uplift order throughput and customer satisfaction.`] });
  } catch (error) {
    console.error('Error fetching staff agent insights:', error);
    res.status(500).json({ error: 'Server error computing staff agent insights' });
  }
});

// ==========================================
// 6. MARKETING AGENT ENDPOINTS
// ==========================================
const { spawn } = require('child_process');
const path = require('path');

// Helper function to call the Python Scikit-Learn script
function runPythonTask(task, data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'ai', 'marketing_ai.py');
    const pythonProcess = spawn('python', [scriptPath, task]);

    let stdout = '';
    let stderr = '';

    if (data) {
      pythonProcess.stdin.write(JSON.stringify(data));
      pythonProcess.stdin.end();
    }

    pythonProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python task "${task}" failed. Stderr:`, stderr);
        return reject(new Error(stderr || `Python exited with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (err) {
        reject(new Error(`Failed to parse Python JSON output: ${stdout}. Stderr: ${stderr}`));
      }
    });
  });
}

// 6.1 API KPIs Aggregation
app.get('/api/marketing/kpis', authenticateToken, async (req, res) => {
  try {
    const [campaigns, roiReports, customersList, metrics] = await Promise.all([
      prisma.campaigns.findMany(),
      prisma.roi_reports.findMany(),
      prisma.customers.findMany(),
      prisma.marketing_metrics.findMany()
    ]);

    const totalSpend = roiReports.reduce((s, r) => s + r.total_spend, 0);
    const attributedRevenue = roiReports.reduce((s, r) => s + r.attributed_revenue, 0);
    const netRoi = attributedRevenue - totalSpend;
    const roas = totalSpend > 0 ? parseFloat((attributedRevenue / totalSpend).toFixed(2)) : 0;

    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    metrics.forEach(m => {
      totalClicks += m.clicks;
      totalImpressions += m.impressions;
      totalConversions += m.pos_sales_conversions;
    });

    const averageCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const averageConvRate = totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    const sumEngagement = customersList.reduce((s, c) => s + c.calculated_engagement_score, 0);
    const engagementIndex = customersList.length > 0 ? parseFloat((sumEngagement / customersList.length).toFixed(1)) : 50;

    res.json({
      totalSpend,
      attributedRevenue,
      netRoi,
      roas,
      averageCtr,
      averageConvRate,
      engagementIndex,
      totalCustomers: customersList.length
    });
  } catch (error) {
    console.error('Error fetching marketing KPIs:', error);
    res.status(500).json({ error: 'Server error computing marketing KPIs' });
  }
});

// 6.2 Campaign & ROI List
app.get('/api/marketing/campaigns', authenticateToken, async (req, res) => {
  try {
    const list = await prisma.campaigns.findMany({
      include: {
        roi_reports: true,
        marketing_metrics: {
          orderBy: { recorded_date: 'asc' }
        }
      },
      orderBy: { id: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching campaigns list:', error);
    res.status(500).json({ error: 'Server error fetching campaigns' });
  }
});

// 6.3 Data Ingest Webhook
app.post('/api/marketing/data-ingest', authenticateToken, async (req, res) => {
  try {
    const { campaignId, clicks, impressions, posSalesConversions, sentimentScore, couponRedemptions, recordedDate } = req.body;

    if (!campaignId || !recordedDate) {
      return res.status(400).json({ error: 'campaignId and recordedDate are required' });
    }

    const campaign = await prisma.campaigns.findUnique({ where: { id: parseInt(campaignId, 10) } });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Insert metric
    const metric = await prisma.marketing_metrics.create({
      data: {
        campaign_id: parseInt(campaignId, 10),
        clicks: parseInt(clicks, 10) || 0,
        impressions: parseInt(impressions, 10) || 0,
        pos_sales_conversions: parseInt(posSalesConversions, 10) || 0,
        sentiment_score: parseFloat(sentimentScore) || 0.0,
        coupon_redemptions: parseInt(couponRedemptions, 10) || 0,
        recorded_date: recordedDate
      }
    });

    // Recompute campaign's ROI report
    const allMetrics = await prisma.marketing_metrics.findMany({ where: { campaign_id: parseInt(campaignId, 10) } });
    let totalConversions = 0;
    allMetrics.forEach(m => {
      totalConversions += m.pos_sales_conversions;
    });

    const avgAOV = campaign.channel === "POS Coupons" ? 220 : 310;
    const attributed_revenue = parseFloat((totalConversions * avgAOV).toFixed(2));
    const total_spend = campaign.budget;
    const net_roi = parseFloat((attributed_revenue - total_spend).toFixed(2));
    const efficiency_ratio = total_spend > 0 ? parseFloat((attributed_revenue / total_spend).toFixed(2)) : 0;

    await prisma.roi_reports.deleteMany({ where: { campaign_id: parseInt(campaignId, 10) } });
    const roiReport = await prisma.roi_reports.create({
      data: {
        campaign_id: parseInt(campaignId, 10),
        total_spend,
        attributed_revenue,
        net_roi,
        efficiency_ratio,
        calculated_timestamp: new Date()
      }
    });

    res.json({ message: 'Metric ingested successfully and ROI recalculated', metric, roiReport });
  } catch (error) {
    console.error('Error in marketing data ingestion:', error);
    res.status(500).json({ error: 'Server error ingesting marketing data' });
  }
});

// 6.4 AI Predict campaign success
app.post('/api/marketing/ai/predict', authenticateToken, async (req, res) => {
  try {
    const { budget, channel } = req.body;
    if (!budget || !channel) {
      return res.status(400).json({ error: 'budget and channel are required' });
    }

    const campaignsList = await prisma.campaigns.findMany({
      include: { marketing_metrics: true }
    });

    const historical = campaignsList.map(c => {
      const clicks = c.marketing_metrics.reduce((s, m) => s + m.clicks, 0);
      const impressions = c.marketing_metrics.reduce((s, m) => s + m.impressions, 0);
      const pos_sales_conversions = c.marketing_metrics.reduce((s, m) => s + m.pos_sales_conversions, 0);
      return {
        channel: c.channel,
        budget: c.budget,
        clicks,
        impressions,
        pos_sales_conversions
      };
    });

    const prediction = await runPythonTask('predict', {
      campaign: { budget, channel },
      historical_campaigns: historical
    });

    res.json(prediction);
  } catch (error) {
    console.error('Error running campaign prediction:', error);
    res.status(500).json({ error: 'Server error running AI predictor' });
  }
});

// 6.5 AI Customer Segmentation (K-Means)
app.get('/api/marketing/ai/segmentation', authenticateToken, async (req, res) => {
  try {
    const customers = await prisma.customers.findMany();
    const result = await runPythonTask('segmentation', { customers });

    // Update database in background for consistency
    if (result && result.customers) {
      for (const c of result.customers) {
        await prisma.customers.update({
          where: { id: c.id },
          data: { segment: c.segment }
        }).catch(err => console.error(`Error updating customer ${c.id}:`, err));
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error running customer segmentation:', error);
    res.status(500).json({ error: 'Server error running AI segmentation' });
  }
});

// 6.6 AI Sentiment feeds
app.get('/api/marketing/ai/sentiment', authenticateToken, async (req, res) => {
  try {
    const feedbackComments = [
      { id: 1, text: "The Indiranagar outlet is fantastic! Best espresso in town." },
      { id: 2, text: "I love the butter croissants, but the queue during peak morning hours is too long." },
      { id: 3, text: "Waiters were quite slow, and tables in the Anna Nagar cafe were sticky." },
      { id: 4, text: "Double point Wednesdays is an awesome reward program! Really love the vibes." },
      { id: 5, text: "Overpriced coffee and rude staff in Pune bistro." },
      { id: 6, text: "Tried the new Organic Cold Brew, it tasted very fresh and delicious." },
      { id: 7, text: "My coffee was served cold, highly disappointed." },
      { id: 8, text: "Super cozy atmosphere at Bandra. The espresso barista is highly skilled." }
    ];

    const sentimentResult = await runPythonTask('sentiment', { comments: feedbackComments });
    res.json(sentimentResult);
  } catch (error) {
    console.error('Error running sentiment analysis:', error);
    res.status(500).json({ error: 'Server error running sentiment analyzer' });
  }
});

// 6.7 AI Trend Forecasting
app.get('/api/marketing/ai/forecast', authenticateToken, async (req, res) => {
  try {
    // Fetch daily metrics
    const metrics = await prisma.marketing_metrics.findMany({
      orderBy: { recorded_date: 'asc' }
    });

    // Group conversions by date
    const dailyMap = {};
    metrics.forEach(m => {
      if (!dailyMap[m.recorded_date]) {
        dailyMap[m.recorded_date] = 0;
      }
      dailyMap[m.recorded_date] += m.pos_sales_conversions;
    });

    const dailyMetrics = Object.keys(dailyMap).map(date => ({
      recorded_date: date,
      pos_sales_conversions: dailyMap[date]
    }));

    const forecast = await runPythonTask('forecast', { daily_metrics: dailyMetrics });
    res.json(forecast);
  } catch (error) {
    console.error('Error running trend forecasting:', error);
    res.status(500).json({ error: 'Server error running AI forecasting' });
  }
});

// 6.8 AI Recommendations
app.get('/api/marketing/ai/recommendations', authenticateToken, async (req, res) => {
  try {
    const campaigns = await prisma.campaigns.findMany({
      include: { roi_reports: true }
    });

    const campaignsData = campaigns.map(c => {
      const rep = c.roi_reports[0] || { total_spend: c.budget, attributed_revenue: 0 };
      return {
        id: c.id,
        name: c.name,
        channel: c.channel,
        budget: c.budget,
        attributed_revenue: rep.attributed_revenue
      };
    });

    const recommendations = await runPythonTask('recommendations', { campaigns: campaignsData });
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    res.status(500).json({ error: 'Server error generating recommendations' });
  }
});

// 6.9 Apply Recommendation
app.post('/api/marketing/recommendations/apply', authenticateToken, async (req, res) => {
  try {
    const { reallocation_details, campaign_id } = req.body;

    if (reallocation_details) {
      const { source_channel, target_channel, shift_amount } = reallocation_details;

      // Find campaigns under source channel and target channel to shift budget
      const sourceCampaigns = await prisma.campaigns.findMany({ where: { channel: source_channel, status: 'Active' } });
      const targetCampaigns = await prisma.campaigns.findMany({ where: { channel: target_channel, status: 'Active' } });

      if (sourceCampaigns.length > 0 && targetCampaigns.length > 0) {
        const srcCamp = sourceCampaigns[0];
        const tgtCamp = targetCampaigns[0];

        const finalSrcBudget = Math.max(0, srcCamp.budget - shift_amount);
        const finalTgtBudget = tgtCamp.budget + shift_amount;

        await prisma.campaigns.update({
          where: { id: srcCamp.id },
          data: { budget: finalSrcBudget }
        });

        await prisma.campaigns.update({
          where: { id: tgtCamp.id },
          data: { budget: finalTgtBudget }
        });

        // Update corresponding ROI reports
        const allSrcMetrics = await prisma.marketing_metrics.findMany({ where: { campaign_id: srcCamp.id } });
        const allTgtMetrics = await prisma.marketing_metrics.findMany({ where: { campaign_id: tgtCamp.id } });

        const srcConv = allSrcMetrics.reduce((s, m) => s + m.pos_sales_conversions, 0);
        const tgtConv = allTgtMetrics.reduce((s, m) => s + m.pos_sales_conversions, 0);

        const srcAOV = srcCamp.channel === "POS Coupons" ? 220 : 310;
        const tgtAOV = tgtCamp.channel === "POS Coupons" ? 220 : 310;

        await prisma.roi_reports.deleteMany({ where: { campaign_id: srcCamp.id } });
        await prisma.roi_reports.create({
          data: {
            campaign_id: srcCamp.id,
            total_spend: finalSrcBudget,
            attributed_revenue: srcConv * srcAOV,
            net_roi: (srcConv * srcAOV) - finalSrcBudget,
            efficiency_ratio: finalSrcBudget > 0 ? (srcConv * srcAOV) / finalSrcBudget : 0,
            calculated_timestamp: new Date()
          }
        });

        await prisma.roi_reports.deleteMany({ where: { campaign_id: tgtCamp.id } });
        await prisma.roi_reports.create({
          data: {
            campaign_id: tgtCamp.id,
            total_spend: finalTgtBudget,
            attributed_revenue: tgtConv * tgtAOV,
            net_roi: (tgtConv * tgtAOV) - finalTgtBudget,
            efficiency_ratio: finalTgtBudget > 0 ? (tgtConv * tgtAOV) / finalTgtBudget : 0,
            calculated_timestamp: new Date()
          }
        });

        return res.json({ message: `Successfully reallocated ₹${shift_amount} from ${source_channel} to ${target_channel}` });
      }
    } else if (campaign_id) {
      // General campaign target optimization alert log
      return res.json({ message: `Applied audience targeting refinement for Campaign ID ${campaign_id}` });
    }

    res.status(400).json({ error: 'Invalid reallocation parameters or campaign ID' });
  } catch (error) {
    console.error('Error applying marketing recommendation:', error);
    res.status(500).json({ error: 'Server error applying recommendation' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`FranchiseOps AI Server running on port ${PORT}`);
});
