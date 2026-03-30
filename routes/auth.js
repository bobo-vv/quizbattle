const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// Simple in-memory rate limiter (per IP)
const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10;
  let entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + window };
  }
  entry.count++;
  loginAttempts.set(ip, entry);
  if (entry.count > maxAttempts) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }
  next();
}
// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// Simple email format validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /register (rate limited same as login)
router.post('/register', loginRateLimit, async (req, res) => {
  try {
    const { username, password, email, acceptedTerms } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 3-50 characters' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!acceptedTerms) {
      return res.status(400).json({ error: 'You must accept the terms of service' });
    }

    // Check duplicate username
    const existingUser = await pool.query('SELECT id FROM hosts WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Check duplicate email
    const existingEmail = await pool.query('SELECT id FROM hosts WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      'INSERT INTO hosts (username, password_hash, email, role, status, accepted_terms) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, password_hash, email, 'member', 'pending', true]
    );

    // Do NOT set session — user must wait for admin approval
    res.status(201).json({ pending: true, message: 'Registration successful! Please wait for admin approval.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login (rate limited: 10 per 15 min per IP)
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash, role, status FROM hosts WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const host = result.rows[0];
    const valid = await bcrypt.compare(password, host.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check approval status
    if (host.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval', status: 'pending' });
    }
    if (host.status === 'rejected') {
      return res.status(403).json({ error: 'Your account has been rejected', status: 'rejected' });
    }

    // Update last_login
    await pool.query('UPDATE hosts SET last_login = NOW() WHERE id = $1', [host.id]);

    req.session.hostId = host.id;
    res.json({ id: host.id, username: host.username, role: host.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ ok: true });
  });
});

// GET /me
router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.hostId) {
      return res.json({ user: null });
    }

    const result = await pool.query(
      'SELECT id, username, email, role, status, created_at, last_login FROM hosts WHERE id = $1',
      [req.session.hostId]
    );
    if (result.rows.length === 0) {
      return res.json({ user: null });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /password — change own password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password are required' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const result = await pool.query('SELECT password_hash FROM hosts WHERE id = $1', [req.session.hostId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE hosts SET password_hash = $1 WHERE id = $2', [newHash, req.session.hostId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /email — change own email
router.put('/email', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const existing = await pool.query('SELECT id FROM hosts WHERE email = $1 AND id != $2', [email, req.session.hostId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    await pool.query('UPDATE hosts SET email = $1 WHERE id = $2', [email, req.session.hostId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Change email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /account — delete own account (cascades to quizzes)
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const result = await pool.query('SELECT password_hash, role FROM hosts WHERE id = $1', [req.session.hostId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (result.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be self-deleted' });
    }

    const valid = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    await pool.query('DELETE FROM hosts WHERE id = $1', [req.session.hostId]);
    req.session.destroy(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
