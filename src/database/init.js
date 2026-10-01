import { db } from './db';

export const initDatabase = () => {
  db.transaction((tx) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        password TEXT,
        profile_photo TEXT,
        created_at TEXT
      );
    `);

    tx.executeSql(
      `PRAGMA table_info(users)`,
      [],
      (_, { rows }) => {
        const columns = rows._array.map((column) => column.name);

        if (!columns.includes('profile_photo')) {
          tx.executeSql(`ALTER TABLE users ADD COLUMN profile_photo TEXT`);
        }
      }
    );

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS app_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        user_id INTEGER
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        limit_amount REAL,
        closing_day INTEGER,
        due_day INTEGER,
        best_purchase_day INTEGER
      );
    `);

    tx.executeSql(
      `PRAGMA table_info(cards)`,
      [],
      (_, { rows }) => {
        const columns = rows._array.map((column) => column.name);

        if (!columns.includes('best_purchase_day')) {
          tx.executeSql(`ALTER TABLE cards ADD COLUMN best_purchase_day INTEGER`);
        }
      }
    );

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        card_id INTEGER,
        payment_method TEXT DEFAULT 'card',
        description TEXT,
        category TEXT DEFAULT 'Outros',
        total_amount REAL,
        installments INTEGER,
        is_recurring INTEGER DEFAULT 0,
        recurring_label TEXT,
        purchase_date TEXT,
        created_at TEXT
      );
    `);

    tx.executeSql(
      `PRAGMA table_info(purchases)`,
      [],
      (_, { rows }) => {
        const columns = rows._array.map((column) => column.name);

        if (!columns.includes('is_recurring')) {
          tx.executeSql(`ALTER TABLE purchases ADD COLUMN is_recurring INTEGER DEFAULT 0`);
        }

        if (!columns.includes('recurring_label')) {
          tx.executeSql(`ALTER TABLE purchases ADD COLUMN recurring_label TEXT`);
        }

        if (!columns.includes('payment_method')) {
          tx.executeSql(`ALTER TABLE purchases ADD COLUMN payment_method TEXT DEFAULT 'card'`);
        }

        if (!columns.includes('category')) {
          tx.executeSql(`ALTER TABLE purchases ADD COLUMN category TEXT DEFAULT 'Outros'`);
        }
      }
    );

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER,
        installment_number INTEGER,
        amount REAL,
        due_date TEXT,
        is_paid INTEGER DEFAULT 0
      );
    `);
  });
};
