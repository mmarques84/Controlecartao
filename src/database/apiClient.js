const SESSION_KEY = 'controle-cartao-api-session';

function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  return '';
}

export function canUseApi() {
  return Boolean(getApiBaseUrl());
}

export function getApiSessionUserId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const rawValue = window.localStorage.getItem(SESSION_KEY);
  return rawValue ? Number(rawValue) : null;
}

export function setApiSessionUserId(userId) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  if (!userId) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, String(userId));
}

export async function apiRequest(path, options = {}) {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error('API_DISABLED');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error || 'API_ERROR');
    error.status = response.status;
    throw error;
  }

  return data;
}
