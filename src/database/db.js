import { Platform } from 'react-native';

let database = null;

if (Platform.OS !== 'web') {
  const SQLite = require('expo-sqlite');
  database = SQLite.openDatabaseSync('controle-cartao.db');
}

function buildRows(rowsArray) {
  return {
    length: rowsArray.length,
    _array: rowsArray,
    item: (index) => rowsArray[index]
  };
}

function executeSqlCompat(tx, sql, params = [], onSuccess, onError) {
  try {
    if (!database) {
      onSuccess?.(tx, {
        insertId: undefined,
        rowsAffected: 0,
        rows: buildRows([])
      });
      return;
    }

    const statement = String(sql).trim();
    const isReadQuery = /^(SELECT|PRAGMA|WITH)\b/i.test(statement);

    if (isReadQuery) {
      const rows = database.getAllSync(statement, params);
      const result = { rows: buildRows(rows), rowsAffected: 0 };
      onSuccess?.(tx, result);
      return;
    }

    const runResult = database.runSync(statement, params);
    const result = {
      insertId: runResult?.lastInsertRowId,
      rowsAffected: runResult?.changes ?? 0,
      rows: buildRows([])
    };
    onSuccess?.(tx, result);
  } catch (error) {
    const handled = onError?.(tx, error);
    if (handled !== false) {
      console.log('SQLite error:', error);
    }
  }
}

export const db = {
  transaction(callback) {
    const tx = {
      executeSql(sql, params, onSuccess, onError) {
        executeSqlCompat(tx, sql, params, onSuccess, onError);
      }
    };
    callback(tx);
  }
};

export default db;
