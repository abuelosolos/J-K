require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');

// Backend routes
const authRoutes = require('./fara-backend/routes/auth');
const walletRoutes = require('./fara-backend/routes/wallet');
const paymentsRoutes = require('./fara-backend/routes/payments');
const withdrawalsRoutes = require('./fara-backend/routes/withdrawals');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'pages')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Fara running on port ${PORT}`);
});