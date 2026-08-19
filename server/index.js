import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import './db.js';
import { requireAuth } from './middleware/auth.js';
import { generateDueRecurringTransactions } from './lib/generateRecurring.js';

import authRoutes from './routes/auth.js';
import categoriesRoutes from './routes/categories.js';
import transactionsRoutes from './routes/transactions.js';
import recurringRoutes from './routes/recurring.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', requireAuth, categoriesRoutes);
app.use('/api/transactions', requireAuth, transactionsRoutes);
app.use('/api/recurring', requireAuth, recurringRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Catch up on any recurring transactions that are due, then re-check hourly.
generateDueRecurringTransactions();
setInterval(generateDueRecurringTransactions, 60 * 60 * 1000);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Budget API listening on port ${port}`));
