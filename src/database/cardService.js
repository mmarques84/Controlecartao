import { Platform } from 'react-native';
import { db } from './db';
import { getCurrentUser } from './authService';
import { apiRequest, canUseApi } from './apiClient';
import { nextWebId, readWebStore, writeWebStore } from './webStore';

export const createCard = ({
  name,
  limitAmount,
  closingDay,
  dueDay,
  bestPurchaseDay
}) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return getCurrentUser().then((user) => {
      if (!user?.id) {
        return { error: 'NO_SESSION' };
      }

      return apiRequest('/cards', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          name,
          limitAmount,
          closingDay,
          dueDay,
          bestPurchaseDay
        })
      });
    });
  }

  if (Platform.OS === 'web') {
    return getCurrentUser().then((user) => {
      if (!user?.id) {
        return { error: 'NO_SESSION' };
      }

      const store = readWebStore();
      const id = nextWebId(store, 'cards');

      store.cards.push({
        id,
        user_id: user.id,
        name,
        limit_amount: limitAmount,
        closing_day: closingDay,
        due_day: dueDay,
        best_purchase_day: bestPurchaseDay
      });
      writeWebStore(store);

      return { insertId: id, rowsAffected: 1 };
    });
  }

  return new Promise((resolve, reject) => {
    getCurrentUser()
      .then((user) => {
        if (!user?.id) {
          resolve({ error: 'NO_SESSION' });
          return;
        }

        db.transaction((tx) => {
          tx.executeSql(
            `INSERT INTO cards (user_id, name, limit_amount, closing_day, due_day, best_purchase_day)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user.id, name, limitAmount, closingDay, dueDay, bestPurchaseDay],
            (_, result) => resolve(result),
            (_, error) => reject(error)
          );
        });
      })
      .catch(reject);
  });
};

export const getCards = () => {
  if (Platform.OS === 'web' && canUseApi()) {
    return getCurrentUser().then((user) => {
      if (!user?.id) {
        return [];
      }

      return apiRequest(`/cards?userId=${user.id}`).then((result) => result.cards ?? []);
    });
  }

  if (Platform.OS === 'web') {
    return getCurrentUser().then((user) => {
      if (!user?.id) {
        return [];
      }

      const store = readWebStore();
      return store.cards
        .filter((card) => card.user_id === user.id)
        .sort((a, b) => b.id - a.id);
    });
  }

  return new Promise((resolve, reject) => {
    getCurrentUser()
      .then((user) => {
        if (!user?.id) {
          resolve([]);
          return;
        }

        db.transaction((tx) => {
          tx.executeSql(
            `SELECT *
             FROM cards
             WHERE user_id = ?
             ORDER BY id DESC`,
            [user.id],
            (_, { rows }) => resolve(rows._array),
            (_, error) => reject(error)
          );
        });
      })
      .catch(reject);
  });
};

export const deleteCard = (cardId) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return apiRequest(`/cards/${cardId}`, { method: 'DELETE' });
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    const purchaseIds = store.purchases
      .filter((purchase) => purchase.card_id === cardId)
      .map((purchase) => purchase.id);

    store.installments = store.installments.filter((installment) => !purchaseIds.includes(installment.purchase_id));
    store.purchases = store.purchases.filter((purchase) => purchase.card_id !== cardId);
    store.cards = store.cards.filter((card) => card.id !== cardId);
    writeWebStore(store);

    return Promise.resolve({ rowsAffected: 1 });
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `DELETE FROM installments
         WHERE purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)`,
        [cardId]
      );

      tx.executeSql(`DELETE FROM purchases WHERE card_id = ?`, [cardId]);

      tx.executeSql(
        `DELETE FROM cards WHERE id = ?`,
        [cardId],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};
