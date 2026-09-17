const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const outlets = await prisma.outlets.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
    res.json(outlets);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    res.status(500).json({ error: 'Server error fetching outlets' });
  }
});

router.get('/locations', authenticateToken, async (req, res) => {
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

router.get('/health-scores', authenticateToken, async (req, res) => {
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

router.get('/underperforming', authenticateToken, async (req, res) => {
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

router.get('/compare', authenticateToken, async (req, res) => {
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

module.exports = router;
