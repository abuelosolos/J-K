const express     = require('express');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// GET /api/wallet
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT balance_ngn FROM wallets WHERE user_id = $1', [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    res.json({ balance_ngn: result.rows[0].balance_ngn });
  } catch (err) {
    console.error('Wallet error:', err);
    res.status(500).json({ error: 'Failed to load wallet.' });
  }
});

// GET /api/wallet/transactions
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, type, amount_ngn, description, reference, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ transactions: result.rows });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: 'Failed to load transactions.' });
  }
});

module.exports = router;
