import type {
  CreateInvoiceRequest,
  Invoice,
  LoginResponse,
  PaginatedResponse,
  UpdateInvoiceRequest,
  User,
} from '@simple-invoice/shared';
import { useAuthStore } from './auth';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    // The JWT is in an httpOnly cookie set by /auth/login. The browser
    // sends it automatically only when credentials are explicitly
    // included on the fetch.
    credentials: 'include',
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Cookie missing / expired / invalid — flip to guest so guards bounce
      // the user to /login.
      useAuthStore.getState().setGuest();
    }
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message)
      ? body.message.join(', ')
      : body.message || `Error ${res.status}`;
    throw new Error(msg);
  }

  // 204 No Content (used by DELETE / logout) has no body to parse.
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<User>('/auth/me'),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  invoices: {
    list: (params: Record<string, string>) =>
      request<PaginatedResponse<Invoice>>(`/invoices?${new URLSearchParams(params)}`),
    get: (id: string) => request<Invoice>(`/invoices/${id}`),
    create: (data: CreateInvoiceRequest) =>
      request<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateInvoiceRequest) =>
      request<Invoice>(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<void>(`/invoices/${id}`, { method: 'DELETE' }),
    restore: (id: string) =>
      request<Invoice>(`/invoices/${id}/restore`, { method: 'POST' }),
  },
};
