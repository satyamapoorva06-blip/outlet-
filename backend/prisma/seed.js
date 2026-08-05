const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SQLite database via Prisma...');

  // Clear all tables in correct order (FK constraints)
  await prisma.roi_reports.deleteMany();
  await prisma.marketing_metrics.deleteMany();
  await prisma.campaigns.deleteMany();
  await prisma.customers.deleteMany();
  await prisma.sales.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.users.deleteMany();
  await prisma.outlets.deleteMany();
  console.log('Cleared all existing data (including marketing agent tables).');


  // 1. Seed Outlets
  const outletData = [
    { outlet_name: "Indiranagar Flagship", manager_name: "Aarav Sharma", address: "100 Feet Rd, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", postal_code: "560038", latitude: 12.9716, longitude: 77.5946 },
    { outlet_name: "HITECH City Hub", manager_name: "Priya Reddy", address: "Cyber Towers, HITECH City", city: "Hyderabad", state: "Telangana", country: "India", postal_code: "500081", latitude: 17.4435, longitude: 78.3772 },
    { outlet_name: "Anna Nagar Cafe", manager_name: "Karthik Raja", address: "2nd Avenue, Anna Nagar", city: "Chennai", state: "Tamil Nadu", country: "India", postal_code: "600040", latitude: 13.0850, longitude: 80.2101 },
    { outlet_name: "Bandra Promenade", manager_name: "Neha Kulkarni", address: "Carter Rd, Bandra West", city: "Mumbai", state: "Maharashtra", country: "India", postal_code: "400050", latitude: 19.0596, longitude: 72.8295 },
    { outlet_name: "Koregaon Park Bistro", manager_name: "Rohan Deshmukh", address: "North Main Rd, Koregaon Park", city: "Pune", state: "Maharashtra", country: "India", postal_code: "411001", latitude: 18.5362, longitude: 73.8940 }
  ];

  for (const o of outletData) {
    await prisma.outlets.create({ data: o });
  }

  const outlets = await prisma.outlets.findMany({ orderBy: { id: 'asc' } });
  console.log(`Seeded ${outlets.length} outlets.`);

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.users.create({ data: { name: "HQ Operations Admin", email: "admin@franchiseops.ai", password_hash: passwordHash, role: "ADMIN", outlet_id: null } });
  for (const outlet of outlets) {
    const email = `${outlet.city.toLowerCase()}.mgr@franchiseops.ai`;
    await prisma.users.create({ data: { name: outlet.manager_name, email, password_hash: passwordHash, role: "MANAGER", outlet_id: outlet.id } });
  }
  console.log('Seeded 6 users (admin@franchiseops.ai / admin123).');

  // 3. Seed Inventory
  const catalog = [
    { name: "Espresso Beans (Arabica)", category: "Coffee", baseStock: 45, min: 15, max: 100, unit: "kg", price: 850 },
    { name: "Whole Milk (Fresh 1L)", category: "Dairy", baseStock: 120, min: 30, max: 200, unit: "L", price: 65 },
    { name: "Oat Milk (Barista Edition)", category: "Dairy", baseStock: 35, min: 10, max: 80, unit: "L", price: 240 },
    { name: "French Vanilla Syrup", category: "Syrups", baseStock: 18, min: 5, max: 40, unit: "bottles", price: 450 },
    { name: "Salted Caramel Syrup", category: "Syrups", baseStock: 14, min: 5, max: 40, unit: "bottles", price: 450 },
    { name: "Hot Cups 12oz (Pack 50)", category: "Packaging", baseStock: 80, min: 25, max: 150, unit: "packs", price: 320 },
    { name: "Cold Cups 16oz (Pack 50)", category: "Packaging", baseStock: 95, min: 25, max: 150, unit: "packs", price: 350 },
    { name: "Butter Croissants (Frozen)", category: "Bakery", baseStock: 150, min: 40, max: 300, unit: "units", price: 55 },
    { name: "Artisanal Sourdough Bread", category: "Bakery", baseStock: 40, min: 12, max: 80, unit: "loaves", price: 120 },
    { name: "Eco Paper Napkins (Pack 500)", category: "Supplies", baseStock: 50, min: 15, max: 100, unit: "packs", price: 180 }
  ];

  for (const outlet of outlets) {
    for (const item of catalog) {
      let current_stock = item.baseStock;
      let status = 'In Stock';
      if (outlet.city === 'Hyderabad' && (item.name.includes("Espresso") || item.name.includes("Croissants"))) { current_stock = Math.round(item.min * 0.6); status = 'Critical'; }
      else if (outlet.city === 'Pune' && (item.name.includes("Oat Milk") || item.name.includes("Hot Cups"))) { current_stock = item.min - 2; status = 'Low Stock'; }
      else if (outlet.city === 'Chennai' && item.name.includes("Caramel")) { current_stock = item.min - 1; status = 'Low Stock'; }
      await prisma.inventory.create({ data: { outlet_id: outlet.id, item_name: item.name, category: item.category, current_stock, min_threshold: item.min, max_capacity: item.max, unit: item.unit, unit_price: item.price, status, last_restocked: '2026-07-25' } });
    }
  }
  console.log('Seeded 50 inventory items.');

  // 4. Seed Staff
  const staffTemplates = [
    { name: "Aarav Sharma", role: "Store Manager", job: "Store Operations & Inventory Audit", shift: "Morning", login: "07:30 AM", logoff: "04:00 PM", rate: 350, hours: 168, rating: 4.9 },
    { name: "Sneha Nair", role: "Senior Barista", job: "Lead Espresso Barista & Quality Check", shift: "Morning", login: "07:45 AM", logoff: "04:15 PM", rate: 240, hours: 160, rating: 4.8 },
    { name: "Kavita Rao", role: "Shift Supervisor", job: "Floor Supervisor & Customer Service", shift: "Morning", login: "08:00 AM", logoff: "04:30 PM", rate: 260, hours: 165, rating: 4.7 },
    { name: "Divya Patel", role: "Cashier & Billing", job: "Front Desk POS & Cashier Lead", shift: "Morning", login: "08:15 AM", logoff: "04:45 PM", rate: 180, hours: 155, rating: 4.6 },
    { name: "Rahul Verma", role: "Barista Lead", job: "Cold Brew & Beverage Specialist", shift: "Evening", login: "03:45 PM", logoff: "11:15 PM", rate: 230, hours: 162, rating: 4.6 },
    { name: "Vikram Malhotra", role: "Barista", job: "Espresso & Milk Texturing Station", shift: "Evening", login: "04:00 PM", logoff: "11:30 PM", rate: 190, hours: 150, rating: 4.2 },
    { name: "Sameer Joshi", role: "Kitchen Prep", job: "Pastry Heating & Sandwich Line", shift: "Evening", login: "04:15 PM", logoff: "11:45 PM", rate: 175, hours: 145, rating: 3.6 },
    { name: "Ananya Sen", role: "Junior Barista", job: "Table Clearing & Order Runner", shift: "Evening", login: "04:30 PM", logoff: "12:00 AM", rate: 170, hours: 140, rating: 3.4 },
    { name: "Rishi Kumar", role: "Trainee Barista", job: "Dishwasher & Sanitization Lead", shift: "Night", login: "11:45 PM", logoff: "07:15 AM", rate: 160, hours: 130, rating: 3.2 },
    { name: "Pooja Hegde", role: "Junior Cashier", job: "Counter Cleanup & Receipt Filing", shift: "Night", login: "12:00 AM", logoff: "07:30 AM", rate: 165, hours: 135, rating: 3.1 }
  ];

  let staffCount = 0;
  for (const outlet of outlets) {
    for (const st of staffTemplates) {
      let performance_rating = st.rating;
      if (outlet.city === 'Hyderabad' && (st.role.includes("Junior") || st.role.includes("Trainee"))) performance_rating = parseFloat((st.rating - 0.4).toFixed(1));
      else if (outlet.city === 'Bengaluru' && st.role.includes("Senior")) performance_rating = 5.0;
      const staffName = st.role === 'Store Manager' ? outlet.manager_name : `${st.name.split(' ')[0]} (${outlet.city})`;
      const email = `${staffName.toLowerCase().replace(/[^a-z]/g, '')}@franchiseops.ai`;
      const phone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
      await prisma.staff.create({ data: { outlet_id: outlet.id, name: staffName, role: st.role, assigned_job: st.job, shift_type: st.shift, login_time: st.login, logoff_time: st.logoff, hourly_rate: st.rate, hours_worked: st.hours, performance_rating, status: 'Active', email, phone } });
      staffCount++;
    }
  }
  console.log(`Seeded ${staffCount} staff members.`);

  // 5. Seed Sales (60 days)
  const today = new Date("2026-07-28");
  let salesCount = 0;

  for (const outlet of outlets) {
    for (let i = 60; i >= 1; i--) {
      const saleDate = new Date(today);
      saleDate.setDate(today.getDate() - i);
      const dayOfWeek = saleDate.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5);

      let baseOrders = 160, baseAOV = 150, weekendBoost = 1.15, weekdayBoost = 1.0, costRatio = 0.58;
      if (outlet.city === 'Bengaluru') { baseOrders = 210; baseAOV = 175; weekendBoost = 1.30; costRatio = 0.52; }
      else if (outlet.city === 'Hyderabad') { baseOrders = 110; baseAOV = 125; weekdayBoost = 1.05; weekendBoost = 0.75; costRatio = 0.76; }
      else if (outlet.city === 'Chennai') { baseOrders = 145; baseAOV = 140; weekendBoost = 1.35; costRatio = 0.60; }
      else if (outlet.city === 'Mumbai') { baseOrders = 220; baseAOV = 185; weekendBoost = 1.20; costRatio = 0.54; }
      else if (outlet.city === 'Pune') { baseOrders = 135; baseAOV = 138; weekdayBoost = 1.18; weekendBoost = 0.85; costRatio = 0.64; }

      const boost = isWeekend ? weekendBoost : weekdayBoost;
      const rnd = 0.92 + Math.random() * 0.16;
      const total_orders = Math.round(baseOrders * boost * rnd);
      const customer_count = Math.round(total_orders * (1.1 + Math.random() * 0.12));
      const average_order_value = parseFloat((baseAOV * (0.95 + Math.random() * 0.1)).toFixed(2));
      const gross_revenue = parseFloat((total_orders * average_order_value).toFixed(2));
      const operating_cost = parseFloat((gross_revenue * (costRatio + Math.random() * 0.06 - 0.03)).toFixed(2));
      const net_profit = parseFloat((gross_revenue - operating_cost).toFixed(2));
      const upiShare = 0.55 + Math.random() * 0.08;
      const cardShare = 0.28 + Math.random() * 0.08;
      const cashShare = Math.max(0.02, 1.0 - upiShare - cardShare);
      const payment_upi = parseFloat((gross_revenue * upiShare).toFixed(2));
      const payment_card = parseFloat((gross_revenue * cardShare).toFixed(2));
      const payment_cash = parseFloat((gross_revenue * cashShare).toFixed(2));
      const sale_date = saleDate.toISOString().slice(0, 10);

      await prisma.sales.create({ data: { outlet_id: outlet.id, sale_date, total_orders, customer_count, gross_revenue, operating_cost, net_profit, average_order_value, payment_cash, payment_card, payment_upi } });
      salesCount++;
    }
  }
  console.log(`Seeded ${salesCount} sales records.`);

  // 6. Seed Customers
  console.log('Seeding customers...');
  const customerNames = [
    "Vihaan Sharma", "Ananya Iyer", "Arjun Patel", "Diya Nair", "Sai Krishna", 
    "Ishaan Gupta", "Aanya Verma", "Kabir Roy", "Meera Sen", "Aditya Bose", 
    "Sanya Malik", "Rohan Mehta", "Prisha Joshi", "Dev Choudhury", "Tara Rao",
    "Karan Khanna", "Riya Malhotra", "Nikhil Kapoor", "Siddharth Rao", "Alisha Das"
  ];
  const cities = ["Bengaluru", "Hyderabad", "Chennai", "Mumbai", "Pune"];
  const genders = ["Male", "Female"];
  const customerData = [];

  for (let c = 1; c <= 120; c++) {
    const baseName = customerNames[c % customerNames.length];
    const name = `${baseName} ${String.fromCharCode(65 + (c % 26))}.`;
    const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}${c}@gmail.com`;
    const phone = `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`;
    const age = Math.floor(18 + Math.random() * 45);
    const gender = genders[c % 2];
    const visit_count = Math.floor(1 + Math.random() * 50);
    const total_spend = parseFloat((visit_count * (120 + Math.random() * 280)).toFixed(2));
    
    // Simple heuristic for base engagement score
    const recency_factor = Math.random() * 30; // higher is better
    const freq_factor = Math.min(40, (visit_count / 50) * 40);
    const monetary_factor = Math.min(30, (total_spend / 15000) * 30);
    const calculated_engagement_score = parseFloat((recency_factor + freq_factor + monetary_factor).toFixed(2));
    
    // Heuristic for base segment
    let segment = "Regular";
    if (calculated_engagement_score > 65 && total_spend > 5000) segment = "High-Value";
    else if (calculated_engagement_score < 25 || visit_count < 4) segment = "Churn-Risk";

    customerData.push({
      name, email, phone, age, gender, total_spend, visit_count, calculated_engagement_score, segment
    });
  }

  for (const cust of customerData) {
    await prisma.customers.create({ data: cust });
  }
  console.log(`Seeded ${customerData.length} customers.`);

  // 7. Seed Campaigns
  console.log('Seeding campaigns...');
  const campaignData = [
    { name: "Summer Cooler Launch", channel: "Social Media", start_date: "2026-06-01", end_date: "2026-06-30", budget: 35000, status: "Completed", targeted_segments: "High-Value, Regular" },
    { name: "Monsoon Weekend Special", channel: "POS Coupons", start_date: "2026-07-01", end_date: "2026-07-15", budget: 15000, status: "Completed", targeted_segments: "High-Value, Churn-Risk" },
    { name: "Double Point Wednesdays", channel: "CRM System Data", start_date: "2026-07-01", end_date: "2026-08-31", budget: 12000, status: "Active", targeted_segments: "Regular, High-Value" },
    { name: "Late Night Happy Hours", channel: "Google Analytics", start_date: "2026-07-10", end_date: "2026-08-10", budget: 25000, status: "Active", targeted_segments: "Regular" },
    { name: "Bandra Store Anniversary Promo", channel: "Website Analytics", start_date: "2026-06-15", end_date: "2026-06-25", budget: 20000, status: "Completed", targeted_segments: "Regular" },
    { name: "Organic Cold Brew Drive", channel: "Social Media", start_date: "2026-08-10", end_date: "2026-08-31", budget: 40000, status: "Draft", targeted_segments: "High-Value" },
    { name: "Festive Coffee Box Gifting", channel: "Google Analytics", start_date: "2026-09-01", end_date: "2026-10-15", budget: 60000, status: "Draft", targeted_segments: "High-Value" },
    { name: "Express Delivery Promo", channel: "Website Analytics", start_date: "2026-05-01", end_date: "2026-05-15", budget: 18000, status: "Completed", targeted_segments: "Regular" },
    { name: "Monday Morning Boost", channel: "Social Media", start_date: "2026-05-10", end_date: "2026-06-10", budget: 10000, status: "Completed", targeted_segments: "Regular" }
  ];

  const campaigns = [];
  for (const camp of campaignData) {
    const created = await prisma.campaigns.create({ data: camp });
    campaigns.push(created);
  }
  console.log(`Seeded ${campaigns.length} campaigns.`);

  // 8. Seed Marketing Metrics and ROI Reports
  console.log('Seeding metrics and calculating ROI...');
  for (const camp of campaigns) {
    if (camp.status === 'Draft') continue;

    const start = new Date(camp.start_date);
    const end = new Date(camp.end_date);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) || 1;
    
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalConversions = 0;
    let totalRedemptions = 0;

    // Generate daily metrics
    for (let d = 0; d < days; d++) {
      const metricDate = new Date(start);
      metricDate.setDate(start.getDate() + d);
      
      const dayOfWeek = metricDate.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      
      // Base channel characteristics
      let baseImps = 2000, clickThruRate = 0.04, convRate = 0.20;
      if (camp.channel === "Social Media") { baseImps = 5000; clickThruRate = 0.06; convRate = 0.15; }
      else if (camp.channel === "POS Coupons") { baseImps = 800; clickThruRate = 0.25; convRate = 0.60; }
      else if (camp.channel === "CRM System Data") { baseImps = 1200; clickThruRate = 0.12; convRate = 0.35; }
      else if (camp.channel === "Google Analytics") { baseImps = 3000; clickThruRate = 0.05; convRate = 0.18; }
      else if (camp.channel === "Website Analytics") { baseImps = 2200; clickThruRate = 0.08; convRate = 0.22; }

      const boost = isWeekend ? 1.25 : 0.95;
      const rnd = 0.85 + Math.random() * 0.3;

      const impressions = Math.round(baseImps * boost * rnd);
      const clicks = Math.round(impressions * clickThruRate * rnd);
      const pos_sales_conversions = Math.round(clicks * convRate * rnd);
      const coupon_redemptions = camp.channel === "POS Coupons" ? Math.round(clicks * 0.9) : 0;
      const sentiment_score = parseFloat((0.65 + Math.random() * 0.3 - (d % 3 === 0 ? 0.15 : 0)).toFixed(2));
      const recorded_date = metricDate.toISOString().slice(0, 10);

      await prisma.marketing_metrics.create({
        data: {
          campaign_id: camp.id,
          clicks,
          impressions,
          pos_sales_conversions,
          sentiment_score,
          coupon_redemptions,
          recorded_date
        }
      });

      totalClicks += clicks;
      totalImpressions += impressions;
      totalConversions += pos_sales_conversions;
      totalRedemptions += coupon_redemptions;
    }

    // Attributed Revenue is based on conversions * average order value (e.g. ₹280)
    const avgAOV = camp.channel === "POS Coupons" ? 220 : 310;
    const attributed_revenue = parseFloat((totalConversions * avgAOV).toFixed(2));
    const total_spend = camp.budget;
    const net_roi = parseFloat((attributed_revenue - total_spend).toFixed(2));
    const efficiency_ratio = total_spend > 0 ? parseFloat((attributed_revenue / total_spend).toFixed(2)) : 0;

    await prisma.roi_reports.create({
      data: {
        campaign_id: camp.id,
        total_spend,
        attributed_revenue,
        net_roi,
        efficiency_ratio,
        calculated_timestamp: new Date()
      }
    });
  }
  console.log('Seeded marketing metrics and calculated initial ROI reports.');

  console.log('\n🎉 SEED COMPLETE! Local SQLite database is ready.');
  console.log('Login with: admin@franchiseops.ai / admin123');
}


main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
