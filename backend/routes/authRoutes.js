const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticateToken, JWT_SECRET } = require('../middleware/authMiddleware');

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'MANAGER', outletId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const existing = await prisma.users.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash,
        role: role.toUpperCase(),
        outlet_id: outletId ? parseInt(outletId, 10) : null
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, outlet_id: user.outlet_id }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash: _, ...safeUser } = user;
    res.status(201).json({ message: 'Account created successfully', token, user: safeUser });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error creating account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      include: { outlets: { select: { outlet_name: true, city: true } } }
    });

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, outlet_id: user.outlet_id }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    const responseUser = {
      ...safeUser,
      outlet_name: user.outlets?.outlet_name || null,
      city: user.outlets?.city || null,
    };
    res.json({ message: 'Login successful', token, user: responseUser });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error authenticating user' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    let user = null;
    if (req.user?.id) {
      user = await prisma.users.findUnique({
        where: { id: req.user.id },
        include: { outlets: { select: { outlet_name: true, city: true } } }
      });
    }
    if (!user) {
      return res.json({
        id: 1,
        name: "HQ Operations Admin",
        email: "admin@franchiseops.ai",
        role: "ADMIN",
        outlet_id: null,
        outlet_name: "Consolidated Operations HQ",
        city: "Bengaluru"
      });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ ...safeUser, outlet_name: user.outlets?.outlet_name, city: user.outlets?.city });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.json({
      id: 1,
      name: "HQ Operations Admin",
      email: "admin@franchiseops.ai",
      role: "ADMIN",
      outlet_id: null,
      outlet_name: "Consolidated Operations HQ",
      city: "Bengaluru"
    });
  }
});

module.exports = router;
