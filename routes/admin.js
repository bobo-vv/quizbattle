const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// All admin routes require admin role
router.use(requireAdmin);

// GET /stats — dashboard overview
router.get('/stats', async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
        COUNT(*) FILTER (WHERE role = 'premium')::int AS premium_count,
        COUNT(*) FILTER (WHERE role = 'admin')::int AS admin_count
      FROM hosts
    `);
    const quizzesResult = await pool.query('SELECT COUNT(*)::int AS total_quizzes FROM quizzes');

    res.json({
      ...usersResult.rows[0],
      total_quizzes: quizzesResult.rows[0].total_quizzes,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users — list all users (with optional status filter)
router.get('/users', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT id, username, email, role, status, created_at, last_login,
        (SELECT COUNT(*)::int FROM quizzes WHERE host_id = hosts.id) AS quiz_count
      FROM hosts
    `;
    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push('status = $' + params.length);
    }
    if (search) {
      params.push('%' + search + '%');
      conditions.push('(username ILIKE $' + params.length + ' OR email ILIKE $' + params.length + ')');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /users/:id/approve
router.put('/users/:id/approve', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE hosts SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING id, username",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or not pending' });
    }
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('Admin approve error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /users/:id/reject
router.put('/users/:id/reject', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE hosts SET status = 'rejected' WHERE id = $1 AND status = 'pending' RETURNING id, username",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or not pending' });
    }
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('Admin reject error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['member', 'premium'].includes(role)) {
      return res.status(400).json({ error: 'Role must be member or premium' });
    }

    // Prevent changing admin's own role
    if (parseInt(req.params.id) === req.session.hostId) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    const result = await pool.query(
      'UPDATE hosts SET role = $1 WHERE id = $2 AND role != $3 RETURNING id, username, role',
      [role, req.params.id, 'admin']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or is admin' });
    }
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error('Admin change role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /users/:id/reset-password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    // Prevent resetting admin's own password via admin panel
    if (parseInt(req.params.id) === req.session.hostId) {
      return res.status(403).json({ error: 'Use account settings to change your own password' });
    }

    const check = await pool.query('SELECT id, username FROM hosts WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate random password (8 chars)
    const newPassword = crypto.randomBytes(4).toString('hex');
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query('UPDATE hosts SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
    res.json({ ok: true, username: check.rows[0].username, newPassword });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
