const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isDatabaseConfigured = Boolean(connectionString);

if (!connectionString) {
  console.warn('DATABASE_URL is not set. API routes that need Postgres will fail.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_photo TEXT DEFAULT '',
      created_at DATE DEFAULT CURRENT_DATE
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      limit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      closing_day INTEGER NOT NULL,
      due_day INTEGER NOT NULL,
      best_purchase_day INTEGER NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL,
      payment_method TEXT DEFAULT 'card',
      description TEXT NOT NULL,
      category TEXT DEFAULT 'Outros',
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      installments INTEGER NOT NULL DEFAULT 1,
      is_recurring INTEGER DEFAULT 0,
      recurring_label TEXT,
      purchase_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS installments (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      installment_number INTEGER NOT NULL,
      amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      due_date DATE NOT NULL,
      is_paid INTEGER DEFAULT 0
    );
  `);
}

module.exports = {
  isDatabaseConfigured,
  initSchema,
  query
};
