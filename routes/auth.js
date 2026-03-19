const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/db');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await pool.query('SELECT id FROM hosts WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO hosts (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password_hash]
    );

    const host = result.rows[0];
    req.session.hostId = host.id;
    res.status(201).json({ id: host.id, username: host.username });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query('SELECT id, username, password_hash FROM hosts WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const host = result.rows[0];
    const valid = await bcrypt.compare(password, host.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.hostId = host.id;
    res.json({ id: host.id, username: host.username });
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

    const result = await pool.query('SELECT id, username, created_at FROM hosts WHERE id = $1', [req.session.hostId]);
    if (result.rows.length === 0) {
      return res.json({ user: null });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
