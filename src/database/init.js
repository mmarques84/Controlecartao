import db from './db';

export function initDB() {
  db.transaction(tx => {

    // 👤 usuário
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        password TEXT
      );
    `);

    // 💳 compras
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        description TEXT,
        total_amount REAL,
        total_installments INTEGER,
        purchase_date TEXT
      );
    `);

    // 💸 parcelas
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER,
        installment_number INTEGER,
        total_installments INTEGER,
        amount REAL,
        due_date TEXT,
        is_paid INTEGER DEFAULT 0
      );
    `);

  });
}