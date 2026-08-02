const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.biidbeycggaggvaicnlr:BEdVIdulemlQs33B@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL for fresh table setup and seeding...");

    // Drop existing tables to enforce accurate fresh schemas
    await client.query(`
      DROP TABLE IF EXISTS sales CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS staff CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS outlets CASCADE;
    `);
    console.log("Dropped old tables cleanly.");

    // 1. Create Outlets Table
    await client.query(`
      CREATE TABLE outlets (
        id SERIAL PRIMARY KEY,
        outlet_name VARCHAR(100) NOT NULL,
        manager_name VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        postal_code VARCHAR(10),
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create Sales Table
    await client.query(`
      CREATE TABLE sales (
        id SERIAL PRIMARY KEY,
        outlet_id INT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
        sale_date DATE NOT NULL,
        total_orders INT NOT NULL,
        customer_count INT NOT NULL,
        gross_revenue DECIMAL(12, 2) NOT NULL,
        operating_cost DECIMAL(12, 2) NOT NULL,
        net_profit DECIMAL(12, 2) NOT NULL,
        average_order_value DECIMAL(10, 2) NOT NULL,
        payment_cash DECIMAL(10, 2) NOT NULL,
        payment_card DECIMAL(10, 2) NOT NULL,
        payment_upi DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Users Table
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'MANAGER',
        outlet_id INT REFERENCES outlets(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Inventory Table
    await client.query(`
      CREATE TABLE inventory (
        id SERIAL PRIMARY KEY,
        outlet_id INT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
        item_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        current_stock DECIMAL(10, 2) NOT NULL,
        min_threshold DECIMAL(10, 2) NOT NULL,
        max_capacity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(30) DEFAULT 'In Stock',
        last_restocked DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create Staff Table with assigned_job, login_time, and logoff_time
    await client.query(`
      CREATE TABLE staff (
        id SERIAL PRIMARY KEY,
        outlet_id INT NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        assigned_job VARCHAR(100) NOT NULL DEFAULT 'General Operations',
        shift_type VARCHAR(30) NOT NULL,
        login_time VARCHAR(30) NOT NULL DEFAULT '08:00 AM',
        logoff_time VARCHAR(30) NOT NULL DEFAULT '04:30 PM',
        hourly_rate DECIMAL(8, 2) NOT NULL,
        hours_worked DECIMAL(8, 2) NOT NULL,
        performance_rating DECIMAL(3, 2) NOT NULL,
        status VARCHAR(30) DEFAULT 'Active',
        email VARCHAR(150),
        phone VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Created fresh tables: outlets, sales, users, inventory, staff.");

    // Seed 5 core outlets
    const defaultOutlets = [
      { name: "Indiranagar Flagship", manager: "Aarav Sharma", address: "100 Feet Rd, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", zip: "560038", lat: 12.9716, lng: 77.5946 },
      { name: "HITECH City Hub", manager: "Priya Reddy", address: "Cyber Towers, HITECH City", city: "Hyderabad", state: "Telangana", country: "India", zip: "500081", lat: 17.4435, lng: 78.3772 },
      { name: "Anna Nagar Cafe", manager: "Karthik Raja", address: "2nd Avenue, Anna Nagar", city: "Chennai", state: "Tamil Nadu", country: "India", zip: "600040", lat: 13.0850, lng: 80.2101 },
      { name: "Bandra Promenade", manager: "Neha Kulkarni", address: "Carter Rd, Bandra West", city: "Mumbai", state: "Maharashtra", country: "India", zip: "400050", lat: 19.0596, lng: 72.8295 },
      { name: "Koregaon Park Bistro", manager: "Rohan Deshmukh", address: "North Main Rd, Koregaon Park", city: "Pune", state: "Maharashtra", country: "India", zip: "411001", lat: 18.5362, lng: 73.8940 }
    ];

    for (const o of defaultOutlets) {
      await client.query(`
        INSERT INTO outlets (outlet_name, manager_name, address, city, state, country, postal_code, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [o.name, o.manager, o.address, o.city, o.state, o.country, o.zip, o.lat, o.lng]);
    }

    const resOutlets = await client.query("SELECT id, outlet_name, city, manager_name FROM outlets ORDER BY id");
    const outlets = resOutlets.rows;

    // Seed Users
    const passwordHash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (name, email, password_hash, role, outlet_id)
      VALUES ($1, $2, $3, $4, $5)
    `, ["HQ Operations Admin", "admin@franchiseops.ai", passwordHash, "ADMIN", null]);

    for (const outlet of outlets) {
      const email = `${outlet.city.toLowerCase()}.mgr@franchiseops.ai`;
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, outlet_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [outlet.manager_name, email, passwordHash, "MANAGER", outlet.id]);
    }

    // Seed Inventory Items
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

        await client.query(`
          INSERT INTO inventory (outlet_id, item_name, category, current_stock, min_threshold, max_capacity, unit, unit_price, status, last_restocked)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          outlet.id, item.name, item.category, currentStock, item.min, item.max, item.unit, item.price, status, '2026-07-25'
        ]);
      }
    }

    // Seed Staff Members with rich roles, assigned jobs, ratings, and login/logoff times
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
        let rating = st.rating;
        let status = 'Active';

        // Custom variations per city so each store has distinct top performers & underperformers
        if (outlet.city === 'Hyderabad' && (st.role.includes("Junior") || st.role.includes("Trainee"))) {
          rating = parseFloat((st.rating - 0.4).toFixed(1));
        } else if (outlet.city === 'Bengaluru' && st.role.includes("Senior")) {
          rating = 5.0; // Flagship top performer
        }

        const staffName = st.role === 'Store Manager' ? outlet.manager_name : `${st.name.split(' ')[0]} (${outlet.city})`;
        const email = `${staffName.toLowerCase().replace(/[^a-z]/g, '')}@franchiseops.ai`;
        const phone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

        await client.query(`
          INSERT INTO staff (outlet_id, name, role, assigned_job, shift_type, login_time, logoff_time, hourly_rate, hours_worked, performance_rating, status, email, phone)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          outlet.id, staffName, st.role, st.job, st.shift, st.login, st.logoff, st.rate, st.hours, rating, status, email, phone
        ]);
        staffCount++;
      }
    }
    console.log(`Seeded ${staffCount} staff members with jobs and login/logoff times.`);

    // Seed Sales for 60 days
    const totalDays = 60;
    const today = new Date("2026-07-28");
    let salesCount = 0;

    for (const outlet of outlets) {
      for (let i = totalDays; i >= 1; i--) {
        const saleDate = new Date(today);
        saleDate.setDate(today.getDate() - i);
        
        const dayOfWeek = saleDate.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5);

        let baseOrders = 160;
        let baseAOV = 150;
        let weekendBoost = 1.15;
        let weekdayBoost = 1.0;
        let costRatio = 0.58;

        if (outlet.city === 'Bengaluru') {
          baseOrders = 210;
          baseAOV = 175;
          weekendBoost = 1.30;
          costRatio = 0.52;
        } else if (outlet.city === 'Hyderabad') {
          baseOrders = 110;
          baseAOV = 125;
          weekdayBoost = 1.05;
          weekendBoost = 0.75;
          costRatio = 0.76;
        } else if (outlet.city === 'Chennai') {
          baseOrders = 145;
          baseAOV = 140;
          weekendBoost = 1.35;
          costRatio = 0.60;
        } else if (outlet.city === 'Mumbai') {
          baseOrders = 220;
          baseAOV = 185;
          weekendBoost = 1.20;
          costRatio = 0.54;
        } else if (outlet.city === 'Pune') {
          baseOrders = 135;
          baseAOV = 138;
          weekdayBoost = 1.18;
          weekendBoost = 0.85;
          costRatio = 0.64;
        }

        const boost = isWeekend ? weekendBoost : weekdayBoost;
        const randomMultiplier = 0.92 + Math.random() * 0.16;
        
        const total_orders = Math.round(baseOrders * boost * randomMultiplier);
        const customer_count = Math.round(total_orders * (1.1 + Math.random() * 0.12));
        const average_order_value = parseFloat((baseAOV * (0.95 + Math.random() * 0.1)).toFixed(2));
        
        const gross_revenue = parseFloat((total_orders * average_order_value).toFixed(2));
        
        const costPercentage = costRatio + (Math.random() * 0.06 - 0.03);
        const operating_cost = parseFloat((gross_revenue * costPercentage).toFixed(2));
        const net_profit = parseFloat((gross_revenue - operating_cost).toFixed(2));

        const upiShare = 0.55 + Math.random() * 0.08;
        const cardShare = 0.28 + Math.random() * 0.08;
        const cashShare = Math.max(0.02, 1.0 - upiShare - cardShare);

        const payment_upi = parseFloat((gross_revenue * upiShare).toFixed(2));
        const payment_card = parseFloat((gross_revenue * cardShare).toFixed(2));
        const payment_cash = parseFloat((gross_revenue * cashShare).toFixed(2));

        const formattedDate = saleDate.toISOString().slice(0, 10);

        await client.query(`
          INSERT INTO sales (
            outlet_id, sale_date, total_orders, customer_count, gross_revenue, 
            operating_cost, net_profit, average_order_value, payment_cash, 
            payment_card, payment_upi
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          outlet.id, formattedDate, total_orders, customer_count, gross_revenue,
          operating_cost, net_profit, average_order_value, payment_cash,
          payment_card, payment_upi
        ]);

        salesCount++;
      }
    }

    console.log(`\n🎉 SEED COMPLETE! Database updated with job allocation and login/logoff times:`);
    console.log(`- 5 Franchise Outlets`);
    console.log(`- 6 Users`);
    console.log(`- 50 Inventory Items`);
    console.log(`- ${staffCount} Staff Members with Jobs & Login/Logoff Times`);
    console.log(`- ${salesCount} Daily Sales Records`);

  } catch (err) {
    console.error("Error during database seed execution:", err);
  } finally {
    await client.end();
  }
}

main();
