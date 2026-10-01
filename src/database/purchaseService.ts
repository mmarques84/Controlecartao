import { Platform } from 'react-native';
import { db } from './db';
import { getCurrentUser } from './authService';
import { apiRequest, canUseApi } from './apiClient';
import { nextWebId, readWebStore, todayWebIso, writeWebStore } from './webStore';

export const getInstallmentsByMonth = (month: number, year: number) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return getCurrentUser().then((user: any) => {
      if (!user?.id) {
        return [];
      }

      return apiRequest(`/installments?userId=${user.id}&month=${month}&year=${year}`)
        .then((result: any) => result.installments ?? []);
    });
  }

  if (Platform.OS === 'web') {
    return getCurrentUser().then((user: any) => {
      if (!user?.id) {
        return [];
      }

      const selectedMonth = String(month).padStart(2, '0');
      const selectedYear = String(year);
      const store = readWebStore();

      return store.installments
        .filter((installment: any) => {
          const purchase = store.purchases.find((item: any) => item.id === installment.purchase_id);
          return (
            purchase?.user_id === user.id &&
            String(installment.due_date).slice(5, 7) === selectedMonth &&
            String(installment.due_date).slice(0, 4) === selectedYear
          );
        })
        .map((installment: any) => {
          const purchase = store.purchases.find((item: any) => item.id === installment.purchase_id);
          const card = store.cards.find((item: any) => item.id === purchase?.card_id);

          return {
            ...installment,
            description: purchase?.description,
            card_id: purchase?.card_id,
            payment_method: purchase?.payment_method,
            card_name: card?.name ?? null
          };
        })
        .sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date)));
    });
  }

  return new Promise((resolve, reject) => {
    getCurrentUser()
      .then((user: any) => {
        if (!user?.id) {
          resolve([]);
          return;
        }

        db.transaction((tx: any) => {
          tx.executeSql(
            `
            SELECT
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
            WHERE p.user_id = ?
              AND strftime('%m', i.due_date) = ?
              AND strftime('%Y', i.due_date) = ?
            ORDER BY i.due_date ASC
            `,
            [user.id, String(month).padStart(2, '0'), String(year)],
            (_: any, result: any) => resolve(result.rows._array),
            (_: any, error: any) => reject(error)
          );
        });
      })
      .catch(reject);
  });
};

function calculateDueDate(baseDate: string, installmentOffset: number, dueDay: number) {
  const [year, month] = baseDate.split('-').map(Number);
  const date = new Date(year, month - 1 + installmentOffset, dueDay);
  return date.toISOString().split('T')[0];
}

type CreatePurchaseInput = {
  cardId?: number | null;
  paymentMethod?: 'card' | 'pix';
  description: string;
  category?: string;
  totalAmount: number;
  installments: number;
  isRecurring?: boolean;
  recurringLabel?: string | null;
  purchaseDate: string;
};

export const createPurchase = ({
  cardId,
  paymentMethod = 'card',
  description,
  category = 'Outros',
  totalAmount,
  installments,
  isRecurring = false,
  recurringLabel = null,
  purchaseDate
}: CreatePurchaseInput) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return getCurrentUser().then((user: any) => {
      if (!user?.id) {
        return { error: 'NO_SESSION' };
      }

      return apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          cardId,
          paymentMethod,
          description,
          category,
          totalAmount,
          installments,
          isRecurring,
          recurringLabel,
          purchaseDate
        })
      });
    });
  }

  if (Platform.OS === 'web') {
    return getCurrentUser().then((user: any) => {
      if (!user?.id) {
        return { error: 'NO_SESSION' };
      }

      const store = readWebStore();

      if (paymentMethod === 'card') {
        const card = store.cards.find((item: any) => item.id === cardId && item.user_id === user.id);

        if (!card) {
          return { error: 'CARD_NOT_FOUND' };
        }
      }

      const purchaseId = nextWebId(store, 'purchases');

      store.purchases.push({
        id: purchaseId,
        user_id: user.id,
        card_id: paymentMethod === 'pix' ? null : cardId,
        payment_method: paymentMethod,
        description,
        category,
        total_amount: totalAmount,
        installments: paymentMethod === 'pix' ? 1 : installments,
        is_recurring: isRecurring ? 1 : 0,
        recurring_label: recurringLabel,
        purchase_date: purchaseDate,
        created_at: todayWebIso()
      });

      if (paymentMethod === 'card') {
        const card = store.cards.find((item: any) => item.id === cardId);
        const installmentCount = Math.max(Number(installments || 1), 1);
        const installmentValue = Number((totalAmount / installmentCount).toFixed(2));

        for (let index = 0; index < installmentCount; index += 1) {
          store.installments.push({
            id: nextWebId(store, 'installments'),
            purchase_id: purchaseId,
            installment_number: index + 1,
            amount: installmentValue,
            due_date: calculateDueDate(purchaseDate, index, card?.due_day ?? 1),
            is_paid: 0
          });
        }
      }

      writeWebStore(store);

      return { success: true, purchaseId };
    });
  }

  return new Promise((resolve, reject) => {
    getCurrentUser()
      .then((user: any) => {
        if (!user?.id) {
          resolve({ error: 'NO_SESSION' });
          return;
        }

        if (paymentMethod === 'pix') {
          db.transaction((tx: any) => {
            tx.executeSql(
              `INSERT INTO purchases
                (user_id, card_id, payment_method, description, category, total_amount, installments, is_recurring, recurring_label, purchase_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              [
                user.id,
                null,
                'pix',
                description,
                category,
                totalAmount,
                1,
                isRecurring ? 1 : 0,
                recurringLabel,
                purchaseDate
              ],
              (_: any, result: any) => resolve({ success: true, purchaseId: result?.insertId }),
              (_: any, error: any) => reject(error)
            );
          });
          return;
        }

        if (!cardId) {
          resolve({ error: 'CARD_NOT_FOUND' });
          return;
        }

        db.transaction((tx: any) => {
          tx.executeSql(
            `SELECT * FROM cards WHERE id = ? AND user_id = ?`,
            [cardId, user.id],
            (_: any, { rows }: any) => {
              if (rows.length === 0) {
                resolve({ error: 'CARD_NOT_FOUND' });
                return;
              }

              const card = rows._array[0];

              tx.executeSql(
                `INSERT INTO purchases
                  (user_id, card_id, payment_method, description, category, total_amount, installments, is_recurring, recurring_label, purchase_date, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                  user.id,
                  cardId,
                  'card',
                  description,
                  category,
                  totalAmount,
                  installments,
                  isRecurring ? 1 : 0,
                  recurringLabel,
                  purchaseDate
                ],
                (_: any, result: any) => {
                  const purchaseId = result?.insertId;

                  if (!purchaseId) {
                    resolve({ error: 'PURCHASE_NOT_CREATED' });
                    return;
                  }

                  const installmentValue = Number((totalAmount / installments).toFixed(2));

                  for (let index = 0; index < installments; index += 1) {
                    tx.executeSql(
                      `INSERT INTO installments
                        (purchase_id, installment_number, amount, due_date)
                       VALUES (?, ?, ?, ?)`,
                      [
                        purchaseId,
                        index + 1,
                        installmentValue,
                        calculateDueDate(purchaseDate, index, card.due_day)
                      ]
                    );
                  }

                  resolve({ success: true, purchaseId });
                },
                (_: any, error: any) => reject(error)
              );
            },
            (_: any, error: any) => reject(error)
          );
        });
      })
      .catch(reject);
  });
};

export const getRecentPurchases = () => {
  if (Platform.OS === 'web' && canUseApi()) {
    return getCurrentUser().then((user: any) => {
      if (!user?.id) {
        return [];
      }

      return apiRequest(`/purchases?userId=${user.id}`).then((result: any) => result.purchases ?? []);
    });
  }

  if (Platform.OS === 'web') {
    return getCurrentUser().then((user: any) => {
      if (!user?.id) {
        return [];
      }

      const store = readWebStore();

      return store.purchases
        .filter((purchase: any) => purchase.user_id === user.id)
        .map((purchase: any) => {
          const card = store.cards.find((item: any) => item.id === purchase.card_id);
          return {
            ...purchase,
            card_name: card?.name ?? null
          };
        })
        .sort((a: any, b: any) => b.id - a.id);
    });
  }

  return new Promise((resolve, reject) => {
    getCurrentUser()
      .then((user: any) => {
        if (!user?.id) {
          resolve([]);
          return;
        }

        db.transaction((tx: any) => {
          tx.executeSql(
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
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC, p.id DESC`,
            [user.id],
            (_: any, { rows }: any) => resolve(rows._array),
            (_: any, error: any) => reject(error)
          );
        });
      })
      .catch(reject);
  });
};

export const deletePurchase = (purchaseId: number) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return apiRequest(`/purchases/${purchaseId}`, { method: 'DELETE' });
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    store.installments = store.installments.filter((installment: any) => installment.purchase_id !== purchaseId);
    store.purchases = store.purchases.filter((purchase: any) => purchase.id !== purchaseId);
    writeWebStore(store);
    return Promise.resolve({ rowsAffected: 1 });
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(`DELETE FROM installments WHERE purchase_id = ?`, [purchaseId]);
      tx.executeSql(
        `DELETE FROM purchases WHERE id = ?`,
        [purchaseId],
        (_: any, result: any) => resolve(result),
        (_: any, error: any) => reject(error)
      );
    });
  });
};

export const updateInstallmentPaidStatus = (installmentId: number, isPaid: number) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return apiRequest(`/installments/${installmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPaid: Number(isPaid) === 1 })
    });
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    store.installments = store.installments.map((installment: any) => (
      installment.id === installmentId ? { ...installment, is_paid: isPaid } : installment
    ));
    writeWebStore(store);
    return Promise.resolve({ rowsAffected: 1 });
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `UPDATE installments
         SET is_paid = ?
         WHERE id = ?`,
        [isPaid, installmentId],
        (_: any, result: any) => resolve(result),
        (_: any, error: any) => reject(error)
      );
    });
  });
};
