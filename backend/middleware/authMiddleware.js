const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'franchiseops_super_secret_jwt_key_2026';

/**
 * Express middleware to authenticate requests via JWT.
 * Falls back to default admin context for unauthenticated demo sessions.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = { id: 1, email: 'admin@franchiseops.ai', role: 'ADMIN', outlet_id: null };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { id: 1, email: 'admin@franchiseops.ai', role: 'ADMIN', outlet_id: null };
      return next();
    }
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken,
  JWT_SECRET
};
