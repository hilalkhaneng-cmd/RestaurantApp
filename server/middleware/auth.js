const jwt = require('jsonwebtoken');
const store = require('../data/store');

/**
 * Verify JWT sent in Authorization: Bearer <token>
 * Attaches req.user = { _id, id, name, email, role } on success.
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('Configuration Error: JWT_SECRET environment variable is missing.');
    return res.status(500).json({
      error: 'Server authentication configuration error: JWT_SECRET is not set',
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const user = await store.users.findById(decoded.id || decoded._id);

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

/**
 * Require manager role for the route.
 */
function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager access required' });
  }

  next();
}

module.exports = { authenticateToken, requireManager };
