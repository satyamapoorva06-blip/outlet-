const express = require('express');
const cors = require('cors');
require('dotenv').config();

const prisma = require('./lib/prisma');
const { authenticateToken } = require('./middleware/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const outletRoutes = require('./routes/outletRoutes');
const salesRoutes = require('./routes/salesRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const staffRoutes = require('./routes/staffRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const auditRoutes = require('./routes/auditRoutes');
const intelligenceRoutes = require('./routes/intelligenceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { initNotificationDb } = require('./initNotificationDb');
const { startBackgroundWorker } = require('./services/backgroundWorker');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Verify database connection on startup
prisma.$connect()
  .then(() => console.log('Successfully connected to SQLite database'))
  .catch(err => console.error('Database connection failed:', err));

// Register Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Register Agentic Notification System
initNotificationDb().then(() => {
  startBackgroundWorker(15000);
});
app.use('/api/notifications', authenticateToken, notificationRoutes);

app.listen(PORT, () => {
  console.log(`FranchiseOps AI Server running on port ${PORT}`);
});
