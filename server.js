// server.js — IronForge Gym Backend
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/db');
const { pool }           = require('./config/db');
const { validateSignup } = require('./utils/validateSignup');
const basicAuth          = require('./middleware/basicAuth');
const statsRouter        = require('./routes/stats');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin (Postman/curl), any localhost, or any 127.0.0.1
    if (
      !origin ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return cb(null, true);
    }
    // Allow origins listed in .env
    const allowed = (process.env.ALLOWED_ORIGINS || '')
      .split(',').map(o => o.trim()).filter(Boolean);
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: Origin ${origin} not allowed.`));
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── BODY PARSING ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many signup attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── STATIC FILES ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API RATE LIMIT ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── POST /api/signups  (PUBLIC — no auth) ─────────────────────────────────────
app.post('/api/signups', signupLimiter, async (req, res) => {
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
      data: {
        id:   result.insertId,
        name: `${clean.firstName} ${clean.lastName}`,
        plan: clean.plan,
      },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This email is already registered.',
        errors: { email: 'Email already exists.' },
      });
    }
    console.error('[POST /api/signups]', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ── GET /api/signups  (ADMIN only) ────────────────────────────────────────────
app.get('/api/signups', basicAuth, async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const plan   = req.query.plan || null;

  try {
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
      `SELECT COUNT(*) AS total FROM signups ${where}`, params
    );
    const [rows] = await pool.execute(
      `SELECT id, first_name, last_name, email, phone, plan, goal, experience, message, created_at
       FROM signups ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[GET /api/signups]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/signups/:id  (ADMIN only) ────────────────────────────────────────
app.get('/api/signups/:id', basicAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ success: false, message: 'Invalid ID.' });

  try {
    const [rows] = await pool.execute('SELECT * FROM signups WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/signups/:id]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── DELETE /api/signups/:id  (ADMIN only) ─────────────────────────────────────
app.delete('/api/signups/:id', basicAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ success: false, message: 'Invalid ID.' });

  try {
    const [result] = await pool.execute('DELETE FROM signups WHERE id = ?', [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Not found.' });
    return res.json({ success: true, message: `Signup #${id} deleted.` });
  } catch (err) {
    console.error('[DELETE /api/signups/:id]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── GET /api/stats  (ADMIN only) ──────────────────────────────────────────────
app.use('/api/stats', basicAuth, statsRouter);

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────
app.get('/admin', basicAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── FALLBACK → gym website ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error('[Unhandled Error]', err.message || err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await testConnection();
    console.log('✅ MySQL connection verified.');
  } catch (err) {
    console.error('❌ Cannot connect to MySQL:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('  ██╗██████╗  ██████╗ ███╗   ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗');
    console.log('  ██║██╔══██╗██╔═══██╗████╗  ██║██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝');
    console.log('  ██║██████╔╝██║   ██║██╔██╗ ██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  ');
    console.log('  ██║██╔══██╗██║   ██║██║╚██╗██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  ');
    console.log('  ██║██║  ██║╚██████╔╝██║ ╚████║██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗');
    console.log('  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝');
    console.log('');
    console.log(`  🏋️  Website    → http://localhost:${PORT}`);
    console.log(`  👑  Admin      → http://localhost:${PORT}/admin`);
    console.log(`  📡  Health     → http://localhost:${PORT}/health`);
    console.log('');
  });
})();