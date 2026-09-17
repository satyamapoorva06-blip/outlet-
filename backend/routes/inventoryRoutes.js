const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
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

    const statusOrder = { 'Critical': 1, 'Low Stock': 2, 'In Stock': 3 };
    rows.sort((a, b) => (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3));

    const items = rows.map(r => ({ id: r.id, outletId: r.outlet_id, outletName: r.outlets.outlet_name, city: r.outlets.city, itemName: r.item_name, category: r.category, currentStock: r.current_stock, minThreshold: r.min_threshold, maxCapacity: r.max_capacity, unit: r.unit, unitPrice: r.unit_price, status: r.status, lastRestocked: r.last_restocked || null }));
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Server error fetching inventory' });
  }
});

router.get('/agent-insights', authenticateToken, async (req, res) => {
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

module.exports = router;
