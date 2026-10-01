const STORAGE_KEY = 'controle-cartao-web-store';

function emptyStore() {
  return {
    users: [],
    sessionUserId: null,
    cards: [],
    purchases: [],
    installments: [],
    counters: {
      users: 1,
      cards: 1,
      purchases: 1,
      installments: 1
    }
  };
}

export function readWebStore() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return emptyStore();
  }

  const rawStore = window.localStorage.getItem(STORAGE_KEY);

  if (!rawStore) {
    return emptyStore();
  }

  try {
    return {
      ...emptyStore(),
      ...JSON.parse(rawStore)
    };
  } catch {
    return emptyStore();
  }
}

export function writeWebStore(store) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function nextWebId(store, key) {
  const id = store.counters[key] ?? 1;
  store.counters[key] = id + 1;
  return id;
}

export function todayWebIso() {
  return new Date().toISOString().split('T')[0];
}
