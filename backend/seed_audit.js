/**
 * seed_audit.js — Prisma-based audit data seeder
 * Safely adds audit sessions, checklist items, findings, media uploads,
 * and incidents WITHOUT touching existing outlets/sales/staff/inventory tables.
 * Run: node seed_audit.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Seeding Audit Agent data via Prisma...');

  // Clear existing audit data first (safe re-run)
  await prisma.audit_media_uploads.deleteMany({});
  await prisma.audit_checklist_items.deleteMany({});
  await prisma.audit_findings.deleteMany({});
  await prisma.audit_sessions.deleteMany({});
  await prisma.audit_incidents.deleteMany({});
  console.log('Cleared existing audit records.');

  // Get outlet IDs from existing data
  const outlets = await prisma.outlets.findMany({ select: { id: true, outlet_name: true }, orderBy: { id: 'asc' } });
  if (outlets.length < 3) {
    console.error('Need at least 3 outlets in the database. Please run seed_sqlite.js first.');
    process.exit(1);
  }
  const [o1, o2, o3, o4, o5] = outlets;
  console.log(`Found ${outlets.length} outlets: ${outlets.map(o => o.outlet_name).join(', ')}`);

  // ── Create Audit Sessions ──────────────────────────────────────────────────
  const sessions = await Promise.all([
    // Session 1: Outlet 1 — Completed, Pass
    prisma.audit_sessions.create({ data: { outlet_id: o1.id, auditor_name: 'Priya Sharma (Regional Auditor)', audit_date: '2026-08-10', status: 'Completed', overall_score: 84.5, max_score: 100, pass_fail: 'Pass', hygiene_score: 88.0, food_safety_score: 91.0, sop_score: 80.0, facility_score: 79.0, notes: 'Overall strong performance. Minor SOP gaps noted at cashier station.' } }),
    // Session 2: Outlet 1 — Completed, Fail (older)
    prisma.audit_sessions.create({ data: { outlet_id: o1.id, auditor_name: 'Arjun Mehta (Field Inspector)', audit_date: '2026-07-15', status: 'Completed', overall_score: 61.2, max_score: 100, pass_fail: 'Fail', hygiene_score: 55.0, food_safety_score: 62.0, sop_score: 65.0, facility_score: 63.0, notes: 'Critical hygiene failures in cold storage area. Escalation raised to Regional Manager.' } }),
    // Session 3: Outlet 2 — Completed, Pass (model outlet)
    prisma.audit_sessions.create({ data: { outlet_id: o2.id, auditor_name: 'Priya Sharma (Regional Auditor)', audit_date: '2026-08-09', status: 'Completed', overall_score: 91.3, max_score: 100, pass_fail: 'Pass', hygiene_score: 95.0, food_safety_score: 94.0, sop_score: 88.0, facility_score: 88.0, notes: 'Excellent compliance across all categories. Model outlet.' } }),
    // Session 4: Outlet 2 — In Progress (live today)
    prisma.audit_sessions.create({ data: { outlet_id: o2.id, auditor_name: 'Rahul Gupta (Junior Auditor)', audit_date: '2026-08-12', status: 'In Progress', overall_score: 0, max_score: 100, pass_fail: 'Pending', hygiene_score: 0, food_safety_score: 0, sop_score: 0, facility_score: 0, notes: 'Live audit in progress — checklist partially completed.' } }),
    // Session 5: Outlet 3 — Escalated, Fail
    prisma.audit_sessions.create({ data: { outlet_id: o3.id, auditor_name: 'Arjun Mehta (Field Inspector)', audit_date: '2026-08-08', status: 'Escalated', overall_score: 52.0, max_score: 100, pass_fail: 'Fail', hygiene_score: 44.0, food_safety_score: 48.0, sop_score: 60.0, facility_score: 56.0, notes: 'Multiple critical food safety violations. Escalated to Regional Director immediately.' } }),
    // Session 6: Outlet 4 — Completed, Pass
    prisma.audit_sessions.create({ data: { outlet_id: o4 ? o4.id : o1.id, auditor_name: 'Kavya Nair (Compliance Lead)', audit_date: '2026-08-07', status: 'Completed', overall_score: 78.9, max_score: 100, pass_fail: 'Pass', hygiene_score: 83.0, food_safety_score: 79.0, sop_score: 76.0, facility_score: 77.0, notes: 'Good overall. Recommend refresher on closing procedures.' } }),
    // Session 7: Outlet 5 — Completed, Pass (marginal)
    prisma.audit_sessions.create({ data: { outlet_id: o5 ? o5.id : o2.id, auditor_name: 'Priya Sharma (Regional Auditor)', audit_date: '2026-08-06', status: 'Completed', overall_score: 73.5, max_score: 100, pass_fail: 'Pass', hygiene_score: 76.0, food_safety_score: 72.0, sop_score: 74.0, facility_score: 72.0, notes: 'Passed with marginal scores. Action plan dispatched.' } }),
  ]);
  console.log(`Created ${sessions.length} audit sessions.`);

  const [s1, s2, s3, s4, s5, s6, s7] = sessions;

  // ── Checklist templates ────────────────────────────────────────────────────
  const templates = [
    { category: 'Hygiene', question: 'All food contact surfaces sanitised and free of residue', score_weight: 8 },
    { category: 'Hygiene', question: 'Handwashing stations stocked with soap and sanitiser', score_weight: 7 },
    { category: 'Hygiene', question: 'Staff wearing appropriate PPE (gloves, hairnets, aprons)', score_weight: 8 },
    { category: 'Hygiene', question: 'Waste bins sealed, labelled, and emptied per schedule', score_weight: 6 },
    { category: 'Hygiene', question: 'Restrooms clean, stocked and inspected within last 2 hours', score_weight: 6 },
    { category: 'Hygiene', question: 'Floors, walls, and ceilings free of mould and grease buildup', score_weight: 5 },
    { category: 'Food Safety', question: 'All perishable items stored at correct temperature (0-5 degrees)', score_weight: 10 },
    { category: 'Food Safety', question: 'FIFO stock rotation applied to all ingredient batches', score_weight: 8 },
    { category: 'Food Safety', question: 'No expired or near-expiry items in active storage zones', score_weight: 10 },
    { category: 'Food Safety', question: 'Food thermometers calibrated and logs signed today', score_weight: 7 },
    { category: 'Food Safety', question: 'Allergen menu information displayed and up to date', score_weight: 6 },
    { category: 'Food Safety', question: 'Pest control records current and no active pest signs', score_weight: 9 },
    { category: 'Opening Procedure', question: 'Opening checklist signed by manager-on-duty', score_weight: 6 },
    { category: 'Opening Procedure', question: 'All equipment powered on and tested before opening', score_weight: 7 },
    { category: 'Opening Procedure', question: 'Cash drawer float verified and counted', score_weight: 8 },
    { category: 'Opening Procedure', question: 'POS system online and syncing to HQ', score_weight: 7 },
    { category: 'Opening Procedure', question: 'Temperature logs completed for all cold storage units', score_weight: 6 },
    { category: 'Closing Procedure', question: 'Closing checklist signed by manager-on-duty', score_weight: 6 },
    { category: 'Closing Procedure', question: 'End-of-day cash reconciliation completed and locked', score_weight: 10 },
    { category: 'Closing Procedure', question: 'All perishables properly sealed and refrigerated', score_weight: 8 },
    { category: 'Closing Procedure', question: 'Security alarm set and exit doors locked', score_weight: 8 },
    { category: 'Closing Procedure', question: 'Deep cleaning of prep surfaces completed', score_weight: 7 },
    { category: 'SOP', question: 'Brand standard uniform worn by all on-shift staff', score_weight: 5 },
    { category: 'SOP', question: 'Customer greeting SOP followed at POS (within 30 sec)', score_weight: 6 },
    { category: 'SOP', question: 'Order accuracy rate above 98% based on log review', score_weight: 8 },
    { category: 'SOP', question: 'Upsell prompts correctly applied per training manual', score_weight: 5 },
    { category: 'SOP', question: 'Incident log book updated and accessible', score_weight: 6 },
    { category: 'SOP', question: 'Staff certifications (food safety, first aid) visible on-site', score_weight: 7 },
  ];

  // Answer matrices per session
  const answerMap = {
    [s1.id]: ['Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass'],
    [s2.id]: ['Fail','Fail','Pass','Fail','Fail','Pass','Fail','Pass','Fail','Fail','Pass','Fail','Pass','Pass','Fail','Pass','Pass','Pass','Fail','Fail','Pass','Pass','Fail','Pass','Fail','Pass','Fail','Pass'],
    [s3.id]: ['Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass'],
    [s4.id]: ['Pass','Pass','Pass','Pending','Pending','Pending','Pass','Pending','Pending','Pending','Pending','Pending','Pass','Pass','Pending','Pending','Pending','Pending','Pending','Pending','Pending','Pending','Pass','Pass','Pending','Pending','Pending','Pending'],
    [s5.id]: ['Fail','Pass','Fail','Fail','Fail','Fail','Fail','Fail','Fail','Fail','Pass','Fail','Pass','Pass','Fail','Pass','Fail','Pass','Fail','Fail','Pass','Pass','Pass','Pass','Fail','Pass','Fail','Pass'],
    [s6.id]: ['Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass'],
    [s7.id]: ['Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass'],
  };

  // Insert checklist items for all sessions
  for (const session of sessions) {
    const answers = answerMap[session.id] || templates.map(() => 'Pending');
    const items = templates.map((t, i) => {
      const answer = answers[i] || 'Pending';
      return {
        session_id: session.id, category: t.category, question: t.question,
        answer, score_weight: t.score_weight,
        notes: answer === 'Fail' ? 'Non-compliance observed. Photo documentation required.' : null,
        photo_url: answer === 'Fail' ? 'https://placehold.co/400x300/1e293b/94a3b8?text=Evidence+Photo' : null,
      };
    });
    await prisma.audit_checklist_items.createMany({ data: items });
  }
  console.log('Created checklist items for all sessions.');

  // ── Findings ───────────────────────────────────────────────────────────────
  await prisma.audit_findings.createMany({ data: [
    // Session 2 (outlet1, July fail)
    { session_id: s2.id, severity: 'Critical', finding_type: 'Food Safety', description: 'FAILED: Perishable storage — cold chain breach detected, temperature above safe threshold', status: 'Open', assigned_to: 'Outlet Manager', due_date: '2026-07-20' },
    { session_id: s2.id, severity: 'Critical', finding_type: 'Hygiene', description: 'FAILED: Food contact surfaces — visible contamination on prep counters', status: 'In Progress', assigned_to: 'Priya Sharma', due_date: '2026-07-18' },
    { session_id: s2.id, severity: 'High', finding_type: 'Hygiene', description: 'FAILED: Handwashing stations not stocked — soap dispensers empty at 3 stations', status: 'Resolved', assigned_to: 'Outlet Manager', due_date: '2026-07-17' },
    { session_id: s2.id, severity: 'High', finding_type: 'Food Safety', description: 'FAILED: Expired items found in active cold storage (2 items, 3 days past date)', status: 'Open', assigned_to: 'Store Supervisor', due_date: '2026-07-21' },
    { session_id: s2.id, severity: 'Medium', finding_type: 'SOP', description: 'FAILED: Order accuracy log not maintained for the past 48 hours', status: 'Open', assigned_to: null, due_date: '2026-07-22' },
    // Session 5 (outlet3, escalated)
    { session_id: s5.id, severity: 'Critical', finding_type: 'Food Safety', description: 'FAILED: Perishable storage temperature at 9 degrees — exceeds safe zone. Immediate food safety risk.', status: 'Open', assigned_to: 'Regional Manager - Bangalore', due_date: '2026-08-09' },
    { session_id: s5.id, severity: 'Critical', finding_type: 'Hygiene', description: 'FAILED: Pest signs (rodent droppings) observed in dry storage room', status: 'Open', assigned_to: 'Facility Team', due_date: '2026-08-09' },
    { session_id: s5.id, severity: 'Critical', finding_type: 'Food Safety', description: 'FAILED: Expired items in active kitchen use — 4 items past sell-by date', status: 'Open', assigned_to: 'Outlet Manager - Bangalore', due_date: '2026-08-09' },
    { session_id: s5.id, severity: 'High', finding_type: 'Hygiene', description: 'FAILED: Floors in prep area visibly greasy — slip hazard not addressed', status: 'In Progress', assigned_to: 'Cleaning Crew Lead', due_date: '2026-08-10' },
    { session_id: s5.id, severity: 'High', finding_type: 'Financial', description: 'FAILED: Cash drawer reconciliation missing for last 2 shifts', status: 'Open', assigned_to: 'Store Manager', due_date: '2026-08-10' },
    { session_id: s5.id, severity: 'High', finding_type: 'Staffing', description: 'FAILED: Staff certifications not visible or accessible on-site', status: 'Open', assigned_to: 'HR - South Region', due_date: '2026-08-12' },
  ]});
  console.log('Created audit findings.');

  // ── Media Uploads ──────────────────────────────────────────────────────────
  await prisma.audit_media_uploads.createMany({ data: [
    { session_id: s2.id, file_name: 'cold_storage_breach.jpg', file_url: 'https://placehold.co/800x600/450a0a/fca5a5?text=Cold+Storage+Temp+Breach' },
    { session_id: s2.id, file_name: 'surface_contamination.jpg', file_url: 'https://placehold.co/800x600/450a0a/fca5a5?text=Surface+Contamination+Found' },
    { session_id: s5.id, file_name: 'pest_evidence.jpg', file_url: 'https://placehold.co/800x600/431407/fdba74?text=Pest+Droppings+Found' },
    { session_id: s5.id, file_name: 'temperature_log.jpg', file_url: 'https://placehold.co/800x600/1e1b4b/a5b4fc?text=Temperature+Log+Violation' },
    { session_id: s1.id, file_name: 'clean_station_verified.jpg', file_url: 'https://placehold.co/800x600/052e16/86efac?text=Clean+Food+Station+Verified' },
    { session_id: s3.id, file_name: 'model_outlet_compliance.jpg', file_url: 'https://placehold.co/800x600/052e16/86efac?text=Model+Outlet+Compliance' },
  ]});
  console.log('Created audit media uploads.');

  // ── Incidents ──────────────────────────────────────────────────────────────
  await prisma.audit_incidents.createMany({ data: [
    { outlet_id: o3.id, session_id: s5.id, title: 'Refrigeration Unit Malfunction — Cold Chain Breach', description: 'Primary cold storage unit failed overnight. Temperature rose to 9 degrees, compromising all perishables. Unit requires immediate replacement or repair.', incident_type: 'Equipment', priority: 'Critical', status: 'Open', assigned_to: 'Facility Team - South Zone', reported_date: '2026-08-08' },
    { outlet_id: o3.id, session_id: s5.id, title: 'Pest Infestation — Dry Storage Room', description: 'Rodent droppings identified during routine audit. Full pest control sweep required. All dry goods in affected zone quarantined.', incident_type: 'Hygiene', priority: 'Critical', status: 'In Progress', assigned_to: 'Pest Control Vendor', reported_date: '2026-08-08' },
    { outlet_id: o1.id, session_id: s2.id, title: 'Cash Drawer Reconciliation Discrepancy', description: 'End-of-day cash count short by Rs.2,840 on July 15 shift. POS logs reviewed — 3 manual voids flagged without supervisor approval.', incident_type: 'POS', priority: 'High', status: 'In Progress', assigned_to: 'Priya Sharma (Auditor)', reported_date: '2026-07-15' },
    { outlet_id: o2.id, session_id: null, title: 'Broken AC Unit — Customer Seating Area', description: 'Primary HVAC unit in customer-facing seating zone non-functional. Customer complaints logged. Ambient temperature at 31 degrees during peak hours.', incident_type: 'Facility', priority: 'High', status: 'In Progress', assigned_to: 'Maintenance - West Zone', reported_date: '2026-08-05' },
    { outlet_id: o4 ? o4.id : o1.id, session_id: s6.id, title: 'Fire Extinguisher Inspection Overdue', description: 'Two fire extinguishers in kitchen zone have inspection tags expired by 60+ days. Regulatory non-compliance risk.', incident_type: 'Safety', priority: 'High', status: 'Open', assigned_to: 'Safety Officer', reported_date: '2026-08-07' },
    { outlet_id: o5 ? o5.id : o2.id, session_id: null, title: 'POS Terminal Unresponsive During Peak Hours', description: 'Terminal 2 froze twice during morning rush, causing order queue backup. IT support notified.', incident_type: 'POS', priority: 'Medium', status: 'Resolved', assigned_to: 'IT Support Desk', reported_date: '2026-08-01', resolved_date: '2026-08-03' },
    { outlet_id: o1.id, session_id: null, title: 'Broken Display Signage — Brand Compliance Gap', description: 'FranchiseOps branded menu board display cracked and showing outdated seasonal menu. Brand compliance violation.', incident_type: 'Facility', priority: 'Medium', status: 'Open', assigned_to: 'Brand Team - HQ', reported_date: '2026-08-10' },
    { outlet_id: o2.id, session_id: s3.id, title: 'Hand Sanitizer Station Malfunction — Front Entrance', description: 'Auto-dispenser at entrance non-functional. Manual station installed as interim fix. Permanent replacement ordered.', incident_type: 'Hygiene', priority: 'Low', status: 'Resolved', assigned_to: 'Outlet Manager', reported_date: '2026-08-06', resolved_date: '2026-08-09' },
  ]});
  console.log('Created audit incidents.');

  console.log('\n🎉 Audit Agent seed complete!');
  console.log('- 7 Audit Sessions (Pass/Fail/Escalated/In Progress)');
  console.log('- 196 Checklist items (28 per session)');
  console.log('- 11 Audit Findings (Critical/High/Medium)');
  console.log('- 6 Media Uploads');
  console.log('- 8 Facility/POS/Hygiene Incidents');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
