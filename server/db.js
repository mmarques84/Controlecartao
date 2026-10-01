const { Pool } = require('pg');
const mysql = require('mysql2/promise');

const connectionString = process.env.DATABASE_URL;
const mysqlUrl = process.env.MYSQL_URL;
const dialect = mysqlUrl ? 'mysql' : 'postgres';
const isDatabaseConfigured = Boolean(connectionString || mysqlUrl);

if (!isDatabaseConfigured) {
  console.warn('DATABASE_URL or MYSQL_URL is not set. API routes that need a database will fail.');
}

const pgPool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
    })
  : null;

const mysqlPool = mysqlUrl
  ? mysql.createPool({
      uri: mysqlUrl,
      waitForConnections: true,
      connectionLimit: 10
    })
  : null;

function prepareMysqlQuery(text) {
  return text
    .replace(/\b(users|cards|purchases|installments)\b/g, 'controle_$1')
    .replace(/\$\d+/g, '?');
}

async function query(text, params = []) {
  if (dialect === 'mysql') {
    const [rows] = await mysqlPool.execute(prepareMysqlQuery(text), params);

    if (Array.isArray(rows)) {
      return { rows, rowCount: rows.length };
    }

    return { rows: [], rowCount: rows.affectedRows || 0, insertId: rows.insertId };
  }

  return pgPool.query(text, params);
}

async function initSchema() {
  if (dialect === 'mysql') {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_photo TEXT,
        created_at DATE DEFAULT (CURRENT_DATE)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        limit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        closing_day INT NOT NULL,
        due_day INT NOT NULL,
        best_purchase_day INT NOT NULL,
        CONSTRAINT controle_cards_user_fk
          FOREIGN KEY (user_id) REFERENCES controle_users(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        card_id INT NULL,
        payment_method VARCHAR(20) DEFAULT 'card',
        description VARCHAR(255) NOT NULL,
        category VARCHAR(120) DEFAULT 'Outros',
        total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        installments INT NOT NULL DEFAULT 1,
        is_recurring INT DEFAULT 0,
        recurring_label VARCHAR(255),
        purchase_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT controle_purchases_user_fk
          FOREIGN KEY (user_id) REFERENCES controle_users(id) ON DELETE CASCADE,
        CONSTRAINT controle_purchases_card_fk
          FOREIGN KEY (card_id) REFERENCES controle_cards(id) ON DELETE SET NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS installments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        installment_number INT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        due_date DATE NOT NULL,
        is_paid INT DEFAULT 0,
        CONSTRAINT controle_installments_purchase_fk
          FOREIGN KEY (purchase_id) REFERENCES controle_purchases(id) ON DELETE CASCADE
      );
    `);
    return;
  }

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
  dialect,
  isDatabaseConfigured,
  initSchema,
  query
};
