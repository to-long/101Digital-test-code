import { describe, test, expect, beforeAll } from 'bun:test';

const BASE = 'http://localhost:3000/api';
let token: string;

beforeAll(async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@simpleinvoice.com', password: 'password123' }),
  });
  const data = await res.json();
  token = data.accessToken;
});

function authHeaders() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

describe('Auth Endpoints', () => {
  test('POST /auth/login with valid credentials → 201', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@simpleinvoice.com', password: 'password123' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.accessToken).toBeDefined();
    expect(data.user.email).toBe('admin@simpleinvoice.com');
  });

  test('POST /auth/login with invalid password → 401', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@simpleinvoice.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  test('GET /auth/me with valid token → 200', async () => {
    const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe('admin@simpleinvoice.com');
    expect(data.fullname).toBe('Admin User');
  });

  test('GET /auth/me without token → 401', async () => {
    const res = await fetch(`${BASE}/auth/me`);
    expect(res.status).toBe(401);
  });
});

describe('Invoice Endpoints', () => {
  test('GET /invoices → paginated list', async () => {
    const res = await fetch(`${BASE}/invoices?page=1&pageSize=5`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeLessThanOrEqual(5);
    expect(data.paging.page).toBe(1);
    expect(data.paging.pageSize).toBe(5);
    expect(data.paging.total).toBeGreaterThan(0);
  });

  test('GET /invoices without token → 401', async () => {
    const res = await fetch(`${BASE}/invoices`);
    expect(res.status).toBe(401);
  });

  test('GET /invoices with status filter', async () => {
    const res = await fetch(`${BASE}/invoices?status=Paid`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    data.data.forEach((inv: any) => {
      expect(inv.status).toBe('Paid');
    });
  });

  test('GET /invoices with keyword search', async () => {
    const res = await fetch(`${BASE}/invoices?keyword=INV`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('POST /invoices → creates invoice with correct calculations', async () => {
    const invoiceNumber = `TEST-${Date.now()}`;
    const res = await fetch(`${BASE}/invoices`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        customer: { fullname: 'Test Customer', email: 'test@test.com' },
        invoiceNumber,
        invoiceDate: '2026-06-05',
        dueDate: '2026-07-05',
        currency: 'AUD',
        item: { name: 'Test Item', quantity: 3, rate: 500 },
        taxPercent: 10,
        discount: 50,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.invoiceNumber).toBe(invoiceNumber);
    expect(data.status).toBe('Draft');
    expect(data.invoiceSubTotal).toBe(1500);
    expect(data.totalTax).toBe(150);
    expect(data.totalDiscount).toBe(50);
    expect(data.totalAmount).toBe(1600);
    expect(data.balanceAmount).toBe(1600);
    expect(data.customer.fullname).toBe('Test Customer');
    expect(data.items[0].name).toBe('Test Item');
  });

  test('POST /invoices with duplicate number → 409', async () => {
    const res = await fetch(`${BASE}/invoices`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        customer: { fullname: 'Dup', email: 'dup@test.com' },
        invoiceNumber: 'INV-001',
        invoiceDate: '2026-06-05',
        dueDate: '2026-07-05',
        currency: 'AUD',
        item: { name: 'Item', quantity: 1, rate: 100 },
        taxPercent: 10,
        discount: 0,
      }),
    });
    expect(res.status).toBe(409);
  });

  test('POST /invoices with missing fields → 400', async () => {
    const res = await fetch(`${BASE}/invoices`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test('GET /invoices/:id → invoice detail', async () => {
    const listRes = await fetch(`${BASE}/invoices?pageSize=1`, { headers: authHeaders() });
    const list = await listRes.json();
    const invoiceId = list.data[0].invoiceId;

    const res = await fetch(`${BASE}/invoices/${invoiceId}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.invoiceId).toBe(invoiceId);
    expect(data.items).toBeInstanceOf(Array);
    expect(data.customer).toBeDefined();
  });

  test('GET /invoices/:id with invalid ID → 400', async () => {
    const res = await fetch(`${BASE}/invoices/not-a-uuid`, { headers: authHeaders() });
    expect(res.status).toBe(400);
  });
});
