const { pool } = require('../db/db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.hostId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.hostId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  try {
    const result = await pool.query('SELECT role FROM hosts WHERE id = $1', [req.session.hostId]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getLimits(role) {
  switch (role) {
    case 'admin':
      return { maxQuizzes: Infinity, maxPlayers: Infinity };
    case 'premium':
      return { maxQuizzes: Infinity, maxPlayers: 200 };
    default: // member
      return { maxQuizzes: 5, maxPlayers: 100 };
  }
}

module.exports = { requireAuth, requireAdmin, getLimits };
