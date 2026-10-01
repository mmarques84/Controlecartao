import { Platform } from 'react-native';
import { db } from './db';
import { apiRequest, canUseApi, getApiSessionUserId, setApiSessionUserId } from './apiClient';
import { nextWebId, readWebStore, todayWebIso, writeWebStore } from './webStore';

export const register = (email, password) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }).then((result) => {
      if (result?.userId) {
        setApiSessionUserId(result.userId);
      }

      return result;
    });
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();

    if (store.users.some((user) => user.email === email)) {
      return Promise.resolve({ error: 'EMAIL_EXISTS' });
    }

    const user = {
      id: nextWebId(store, 'users'),
      email,
      password,
      profile_photo: '',
      created_at: todayWebIso()
    };

    store.users.push(user);
    store.sessionUserId = user.id;
    writeWebStore(store);

    return Promise.resolve({ success: true, userId: user.id });
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM users WHERE email = ?`,
        [email],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve({ error: 'EMAIL_EXISTS' });
            return;
          }

          tx.executeSql(
            `INSERT INTO users (email, password, created_at)
             VALUES (?, ?, datetime('now'))`,
            [email, password],
            (_, result) => resolve({ success: true, userId: result?.insertId }),
            (_, error) => reject(error)
          );
        }
      );
    });
  });
};

export const persistSession = (userId) => {
  if (Platform.OS === 'web' && canUseApi()) {
    setApiSessionUserId(userId);
    return Promise.resolve(true);
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    store.sessionUserId = userId;
    writeWebStore(store);
    return Promise.resolve(true);
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT OR REPLACE INTO app_session (id, user_id)
         VALUES (1, ?)`,
        [userId],
        () => resolve(true),
        (_, error) => reject(error)
      );
    });
  });
};

export const login = (email, password) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }).then((result) => {
      if (result?.user?.id) {
        setApiSessionUserId(result.user.id);
      }

      return result?.user ?? null;
    });
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    const user = store.users.find((item) => item.email === email && item.password === password) ?? null;

    if (user) {
      store.sessionUserId = user.id;
      writeWebStore(store);
    }

    return Promise.resolve(user);
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM users WHERE email = ? AND password = ?`,
        [email, password],
        (_, { rows }) => {
          if (rows.length > 0) {
            const user = rows._array[0];
            persistSession(user.id)
              .then(() => resolve(user))
              .catch(reject);
          } else {
            resolve(null);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const clearSession = () => {
  if (Platform.OS === 'web' && canUseApi()) {
    setApiSessionUserId(null);
    return Promise.resolve(true);
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    store.sessionUserId = null;
    writeWebStore(store);
    return Promise.resolve(true);
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `DELETE FROM app_session WHERE id = 1`,
        [],
        () => resolve(true),
        (_, error) => reject(error)
      );
    });
  });
};

export const getCurrentUser = () => {
  if (Platform.OS === 'web' && canUseApi()) {
    const userId = getApiSessionUserId();

    if (!userId) {
      return Promise.resolve(null);
    }

    return apiRequest(`/users/${userId}`).then((result) => result?.user ?? null);
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    const user = store.users.find((item) => item.id === store.sessionUserId) ?? null;
    return Promise.resolve(user);
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT u.*
         FROM app_session s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = 1`,
        [],
        (_, { rows }) => resolve(rows.length > 0 ? rows._array[0] : null),
        (_, error) => reject(error)
      );
    });
  });
};

export const updateProfilePhoto = (userId, photoUri) => {
  if (Platform.OS === 'web' && canUseApi()) {
    return apiRequest(`/users/${userId}/photo`, {
      method: 'PATCH',
      body: JSON.stringify({ photoUri })
    });
  }

  if (Platform.OS === 'web') {
    const store = readWebStore();
    store.users = store.users.map((user) => (
      user.id === userId ? { ...user, profile_photo: photoUri } : user
    ));
    writeWebStore(store);
    return Promise.resolve({ rowsAffected: 1 });
  }

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `UPDATE users
         SET profile_photo = ?
         WHERE id = ?`,
        [photoUri, userId],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};
