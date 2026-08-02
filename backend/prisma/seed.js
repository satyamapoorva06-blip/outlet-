const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SQLite database via Prisma...');

  // Clear all tables in correct order (FK constraints)
  await prisma.sales.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.users.deleteMany();
  await prisma.outlets.deleteMany();
  console.log('Cleared all existing data.');

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

  console.log('\n🎉 SEED COMPLETE! Local SQLite database is ready.');
  console.log('Login with: admin@franchiseops.ai / admin123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
