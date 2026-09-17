const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

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

router.get('/summary', authenticateToken, async (req, res) => {
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

router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const where = buildSalesWhere(req.query);
    const sales = await prisma.sales.findMany({ where, orderBy: { sale_date: 'asc' } });
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

router.get('/list', authenticateToken, async (req, res) => {
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

module.exports = router;
