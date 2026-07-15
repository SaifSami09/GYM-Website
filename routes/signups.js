// routes/signups.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { validateSignup } = require('../utils/validateSignup');

// ── POST /api/signups ─────────────────────────────────────────────────────────
// Accepts a new membership signup from the join form and saves it to MySQL.
router.post('/', async (req, res) => {
  const { valid, errors, clean } = validateSignup(req.body);

  if (!valid) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check the fields below.',
      errors,
    });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO signups
        (first_name, last_name, email, phone, plan, goal, experience, message, agreed_terms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clean.firstName,
        clean.lastName,
        clean.email,
        clean.phone,
        clean.plan,
        clean.goal,
        clean.experience,
        clean.message,
        clean.agreeTerms ? 1 : 0,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Welcome to IronForge, ${clean.firstName}! Your free week is confirmed.`,
      data: { id: result.insertId, name: `${clean.firstName} ${clean.lastName}`, plan: clean.plan },
    });
  } catch (err) {
    // Duplicate email: MySQL error 1062
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered. Please use a different email or contact us.',
        errors: { email: 'Email already exists.' },
      });
    }
    console.error('[POST /api/signups] DB error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── GET /api/signups ──────────────────────────────────────────────────────────
// Returns all signups (admin use, protected by basicAuth middleware).
router.get('/', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const plan   = req.query.plan   || null;

  try {
    // Build dynamic WHERE clause
    const conditions = [];
    const params     = [];

    if (search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      params.push(search, search, search);
    }
    if (plan) {
      conditions.push('plan = ?');
      params.push(plan);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM signups ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, email, phone, plan, goal, experience, message, created_at
       FROM signups ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/signups] DB error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/signups/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ success: false, message: 'Invalid ID.' });

  try {
    const [rows] = await pool.execute('SELECT * FROM signups WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Signup not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/signups/:id] DB error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/signups/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ success: false, message: 'Invalid ID.' });

  try {
    const [result] = await pool.execute('DELETE FROM signups WHERE id = ?', [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Signup not found.' });
    return res.json({ success: true, message: `Signup #${id} deleted.` });
  } catch (err) {
    console.error('[DELETE /api/signups/:id] DB error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
