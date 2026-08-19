# Fundwell

A simple shared household budgeting app. Track income and expenses, set monthly
spending limits per category, see a dashboard with charts, and set up recurring
bills/paychecks so they show up automatically every month.

Built for two people (e.g. you and your spouse) to log in with separate
accounts and share the same household budget data.

## Features

- **Accounts** — each person creates their own login; all budget data is shared.
- **Categories** — income/expense categories, each with an optional monthly spending limit.
- **Transactions** — add, edit, delete income and expenses; filter by month, type, category.
- **Recurring items** — rent, subscriptions, paychecks, etc. Pick a day of the month and
  the app automatically generates that transaction every month (including catch-up for
  any months you weren't running the app).
- **Dashboard** — income/expense/net for the month, spending-by-category pie chart,
  budget-vs-actual per category, and a 6-month income/expense trend line.

## Tech stack

- **Backend**: Node.js, Express, SQLite (via `better-sqlite3`), JWT auth
- **Frontend**: React (Vite), React Router, Recharts, Axios

## Getting started

Requires Node.js 18+.

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # edit JWT_SECRET before deploying anywhere shared
npm run dev             # http://localhost:4000
```

The SQLite database file is created automatically at `server/data/budget.db` on
first run.

### 2. Frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev             # http://localhost:5173
```

By default the client talks to the API at `http://localhost:4000/api` (see
`client/.env`, `VITE_API_URL`).

### 3. Use it

Open `http://localhost:5173`, create an account, then have your partner create
their own account too — you'll both see the same shared data. Start by adding a
few categories (Categories tab), then log transactions or set up recurring
bills/income.

## Project structure

```
server/            Express API + SQLite
  db.js             schema/setup
  routes/           auth, categories, transactions, recurring, dashboard
  lib/generateRecurring.js   generates due recurring transactions
client/            React app (Vite)
  src/pages/         Dashboard, Transactions, Categories, Recurring, Login/Register
  src/context/       auth state
  src/api.js         axios client with JWT attached
```

## Notes

- This is set up for trusted, personal use (two household members) — anyone
  with the register endpoint can create an account, and all data is shared
  across all accounts. Don't expose it to the public internet without adding
  proper access control.
- Change `JWT_SECRET` in `server/.env` before running anywhere besides your
  own machine.
