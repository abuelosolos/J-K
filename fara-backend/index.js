require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes        = require('./routes/auth');
const walletRoutes      = require('./routes/wallet');
const paymentsRoutes    = require('./routes/payments');
const withdrawalsRoutes = require('./routes/withdrawals');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/wallet',      walletRoutes);
app.use('/api/payments',    paymentsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fara API is running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Fara API running on http://localhost:${PORT}\n`);
});
