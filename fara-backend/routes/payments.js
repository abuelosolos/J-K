const express     = require('express');
const crypto      = require('crypto');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const USD_TO_NGN = parseFloat(process.env.USD_TO_NGN_RATE) || 1580;
const FLAT_FEE_USD = 2;

// Generate a random token for the payment link
function generateToken() {
  return crypto.randomBytes(12).toString('hex');
}

// POST /api/payments/jobs — freelancer creates invoice
router.post('/jobs', requireAuth, async (req, res) => {
  if (req.user.role !== 'freelancer') {
    return res.status(403).json({ error: 'Only freelancers can create invoices.' });
  }

  const { title, amount_usd } = req.body;

  if (!title || !amount_usd) {
    return res.status(400).json({ error: 'Title and amount are required.' });
  }
  if (amount_usd < 3) {
    return res.status(400).json({ error: 'Minimum amount is $3.' });
  }

  try {
    const token = generateToken();

    const result = await db.query(
      `INSERT INTO jobs (freelancer_id, title, amount_usd, token, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, title, amount_usd, token, status, created_at`,
      [req.user.id, title, amount_usd, token]
    );

    const job = result.rows[0];
    res.json({ job });
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: 'Failed to create invoice.' });
  }
});

// GET /api/payments/job/:token — get job details for pay page (public)
router.get('/job/:token', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT j.id, j.title, j.amount_usd, j.status, j.token,
              u.full_name AS freelancer_name, u.email AS freelancer_email
       FROM jobs j
       JOIN users u ON u.id = j.freelancer_id
       WHERE j.token = $1`,
      [req.params.token]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Payment link not found.' });
    }

    const job = result.rows[0];
    if (job.status === 'paid') {
      return res.status(400).json({ error: 'This invoice has already been paid.' });
    }

    res.json({ job });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Failed to load payment details.' });
  }
});

// POST /api/payments/pay/:token — mock payment (client pays)
router.post('/pay/:token', async (req, res) => {
  const { payer_name, payer_email } = req.body;

  if (!payer_name || !payer_email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Lock the job row
    const jobResult = await client.query(
      `SELECT j.*, u.id AS freelancer_user_id
       FROM jobs j
       JOIN users u ON u.id = j.freelancer_id
       WHERE j.token = $1 FOR UPDATE`,
      [req.params.token]
    );

    if (!jobResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment link not found.' });
    }

    const job = jobResult.rows[0];
    if (job.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This invoice has already been paid.' });
    }

    // Calculate NGN amount after $2 fee
    const net_usd = job.amount_usd - FLAT_FEE_USD;
    const net_ngn = net_usd * USD_TO_NGN;

    // Generate reference
    const reference = 'FARA-' + Date.now().toString(36).toUpperCase();

    // Mark job as paid
    await client.query(
      `UPDATE jobs SET status = 'paid', paid_at = NOW() WHERE id = $1`,
      [job.id]
    );

    // Credit freelancer wallet
    await client.query(
      `UPDATE wallets SET balance_ngn = balance_ngn + $1, updated_at = NOW()
       WHERE user_id = $2`,
      [net_ngn, job.freelancer_user_id]
    );

    // Record transaction for freelancer
    await client.query(
      `INSERT INTO transactions (user_id, type, amount_ngn, description, reference)
       VALUES ($1, 'credit', $2, $3, $4)`,
      [
        job.freelancer_user_id,
        net_ngn,
        `Payment for: ${job.title}`,
        reference
      ]
    );

    // If payer is a registered client, record in their history too
    const clientUser = await client.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      [payer_email, 'client']
    );
    if (clientUser.rows.length) {
      await client.query(
        `INSERT INTO transactions (user_id, type, amount_ngn, description, reference)
         VALUES ($1, 'debit', $2, $3, $4)`,
        [
          clientUser.rows[0].id,
          job.amount_usd * USD_TO_NGN,
          `Paid for: ${job.title}`,
          reference
        ]
      );
    }

    await client.query('COMMIT');

    // Simulate Interswitch mock response
    res.json({
      success: true,
      reference,
      message: 'Payment successful.',
      amount_usd: job.amount_usd,
      net_ngn,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Payment failed. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /api/payments/history — client sees their payment history
router.get('/history', requireAuth, async (req, res) => {
  try {
    // For clients: show jobs they paid for (matched by email)
    if (req.user.role === 'client') {
      const result = await db.query(
        `SELECT j.id, j.title, j.amount_usd, j.paid_at AS created_at,
                u.full_name AS freelancer_name, u.email AS freelancer_email,
                t.reference
         FROM jobs j
         JOIN users u ON u.id = j.freelancer_id
         LEFT JOIN transactions t ON t.reference LIKE 'FARA-%'
           AND t.user_id = (SELECT id FROM users WHERE email = $1 AND role = 'client' LIMIT 1)
           AND t.description LIKE '%' || j.title || '%'
         WHERE j.status = 'paid'
           AND j.paid_at IS NOT NULL
         ORDER BY j.paid_at DESC`,
        [req.user.email]
      );
      return res.json({ payments: result.rows });
    }

    // For freelancers: show their invoices
    const result = await db.query(
      `SELECT j.id, j.title, j.amount_usd, j.status, j.created_at,
              t.reference
       FROM jobs j
       LEFT JOIN transactions t ON t.description LIKE '%' || j.title || '%'
         AND t.user_id = $1 AND t.type = 'credit'
       WHERE j.freelancer_id = $1
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    res.json({ payments: result.rows });

  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ error: 'Failed to load payment history.' });
  }
});

module.exports = router;
