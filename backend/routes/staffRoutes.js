const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, async (req, res) => {
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

router.get('/performers', authenticateToken, async (req, res) => {
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

router.put('/:id/allocate-job', authenticateToken, async (req, res) => {
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

router.get('/agent-insights', authenticateToken, async (req, res) => {
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

module.exports = router;
