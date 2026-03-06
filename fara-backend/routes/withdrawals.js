const express     = require('express');
const bcrypt      = require('bcryptjs');
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// POST /api/withdrawals
router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'freelancer') {
    return res.status(403).json({ error: 'Only freelancers can withdraw.' });
  }

  const { amount_ngn, bank_code, account_number, account_name, password } = req.body;

  if (!amount_ngn || !bank_code || !account_number || !account_name || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (amount_ngn < 15800) {
    return res.status(400).json({ error: 'Minimum withdrawal is ₦15,800.' });
  }
  if (account_number.replace(/\D/g, '').length !== 10) {
    return res.status(400).json({ error: 'Account number must be 10 digits.' });
  }

  const client = await db.connect();

  try {
    // Verify password
    const userResult = await client.query(
      'SELECT password_hash FROM users WHERE id = $1', [req.user.id]
    );
    const valid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    await client.query('BEGIN');

    // Check balance
    const walletResult = await client.query(
      'SELECT balance_ngn FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]
    );
    const balance = parseFloat(walletResult.rows[0].balance_ngn);

    if (balance < amount_ngn) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Deduct from wallet
    await client.query(
      'UPDATE wallets SET balance_ngn = balance_ngn - $1, updated_at = NOW() WHERE user_id = $2',
      [amount_ngn, req.user.id]
    );

    const reference = 'WDR-' + Date.now().toString(36).toUpperCase();

    // Record debit transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, amount_ngn, description, reference)
       VALUES ($1, 'debit', $2, $3, $4)`,
      [
        req.user.id,
        amount_ngn,
        `Withdrawal to ${account_name} (${account_number})`,
        reference
      ]
    );

    await client.query('COMMIT');

    // TODO: Replace with real Interswitch bank transfer API call
    console.log(`\n💸 Mock withdrawal: ₦${amount_ngn} to ${account_name} (${bank_code} / ${account_number}) — ref: ${reference}\n`);

    res.json({
      success: true,
      reference,
      message: 'Withdrawal initiated. Funds will arrive within 1 business day.',
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Withdrawal failed. Please try again.' });
  } finally {
    client.release();
  }
});

module.exports = router;
