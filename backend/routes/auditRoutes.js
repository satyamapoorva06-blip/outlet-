const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

const AUDIT_CHECKLIST_TEMPLATES = {
  Hygiene: [
    { question: 'All food contact surfaces sanitised and free of residue', score_weight: 8 },
    { question: 'Handwashing stations stocked with soap and sanitiser', score_weight: 7 },
    { question: 'Staff wearing appropriate PPE (gloves, hairnets, aprons)', score_weight: 8 },
    { question: 'Waste bins sealed, labelled, and emptied per schedule', score_weight: 6 },
    { question: 'Restrooms clean, stocked and inspected within last 2 hours', score_weight: 6 },
    { question: 'Floors, walls, and ceilings free of mould and grease buildup', score_weight: 5 },
  ],
  'Food Safety': [
    { question: 'All perishable items stored at correct temperature (0-5\u00B0C)', score_weight: 10 },
    { question: 'FIFO stock rotation applied to all ingredient batches', score_weight: 8 },
    { question: 'No expired or near-expiry items in active storage zones', score_weight: 10 },
    { question: 'Food thermometers calibrated and logs signed today', score_weight: 7 },
    { question: 'Allergen menu information displayed and up to date', score_weight: 6 },
    { question: 'Pest control records current and no active pest signs', score_weight: 9 },
  ],
  'Opening Procedure': [
    { question: 'Opening checklist signed by manager-on-duty', score_weight: 6 },
    { question: 'All equipment powered on and tested before opening', score_weight: 7 },
    { question: 'Cash drawer float verified and counted', score_weight: 8 },
    { question: 'POS system online and syncing to HQ', score_weight: 7 },
    { question: 'Temperature logs completed for all cold storage units', score_weight: 6 },
  ],
  'Closing Procedure': [
    { question: 'Closing checklist signed by manager-on-duty', score_weight: 6 },
    { question: 'End-of-day cash reconciliation completed and locked', score_weight: 10 },
    { question: 'All perishables properly sealed and refrigerated', score_weight: 8 },
    { question: 'Security alarm set and exit doors locked', score_weight: 8 },
    { question: 'Deep cleaning of prep surfaces completed', score_weight: 7 },
  ],
  SOP: [
    { question: 'Brand standard uniform worn by all on-shift staff', score_weight: 5 },
    { question: 'Customer greeting SOP followed at POS (within 30 sec)', score_weight: 6 },
    { question: 'Order accuracy rate above 98% based on today\'s log review', score_weight: 8 },
    { question: 'Upsell prompts correctly applied per training manual', score_weight: 5 },
    { question: 'Incident log book updated and accessible', score_weight: 6 },
    { question: 'Staff certifications (food safety, first aid) visible on-site', score_weight: 7 },
  ],
};

router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { outletId, status } = req.query;
    const rows = await prisma.audit_sessions.findMany({
      where: {
        ...(outletId && outletId !== 'all' ? { outlet_id: parseInt(outletId, 10) } : {}),
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        findings: { select: { id: true, severity: true, status: true } },
        _count: { select: { checklist_items: true } },
      },
      orderBy: { audit_date: 'desc' },
    });

    const sessions = await Promise.all(rows.map(async s => {
      const outlet = await prisma.outlets.findUnique({ where: { id: s.outlet_id }, select: { outlet_name: true, city: true, manager_name: true } });
      const criticalFindings = s.findings.filter(f => f.severity === 'Critical' && f.status !== 'Resolved').length;
      return {
        id: s.id, outletId: s.outlet_id, outletName: outlet?.outlet_name || 'Unknown',
        city: outlet?.city || '', manager: outlet?.manager_name || '',
        auditorName: s.auditor_name, auditDate: s.audit_date, status: s.status,
        overallScore: s.overall_score, maxScore: s.max_score, passFail: s.pass_fail,
        hygieneScore: s.hygiene_score, foodSafetyScore: s.food_safety_score,
        sopScore: s.sop_score, facilityScore: s.facility_score,
        checklistCount: s._count.checklist_items, criticalFindings,
        totalFindings: s.findings.length, notes: s.notes,
      };
    }));
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching audit sessions:', error);
    res.status(500).json({ error: 'Server error fetching audit sessions' });
  }
});

router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { outletId, auditorName, auditDate, notes } = req.body;
    if (!outletId || !auditorName || !auditDate) {
      return res.status(400).json({ error: 'outletId, auditorName, and auditDate are required' });
    }
    const outlet = await prisma.outlets.findUnique({ where: { id: parseInt(outletId, 10) } });
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    const session = await prisma.audit_sessions.create({
      data: {
        outlet_id: parseInt(outletId, 10), auditor_name: auditorName,
        audit_date: auditDate, status: 'In Progress', notes: notes || null,
      },
    });

    const items = [];
    for (const [category, questions] of Object.entries(AUDIT_CHECKLIST_TEMPLATES)) {
      for (const q of questions) {
        items.push({ session_id: session.id, category, question: q.question, score_weight: q.score_weight });
      }
    }
    await prisma.audit_checklist_items.createMany({ data: items });

    res.status(201).json({ message: 'Audit session created', sessionId: session.id });
  } catch (error) {
    console.error('Error creating audit session:', error);
    res.status(500).json({ error: 'Server error creating audit session' });
  }
});

router.get('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const session = await prisma.audit_sessions.findUnique({
      where: { id },
      include: { checklist_items: { orderBy: [{ category: 'asc' }, { id: 'asc' }] }, findings: { orderBy: { severity: 'asc' } }, media_uploads: true },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const outlet = await prisma.outlets.findUnique({ where: { id: session.outlet_id }, select: { outlet_name: true, city: true } });
    res.json({ ...session, outletName: outlet?.outlet_name, city: outlet?.city });
  } catch (error) {
    console.error('Error fetching session detail:', error);
    res.status(500).json({ error: 'Server error fetching session detail' });
  }
});

router.put('/checklist-items/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { answer, notes, photoUrl } = req.body;
    if (!answer) return res.status(400).json({ error: 'answer is required' });
    const updated = await prisma.audit_checklist_items.update({
      where: { id },
      data: { answer, notes: notes || null, photo_url: photoUrl || null },
    });
    res.json({ message: 'Checklist item updated', item: updated });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Server error updating checklist item' });
  }
});

router.post('/sessions/:id/complete', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const session = await prisma.audit_sessions.findUnique({ where: { id }, include: { checklist_items: true } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const catScores = {};
    let totalEarned = 0, totalPossible = 0;
    for (const item of session.checklist_items) {
      if (!catScores[item.category]) catScores[item.category] = { earned: 0, possible: 0 };
      catScores[item.category].possible += item.score_weight;
      totalPossible += item.score_weight;
      if (item.answer === 'Pass') {
        catScores[item.category].earned += item.score_weight;
        totalEarned += item.score_weight;
      } else if (item.answer === 'N/A') {
        catScores[item.category].possible -= item.score_weight;
        totalPossible -= item.score_weight;
      }
    }

    const overallScore = totalPossible > 0 ? parseFloat(((totalEarned / totalPossible) * 100).toFixed(1)) : 0;
    const passFail = overallScore >= 70 ? 'Pass' : 'Fail';

    const getScore = (cat) => {
      const s = catScores[cat];
      if (!s || s.possible === 0) return 0;
      return parseFloat(((s.earned / s.possible) * 100).toFixed(1));
    };

    await prisma.audit_sessions.update({
      where: { id },
      data: {
        status: 'Completed', overall_score: overallScore,
        max_score: 100, pass_fail: passFail,
        hygiene_score: getScore('Hygiene'),
        food_safety_score: getScore('Food Safety'),
        sop_score: getScore('SOP'),
        facility_score: getScore('Opening Procedure'),
        updated_at: new Date(),
      },
    });

    const failedItems = session.checklist_items.filter(i => i.answer === 'Fail');
    for (const item of failedItems) {
      const severity = item.score_weight >= 9 ? 'Critical' : item.score_weight >= 7 ? 'High' : 'Medium';
      await prisma.audit_findings.create({
        data: {
          session_id: id, severity,
          finding_type: item.category === 'Hygiene' || item.category === 'Food Safety' ? 'Hygiene' : 'SOP',
          description: `FAILED: ${item.question}`,
          status: 'Open',
        },
      });
    }

    res.json({ message: 'Audit session completed', overallScore, passFail });
  } catch (error) {
    console.error('Error completing audit session:', error);
    res.status(500).json({ error: 'Server error completing audit session' });
  }
});

router.get('/checklists', authenticateToken, async (req, res) => {
  try {
    res.json(AUDIT_CHECKLIST_TEMPLATES);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching checklist templates' });
  }
});

router.get('/inventory-variance', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const where = {};
    if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);

    const [inventoryRows, salesRows] = await Promise.all([
      prisma.inventory.findMany({ where, include: { outlets: { select: { outlet_name: true, city: true } } } }),
      prisma.sales.findMany({ where: outletId && outletId !== 'all' ? { outlet_id: parseInt(outletId, 10) } : {}, select: { total_orders: true, outlet_id: true } }),
    ]);

    const ordersByOutlet = {};
    salesRows.forEach(s => {
      ordersByOutlet[s.outlet_id] = (ordersByOutlet[s.outlet_id] || 0) + s.total_orders;
    });

    const varianceItems = inventoryRows.map(item => {
      const totalOrders = ordersByOutlet[item.outlet_id] || 0;
      const consumptionRate = item.category === 'Coffee' ? 0.015 : item.category === 'Dairy' ? 0.08 : item.category === 'Food' ? 0.025 : 0.01;
      const estimatedConsumption = parseFloat((totalOrders * consumptionRate).toFixed(2));
      const theoreticalRemaining = parseFloat((item.max_capacity - estimatedConsumption).toFixed(2));
      const variance = parseFloat((item.current_stock - theoreticalRemaining).toFixed(2));
      const variancePct = theoreticalRemaining > 0 ? parseFloat(((Math.abs(variance) / theoreticalRemaining) * 100).toFixed(1)) : 0;
      const flagLevel = variancePct > 25 ? 'Critical' : variancePct > 12 ? 'High' : variancePct > 5 ? 'Medium' : 'Normal';
      return {
        id: item.id, outletId: item.outlet_id, outletName: item.outlets.outlet_name,
        city: item.outlets.city, itemName: item.item_name, category: item.category,
        currentStock: item.current_stock, unit: item.unit,
        estimatedConsumption, theoreticalRemaining,
        variance, variancePct, flagLevel, status: item.status,
      };
    });

    varianceItems.sort((a, b) => b.variancePct - a.variancePct);
    res.json({ items: varianceItems, summary: {
      totalItems: varianceItems.length,
      criticalVariance: varianceItems.filter(i => i.flagLevel === 'Critical').length,
      highVariance: varianceItems.filter(i => i.flagLevel === 'High').length,
      normal: varianceItems.filter(i => i.flagLevel === 'Normal').length,
    }});
  } catch (error) {
    console.error('Error computing inventory variance:', error);
    res.status(500).json({ error: 'Server error computing inventory variance' });
  }
});

router.get('/pos-discrepancies', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const where = {};
    if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);

    const outlets = await prisma.outlets.findMany({
      where: { is_active: true, ...(outletId && outletId !== 'all' ? { id: parseInt(outletId, 10) } : {}) },
      include: { sales: { select: { gross_revenue: true, payment_cash: true, payment_card: true, payment_upi: true, total_orders: true, sale_date: true } } },
    });

    const discrepancies = outlets.map(outlet => {
      const totalRevenue = outlet.sales.reduce((s, r) => s + r.gross_revenue, 0);
      const totalCash = outlet.sales.reduce((s, r) => s + r.payment_cash, 0);
      const totalCard = outlet.sales.reduce((s, r) => s + r.payment_card, 0);
      const totalUpi = outlet.sales.reduce((s, r) => s + r.payment_upi, 0);
      const recordedTotal = totalCash + totalCard + totalUpi;
      const mismatch = parseFloat((totalRevenue - recordedTotal).toFixed(2));
      const mismatchPct = totalRevenue > 0 ? parseFloat(((Math.abs(mismatch) / totalRevenue) * 100).toFixed(2)) : 0;

      const cashRatio = totalRevenue > 0 ? (totalCash / totalRevenue) * 100 : 0;
      const voidEstimate = Math.max(0, Math.floor((mismatchPct / 100) * outlet.sales.reduce((s, r) => s + r.total_orders, 0)));
      const overrideFlags = cashRatio > 45 ? 'High cash dependency — manual override risk' : null;

      const riskLevel = mismatchPct > 5 || cashRatio > 50 ? 'Critical' : mismatchPct > 2 || cashRatio > 40 ? 'High' : mismatchPct > 0.5 ? 'Medium' : 'Normal';

      return {
        outletId: outlet.id, outletName: outlet.outlet_name, city: outlet.city,
        manager: outlet.manager_name, totalRevenue, recordedTotal,
        mismatch: Math.abs(mismatch), mismatchPct,
        paymentSplit: { cash: totalCash, card: totalCard, upi: totalUpi },
        cashRatio: parseFloat(cashRatio.toFixed(1)),
        estimatedVoids: voidEstimate,
        overrideFlag: overrideFlags,
        riskLevel,
      };
    });

    discrepancies.sort((a, b) => b.mismatchPct - a.mismatchPct);
    res.json({
      discrepancies,
      summary: {
        totalMismatch: parseFloat(discrepancies.reduce((s, d) => s + d.mismatch, 0).toFixed(2)),
        criticalOutlets: discrepancies.filter(d => d.riskLevel === 'Critical').length,
        highRisk: discrepancies.filter(d => d.riskLevel === 'High').length,
      },
    });
  } catch (error) {
    console.error('Error computing POS discrepancies:', error);
    res.status(500).json({ error: 'Server error computing POS discrepancies' });
  }
});

router.get('/shift-verification', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const where = {};
    if (outletId && outletId !== 'all') where.outlet_id = parseInt(outletId, 10);

    const [outlets, staffRows] = await Promise.all([
      prisma.outlets.findMany({ where: { is_active: true, ...(outletId && outletId !== 'all' ? { id: parseInt(outletId, 10) } : {}) }, select: { id: true, outlet_name: true, city: true, manager_name: true } }),
      prisma.staff.findMany({ where, include: { outlets: { select: { outlet_name: true, city: true } } } }),
    ]);

    const outletVerification = outlets.map(outlet => {
      const staff = staffRows.filter(s => s.outlet_id === outlet.id);
      const scheduled = staff.length;
      const active = staff.filter(s => s.status === 'Active').length;
      const morning = staff.filter(s => s.shift_type === 'Morning').length;
      const evening = staff.filter(s => s.shift_type === 'Evening').length;
      const night = staff.filter(s => s.shift_type === 'Night').length;

      const certGaps = staff.filter(s => s.performance_rating < 3.5).map(s => ({
        staffId: s.id, name: s.name, role: s.role, rating: s.performance_rating,
        gap: 'Food safety re-certification required (rating below threshold)',
      }));

      const coverageFlag = active < 3 ? 'Understaffed' : active < 5 ? 'Borderline' : 'Adequate';
      const managerPresent = staff.some(s => s.role === 'Manager' || s.role === 'Shift Supervisor');

      return {
        outletId: outlet.id, outletName: outlet.outlet_name, city: outlet.city, manager: outlet.manager_name,
        scheduled, active, shiftBreakdown: { morning, evening, night },
        coverageFlag, managerPresent, certificationGaps: certGaps,
        attendanceRate: scheduled > 0 ? parseFloat(((active / scheduled) * 100).toFixed(1)) : 0,
        riskLevel: certGaps.length > 2 || !managerPresent ? 'Critical' : certGaps.length > 0 || coverageFlag === 'Understaffed' ? 'High' : 'Normal',
      };
    });

    res.json({
      outlets: outletVerification,
      summary: {
        totalCertGaps: outletVerification.reduce((s, o) => s + o.certificationGaps.length, 0),
        understaffedOutlets: outletVerification.filter(o => o.coverageFlag === 'Understaffed').length,
        missingManagers: outletVerification.filter(o => !o.managerPresent).length,
      },
    });
  } catch (error) {
    console.error('Error verifying shift coverage:', error);
    res.status(500).json({ error: 'Server error verifying shifts' });
  }
});

router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    const { outletId, status } = req.query;
    const rows = await prisma.audit_incidents.findMany({
      where: {
        ...(outletId && outletId !== 'all' ? { outlet_id: parseInt(outletId, 10) } : {}),
        ...(status && status !== 'all' ? { status } : {}),
      },
      orderBy: [{ priority: 'asc' }, { reported_date: 'desc' }],
    });

    const incidents = await Promise.all(rows.map(async inc => {
      const outlet = await prisma.outlets.findUnique({ where: { id: inc.outlet_id }, select: { outlet_name: true, city: true } });
      return { ...inc, outletName: outlet?.outlet_name || 'Unknown', city: outlet?.city || '' };
    }));

    res.json({ incidents, summary: {
      open: incidents.filter(i => i.status === 'Open').length,
      inProgress: incidents.filter(i => i.status === 'In Progress').length,
      resolved: incidents.filter(i => i.status === 'Resolved').length,
      critical: incidents.filter(i => i.priority === 'Critical').length,
    }});
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Server error fetching incidents' });
  }
});

router.post('/incidents', authenticateToken, async (req, res) => {
  try {
    const { outletId, sessionId, title, description, incidentType, priority, assignedTo, reportedDate } = req.body;
    if (!outletId || !title || !incidentType || !reportedDate) {
      return res.status(400).json({ error: 'outletId, title, incidentType, and reportedDate are required' });
    }
    const incident = await prisma.audit_incidents.create({
      data: {
        outlet_id: parseInt(outletId, 10), session_id: sessionId ? parseInt(sessionId, 10) : null,
        title, description: description || '', incident_type: incidentType,
        priority: priority || 'Medium', assigned_to: assignedTo || null,
        reported_date: reportedDate,
      },
    });
    res.status(201).json({ message: 'Incident created', incident });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Server error creating incident' });
  }
});

router.put('/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, resolvedDate } = req.body;
    const updated = await prisma.audit_incidents.update({
      where: { id },
      data: { status, resolved_date: resolvedDate || null, updated_at: new Date() },
    });
    res.json({ message: 'Incident updated', incident: updated });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Server error updating incident' });
  }
});

router.get('/anomalies', authenticateToken, async (req, res) => {
  try {
    const { outletId } = req.query;
    const where = outletId && outletId !== 'all' ? { outlet_id: parseInt(outletId, 10) } : {};

    const [sessions, incidents, inventoryRows, staffRows, salesRows] = await Promise.all([
      prisma.audit_sessions.findMany({ where, include: { findings: true } }),
      prisma.audit_incidents.findMany({ where: { ...where, status: { not: 'Resolved' }, priority: { in: ['Critical', 'High'] } } }),
      prisma.inventory.findMany({ where: { ...where, status: { in: ['Critical', 'Low Stock'] } } }),
      prisma.staff.findMany({ where: { ...where, performance_rating: { lt: 3.5 } } }),
      prisma.sales.findMany({ where, select: { gross_revenue: true, payment_cash: true, outlet_id: true } }),
    ]);

    const anomalies = [];

    sessions.forEach(s => {
      const critFailed = s.findings.filter(f => f.severity === 'Critical' && f.status !== 'Resolved');
      if (critFailed.length > 0) {
        anomalies.push({
          id: `session-${s.id}`, type: 'Hygiene / SOP Failure', severity: 'Critical',
          description: `Audit session #${s.id} has ${critFailed.length} unresolved critical finding(s). Score: ${s.overall_score}/100`,
          outletId: s.outlet_id, escalated: s.status === 'Escalated', timestamp: s.audit_date,
          action: 'Immediate re-inspection required. Escalate to Regional Manager.',
        });
      }
    });

    const cashByOutlet = {};
    const revenueByOutlet = {};
    salesRows.forEach(r => {
      cashByOutlet[r.outlet_id] = (cashByOutlet[r.outlet_id] || 0) + r.payment_cash;
      revenueByOutlet[r.outlet_id] = (revenueByOutlet[r.outlet_id] || 0) + r.gross_revenue;
    });
    Object.keys(revenueByOutlet).forEach(oId => {
      const revenue = revenueByOutlet[oId];
      const cash = cashByOutlet[oId] || 0;
      const cashRatio = revenue > 0 ? (cash / revenue) * 100 : 0;
      if (cashRatio > 45) {
        anomalies.push({
          id: `pos-${oId}`, type: 'POS Cash Mismatch', severity: cashRatio > 60 ? 'Critical' : 'High',
          description: `Outlet ${oId}: ${cashRatio.toFixed(1)}% cash dependency detected. Possible manual override or void pattern.`,
          outletId: parseInt(oId), escalated: false, timestamp: new Date().toISOString().slice(0, 10),
          action: 'Pull POS void logs, verify cash drawer counts against daily settlement report.',
        });
      }
    });

    const criticalInv = inventoryRows.filter(i => i.status === 'Critical');
    if (criticalInv.length > 0) {
      anomalies.push({
        id: 'inventory-critical', type: 'Critical Stock Shortage', severity: 'High',
        description: `${criticalInv.length} item(s) at critical stock level across the franchise network. Potential service disruption risk.`,
        outletId: null, escalated: false, timestamp: new Date().toISOString().slice(0, 10),
        action: 'Trigger emergency purchase order. Contact primary supplier immediately.',
      });
    }

    if (staffRows.length > 0) {
      anomalies.push({
        id: 'staff-cert', type: 'Staff Certification Gap', severity: staffRows.length > 5 ? 'Critical' : 'High',
        description: `${staffRows.length} staff member(s) with performance rating below certification threshold (< 3.5/5.0).`,
        outletId: null, escalated: false, timestamp: new Date().toISOString().slice(0, 10),
        action: 'Schedule mandatory re-training sessions. Restrict unsupervised shifts for flagged staff.',
      });
    }

    if (incidents.length > 0) {
      anomalies.push({
        id: 'incidents-open', type: 'Open Critical Incidents', severity: incidents.some(i => i.priority === 'Critical') ? 'Critical' : 'High',
        description: `${incidents.length} open incident(s) with Critical/High priority require immediate resolution.`,
        outletId: null, escalated: false, timestamp: new Date().toISOString().slice(0, 10),
        action: 'Review incident tickets. Assign resolution owners with 24-hour SLA for critical items.',
      });
    }

    anomalies.sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    res.json({ anomalies, summary: {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'Critical').length,
      high: anomalies.filter(a => a.severity === 'High').length,
    }});
  } catch (error) {
    console.error('Error computing audit anomalies:', error);
    res.status(500).json({ error: 'Server error computing audit anomalies' });
  }
});

module.exports = router;
