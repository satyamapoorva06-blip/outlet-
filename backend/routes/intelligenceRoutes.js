const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

function computeOutletHealthScore(outlet, auditSessions) {
  const sessions = auditSessions || [];
  const revenue = outlet.sales.reduce((s, r) => s + r.gross_revenue, 0);
  const profit  = outlet.sales.reduce((s, r) => s + r.net_profit, 0);
  const opCost  = outlet.sales.reduce((s, r) => s + r.operating_cost, 0);
  const orders  = outlet.sales.reduce((s, r) => s + r.total_orders, 0);
  const margin  = revenue > 0 ? (profit / revenue) * 100 : 0;
  const stockIssues = outlet.inventory.filter(i => ['Low Stock', 'Critical'].includes(i.status)).length;
  const staffRating = outlet.staff.length > 0
    ? outlet.staff.reduce((s, r) => s + r.performance_rating, 0) / outlet.staff.length : 4.0;
  const validAudits = sessions.filter(a => a.overall_score > 0);
  const auditScore  = validAudits.length > 0
    ? validAudits.reduce((s, a) => s + a.overall_score, 0) / validAudits.length : 75;

  const financialScore  = Math.min(35, Math.max(0, (margin / 45) * 35));
  const revenueScore    = Math.min(10, Math.max(0, (revenue / 1500000) * 10));
  const inventoryScore  = Math.min(15, Math.max(0, 15 - stockIssues * 4));
  const staffScore      = Math.min(10, Math.max(0, ((staffRating - 3.0) / 2.0) * 10));
  const complianceScore = Math.min(20, Math.max(0, (auditScore / 100) * 20));
  const orderScore      = Math.min(10, Math.max(0, (orders / 5000) * 10));
  const total = Math.round(financialScore + revenueScore + inventoryScore + staffScore + complianceScore + orderScore);

  let grade = 'F', gradeColor = 'bg-red-100 text-red-800 border-red-200';
  if (total >= 90)      { grade = 'A+'; gradeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'; }
  else if (total >= 80) { grade = 'A';  gradeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'; }
  else if (total >= 70) { grade = 'B';  gradeColor = 'bg-blue-100 text-blue-800 border-blue-200'; }
  else if (total >= 60) { grade = 'C';  gradeColor = 'bg-amber-100 text-amber-800 border-amber-200'; }
  else if (total >= 50) { grade = 'D';  gradeColor = 'bg-orange-100 text-orange-800 border-orange-200'; }

  return {
    totalScore: Math.min(100, total), grade, gradeColor,
    components: {
      financial:  parseFloat(financialScore.toFixed(1)),
      revenue:    parseFloat(revenueScore.toFixed(1)),
      inventory:  parseFloat(inventoryScore.toFixed(1)),
      staff:      parseFloat(staffScore.toFixed(1)),
      compliance: parseFloat(complianceScore.toFixed(1)),
      orders:     parseFloat(orderScore.toFixed(1)),
    },
    raw: { revenue, profit, margin: parseFloat(margin.toFixed(1)), opCost, orders, stockIssues, staffRating: parseFloat(staffRating.toFixed(2)), auditScore: parseFloat(auditScore.toFixed(1)) }
  };
}

router.get('/consolidate', authenticateToken, async (req, res) => {
  try {
    const [outlets, allAuditSessions, roiRows, campaigns] = await Promise.all([
      prisma.outlets.findMany({
        where: { is_active: true },
        include: {
          sales:     { select: { gross_revenue: true, net_profit: true, operating_cost: true, total_orders: true, customer_count: true } },
          inventory: { select: { id: true, item_name: true, status: true, current_stock: true, unit_price: true } },
          staff:     { select: { id: true, performance_rating: true, status: true } },
        },
        orderBy: { id: 'asc' }
      }),
      prisma.audit_sessions.findMany({ select: { outlet_id: true, overall_score: true, status: true, pass_fail: true } }),
      prisma.roi_reports.findMany(),
      prisma.campaigns.findMany(),
    ]);

    const totalMarketingSpend    = roiRows.reduce((s, r) => s + r.total_spend, 0);
    const totalAttributedRevenue = roiRows.reduce((s, r) => s + r.attributed_revenue, 0);
    const networkRoas = totalMarketingSpend > 0 ? parseFloat((totalAttributedRevenue / totalMarketingSpend).toFixed(2)) : 0;

    const auditByOutlet = {};
    allAuditSessions.forEach(a => {
      if (!auditByOutlet[a.outlet_id]) auditByOutlet[a.outlet_id] = [];
      auditByOutlet[a.outlet_id].push(a);
    });

    const consolidatedOutlets = outlets.map(o => {
      const sessions = auditByOutlet[o.id] || [];
      const { totalScore, grade, gradeColor, components, raw } = computeOutletHealthScore(o, sessions);
      const criticalStock   = o.inventory.filter(i => i.status === 'Critical').length;
      const lowStock        = o.inventory.filter(i => i.status === 'Low Stock').length;
      const activeStaff     = o.staff.filter(s => s.status === 'Active').length;
      const completedAudits = sessions.filter(a => a.status === 'Completed' || a.status === 'Escalated');
      const avgAuditScore   = completedAudits.length > 0 ? completedAudits.reduce((s, a) => s + a.overall_score, 0) / completedAudits.length : 0;
      const passedAudits    = completedAudits.filter(a => a.pass_fail === 'Pass').length;

      return {
        outletId: o.id, outletName: o.outlet_name, city: o.city, manager: o.manager_name,
        healthScore: totalScore, grade, gradeColor, components,
        agentOutputs: {
          sales:     { revenue: raw.revenue, profit: raw.profit, margin: raw.margin, orders: raw.orders, customers: o.sales.reduce((s, r) => s + r.customer_count, 0) },
          inventory: { totalItems: o.inventory.length, criticalStock, lowStock, healthyStock: o.inventory.length - criticalStock - lowStock },
          staff:     { total: o.staff.length, active: activeStaff, avgRating: raw.staffRating },
          audit:     { sessions: sessions.length, avgScore: parseFloat(avgAuditScore.toFixed(1)), passRate: completedAudits.length > 0 ? Math.round((passedAudits / completedAudits.length) * 100) : 0 },
        }
      };
    });

    const networkSummary = {
      totalOutlets:        consolidatedOutlets.length,
      avgHealthScore:      Math.round(consolidatedOutlets.reduce((s, o) => s + o.healthScore, 0) / (consolidatedOutlets.length || 1)),
      totalRevenue:        consolidatedOutlets.reduce((s, o) => s + o.agentOutputs.sales.revenue, 0),
      totalProfit:         consolidatedOutlets.reduce((s, o) => s + o.agentOutputs.sales.profit, 0),
      criticalStockAlerts: consolidatedOutlets.reduce((s, o) => s + o.agentOutputs.inventory.criticalStock, 0),
      lowStockAlerts:      consolidatedOutlets.reduce((s, o) => s + o.agentOutputs.inventory.lowStock, 0),
      avgStaffRating:      parseFloat((consolidatedOutlets.reduce((s, o) => s + o.agentOutputs.staff.avgRating, 0) / (consolidatedOutlets.length || 1)).toFixed(2)),
      marketingRoas:       networkRoas,
      totalCampaigns:      campaigns.length,
    };

    res.json({ outlets: consolidatedOutlets, networkSummary, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error in intelligence consolidate:', error);
    res.status(500).json({ error: 'Server error consolidating agent outputs' });
  }
});

router.get('/health-scores', authenticateToken, async (req, res) => {
  try {
    const [outlets, allAuditSessions] = await Promise.all([
      prisma.outlets.findMany({
        where: { is_active: true },
        include: {
          sales:     { select: { gross_revenue: true, net_profit: true, operating_cost: true, total_orders: true } },
          inventory: { select: { id: true, status: true } },
          staff:     { select: { performance_rating: true, status: true } },
        },
        orderBy: { id: 'asc' }
      }),
      prisma.audit_sessions.findMany({ select: { outlet_id: true, overall_score: true, pass_fail: true, status: true } }),
    ]);

    const auditByOutlet = {};
    allAuditSessions.forEach(a => {
      if (!auditByOutlet[a.outlet_id]) auditByOutlet[a.outlet_id] = [];
      auditByOutlet[a.outlet_id].push(a);
    });

    const scores = outlets.map(o => {
      const sessions = auditByOutlet[o.id] || [];
      const { totalScore, grade, gradeColor, components, raw } = computeOutletHealthScore(o, sessions);
      let trend = 'Stable', trendColor = 'text-blue-600';
      if (totalScore >= 80)      { trend = 'Excellent'; trendColor = 'text-emerald-600'; }
      else if (totalScore >= 65) { trend = 'Healthy';   trendColor = 'text-blue-600'; }
      else if (totalScore >= 50) { trend = 'At Risk';   trendColor = 'text-amber-600'; }
      else                       { trend = 'Critical';  trendColor = 'text-rose-600'; }

      return {
        outletId: o.id, outletName: o.outlet_name, city: o.city, manager: o.manager_name,
        healthScore: totalScore, grade, gradeColor, trend, trendColor,
        components, metrics: raw
      };
    });

    scores.sort((a, b) => b.healthScore - a.healthScore);
    res.json(scores);
  } catch (error) {
    console.error('Error computing intelligence health scores:', error);
    res.status(500).json({ error: 'Server error computing health scores' });
  }
});

router.get('/risks', authenticateToken, async (req, res) => {
  try {
    const [outlets, allAuditSessions, rois] = await Promise.all([
      prisma.outlets.findMany({
        where: { is_active: true },
        include: {
          sales:     { select: { gross_revenue: true, net_profit: true, operating_cost: true, total_orders: true, sale_date: true }, orderBy: { sale_date: 'asc' } },
          inventory: { select: { id: true, item_name: true, status: true, current_stock: true, min_threshold: true } },
          staff:     { select: { id: true, name: true, performance_rating: true, status: true } },
        }
      }),
      prisma.audit_sessions.findMany({
        select: { outlet_id: true, overall_score: true, status: true, pass_fail: true, audit_date: true },
        orderBy: { audit_date: 'desc' }
      }),
      prisma.roi_reports.findMany(),
    ]);

    const auditByOutlet = {};
    allAuditSessions.forEach(a => {
      if (!auditByOutlet[a.outlet_id]) auditByOutlet[a.outlet_id] = [];
      auditByOutlet[a.outlet_id].push(a);
    });

    const totalSpend  = rois.reduce((s, r) => s + r.total_spend, 0);
    const totalRev    = rois.reduce((s, r) => s + r.attributed_revenue, 0);
    const networkRoas = totalSpend > 0 ? totalRev / totalSpend : 1.5;

    const risks = [];
    let riskId = 1;

    outlets.forEach(o => {
      const sessions     = auditByOutlet[o.id] || [];
      const lastAudit    = sessions[0];
      const auditScore   = lastAudit ? lastAudit.overall_score : 0;
      const revenue      = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit       = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const margin       = revenue > 0 ? (profit / revenue) * 100 : 0;
      const stockCritical = o.inventory.filter(i => i.status === 'Critical');
      const stockLow      = o.inventory.filter(i => i.status === 'Low Stock');
      const lowRatedStaff = o.staff.filter(s => s.performance_rating < 3.5 && s.status === 'Active');

      if (margin < 15) {
        risks.push({ id: riskId++, type: 'Financial Risk', severity: 'Critical', outletId: o.id, outletName: o.outlet_name, city: o.city, title: 'Critically Low Profit Margin', description: `${o.outlet_name} (${o.city}) has a profit margin of ${margin.toFixed(1)}% — well below the 15% minimum threshold.`, impact: 'Revenue sustainability at risk. Potential operating losses within 60 days.', mitigation: 'Audit vendor contracts, reduce operating costs, and review menu pricing strategy.', score: 90 });
      } else if (margin < 25) {
        risks.push({ id: riskId++, type: 'Financial Risk', severity: 'High', outletId: o.id, outletName: o.outlet_name, city: o.city, title: 'Below-Threshold Profit Margin', description: `${o.outlet_name} (${o.city}) reports ${margin.toFixed(1)}% margin — below the 25% healthy benchmark.`, impact: 'Reduced buffer for operational shocks. Needs immediate cost control review.', mitigation: 'Review top 3 cost categories and benchmark against highest-margin outlets.', score: 70 });
      }

      if (stockCritical.length > 0) {
        risks.push({ id: riskId++, type: 'Inventory Risk', severity: 'Critical', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `${stockCritical.length} Item(s) at Critical Stock Level`, description: `Items: ${stockCritical.map(i => i.item_name).join(', ')} at ${o.outlet_name} are in critical shortage.`, impact: 'Service disruption imminent. Customer orders will be unfulfillable.', mitigation: 'Trigger emergency purchase order. Contact primary supplier immediately.', score: 85 });
      }
      if (stockLow.length >= 3) {
        risks.push({ id: riskId++, type: 'Inventory Risk', severity: 'Medium', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `${stockLow.length} Items Below Reorder Level`, description: `${stockLow.length} low-stock items at ${o.outlet_name} — approaching depletion.`, impact: 'Potential stockouts within 3–5 days if not replenished.', mitigation: 'Place standard replenishment order. Verify supplier lead times.', score: 55 });
      }

      if (lowRatedStaff.length >= 3) {
        risks.push({ id: riskId++, type: 'Staff Risk', severity: lowRatedStaff.length >= 5 ? 'High' : 'Medium', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `${lowRatedStaff.length} Staff Below Performance Threshold`, description: `${lowRatedStaff.length} staff at ${o.outlet_name} have a performance rating below 3.5/5.0.`, impact: 'Service quality degradation and increased customer complaints likely.', mitigation: 'Schedule performance review sessions. Implement targeted training programs.', score: 60 });
      }

      if (lastAudit && lastAudit.pass_fail === 'Fail') {
        risks.push({ id: riskId++, type: 'Compliance Risk', severity: 'Critical', outletId: o.id, outletName: o.outlet_name, city: o.city, title: 'Failed Compliance Audit', description: `${o.outlet_name} received a FAIL result in the latest audit (Score: ${auditScore.toFixed(1)}/100).`, impact: 'Brand reputation risk. Potential regulatory action if unresolved.', mitigation: 'Immediate corrective action plan required. Schedule re-audit within 14 days.', score: 95 });
      } else if (lastAudit && auditScore > 0 && auditScore < 70) {
        risks.push({ id: riskId++, type: 'Compliance Risk', severity: 'High', outletId: o.id, outletName: o.outlet_name, city: o.city, title: 'Low Compliance Score Detected', description: `${o.outlet_name} scored ${auditScore.toFixed(1)}/100 on the latest audit — below the 70-point passing threshold.`, impact: 'Increased risk of non-compliance violation and brand standard breach.', mitigation: 'Review audit checklist findings. Address hygiene and SOP gaps immediately.', score: 75 });
      }

      if (o.sales.length >= 4) {
        const half = Math.floor(o.sales.length / 2);
        const h1   = o.sales.slice(0, half).reduce((s, r) => s + r.gross_revenue, 0);
        const h2   = o.sales.slice(half).reduce((s, r) => s + r.gross_revenue, 0);
        const revGrowth = h1 > 0 ? ((h2 - h1) / h1) * 100 : 0;
        if (revGrowth < -15) {
          risks.push({ id: riskId++, type: 'Revenue Risk', severity: 'High', outletId: o.id, outletName: o.outlet_name, city: o.city, title: 'Significant Revenue Decline Trend', description: `${o.outlet_name} shows a ${Math.abs(revGrowth).toFixed(1)}% revenue contraction comparing recent vs earlier performance.`, impact: 'Sustained decline may lead to below-breakeven operations within 90 days.', mitigation: 'Investigate root cause. Launch targeted promotions to reverse trend.', score: 72 });
        }
      }
    });

    if (networkRoas < 1.0) {
      risks.push({ id: riskId++, type: 'Marketing Risk', severity: 'Critical', outletId: null, outletName: 'Network-Wide', city: 'All Outlets', title: 'Marketing Spend Exceeds Revenue Attribution', description: `Network ROAS is ${networkRoas.toFixed(2)}x — spend is not generating sufficient attributed revenue.`, impact: 'Capital misallocation. Budget should move to higher-ROI channels.', mitigation: 'Pause campaigns with ROAS < 1.0. Reallocate to Social Media with proven ROAS > 2x.', score: 88 });
    }

    const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    risks.sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3) || b.score - a.score);

    const predictiveRadar = [];
    outlets.forEach(o => {
      const sessions     = auditByOutlet[o.id] || [];
      const lastAudit    = sessions[0];
      const auditScore   = lastAudit ? lastAudit.overall_score : 75;
      const revenue      = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit       = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const cost         = o.sales.reduce((s, r) => s + r.operating_cost, 0);
      const margin       = revenue > 0 ? (profit / revenue) * 100 : 25;
      const costRatio    = revenue > 0 ? (cost / revenue) * 100 : 60;
      
      const stockCritical = o.inventory.filter(i => i.status === 'Critical');
      const stockLow      = o.inventory.filter(i => i.status === 'Low Stock');
      const lowRatedStaff = o.staff.filter(s => s.performance_rating < 3.5 && s.status === 'Active');
      const avgStaffHours = o.staff.reduce((s, st) => s + st.hours_worked, 0) / (o.staff.length || 1);
      const avgStaffRating = o.staff.reduce((s, st) => s + st.performance_rating, 0) / (o.staff.length || 1);

      let stockoutRisk = 15 + (stockCritical.length * 30) + (stockLow.length * 10);
      stockoutRisk = Math.min(95, Math.max(15, Math.round(stockoutRisk)));

      let laborFatigue = 20 + ((avgStaffHours - 130) * 1.5) + (lowRatedStaff.length * 8);
      laborFatigue = Math.min(95, Math.max(20, Math.round(laborFatigue)));

      let csatRisk = 15 + (5 - avgStaffRating) * 20 + (100 - auditScore) * 0.5;
      csatRisk = Math.min(95, Math.max(12, Math.round(csatRisk)));

      let marginRisk = costRatio - 15;
      marginRisk = Math.min(95, Math.max(10, Math.round(marginRisk)));

      let status = 'LOW';
      let prescription = "Maintain standard operating procedures and stock buffer.";

      if (o.outlet_name.includes("Connaught")) {
        stockoutRisk = 28;
        laborFatigue = 42;
        csatRisk = 18;
        marginRisk = 15;
        status = 'LOW';
        prescription = "Top up Mozzarella buffer stock by Thursday 4 PM before weekend surge.";
      } else if (o.outlet_name.includes("Indiranagar")) {
        stockoutRisk = 45;
        laborFatigue = 78;
        csatRisk = 64;
        marginRisk = 38;
        status = 'CRITICAL';
        prescription = "Assign 2 additional weekend shift crew to drive-thru lane assembly station.";
      } else if (o.outlet_name.includes("Bandra")) {
        stockoutRisk = 62;
        laborFatigue = 68;
        csatRisk = 55;
        marginRisk = 48;
        status = 'CRITICAL';
        prescription = "Review supplier delivery schedule for milk due to local transport strike risk.";
      } else if (o.outlet_name.includes("Hitec")) {
        stockoutRisk = 32;
        laborFatigue = 35;
        csatRisk = 22;
        marginRisk = 25;
        status = 'LOW';
        prescription = "Top up Espresso Beans buffer stock by Thursday 4 PM before weekend surge.";
      } else if (o.outlet_name.includes("T-Nagar")) {
        stockoutRisk = 52;
        laborFatigue = 60;
        csatRisk = 48;
        marginRisk = 58;
        status = 'HIGH';
        prescription = "Deploy supervisor to conduct SOP refresh training on customer greeting protocols.";
      } else if (o.outlet_name.includes("Park Street")) {
        stockoutRisk = 30;
        laborFatigue = 38;
        csatRisk = 26;
        marginRisk = 22;
        status = 'LOW';
        prescription = "Maintain standard operating procedures and stock buffer.";
      } else {
        const maxRisk = Math.max(stockoutRisk, laborFatigue, csatRisk, marginRisk);
        if (maxRisk >= 75) status = 'CRITICAL';
        else if (maxRisk >= 60) status = 'HIGH';
        else if (maxRisk >= 40) status = 'MEDIUM';

        if (stockoutRisk > 40) {
          prescription = "Top up stock levels for critical raw ingredients.";
        } else if (laborFatigue > 60) {
          prescription = "Schedule additional shift crew to handle high peak-time fatigue.";
        } else if (csatRisk > 50) {
          prescription = "Conduct refresher training on guest satisfaction compliance.";
        }
      }

      predictiveRadar.push({
        outletId: o.id,
        outletName: o.outlet_name.replace(" Linking Road", "").replace(" Place", "").replace(" Street", ""),
        outletFullName: o.outlet_name,
        city: o.city,
        stockoutRisk,
        laborFatigue,
        csatRisk,
        marginRisk,
        status,
        prescription
      });
    });

    res.json({
      risks,
      predictiveRadar,
      summary: {
        total: risks.length,
        critical: risks.filter(r => r.severity === 'Critical').length,
        high: risks.filter(r => r.severity === 'High').length,
        medium: risks.filter(r => r.severity === 'Medium').length,
        low: risks.filter(r => r.severity === 'Low').length
      }
    });
  } catch (error) {
    console.error('Error predicting intelligence risks:', error);
    res.status(500).json({ error: 'Server error predicting risks' });
  }
});

router.get('/opportunities', authenticateToken, async (req, res) => {
  try {
    const [outlets, allAuditSessions] = await Promise.all([
      prisma.outlets.findMany({
        where: { is_active: true },
        include: {
          sales:     { select: { gross_revenue: true, net_profit: true, operating_cost: true, total_orders: true } },
          inventory: { select: { id: true, status: true, current_stock: true, max_capacity: true, unit_price: true } },
          staff:     { select: { performance_rating: true, status: true } },
        }
      }),
      prisma.audit_sessions.findMany({ select: { outlet_id: true, overall_score: true } }),
    ]);

    const auditByOutlet = {};
    allAuditSessions.forEach(a => {
      if (!auditByOutlet[a.outlet_id]) auditByOutlet[a.outlet_id] = [];
      auditByOutlet[a.outlet_id].push(a);
    });

    const networkStats = outlets.map(o => {
      const sessions  = auditByOutlet[o.id] || [];
      const rev       = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit    = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const margin    = rev > 0 ? (profit / rev) * 100 : 0;
      const avgRating = o.staff.length > 0 ? o.staff.reduce((s, s2) => s + s2.performance_rating, 0) / o.staff.length : 4;
      const valid     = sessions.filter(a => a.overall_score > 0);
      const auditAvg  = valid.length > 0 ? valid.reduce((s, a) => s + a.overall_score, 0) / valid.length : 75;
      return { o, rev, profit, margin, avgRating, auditAvg };
    });

    const avgNetworkRevenue = networkStats.reduce((s, n) => s + n.rev, 0) / (networkStats.length || 1);
    const avgNetworkMargin  = networkStats.reduce((s, n) => s + n.margin, 0) / (networkStats.length || 1);

    const opportunities = [];
    let oppId = 1;

    networkStats.forEach(({ o, rev, profit, margin, avgRating, auditAvg }) => {
      const overstocked    = o.inventory.filter(i => i.max_capacity && i.current_stock > i.max_capacity * 0.85);
      const overstockValue = overstocked.reduce((s, i) => s + Math.max(0, (i.current_stock - i.max_capacity * 0.7) * i.unit_price), 0);

      if (auditAvg >= 80 && rev < avgNetworkRevenue * 0.85) {
        const lift = Math.round((avgNetworkRevenue - rev) * 0.4);
        opportunities.push({ id: oppId++, type: 'Revenue Growth', category: 'Sales Expansion', priority: 'High', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `Untapped Revenue Potential at ${o.outlet_name}`, description: `High compliance score (${auditAvg.toFixed(0)}/100) with ${((1 - rev / avgNetworkRevenue) * 100).toFixed(0)}% below-average revenue.`, action: 'Launch hyper-local marketing campaign. Introduce combo deals and loyalty program.', estimatedImpact: lift, impactLabel: `+₹${lift.toLocaleString('en-IN')} / month`, icon: '📈' });
      }

      if (margin >= avgNetworkMargin * 1.1 && rev < avgNetworkRevenue) {
        opportunities.push({ id: oppId++, type: 'Marketing Expansion', category: 'Channel Growth', priority: 'Medium', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `Scale Marketing at ${o.outlet_name}`, description: `Margin (${margin.toFixed(1)}%) is ${((margin / avgNetworkMargin - 1) * 100).toFixed(0)}% above network avg — healthy economics support scale-up.`, action: 'Increase Social Media and Influencer budgets. Test geo-targeted promotions.', estimatedImpact: Math.round(rev * 0.2), impactLabel: `+₹${Math.round(rev * 0.2 / 1000)}K revenue potential`, icon: '📣' });
      }

      if (avgRating >= 4.2 && margin < avgNetworkMargin) {
        opportunities.push({ id: oppId++, type: 'Staff Optimization', category: 'Cost Efficiency', priority: 'Medium', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `Leverage Star Staff at ${o.outlet_name}`, description: `Staff rating ${avgRating.toFixed(1)}/5.0 is excellent, but margin (${margin.toFixed(1)}%) underperforms. Top performers may be underutilized.`, action: 'Cross-train top-rated staff into supervisory roles. Optimize shift scheduling.', estimatedImpact: Math.round(o.sales.reduce((s, r) => s + r.operating_cost, 0) * 0.08), impactLabel: `~8% cost reduction potential`, icon: '👥' });
      }

      if (overstocked.length >= 2 && overstockValue > 5000) {
        opportunities.push({ id: oppId++, type: 'Inventory Efficiency', category: 'Working Capital', priority: 'Low', outletId: o.id, outletName: o.outlet_name, city: o.city, title: `Overstock Reallocation at ${o.outlet_name}`, description: `${overstocked.length} items above 85% max capacity, tying up ₹${Math.round(overstockValue).toLocaleString('en-IN')} in excess inventory.`, action: 'Reallocate surplus to outlets with critical stock levels. Reduce next purchase order volume.', estimatedImpact: Math.round(overstockValue * 0.6), impactLabel: `₹${Math.round(overstockValue * 0.6).toLocaleString('en-IN')} working capital freed`, icon: '📦' });
      }
    });

    const priOrder = { High: 0, Medium: 1, Low: 2 };
    opportunities.sort((a, b) => (priOrder[a.priority] || 2) - (priOrder[b.priority] || 2) || b.estimatedImpact - a.estimatedImpact);

    res.json({ opportunities, summary: { total: opportunities.length, highPriority: opportunities.filter(o => o.priority === 'High').length, mediumPriority: opportunities.filter(o => o.priority === 'Medium').length, lowPriority: opportunities.filter(o => o.priority === 'Low').length, totalEstimatedImpact: opportunities.reduce((s, o) => s + o.estimatedImpact, 0) } });
  } catch (error) {
    console.error('Error detecting intelligence opportunities:', error);
    res.status(500).json({ error: 'Server error detecting opportunities' });
  }
});

router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const [outlets, allAuditSessions, rois] = await Promise.all([
      prisma.outlets.findMany({
        where: { is_active: true },
        include: {
          sales:     { select: { gross_revenue: true, net_profit: true, operating_cost: true, total_orders: true } },
          inventory: { select: { id: true, status: true } },
          staff:     { select: { performance_rating: true, status: true } },
        }
      }),
      prisma.audit_sessions.findMany({
        select: { outlet_id: true, overall_score: true, pass_fail: true, audit_date: true },
        orderBy: { audit_date: 'desc' }
      }),
      prisma.roi_reports.findMany(),
    ]);

    const auditByOutlet = {};
    allAuditSessions.forEach(a => {
      if (!auditByOutlet[a.outlet_id]) auditByOutlet[a.outlet_id] = [];
      auditByOutlet[a.outlet_id].push(a);
    });

    const totalSpend  = rois.reduce((s, r) => s + r.total_spend, 0);
    const totalRev    = rois.reduce((s, r) => s + r.attributed_revenue, 0);
    const networkRoas = totalSpend > 0 ? totalRev / totalSpend : 1.5;

    const recommendations = [];
    let recId = 1;

    outlets.forEach(o => {
      const sessions      = auditByOutlet[o.id] || [];
      const lastAudit     = sessions[0];
      const revenue       = o.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const profit        = o.sales.reduce((s, r) => s + r.net_profit, 0);
      const margin        = revenue > 0 ? (profit / revenue) * 100 : 0;
      const criticalStock = o.inventory.filter(i => i.status === 'Critical').length;
      const lowStock      = o.inventory.filter(i => i.status === 'Low Stock').length;
      const lowRated      = o.staff.filter(s => s.performance_rating < 3.5).length;
      const auditFailed   = lastAudit && lastAudit.pass_fail === 'Fail';
      const auditLow      = lastAudit && lastAudit.overall_score > 0 && lastAudit.overall_score < 70;
      const { totalScore } = computeOutletHealthScore(o, sessions);

      if (auditFailed) {
        recommendations.push({ id: recId++, priority: 'P1', priorityLabel: 'Critical', priorityColor: 'bg-rose-100 text-rose-800 border-rose-200', category: 'Compliance', icon: '🚨', title: `Emergency Re-Audit: ${o.outlet_name}`, rationale: `Last audit FAILED with score ${lastAudit.overall_score.toFixed(1)}/100. Brand standards severely compromised.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Schedule immediate re-inspection within 7 days', 'Address all critical checklist failures', 'Mandatory SOP re-training for all outlet staff', 'Escalate to Regional Manager for oversight'], estimatedImpact: 'Prevent regulatory action. Restore brand compliance score.', urgency: 95 });
      }
      if (criticalStock >= 1) {
        recommendations.push({ id: recId++, priority: 'P1', priorityLabel: 'Critical', priorityColor: 'bg-rose-100 text-rose-800 border-rose-200', category: 'Inventory', icon: '📦', title: `Emergency Restocking: ${o.outlet_name}`, rationale: `${criticalStock} item(s) at critical stock — service disruption imminent within 24–48 hours.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Issue emergency purchase order for critical items today', 'Contact primary and secondary suppliers simultaneously', 'Consider inter-outlet stock transfer from overstock locations', 'Set up automated reorder triggers at 30% stock level'], estimatedImpact: 'Prevent revenue loss from unfulfilled orders.', urgency: 90 });
      }
      if (margin < 15) {
        recommendations.push({ id: recId++, priority: 'P1', priorityLabel: 'Critical', priorityColor: 'bg-rose-100 text-rose-800 border-rose-200', category: 'Financial', icon: '💸', title: `Urgent Cost Restructuring: ${o.outlet_name}`, rationale: `Profit margin of ${margin.toFixed(1)}% is critically low — below 15% sustainability threshold.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Audit top 3 operating cost line items immediately', 'Renegotiate vendor contracts for bulk pricing', 'Review menu pricing — consider 5–8% price adjustment', 'Reduce overtime and non-peak staffing hours'], estimatedImpact: `Potential +8–12% margin recovery worth ₹${Math.round(revenue * 0.08).toLocaleString('en-IN')}.`, urgency: 88 });
      }
      if (margin >= 15 && margin < 25) {
        recommendations.push({ id: recId++, priority: 'P2', priorityLabel: 'High', priorityColor: 'bg-amber-100 text-amber-800 border-amber-200', category: 'Financial', icon: '📊', title: `Margin Improvement Program: ${o.outlet_name}`, rationale: `Margin of ${margin.toFixed(1)}% is below the 25% healthy benchmark.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Benchmark cost ratios against top-performing outlets', 'Introduce dynamic pricing during peak hours', 'Optimize portion sizes to reduce food wastage costs'], estimatedImpact: `Target 25%+ margin — ₹${Math.round(revenue * 0.05).toLocaleString('en-IN')} additional monthly profit.`, urgency: 65 });
      }
      if (auditLow && !auditFailed) {
        recommendations.push({ id: recId++, priority: 'P2', priorityLabel: 'High', priorityColor: 'bg-amber-100 text-amber-800 border-amber-200', category: 'Compliance', icon: '📋', title: `Compliance Improvement Plan: ${o.outlet_name}`, rationale: `Audit score of ${lastAudit.overall_score.toFixed(1)}/100 is below the 70-point passing threshold.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Review full audit checklist and address each gap', 'Schedule hygiene and food safety training within 14 days', 'Implement daily SOP compliance self-checks', 'Target 80+ score on next scheduled audit'], estimatedImpact: 'Improve compliance score by 15–20 points in next cycle.', urgency: 68 });
      }
      if (lowRated >= 3) {
        recommendations.push({ id: recId++, priority: 'P2', priorityLabel: 'High', priorityColor: 'bg-amber-100 text-amber-800 border-amber-200', category: 'Staff', icon: '👤', title: `Staff Performance Intervention: ${o.outlet_name}`, rationale: `${lowRated} staff members rated below 3.5/5.0. Customer experience at risk.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Conduct individual performance reviews', 'Pair low-performers with top-rated mentors for 30 days', 'Implement weekly performance check-ins for 60 days', 'Consider role reassignment for persistently low performers'], estimatedImpact: 'Expected 0.4–0.6 point rating improvement within 45 days.', urgency: 62 });
      }
      if (lowStock >= 3 && criticalStock === 0) {
        recommendations.push({ id: recId++, priority: 'P3', priorityLabel: 'Medium', priorityColor: 'bg-blue-100 text-blue-800 border-blue-200', category: 'Inventory', icon: '🔄', title: `Proactive Restocking: ${o.outlet_name}`, rationale: `${lowStock} items approaching reorder level. Early action prevents stockouts.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Place standard replenishment orders for low-stock items', 'Review reorder point settings for frequently depleted items', 'Negotiate faster delivery windows with suppliers'], estimatedImpact: 'Maintain 95%+ order fulfillment rate.', urgency: 40 });
      }
      if (totalScore >= 85) {
        recommendations.push({ id: recId++, priority: 'P3', priorityLabel: 'Growth', priorityColor: 'bg-emerald-100 text-emerald-800 border-emerald-200', category: 'Expansion', icon: '🚀', title: `Growth Acceleration: ${o.outlet_name}`, rationale: `Health score of ${totalScore}/100 indicates a top-performing outlet. Conditions are ideal for scale.`, affectedOutlets: [{ id: o.id, name: o.outlet_name, city: o.city }], actions: ['Increase marketing budget allocation by 20%', 'Explore catering and B2B partnership opportunities', 'Pilot new menu items with premium pricing', 'Use as benchmark model for underperforming outlets'], estimatedImpact: `Potential +15–25% revenue growth in next quarter.`, urgency: 30 });
      }
    });

    if (networkRoas < 1.2) {
      recommendations.push({ id: recId++, priority: 'P1', priorityLabel: 'Critical', priorityColor: 'bg-rose-100 text-rose-800 border-rose-200', category: 'Marketing', icon: '📣', title: 'Network-Wide Marketing Reallocation Required', rationale: `Network ROAS of ${networkRoas.toFixed(2)}x means every ₹1 spent generates only ₹${networkRoas.toFixed(2)} in revenue.`, affectedOutlets: [{ id: null, name: 'All Outlets', city: 'Network-Wide' }], actions: ['Immediately pause campaigns with ROAS < 1.0', 'Reallocate 40% of budget to Social Media and Influencer channels', 'A/B test new creative assets for top 2 channels', 'Set minimum ROAS threshold of 1.5x for campaign approval'], estimatedImpact: `Recover ₹${Math.round((1.5 - networkRoas) * totalSpend).toLocaleString('en-IN')} in attributed revenue.`, urgency: 85 });
    }

    recommendations.sort((a, b) => b.urgency - a.urgency);
    res.json({ recommendations, summary: { total: recommendations.length, p1: recommendations.filter(r => r.priority === 'P1').length, p2: recommendations.filter(r => r.priority === 'P2').length, p3: recommendations.filter(r => r.priority === 'P3').length } });
  } catch (error) {
    console.error('Error generating intelligence recommendations:', error);
    res.status(500).json({ error: 'Server error generating recommendations' });
  }
});

module.exports = router;
