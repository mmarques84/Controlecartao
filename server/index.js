const express = require('express');
const cors = require('cors');
const path = require('path');

const { initSchema, isDatabaseConfigured, query } = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, '..', 'dist');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function toNumber(value) {
  return Number(value || 0);
}

function addMonthsDueDate(baseDate, installmentOffset, dueDay) {
  const [year, month] = String(baseDate).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + installmentOffset, dueDay));
  return date.toISOString().split('T')[0];
}

function mapPurchase(row) {
  return {
    ...row,
    total_amount: toNumber(row.total_amount),
    installments: Number(row.installments || 1),
    is_recurring: Number(row.is_recurring || 0)
  };
}

function mapCard(row) {
  return {
    ...row,
    limit_amount: toNumber(row.limit_amount)
  };
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, database: isDatabaseConfigured });
});

app.use('/api', (req, res, next) => {
  if (!isDatabaseConfigured) {
    res.status(503).json({ error: 'DATABASE_NOT_CONFIGURED' });
    return;
  }

  next();
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  if (!email || !password) {
    res.status(400).json({ error: 'INVALID_INPUT' });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, profile_photo, created_at`,
      [email, password]
    );

    res.json({ success: true, userId: result.rows[0].id, user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      res.json({ error: 'EMAIL_EXISTS' });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  const result = await query(
    `SELECT id, email, profile_photo, created_at FROM users WHERE email = $1 AND password = $2`,
    [email, password]
  );

  res.json({ user: result.rows[0] || null });
});

app.get('/api/users/:userId', async (req, res) => {
  const result = await query(
    `SELECT id, email, profile_photo, created_at FROM users WHERE id = $1`,
    [req.params.userId]
  );

  res.json({ user: result.rows[0] || null });
});

app.patch('/api/users/:userId/photo', async (req, res) => {
  const result = await query(
    `UPDATE users SET profile_photo = $1 WHERE id = $2 RETURNING id`,
    [req.body.photoUri || '', req.params.userId]
  );

  res.json({ rowsAffected: result.rowCount });
});

app.get('/api/cards', async (req, res) => {
  const userId = Number(req.query.userId);
  const result = await query(
    `SELECT * FROM cards WHERE user_id = $1 ORDER BY id DESC`,
    [userId]
  );

  res.json({ cards: result.rows.map(mapCard) });
});

app.post('/api/cards', async (req, res) => {
  const result = await query(
    `INSERT INTO cards (user_id, name, limit_amount, closing_day, due_day, best_purchase_day)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      req.body.userId,
      req.body.name,
      req.body.limitAmount,
      req.body.closingDay,
      req.body.dueDay,
      req.body.bestPurchaseDay
    ]
  );

  res.json({ insertId: result.rows[0].id, rowsAffected: 1 });
});

app.delete('/api/cards/:cardId', async (req, res) => {
  await query(
    `DELETE FROM installments
     WHERE purchase_id IN (SELECT id FROM purchases WHERE card_id = $1)`,
    [req.params.cardId]
  );
  await query(`DELETE FROM purchases WHERE card_id = $1`, [req.params.cardId]);
  const result = await query(`DELETE FROM cards WHERE id = $1`, [req.params.cardId]);

  res.json({ rowsAffected: result.rowCount });
});

app.get('/api/purchases', async (req, res) => {
  const userId = Number(req.query.userId);
  const result = await query(
    `SELECT
       p.id,
       p.description,
       p.category,
       p.total_amount,
       p.installments,
       p.payment_method,
       p.is_recurring,
       p.recurring_label,
       p.purchase_date,
       c.name AS card_name
     FROM purchases p
     LEFT JOIN cards c ON c.id = p.card_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC, p.id DESC`,
    [userId]
  );

  res.json({ purchases: result.rows.map(mapPurchase) });
});

app.post('/api/purchases', async (req, res) => {
  const {
    userId,
    cardId,
    paymentMethod = 'card',
    description,
    category = 'Outros',
    totalAmount,
    installments,
    isRecurring = false,
    recurringLabel = null,
    purchaseDate
  } = req.body;

  let card = null;

  if (paymentMethod === 'card') {
    const cardResult = await query(
      `SELECT * FROM cards WHERE id = $1 AND user_id = $2`,
      [cardId, userId]
    );
    card = cardResult.rows[0];

    if (!card) {
      res.status(404).json({ error: 'CARD_NOT_FOUND' });
      return;
    }
  }

  const purchaseResult = await query(
    `INSERT INTO purchases
      (user_id, card_id, payment_method, description, category, total_amount, installments, is_recurring, recurring_label, purchase_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      userId,
      paymentMethod === 'pix' ? null : cardId,
      paymentMethod,
      description,
      category,
      totalAmount,
      paymentMethod === 'pix' ? 1 : installments,
      isRecurring ? 1 : 0,
      recurringLabel,
      purchaseDate
    ]
  );
  const purchaseId = purchaseResult.rows[0].id;

  if (paymentMethod === 'card') {
    const installmentCount = Math.max(Number(installments || 1), 1);
    const installmentValue = Number((Number(totalAmount || 0) / installmentCount).toFixed(2));

    for (let index = 0; index < installmentCount; index += 1) {
      await query(
        `INSERT INTO installments (purchase_id, installment_number, amount, due_date)
         VALUES ($1, $2, $3, $4)`,
        [
          purchaseId,
          index + 1,
          installmentValue,
          addMonthsDueDate(purchaseDate, index, card.due_day)
        ]
      );
    }
  }

  res.json({ success: true, purchaseId });
});

app.delete('/api/purchases/:purchaseId', async (req, res) => {
  await query(`DELETE FROM installments WHERE purchase_id = $1`, [req.params.purchaseId]);
  const result = await query(`DELETE FROM purchases WHERE id = $1`, [req.params.purchaseId]);

  res.json({ rowsAffected: result.rowCount });
});

app.get('/api/installments', async (req, res) => {
  const userId = Number(req.query.userId);
  const month = String(req.query.month).padStart(2, '0');
  const year = String(req.query.year);

  const result = await query(
    `SELECT
       i.id,
       i.installment_number,
       i.amount,
       i.due_date,
       i.is_paid,
       p.description,
       p.card_id,
       p.payment_method,
       c.name AS card_name
     FROM installments i
     JOIN purchases p ON p.id = i.purchase_id
     LEFT JOIN cards c ON c.id = p.card_id
     WHERE p.user_id = $1
       AND to_char(i.due_date, 'MM') = $2
       AND to_char(i.due_date, 'YYYY') = $3
     ORDER BY i.due_date ASC`,
    [userId, month, year]
  );

  res.json({
    installments: result.rows.map((row) => ({
      ...row,
      amount: toNumber(row.amount),
      is_paid: Number(row.is_paid || 0)
    }))
  });
});

app.patch('/api/installments/:installmentId', async (req, res) => {
  const result = await query(
    `UPDATE installments SET is_paid = $1 WHERE id = $2`,
    [req.body.isPaid ? 1 : 0, req.params.installmentId]
  );

  res.json({ rowsAffected: result.rowCount });
});

app.use(express.static(distPath));
app.use((_, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

Promise.resolve()
  .then(() => (isDatabaseConfigured ? initSchema() : null))
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`ControleCartao listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database schema', error);
    process.exit(1);
  });
