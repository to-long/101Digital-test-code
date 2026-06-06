/**
 * BDD-style behavior specs for the invoice domain.
 *
 * Each `describe` block reads as a Feature; each nested `describe` is a
 * Scenario; each `test` body is structured as Given / When / Then comments.
 *
 * Why this style: it makes the API contract readable to non-engineers
 * (designers, PMs, QA) and forces every test to express its business
 * intent before any HTTP setup. Cucumber/Gherkin would be more "real" BDD
 * but adds tooling cost — using `bun:test` with disciplined structure
 * captures most of the value at zero infra cost.
 *
 * Requires `make dev-be` (or full `make dev`) running locally so the API
 * is reachable on http://localhost:4001.
 */
import { beforeAll, describe, expect, test } from 'bun:test';

const BASE = `http://localhost:${process.env.BACKEND_PORT || 4001}/api`;

let adminToken: string;

beforeAll(async () => {
  // Background: an admin user already exists in the seeded database.
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@simpleinvoice.com', password: 'password123' }),
  });
  const data = await res.json();
  adminToken = data.accessToken;
});

function auth() {
  return { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
}

function uniqueInvoiceNumber(prefix = 'BDD') {
  // Avoid collisions with seed data + previous test runs.
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function createDraftInvoice(overrides: Record<string, unknown> = {}) {
  const body = {
    invoiceNumber: uniqueInvoiceNumber(),
    invoiceDate: '2026-01-15',
    dueDate: '2026-02-15',
    currency: 'AUD',
    customer: {
      fullname: 'BDD Customer',
      email: 'bdd@example.com',
    },
    item: { name: 'Consulting service', quantity: 2, rate: 250 },
    taxPercent: 10,
    discount: 0,
    ...overrides,
  };
  const res = await fetch(`${BASE}/invoices`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature: Authentication
// ─────────────────────────────────────────────────────────────────────────────
describe('Feature: Authentication', () => {
  describe('Scenario: signing in with valid credentials', () => {
    test('Given a registered user, when they log in with correct credentials, then they receive a JWT and their profile', async () => {
      // Given a registered user (admin from seed)
      const credentials = { email: 'admin@simpleinvoice.com', password: 'password123' };

      // When they log in
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      // Then the response contains a token and the user profile
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.accessToken).toBeString();
      expect(data.user.email).toBe('admin@simpleinvoice.com');
      expect(data.user.fullname).toBe('Admin User');
    });
  });

  describe('Scenario: signing in with the wrong password', () => {
    test('Given a registered user, when they submit the wrong password, then login is rejected with 401', async () => {
      // Given a registered user
      // When they submit the wrong password
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@simpleinvoice.com', password: 'nope' }),
      });

      // Then the request is rejected as unauthorized
      expect(res.status).toBe(401);
    });
  });

  describe('Scenario: accessing a protected route', () => {
    test('Given an authenticated user, when they request /auth/me, then their profile is returned', async () => {
      // Given an authenticated user (token from beforeAll)
      // When they request their profile
      const res = await fetch(`${BASE}/auth/me`, { headers: auth() });

      // Then their profile is returned
      expect(res.status).toBe(200);
      const me = await res.json();
      expect(me.email).toBe('admin@simpleinvoice.com');
    });

    test('Given no token, when /auth/me is called, then access is denied with 401', async () => {
      // Given no token in the request
      // When /auth/me is called
      const res = await fetch(`${BASE}/auth/me`);

      // Then the gateway denies access
      expect(res.status).toBe(401);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: Browsing the invoice list
// ─────────────────────────────────────────────────────────────────────────────
describe('Feature: Browsing the invoice list', () => {
  describe('Scenario: default paging', () => {
    test('Given the seeded data set, when the list is requested without query params, then 10 invoices per page are returned with total count', async () => {
      // Given a seeded database (100 invoices)
      // When the list is requested with no params
      const res = await fetch(`${BASE}/invoices`, { headers: auth() });

      // Then the response is paginated
      expect(res.status).toBe(200);
      const { data, paging } = await res.json();
      expect(Array.isArray(data)).toBeTrue();
      expect(data.length).toBeLessThanOrEqual(10);
      expect(paging.page).toBe(1);
      expect(paging.pageSize).toBe(10);
      expect(paging.total).toBeGreaterThan(0);
    });
  });

  describe('Scenario: filtering by status', () => {
    test('Given a mix of invoice statuses, when filtering by status=Paid, then only Paid rows are returned', async () => {
      // Given a mixed dataset
      // When filtering by status=Paid
      const res = await fetch(`${BASE}/invoices?status=Paid&pageSize=20`, {
        headers: auth(),
      });

      // Then every row has status Paid
      expect(res.status).toBe(200);
      const { data } = await res.json();
      for (const inv of data) {
        expect(inv.status).toBe('Paid');
      }
    });

    test('Given Pending invoices past their due date, when filtering by status=Overdue, then only those rows are returned', async () => {
      // Given there are past-due Pending invoices in the seed
      // When filtering by Overdue
      const res = await fetch(`${BASE}/invoices?status=Overdue&pageSize=20`, {
        headers: auth(),
      });

      // Then the response is consistent with the derived-status rule:
      //   Pending invoices with dueDate < today are marked Overdue.
      expect(res.status).toBe(200);
      const { data } = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      for (const inv of data) {
        expect(inv.status).toBe('Overdue');
        expect(inv.dueDate < today).toBeTrue();
      }
    });
  });

  describe('Scenario: full-text search', () => {
    test('Given an invoice with a specific number, when searching by that number, then the row is matched', async () => {
      // Given a freshly-created invoice with a known number
      const number = uniqueInvoiceNumber('SEARCH');
      const created = await createDraftInvoice({ invoiceNumber: number });
      expect(created.status).toBe(201);

      // When the list is searched by that number
      const res = await fetch(`${BASE}/invoices?keyword=${number}`, { headers: auth() });

      // Then the new invoice appears in the result set
      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.some((inv: any) => inv.invoiceNumber === number)).toBeTrue();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: Creating an invoice
// ─────────────────────────────────────────────────────────────────────────────
describe('Feature: Creating an invoice', () => {
  describe('Scenario: happy path', () => {
    test('Given valid invoice input, when POST /invoices, then the invoice is created as Draft with server-calculated totals', async () => {
      // Given valid input with quantity=2, rate=250, tax=10%, discount=0
      // When the invoice is created
      const { status, body } = await createDraftInvoice();

      // Then the response carries the saved record with derived totals
      //  subTotal = 2 * 250 = 500.00
      //  tax      = 500 * 10% = 50.00
      //  total    = 500 + 50 - 0 = 550.00
      expect(status).toBe(201);
      expect(body.status).toBe('Draft');
      expect(body.invoiceSubTotal).toBe(500);
      expect(body.totalTax).toBe(50);
      expect(body.totalAmount).toBe(550);
      expect(body.balanceAmount).toBe(550);
    });
  });

  describe('Scenario: due date before invoice date', () => {
    test('Given dueDate < invoiceDate, when POST /invoices, then it is rejected with 400', async () => {
      // Given an invalid date pair
      // When the invoice is created
      const { status } = await createDraftInvoice({
        invoiceDate: '2026-02-15',
        dueDate: '2026-01-15',
      });

      // Then validation rejects it
      expect(status).toBe(400);
    });
  });

  describe('Scenario: duplicate invoice number', () => {
    test('Given an existing invoice number, when a second create reuses it, then 409 Conflict is returned', async () => {
      // Given a freshly-created invoice
      const number = uniqueInvoiceNumber('DUP');
      const first = await createDraftInvoice({ invoiceNumber: number });
      expect(first.status).toBe(201);

      // When creating another with the same number
      const second = await createDraftInvoice({ invoiceNumber: number });

      // Then the duplicate is rejected
      expect(second.status).toBe(409);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: Editing an invoice
// ─────────────────────────────────────────────────────────────────────────────
describe('Feature: Editing an invoice', () => {
  describe('Scenario: editing a Draft', () => {
    test('Given a Draft invoice, when PUT /invoices/:id updates the customer, then the change is persisted', async () => {
      // Given a Draft invoice
      const created = await createDraftInvoice();
      const id = created.body.invoiceId;

      // When updating its customer name
      const update = await fetch(`${BASE}/invoices/${id}`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({
          customer: { fullname: 'Updated Customer', email: 'updated@example.com' },
          invoiceDate: created.body.invoiceDate,
          dueDate: created.body.dueDate,
          currency: 'AUD',
          status: 'Draft',
          item: { name: 'Consulting service', quantity: 2, rate: 250 },
          taxPercent: 10,
          discount: 0,
        }),
      });

      // Then the change is reflected on subsequent reads
      expect(update.status).toBe(200);
      const detail = await fetch(`${BASE}/invoices/${id}`, { headers: auth() });
      const body = await detail.json();
      expect(body.customer.fullname).toBe('Updated Customer');
    });
  });

  describe('Scenario: editing a non-existent invoice', () => {
    test('Given an unknown id, when PUT /invoices/:id, then 404 is returned', async () => {
      // Given a random UUID that does not exist
      const ghostId = '00000000-0000-0000-0000-000000000000';

      // When updating it
      const res = await fetch(`${BASE}/invoices/${ghostId}`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({
          customer: { fullname: 'X', email: 'x@x.com' },
          invoiceDate: '2026-01-01',
          dueDate: '2026-02-01',
          currency: 'AUD',
          status: 'Draft',
          item: { name: 'X', quantity: 1, rate: 1 },
          taxPercent: 0,
          discount: 0,
        }),
      });

      // Then the API reports the row as not found
      expect(res.status).toBe(404);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: Soft-deleting an invoice
// ─────────────────────────────────────────────────────────────────────────────
describe('Feature: Soft-deleting an invoice', () => {
  describe('Scenario: deleting a Draft', () => {
    test('Given a Draft invoice, when DELETE /invoices/:id, then it returns 204, disappears from the default list, but is reachable via the deleted filter', async () => {
      // Given a freshly-created Draft invoice
      const created = await createDraftInvoice();
      const id = created.body.invoiceId;
      const number = created.body.invoiceNumber;

      // When it is deleted
      const del = await fetch(`${BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });

      // Then the API responds with 204 No Content
      expect(del.status).toBe(204);

      // And the row no longer appears in the DEFAULT list (deletedAt filter)
      const list = await fetch(`${BASE}/invoices?keyword=${number}`, { headers: auth() });
      const { data } = await list.json();
      expect(data.some((inv: any) => inv.invoiceId === id)).toBeFalse();

      // And the detail endpoint still returns it, but with displayStatus
      // 'Deleted' so the recycle-bin view can show its data + restore action
      const detail = await fetch(`${BASE}/invoices/${id}`, { headers: auth() });
      expect(detail.status).toBe(200);
      const body = await detail.json();
      expect(body.status).toBe('Deleted');

      // And the recycle-bin filter `?status=Deleted` lists it
      const trash = await fetch(`${BASE}/invoices?status=Deleted&keyword=${number}`, {
        headers: auth(),
      });
      const { data: trashData } = await trash.json();
      expect(trashData.some((inv: any) => inv.invoiceId === id)).toBeTrue();
    });
  });

  describe('Scenario: deleting a non-existent invoice', () => {
    test('Given an unknown id, when DELETE /invoices/:id, then 404 is returned', async () => {
      const ghostId = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${BASE}/invoices/${ghostId}`, {
        method: 'DELETE',
        headers: auth(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: deleting an already-deleted invoice (idempotency check)', () => {
    test('Given an invoice that was just deleted, when DELETE is called again, then 404 is returned (the soft-delete query filters it out)', async () => {
      // Given a freshly-deleted invoice
      const created = await createDraftInvoice();
      const id = created.body.invoiceId;
      const firstDelete = await fetch(`${BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });
      expect(firstDelete.status).toBe(204);

      // When delete is called a second time
      const secondDelete = await fetch(`${BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });

      // Then we get 404 — softDelete() filters on deletedAt IS NULL when
      // looking up the row to mark, so a second call can't find it.
      expect(secondDelete.status).toBe(404);
    });
  });

  describe('Scenario: restoring a deleted invoice', () => {
    test('Given a deleted invoice, when POST /invoices/:id/restore, then deletedAt is cleared and the row returns to the default list', async () => {
      // Given a deleted invoice
      const created = await createDraftInvoice();
      const id = created.body.invoiceId;
      const number = created.body.invoiceNumber;
      const del = await fetch(`${BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });
      expect(del.status).toBe(204);

      // When restore is called
      const restore = await fetch(`${BASE}/invoices/${id}/restore`, {
        method: 'POST',
        headers: auth(),
      });

      // Then the response is 200 with the restored invoice
      // (Nest returns 201 for @Post by default; we keep that.)
      expect(restore.status).toBe(201);
      const body = await restore.json();
      expect(body.status).toBe('Draft'); // back to its DB status

      // And it appears in the default list again
      const list = await fetch(`${BASE}/invoices?keyword=${number}`, { headers: auth() });
      const { data } = await list.json();
      expect(data.some((inv: any) => inv.invoiceId === id)).toBeTrue();
    });

    test('Given an unknown id, when POST /restore, then 404 is returned', async () => {
      const ghostId = '00000000-0000-0000-0000-000000000000';
      const res = await fetch(`${BASE}/invoices/${ghostId}/restore`, {
        method: 'POST',
        headers: auth(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Scenario: editing a deleted invoice is rejected', () => {
    test('Given a deleted invoice, when PUT /invoices/:id, then 400 — must restore first', async () => {
      // Given a deleted invoice
      const created = await createDraftInvoice();
      const id = created.body.invoiceId;
      const del = await fetch(`${BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });
      expect(del.status).toBe(204);

      // When attempting to update it
      const res = await fetch(`${BASE}/invoices/${id}`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({
          customer: { fullname: 'X', email: 'x@x.com' },
          invoiceDate: '2026-01-01',
          dueDate: '2026-02-01',
          currency: 'AUD',
          status: 'Draft',
          item: { name: 'X', quantity: 1, rate: 1 },
          taxPercent: 0,
          discount: 0,
        }),
      });

      // Then the server refuses (rule mirrors the Paid immutability path)
      expect(res.status).toBe(400);
      const err = await res.json();
      expect(err.message.toLowerCase()).toContain('deleted');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: Paid invoices are immutable
// ─────────────────────────────────────────────────────────────────────────────
describe('Feature: Paid invoices are immutable', () => {
  /**
   * Helper: spin up a Draft invoice, then promote it to Paid via PUT.
   * Returns its id for downstream assertions.
   */
  async function createPaidInvoice() {
    const created = await createDraftInvoice();
    const id = created.body.invoiceId;
    const promote = await fetch(`${BASE}/invoices/${id}`, {
      method: 'PUT',
      headers: auth(),
      body: JSON.stringify({
        customer: { fullname: 'BDD Customer', email: 'bdd@example.com' },
        invoiceDate: created.body.invoiceDate,
        dueDate: created.body.dueDate,
        currency: 'AUD',
        status: 'Paid',
        item: { name: 'Consulting service', quantity: 2, rate: 250 },
        taxPercent: 10,
        discount: 0,
      }),
    });
    expect(promote.status).toBe(200);
    return id;
  }

  describe('Scenario: editing a Paid invoice', () => {
    test('Given a Paid invoice, when PUT /invoices/:id, then it is rejected with 400', async () => {
      // Given a Paid invoice
      const id = await createPaidInvoice();

      // When attempting to edit it
      const res = await fetch(`${BASE}/invoices/${id}`, {
        method: 'PUT',
        headers: auth(),
        body: JSON.stringify({
          customer: { fullname: 'Trying to change', email: 'x@x.com' },
          invoiceDate: '2026-01-15',
          dueDate: '2026-02-15',
          currency: 'AUD',
          status: 'Paid',
          item: { name: 'X', quantity: 1, rate: 100 },
          taxPercent: 0,
          discount: 0,
        }),
      });

      // Then the server refuses the modification
      expect(res.status).toBe(400);
      const err = await res.json();
      expect(err.message).toContain('Paid');
    });
  });

  describe('Scenario: deleting a Paid invoice', () => {
    test('Given a Paid invoice, when DELETE /invoices/:id, then it is rejected with 400 — same rule as update', async () => {
      // Given a Paid invoice
      const id = await createPaidInvoice();

      // When attempting to delete it
      const res = await fetch(`${BASE}/invoices/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });

      // Then the server refuses (same immutability guarantee as edit)
      expect(res.status).toBe(400);
      const err = await res.json();
      expect(err.message).toContain('Paid');
    });
  });
});
