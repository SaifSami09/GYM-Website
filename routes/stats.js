// routes/stats.js
// Returns aggregate stats shown on the admin dashboard.
const express = require('express');
const router  = express.Router();
const { pool } = require('../config/db');

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                                             AS total_signups,
        SUM(plan = 'Starter – $39/mo')                      AS plan_starter,
        SUM(plan = 'Performance – $79/mo')                  AS plan_performance,
        SUM(plan = 'Elite – $149/mo')                       AS plan_elite,
        SUM(DATE(created_at) = CURDATE())                   AS today,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS last_7_days,
        SUM(created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS last_30_days
      FROM signups
    `);

    // Signups per day for the last 14 days (for a small sparkline)
    const [dailyRows] = await pool.execute(`
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM signups
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY day
      ORDER BY day ASC
    `);

    // Top goals
    const [goalRows] = await pool.execute(`
      SELECT goal, COUNT(*) AS count
      FROM signups
      GROUP BY goal
      ORDER BY count DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      data: {
        totals,
        daily: dailyRows,
        goals: goalRows,
      },
    });
  } catch (err) {
    console.error('[GET /api/stats] DB error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
