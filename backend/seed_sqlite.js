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
    `);
    console.log("Dropped old tables cleanly (including marketing tables).");

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

    db.pragma('foreign_keys = ON');

    console.log(`\n🎉 SEED COMPLETE! SQLite database ready:`);
    console.log(`- 5 Franchise Outlets`);
    console.log(`- 6 Users (admin@franchiseops.ai / admin123)`);
    console.log(`- 50 Inventory Items`);
    console.log(`- ${staffCount} Staff Members`);
    console.log(`- ${salesCount} Daily Sales Records`);
    console.log(`- 120 Customer Profiles`);
    console.log(`- 9 Marketing Campaigns & associated metrics`);
    console.log(`\nDatabase file: ${DB_PATH}`);

  } catch (err) {
    console.error("Error during database seed:", err);
    process.exit(1);
  }
}

main();
