const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const admin   = require('../firebase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// helper — sign our own JWT after verifying identity
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// helper — create wallet for new user
async function createWallet(userId) {
  await db.query('INSERT INTO wallets (user_id, balance_ngn) VALUES ($1, 0)', [userId]);
}


// ─── Email / Password ────────────────────────────────────────

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password || !role)
    return res.status(400).json({ error: 'All fields are required.' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'An account with that email already exists.' });

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role',
      [full_name, email, hash, role]
    );

    const user = result.rows[0];
    await createWallet(user.id);

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    // firebase users won't have a password_hash — they must use social login
    if (!user.password_hash)
      return res.status(401).json({ error: 'This account was created with Google or Apple. Please sign in that way.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const safe = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
    res.json({ token: signToken(safe), user: safe });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});


// ─── Firebase (Google / Apple) ───────────────────────────────

// POST /api/auth/firebase
// Frontend sends the Firebase ID token + the role they picked
router.post('/firebase', async (req, res) => {
  const { id_token, role } = req.body;

  if (!id_token)
    return res.status(400).json({ error: 'Firebase ID token is required.' });

  if (role && !['freelancer', 'client'].includes(role))
    return res.status(400).json({ error: 'Invalid role.' });

  try {
    // verify the token with Firebase Admin
    const decoded = await admin.auth().verifyIdToken(id_token);

    const firebase_uid = decoded.uid;
    const email        = decoded.email || null;
    const full_name    = decoded.name  || email?.split('@')[0] || 'Fara User';

    // check if user already exists
    const existing = await db.query(
      'SELECT id, full_name, email, role FROM users WHERE firebase_uid = $1',
      [firebase_uid]
    );

    if (existing.rows.length > 0) {
      // returning user — just log them in
      const user = existing.rows[0];
      return res.json({ token: signToken(user), user, is_new: false });
    }

    // new user — role is required on first sign-in
    if (!role)
      return res.status(400).json({ error: 'Please select a role to continue.', needs_role: true });

    // create the user
    const result = await db.query(
      `INSERT INTO users (full_name, email, role, firebase_uid)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role`,
      [full_name, email, role, firebase_uid]
    );

    const user = result.rows[0];
    await createWallet(user.id);

    res.status(201).json({ token: signToken(user), user, is_new: true });
  } catch (err) {
    console.error('Firebase auth error:', err);
    if (err.code === 'auth/id-token-expired')
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    if (err.code === 'auth/argument-error')
      return res.status(401).json({ error: 'Invalid token.' });
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});


// ─── Password change ─────────────────────────────────────────

// POST /api/auth/change-password/request
router.post('/change-password/request', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Current and new password are required.' });

  if (new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user.password_hash)
      return res.status(400).json({ error: 'Social login accounts cannot change password here.' });

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Current password is incorrect.' });

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const newHash   = await bcrypt.hash(new_password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query('DELETE FROM password_change_codes WHERE user_id = $1', [req.user.id]);
    await db.query(
      'INSERT INTO password_change_codes (user_id, code, new_password_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [req.user.id, code, newHash, expiresAt]
    );

    // TODO: send via email — logging for now
    console.log(`\n🔑 Password change code for ${user.email}: ${code}\n`);

    res.json({ message: 'Confirmation code sent. Check your email.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /api/auth/change-password/confirm
router.post('/change-password/confirm', requireAuth, async (req, res) => {
  const { code } = req.body;

  if (!code)
    return res.status(400).json({ error: 'Code is required.' });

  try {
    const result = await db.query(
      'SELECT * FROM password_change_codes WHERE user_id = $1 AND code = $2',
      [req.user.id, code]
    );

    const row = result.rows[0];
    if (!row)
      return res.status(400).json({ error: 'Invalid code.' });

    if (new Date() > new Date(row.expires_at))
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [row.new_password_hash, req.user.id]);
    await db.query('DELETE FROM password_change_codes WHERE user_id = $1', [req.user.id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Password confirm error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
