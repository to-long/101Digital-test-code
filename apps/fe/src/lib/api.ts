import type {
  LoginResponse,
  User,
  Invoice,
  PaginatedResponse,
  CreateInvoiceRequest,
} from '@simple-invoice/shared';
import { useAuthStore } from './auth';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().logout();
    }
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message || `Error ${res.status}`;
    throw new Error(msg);
  }

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
  },
};
