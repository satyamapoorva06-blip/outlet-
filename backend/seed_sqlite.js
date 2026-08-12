const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // off during seeding

async function main() {
  try {
    console.log("Seeding SQLite database at:", DB_PATH);

    // Drop existing tables
    db.exec(`
      DROP TABLE IF EXISTS sales;
      DROP TABLE IF EXISTS inventory;
      DROP TABLE IF EXISTS staff;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS outlets;
      DROP TABLE IF EXISTS roi_reports;
      DROP TABLE IF EXISTS marketing_metrics;
      DROP TABLE IF EXISTS campaigns;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS audit_media_uploads;
      DROP TABLE IF EXISTS audit_checklist_items;
      DROP TABLE IF EXISTS audit_findings;
      DROP TABLE IF EXISTS audit_sessions;
      DROP TABLE IF EXISTS audit_incidents;
    `);
    console.log("Dropped old tables cleanly (including marketing and audit tables).");


    // 1. Outlets
    db.exec(`
      CREATE TABLE outlets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outlet_name TEXT NOT NULL,
        manager_name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        country TEXT NOT NULL,
        postal_code TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 2. Sales
    db.exec(`
      CREATE TABLE sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
        sale_date TEXT NOT NULL,
        total_orders INTEGER NOT NULL,
        customer_count INTEGER NOT NULL,
        gross_revenue REAL NOT NULL,
        operating_cost REAL NOT NULL,
        net_profit REAL NOT NULL,
        average_order_value REAL NOT NULL,
        payment_cash REAL NOT NULL,
        payment_card REAL NOT NULL,
        payment_upi REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 3. Users
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'MANAGER',
        outlet_id INTEGER REFERENCES outlets(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 4. Inventory
    db.exec(`
      CREATE TABLE inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL,
        current_stock REAL NOT NULL,
        min_threshold REAL NOT NULL,
        max_capacity REAL NOT NULL,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL,
        status TEXT DEFAULT 'In Stock',
        last_restocked TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 5. Staff
    db.exec(`
      CREATE TABLE staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        assigned_job TEXT NOT NULL DEFAULT 'General Operations',
        shift_type TEXT NOT NULL,
        login_time TEXT NOT NULL DEFAULT '08:00 AM',
        logoff_time TEXT NOT NULL DEFAULT '04:30 PM',
        hourly_rate REAL NOT NULL,
        hours_worked REAL NOT NULL,
        performance_rating REAL NOT NULL,
        status TEXT DEFAULT 'Active',
        email TEXT,
        phone TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 6. Customers
    db.exec(`
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        age INTEGER,
        gender TEXT,
        total_spend REAL DEFAULT 0.0,
        visit_count INTEGER DEFAULT 0,
        calculated_engagement_score REAL DEFAULT 0.0,
        segment TEXT DEFAULT 'Regular',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 7. Campaigns
    db.exec(`
      CREATE TABLE campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        channel TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        budget REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Draft',
        targeted_segments TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 8. Marketing Metrics
    db.exec(`
      CREATE TABLE marketing_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        pos_sales_conversions INTEGER DEFAULT 0,
        sentiment_score REAL DEFAULT 0.0,
        coupon_redemptions INTEGER DEFAULT 0,
        recorded_date TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // 9. ROI Reports
    db.exec(`
      CREATE TABLE roi_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        total_spend REAL NOT NULL,
        attributed_revenue REAL NOT NULL,
        net_roi REAL NOT NULL,
        efficiency_ratio REAL NOT NULL,
        calculated_timestamp TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    console.log("Created fresh tables: outlets, sales, users, inventory, staff, customers, campaigns, marketing_metrics, roi_reports.");

    // Seed outlets
    const defaultOutlets = [
      { name: "Indiranagar Flagship", manager: "Aarav Sharma", address: "100 Feet Rd, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", zip: "560038", lat: 12.9716, lng: 77.5946 },
      { name: "HITECH City Hub", manager: "Priya Reddy", address: "Cyber Towers, HITECH City", city: "Hyderabad", state: "Telangana", country: "India", zip: "500081", lat: 17.4435, lng: 78.3772 },
      { name: "Anna Nagar Cafe", manager: "Karthik Raja", address: "2nd Avenue, Anna Nagar", city: "Chennai", state: "Tamil Nadu", country: "India", zip: "600040", lat: 13.0850, lng: 80.2101 },
      { name: "Bandra Promenade", manager: "Neha Kulkarni", address: "Carter Rd, Bandra West", city: "Mumbai", state: "Maharashtra", country: "India", zip: "400050", lat: 19.0596, lng: 72.8295 },
      { name: "Koregaon Park Bistro", manager: "Rohan Deshmukh", address: "North Main Rd, Koregaon Park", city: "Pune", state: "Maharashtra", country: "India", zip: "411001", lat: 18.5362, lng: 73.8940 }
    ];

    const insertOutlet = db.prepare(`
      INSERT INTO outlets (outlet_name, manager_name, address, city, state, country, postal_code, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const o of defaultOutlets) {
      insertOutlet.run(o.name, o.manager, o.address, o.city, o.state, o.country, o.zip, o.lat, o.lng);
    }

    const outlets = db.prepare("SELECT id, outlet_name, city, manager_name FROM outlets ORDER BY id").all();

    // Seed users (admin + one manager per outlet)
    const passwordHash = await bcrypt.hash('admin123', 10);

    db.prepare(`INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES (?, ?, ?, ?, ?)`)
      .run("HQ Operations Admin", "admin@franchiseops.ai", passwordHash, "ADMIN", null);

    for (const outlet of outlets) {
      const email = `${outlet.city.toLowerCase()}.mgr@franchiseops.ai`;
      db.prepare(`INSERT INTO users (name, email, password_hash, role, outlet_id) VALUES (?, ?, ?, ?, ?)`)
        .run(outlet.manager_name, email, passwordHash, "MANAGER", outlet.id);
    }

    console.log("Seeded 6 users (1 admin + 5 managers).");

    // Seed inventory
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

    const insertInventory = db.prepare(`
      INSERT INTO inventory (outlet_id, item_name, category, current_stock, min_threshold, max_capacity, unit, unit_price, status, last_restocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const outlet of outlets) {
      for (const item of catalog) {
        let currentStock = item.baseStock;
        let status = 'In Stock';

        if (outlet.city === 'Hyderabad' && (item.name.includes("Espresso") || item.name.includes("Croissants"))) {
          currentStock = Math.round(item.min * 0.6);
          status = 'Critical';
        } else if (outlet.city === 'Pune' && (item.name.includes("Oat Milk") || item.name.includes("Hot Cups"))) {
          currentStock = item.min - 2;
          status = 'Low Stock';
        } else if (outlet.city === 'Chennai' && item.name.includes("Caramel")) {
          currentStock = item.min - 1;
          status = 'Low Stock';
        }

        insertInventory.run(outlet.id, item.name, item.category, currentStock, item.min, item.max, item.unit, item.price, status, '2026-07-25');
      }
    }

    console.log("Seeded 50 inventory items.");

    // Seed staff
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

    const insertStaff = db.prepare(`
      INSERT INTO staff (outlet_id, name, role, assigned_job, shift_type, login_time, logoff_time, hourly_rate, hours_worked, performance_rating, status, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let staffCount = 0;
    for (const outlet of outlets) {
      for (const st of staffTemplates) {
        let rating = st.rating;

        if (outlet.city === 'Hyderabad' && (st.role.includes("Junior") || st.role.includes("Trainee"))) {
          rating = parseFloat((st.rating - 0.4).toFixed(1));
        } else if (outlet.city === 'Bengaluru' && st.role.includes("Senior")) {
          rating = 5.0;
        }

        const staffName = st.role === 'Store Manager' ? outlet.manager_name : `${st.name.split(' ')[0]} (${outlet.city})`;
        const email = `${staffName.toLowerCase().replace(/[^a-z]/g, '')}@franchiseops.ai`;
        const phone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

        insertStaff.run(outlet.id, staffName, st.role, st.job, st.shift, st.login, st.logoff, st.rate, st.hours, rating, 'Active', email, phone);
        staffCount++;
      }
    }
    console.log(`Seeded ${staffCount} staff members.`);

    // Seed 60 days of sales
    const totalDays = 60;
    const today = new Date("2026-07-28");
    let salesCount = 0;

    const insertSale = db.prepare(`
      INSERT INTO sales (outlet_id, sale_date, total_orders, customer_count, gross_revenue, operating_cost, net_profit, average_order_value, payment_cash, payment_card, payment_upi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertManySales = db.transaction(() => {
      for (const outlet of outlets) {
        for (let i = totalDays; i >= 1; i--) {
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

          const formattedDate = saleDate.toISOString().slice(0, 10);
          insertSale.run(outlet.id, formattedDate, total_orders, customer_count, gross_revenue, operating_cost, net_profit, average_order_value, payment_cash, payment_card, payment_upi);
          salesCount++;
        }
      }
    });

    insertManySales();
    console.log(`Seeded ${salesCount} sales records.`);

    // --- SEED MARKETING DATA ---
    console.log("Seeding marketing tables...");
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, email, phone, age, gender, total_spend, visit_count, calculated_engagement_score, segment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customerNames = [
      "Vihaan Sharma", "Ananya Iyer", "Arjun Patel", "Diya Nair", "Sai Krishna", 
      "Ishaan Gupta", "Aanya Verma", "Kabir Roy", "Meera Sen", "Aditya Bose", 
      "Sanya Malik", "Rohan Mehta", "Prisha Joshi", "Dev Choudhury", "Tara Rao",
      "Karan Khanna", "Riya Malhotra", "Nikhil Kapoor", "Siddharth Rao", "Alisha Das"
    ];
    const genders = ["Male", "Female"];
    for (let c = 1; c <= 120; c++) {
      const baseName = customerNames[c % customerNames.length];
      const name = `${baseName} ${String.fromCharCode(65 + (c % 26))}.`;
      const email = `${name.toLowerCase().replace(/[^a-z]/g, '')}${c}@gmail.com`;
      const phone = `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`;
      const age = Math.floor(18 + Math.random() * 45);
      const gender = genders[c % 2];
      const visit_count = Math.floor(1 + Math.random() * 50);
      const total_spend = parseFloat((visit_count * (120 + Math.random() * 280)).toFixed(2));
      
      const recency_factor = Math.random() * 30;
      const freq_factor = Math.min(40, (visit_count / 50) * 40);
      const monetary_factor = Math.min(30, (total_spend / 15000) * 30);
      const calculated_engagement_score = parseFloat((recency_factor + freq_factor + monetary_factor).toFixed(2));
      
      let segment = "Regular";
      if (calculated_engagement_score > 65 && total_spend > 5000) segment = "High-Value";
      else if (calculated_engagement_score < 25 || visit_count < 4) segment = "Churn-Risk";

      insertCustomer.run(name, email, phone, age, gender, total_spend, visit_count, calculated_engagement_score, segment);
    }

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

    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (name, channel, start_date, end_date, budget, status, targeted_segments)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMetric = db.prepare(`
      INSERT INTO marketing_metrics (campaign_id, clicks, impressions, pos_sales_conversions, sentiment_score, coupon_redemptions, recorded_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertROI = db.prepare(`
      INSERT INTO roi_reports (campaign_id, total_spend, attributed_revenue, net_roi, efficiency_ratio, calculated_timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const camp of campaignData) {
      const info = insertCampaign.run(camp.name, camp.channel, camp.start_date, camp.end_date, camp.budget, camp.status, camp.targeted_segments);
      const campaignId = info.lastInsertRowid;

      if (camp.status === 'Draft') continue;

      const start = new Date(camp.start_date);
      const end = new Date(camp.end_date);
      const days = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) || 1;
      
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalConversions = 0;
      let totalRedemptions = 0;

      for (let d = 0; d < days; d++) {
        const metricDate = new Date(start);
        metricDate.setDate(start.getDate() + d);
        
        const dayOfWeek = metricDate.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        
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

        insertMetric.run(campaignId, clicks, impressions, pos_sales_conversions, sentiment_score, coupon_redemptions, recorded_date);

        totalClicks += clicks;
        totalImpressions += impressions;
        totalConversions += pos_sales_conversions;
        totalRedemptions += coupon_redemptions;
      }

      const avgAOV = camp.channel === "POS Coupons" ? 220 : 310;
      const attributed_revenue = parseFloat((totalConversions * avgAOV).toFixed(2));
      const total_spend = camp.budget;
      const net_roi = parseFloat((attributed_revenue - total_spend).toFixed(2));
      const efficiency_ratio = total_spend > 0 ? parseFloat((attributed_revenue / total_spend).toFixed(2)) : 0;

      insertROI.run(campaignId, total_spend, attributed_revenue, net_roi, efficiency_ratio, new Date().toISOString());
    }
    console.log("Seeded marketing metrics and computed ROI reports in SQLite.");

    // ─── AUDIT AGENT SEED DATA ────────────────────────────────────────────────

    // Create audit tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outlet_id INTEGER NOT NULL,
        auditor_name TEXT NOT NULL,
        audit_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'In Progress',
        overall_score REAL NOT NULL DEFAULT 0,
        max_score REAL NOT NULL DEFAULT 100,
        pass_fail TEXT NOT NULL DEFAULT 'Pending',
        hygiene_score REAL NOT NULL DEFAULT 0,
        food_safety_score REAL NOT NULL DEFAULT 0,
        sop_score REAL NOT NULL DEFAULT 0,
        facility_score REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_checklist_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT 'Pending',
        score_weight REAL NOT NULL DEFAULT 5,
        notes TEXT,
        photo_url TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        severity TEXT NOT NULL,
        finding_type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open',
        assigned_to TEXT,
        due_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_media_uploads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        item_id INTEGER,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        uploaded_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outlet_id INTEGER NOT NULL,
        session_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Open',
        assigned_to TEXT,
        reported_date TEXT NOT NULL,
        resolved_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Seed audit sessions
    const insertSession = db.prepare(`
      INSERT INTO audit_sessions (outlet_id, auditor_name, audit_date, status, overall_score, max_score, pass_fail, hygiene_score, food_safety_score, sop_score, facility_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const auditSessionsData = [
      // Outlet 1 - Passed
      [1, 'Priya Sharma (Regional Auditor)', '2026-08-10', 'Completed', 84.5, 100, 'Pass', 88.0, 91.0, 80.0, 79.0, 'Overall strong performance. Minor SOP gaps noted at cashier station.'],
      // Outlet 1 - Failed (older)
      [1, 'Arjun Mehta (Field Inspector)', '2026-07-15', 'Completed', 61.2, 100, 'Fail', 55.0, 62.0, 65.0, 63.0, 'Critical hygiene failures in cold storage area. Escalation raised to Regional Manager.'],
      // Outlet 2 - Passed
      [2, 'Priya Sharma (Regional Auditor)', '2026-08-09', 'Completed', 91.3, 100, 'Pass', 95.0, 94.0, 88.0, 88.0, 'Excellent compliance across all categories. Model outlet.'],
      // Outlet 2 - In Progress
      [2, 'Rahul Gupta (Junior Auditor)', '2026-08-12', 'In Progress', 0, 100, 'Pending', 0, 0, 0, 0, 'Live audit in progress — checklist partially completed.'],
      // Outlet 3 - Escalated
      [3, 'Arjun Mehta (Field Inspector)', '2026-08-08', 'Escalated', 52.0, 100, 'Fail', 44.0, 48.0, 60.0, 56.0, 'Multiple critical food safety violations. Escalated to Regional Director immediately.'],
      // Outlet 4 - Passed
      [4, 'Kavya Nair (Compliance Lead)', '2026-08-07', 'Completed', 78.9, 100, 'Pass', 83.0, 79.0, 76.0, 77.0, 'Good overall. Recommend refresher on closing procedures.'],
      // Outlet 5 - Completed
      [5, 'Priya Sharma (Regional Auditor)', '2026-08-06', 'Completed', 73.5, 100, 'Pass', 76.0, 72.0, 74.0, 72.0, 'Passed with marginal scores. Action plan dispatched.'],
    ];

    const sessionIds = [];
    for (const s of auditSessionsData) {
      const result = insertSession.run(...s);
      sessionIds.push(result.lastInsertRowid);
    }
    console.log(`Seeded ${sessionIds.length} audit sessions.`);

    // Seed checklist items for completed sessions
    const insertItem = db.prepare(`
      INSERT INTO audit_checklist_items (session_id, category, question, answer, score_weight, notes, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const checklistTemplates = [
      { category: 'Hygiene', question: 'All food contact surfaces sanitised and free of residue', weight: 8 },
      { category: 'Hygiene', question: 'Handwashing stations stocked with soap and sanitiser', weight: 7 },
      { category: 'Hygiene', question: 'Staff wearing appropriate PPE (gloves, hairnets, aprons)', weight: 8 },
      { category: 'Hygiene', question: 'Waste bins sealed, labelled, and emptied per schedule', weight: 6 },
      { category: 'Hygiene', question: 'Restrooms clean, stocked and inspected within last 2 hours', weight: 6 },
      { category: 'Hygiene', question: 'Floors, walls, and ceilings free of mould and grease buildup', weight: 5 },
      { category: 'Food Safety', question: 'All perishable items stored at correct temperature (0–5°C)', weight: 10 },
      { category: 'Food Safety', question: 'FIFO stock rotation applied to all ingredient batches', weight: 8 },
      { category: 'Food Safety', question: 'No expired or near-expiry items in active storage zones', weight: 10 },
      { category: 'Food Safety', question: 'Food thermometers calibrated and logs signed today', weight: 7 },
      { category: 'Food Safety', question: 'Allergen menu information displayed and up to date', weight: 6 },
      { category: 'Food Safety', question: 'Pest control records current and no active pest signs', weight: 9 },
      { category: 'Opening Procedure', question: 'Opening checklist signed by manager-on-duty', weight: 6 },
      { category: 'Opening Procedure', question: 'All equipment powered on and tested before opening', weight: 7 },
      { category: 'Opening Procedure', question: 'Cash drawer float verified and counted', weight: 8 },
      { category: 'Opening Procedure', question: 'POS system online and syncing to HQ', weight: 7 },
      { category: 'Opening Procedure', question: 'Temperature logs completed for all cold storage units', weight: 6 },
      { category: 'Closing Procedure', question: 'Closing checklist signed by manager-on-duty', weight: 6 },
      { category: 'Closing Procedure', question: 'End-of-day cash reconciliation completed and locked', weight: 10 },
      { category: 'Closing Procedure', question: 'All perishables properly sealed and refrigerated', weight: 8 },
      { category: 'Closing Procedure', question: 'Security alarm set and exit doors locked', weight: 8 },
      { category: 'Closing Procedure', question: 'Deep cleaning of prep surfaces completed', weight: 7 },
      { category: 'SOP', question: 'Brand standard uniform worn by all on-shift staff', weight: 5 },
      { category: 'SOP', question: 'Customer greeting SOP followed at POS (within 30 sec)', weight: 6 },
      { category: 'SOP', question: 'Order accuracy rate above 98% based on today\'s log review', weight: 8 },
      { category: 'SOP', question: 'Upsell prompts correctly applied per training manual', weight: 5 },
      { category: 'SOP', question: 'Incident log book updated and accessible', weight: 6 },
      { category: 'SOP', question: 'Staff certifications (food safety, first aid) visible on-site', weight: 7 },
    ];

    // Answers matrix for completed sessions [sessionIdx][itemIdx]
    // Session 0 (outlet1, pass=84.5): mostly pass, few fails
    const answersS0 = ['Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass'];
    // Session 1 (outlet1, fail=61.2): many fails
    const answersS1 = ['Fail','Fail','Pass','Fail','Fail','Pass','Fail','Pass','Fail','Fail','Pass','Fail','Pass','Pass','Fail','Pass','Pass','Pass','Fail','Fail','Pass','Pass','Fail','Pass','Fail','Pass','Fail','Pass'];
    // Session 2 (outlet2, pass=91.3): mostly pass
    const answersS2 = ['Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass'];
    // Session 3 (outlet2, in progress): pending mostly
    const answersS3 = ['Pass','Pass','Pass','Pending','Pending','Pending','Pass','Pending','Pending','Pending','Pending','Pending','Pass','Pass','Pending','Pending','Pending','Pending','Pending','Pending','Pending','Pending','Pass','Pass','Pending','Pending','Pending','Pending'];
    // Session 4 (outlet3, escalated fail=52): heavy fails
    const answersS4 = ['Fail','Pass','Fail','Fail','Fail','Fail','Fail','Fail','Fail','Fail','Pass','Fail','Pass','Pass','Fail','Pass','Fail','Pass','Fail','Fail','Pass','Pass','Pass','Pass','Fail','Pass','Fail','Pass'];
    // Session 5 (outlet4, pass=78.9)
    const answersS5 = ['Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass'];
    // Session 6 (outlet5, pass=73.5)
    const answersS6 = ['Pass','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Fail','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass','Pass','Fail','Pass','Pass','Pass'];

    const allAnswers = [answersS0, answersS1, answersS2, answersS3, answersS4, answersS5, answersS6];
    const photoUrls = ['https://placehold.co/400x300/1e293b/94a3b8?text=Evidence+Photo', null];

    for (let si = 0; si < sessionIds.length; si++) {
      for (let qi = 0; qi < checklistTemplates.length; qi++) {
        const t = checklistTemplates[qi];
        const answer = allAnswers[si][qi] || 'Pending';
        const note = answer === 'Fail' ? 'Non-compliance observed. Photo documentation attached.' : null;
        const photo = answer === 'Fail' ? photoUrls[0] : null;
        insertItem.run(sessionIds[si], t.category, t.question, answer, t.weight, note, photo);
      }
    }
    console.log(`Seeded audit checklist items for all sessions.`);

    // Seed findings for failed sessions
    const insertFinding = db.prepare(`
      INSERT INTO audit_findings (session_id, severity, finding_type, description, status, assigned_to, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const findingsData = [
      // Session 1 (outlet1, July fail)
      [sessionIds[1], 'Critical', 'Food Safety', 'FAILED: All perishable items stored at correct temperature (0–5°C) — cold chain breach detected', 'Open', 'Outlet Manager - Mumbai Central', '2026-07-20'],
      [sessionIds[1], 'Critical', 'Hygiene', 'FAILED: All food contact surfaces sanitised — visible contamination on prep counters', 'In Progress', 'Priya Sharma', '2026-07-18'],
      [sessionIds[1], 'High', 'Hygiene', 'FAILED: Handwashing stations not stocked — soap dispensers empty at 3 stations', 'Resolved', 'Outlet Manager', '2026-07-17'],
      [sessionIds[1], 'High', 'Food Safety', 'FAILED: Expired items found in active cold storage (2 items, 3 days past date)', 'Open', 'Store Supervisor', '2026-07-21'],
      [sessionIds[1], 'Medium', 'SOP', 'FAILED: Order accuracy log not maintained for the past 48 hours', 'Open', null, '2026-07-22'],
      // Session 4 (outlet3, escalated)
      [sessionIds[4], 'Critical', 'Food Safety', 'FAILED: Perishable storage temperature at 9°C — exceeds safe zone. Food safety risk.', 'Open', 'Regional Manager - Bangalore', '2026-08-09'],
      [sessionIds[4], 'Critical', 'Hygiene', 'FAILED: Pest signs (rodent droppings) observed in dry storage room', 'Open', 'Facility Team', '2026-08-09'],
      [sessionIds[4], 'Critical', 'Food Safety', 'FAILED: Expired items in active kitchen use — 4 items past sell-by date', 'Open', 'Outlet Manager - Bangalore', '2026-08-09'],
      [sessionIds[4], 'High', 'Hygiene', 'FAILED: Floors in prep area visibly greasy, slip hazard not addressed', 'In Progress', 'Cleaning Crew Lead', '2026-08-10'],
      [sessionIds[4], 'High', 'Financial', 'FAILED: Cash drawer reconciliation missing for last 2 shifts', 'Open', 'Store Manager', '2026-08-10'],
      [sessionIds[4], 'High', 'Staffing', 'FAILED: Staff certifications not visible/accessible on-site', 'Open', 'HR - South Region', '2026-08-12'],
    ];

    for (const f of findingsData) insertFinding.run(...f);
    console.log(`Seeded ${findingsData.length} audit findings.`);

    // Seed media uploads
    const insertMedia = db.prepare(`
      INSERT INTO audit_media_uploads (session_id, file_name, file_url) VALUES (?, ?, ?)
    `);
    const mediaData = [
      [sessionIds[1], 'cold_storage_breach.jpg', 'https://placehold.co/800x600/450a0a/fca5a5?text=Cold+Storage+Temp+Breach'],
      [sessionIds[1], 'surface_contamination.jpg', 'https://placehold.co/800x600/450a0a/fca5a5?text=Surface+Contamination+Found'],
      [sessionIds[4], 'pest_evidence.jpg', 'https://placehold.co/800x600/431407/fdba74?text=Pest+Droppings+Found'],
      [sessionIds[4], 'temperature_log.jpg', 'https://placehold.co/800x600/1e1b4b/a5b4fc?text=Temperature+Log+Violation'],
      [sessionIds[0], 'clean_station.jpg', 'https://placehold.co/800x600/052e16/86efac?text=Clean+Food+Station+Verified'],
      [sessionIds[2], 'model_outlet.jpg', 'https://placehold.co/800x600/052e16/86efac?text=Model+Outlet+Compliance'],
    ];
    for (const m of mediaData) insertMedia.run(...m);
    console.log(`Seeded ${mediaData.length} audit media uploads.`);

    // Seed audit incidents
    const insertIncident = db.prepare(`
      INSERT INTO audit_incidents (outlet_id, session_id, title, description, incident_type, priority, status, assigned_to, reported_date, resolved_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const incidentData = [
      [3, sessionIds[4], 'Refrigeration Unit Malfunction — Cold Chain Breach', 'Primary cold storage unit failed overnight. Temperature rose to 9°C, compromising all perishables. Unit requires immediate replacement or repair.', 'Equipment', 'Critical', 'Open', 'Facility Team - South Zone', '2026-08-08', null],
      [3, sessionIds[4], 'Pest Infestation — Dry Storage Room', 'Rodent droppings identified during routine audit. Full pest control sweep required. All dry goods in affected zone quarantined.', 'Hygiene', 'Critical', 'In Progress', 'Pest Control Vendor', '2026-08-08', null],
      [1, sessionIds[1], 'Cash Drawer Reconciliation Discrepancy', 'End-of-day cash count short by ₹2,840 on July 15 shift. POS logs reviewed — 3 manual voids flagged without supervisor approval.', 'POS', 'High', 'In Progress', 'Priya Sharma (Auditor)', '2026-07-15', null],
      [2, null, 'Broken AC Unit — Customer Seating Area', 'Primary HVAC unit in customer-facing seating zone non-functional. Customer complaints logged. Ambient temperature at 31°C during peak hours.', 'Facility', 'High', 'In Progress', 'Maintenance - West Zone', '2026-08-05', null],
      [4, sessionIds[5], 'Fire Extinguisher Inspection Overdue', 'Two fire extinguishers in kitchen zone have inspection tags expired by 60+ days. Regulatory non-compliance risk.', 'Safety', 'High', 'Open', 'Safety Officer', '2026-08-07', null],
      [5, null, 'POS Terminal Unresponsive During Peak Hours', 'Terminal 2 at Outlet 5 froze twice during morning rush, causing order queue backup. IT support notified.', 'POS', 'Medium', 'Resolved', 'IT Support Desk', '2026-08-01', '2026-08-03'],
      [1, null, 'Broken Display Signage — Brand Compliance Gap', 'FranchiseOps branded menu board display cracked and showing outdated seasonal menu. Brand compliance violation.', 'Facility', 'Medium', 'Open', 'Brand Team - HQ', '2026-08-10', null],
      [2, sessionIds[2], 'Hand Sanitizer Station Malfunction — Front Entrance', 'Auto-dispenser at entrance non-functional. Manual station installed as interim fix. Permanent replacement ordered.', 'Hygiene', 'Low', 'Resolved', 'Outlet Manager - Pune', '2026-08-06', '2026-08-09'],
    ];
    for (const inc of incidentData) insertIncident.run(...inc);
    console.log(`Seeded ${incidentData.length} audit incidents.`);
    console.log(`✅ Audit Agent seed complete.`);

    // ─────────────────────────────────────────────────────────────────────────
    db.pragma('foreign_keys = ON');

    console.log(`\n🎉 SEED COMPLETE! SQLite database ready:`);
    console.log(`- 5 Franchise Outlets`);
    console.log(`- 6 Users (admin@franchiseops.ai / admin123)`);
    console.log(`- 50 Inventory Items`);
    console.log(`- ${staffCount} Staff Members`);
    console.log(`- ${salesCount} Daily Sales Records`);
    console.log(`- 120 Customer Profiles`);
    console.log(`- 9 Marketing Campaigns & associated metrics`);
    console.log(`- 7 Audit Sessions + full checklist, findings, incidents`);
    console.log(`\nDatabase file: ${DB_PATH}`);

  } catch (err) {
    console.error("Error during database seed:", err);
    process.exit(1);
  }
}

main();

