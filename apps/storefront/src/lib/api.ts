const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    fetchApi<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    fetchApi<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(path: string, body: unknown, options?: RequestInit) =>
    fetchApi<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    fetchApi<T>(path, { method: 'DELETE', ...options }),
};

// ─── Server-side fetch with ISR ──────────────────────────────────────────────

export async function serverFetch<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    next: { revalidate },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }

  return res.json();
}

// ─── Server-side authenticated fetch ─────────────────────────────────────────
// Forwards the browser's session cookie to the API so server components can
// make authenticated calls. Use for pages that render personal data (order
// confirmation, invoice, account pages).

export async function authedServerFetch<T>(path: string): Promise<T> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { Cookie: cookieHeader }),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }

  return res.json();
}
