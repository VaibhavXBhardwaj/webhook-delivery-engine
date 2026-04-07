const BASE = 'http://100.26.107.105:3000/api/v1';

export function getKey(): string {
  return localStorage.getItem('whe_key') || '';
}

export function setKey(key: string) {
  localStorage.setItem('whe_key', key);
}

export function clearKey() {
  localStorage.removeItem('whe_key');
}

async function request(path: string, options: RequestInit = {}) {
  const key = localStorage.getItem('whe_key') || '';
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body?: unknown) =>
    request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};