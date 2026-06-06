# SimpleInvoice

Full-stack invoice management application built for the **101 Digital Web Engineer Assessment v2.3.1**.

A polished invoice CRUD app with auth, search/filter/sort/pagination, soft delete with recycle bin, dark mode, and i18n (English / Tiếng Việt / 中文).

---

## 🚀 Quick start

**Prerequisites**: [Bun](https://bun.sh) ≥ 1.0 + [Docker](https://docs.docker.com/get-docker/).

```bash
cp .env.example .env

make setup    # installs deps, starts DB, runs migrations, seeds 100 invoices
make dev      # starts BE :4001 + FE :3041 with hot reload
```

Open **<http://localhost:3041>** and sign in:

| Email | Password |
|-------|----------|
| `admin@simpleinvoice.com` | `password123` |

That's it. The seed populates 100 invoices over 18 months across 3 currencies and 4 statuses (Draft / Pending / Paid / Overdue) so every filter has data.

### Common things you might want next

| Want to… | Run |
|----------|-----|
| Open Swagger docs | <http://localhost:4001/api/docs> |
| Run all backend tests | `make test` |
| Run frontend E2E suite | `make test-e2e` |
| Regenerate README screenshots | `bun run scripts/screenshots.ts` |
| Reseed the DB | `make seed` |
| Lint / format | `make lint` / `make format` |

### Running with Docker (no local Bun/Postgres needed)

```bash
docker compose up --build
docker compose exec backend bun run apps/be/src/db/migrate.ts
docker compose exec backend bun run apps/be/src/db/seed.ts
```

App is still at <http://localhost:3041>.

---

## Screenshots

All screens captured in both light and dark theme. To regenerate them locally: `bun run scripts/screenshots.ts` (requires `make dev` running).

### Login

| Light | Dark |
| :-: | :-: |
| ![Login — light](./docs/screenshots/login-light.png) | ![Login — dark](./docs/screenshots/login-dark.png) |

### Invoices list

| Light | Dark |
| :-: | :-: |
| ![Invoices list — light](./docs/screenshots/invoices-list-light.png) | ![Invoices list — dark](./docs/screenshots/invoices-list-dark.png) |

### Invoice detail

| Light | Dark |
| :-: | :-: |
| ![Invoice detail — light](./docs/screenshots/invoice-detail-light.png) | ![Invoice detail — dark](./docs/screenshots/invoice-detail-dark.png) |

### Create invoice

| Light | Dark |
| :-: | :-: |
| ![Create — light](./docs/screenshots/create-invoice-light.png) | ![Create — dark](./docs/screenshots/create-invoice-dark.png) |

### Edit invoice

| Light | Dark |
| :-: | :-: |
| ![Edit — light](./docs/screenshots/edit-invoice-light.png) | ![Edit — dark](./docs/screenshots/edit-invoice-dark.png) |

---

## Architecture

### System overview

```mermaid
flowchart LR
    subgraph Browser
        FE["React SPA<br/>Vite • Tailwind v4 • SWR<br/>Zustand • react-intl"]
    end

    subgraph Server["Backend (Bun)"]
        Nest["NestJS 11<br/>Controllers + Guards"]
        Svc["Services<br/>(auth, invoices)"]
        Drz["Drizzle ORM"]
    end

    DB[("PostgreSQL 17<br/>users • invoices<br/>invoice_items")]
    Swagger[/"Swagger UI<br/>/api/docs"/]

    FE -->|"HTTPS · Bearer JWT<br/>(via Vite proxy in dev)"| Nest
    Nest --> Svc
    Svc --> Drz
    Drz <--> DB
    Nest -.exposes.-> Swagger

    classDef fe fill:#dbeafe,stroke:#3b82f6,color:#0f172a;
    classDef be fill:#dcfce7,stroke:#16a34a,color:#0f172a;
    classDef db fill:#fef3c7,stroke:#d97706,color:#0f172a;
    class FE fe;
    class Nest,Svc,Drz be;
    class DB db;
```

### Frontend module map

```mermaid
flowchart TB
    subgraph App
        Root["App.tsx<br/>(providers + router)"]
        AppLayout["AppLayout<br/>(breadcrumb + sticky chrome)"]
        Sidebar["Sidebar<br/>(collapse + nav)"]
        Routes{Routes}
    end

    subgraph Providers
        Theme["ThemeProvider<br/>(light/dark/system)"]
        Locale["LocaleProvider<br/>(EN/VI/中)"]
        SWRConfig["SWRConfig"]
    end

    subgraph Features["Invoice features"]
        List["InvoicesPage<br/>(SWR list + filters + paging)"]
        Detail["InvoiceDetailPage<br/>(view + delete)"]
        Create["CreateInvoicePage<br/>(react-hook-form + Zod)"]
        Edit["EditInvoicePage<br/>(optimistic update)"]
    end

    subgraph Lib
        ApiTs["lib/api.ts<br/>(fetch wrapper + auth header)"]
        SwrTs["lib/swr.ts<br/>(hooks: list, detail, mutate)"]
        AuthStore["lib/auth.ts<br/>(Zustand + persist)"]
        Shared["@simple-invoice/shared<br/>(types + Zod schemas)"]
    end

    Root --> Theme --> Locale --> SWRConfig --> Routes
    Routes --> AppLayout --> Sidebar
    Routes --> List & Detail & Create & Edit
    List & Detail & Create & Edit --> SwrTs --> ApiTs
    ApiTs --> AuthStore
    Create & Edit --> Shared
```

### Authentication flow

```mermaid
sequenceDiagram
    actor User
    participant FE as React (LoginPage)
    participant Store as Zustand (auth)
    participant BE as NestJS Auth
    participant DB as PostgreSQL

    User->>FE: enter email + password
    FE->>BE: POST /api/auth/login
    BE->>DB: SELECT user WHERE email=$1
    DB-->>BE: { passwordHash, id, ... }
    BE->>BE: bcrypt.compare(password, hash)
    alt valid
        BE->>BE: sign JWT (sub, email, exp)
        BE-->>FE: 201 { accessToken, user }
        FE->>Store: setAuth(token, user) → localStorage
        FE->>User: redirect to /
    else invalid
        BE-->>FE: 401 Unauthorized
        FE->>User: toast.error("Invalid credentials")
    end

    Note over FE,BE: Subsequent requests
    FE->>BE: GET /api/invoices (Authorization: Bearer ...)
    BE->>BE: JwtAuthGuard verifies signature + exp
    BE-->>FE: 200 { data, paging }
```

### Create invoice — request flow

```mermaid
sequenceDiagram
    actor User
    participant Form as CreateInvoicePage
    participant Zod as createInvoiceSchema (shared)
    participant SWR as useCreateInvoice
    participant BE as InvoicesController
    participant Svc as InvoicesService
    participant DB

    User->>Form: fill fields + click Save
    Form->>Zod: validate
    alt invalid
        Zod-->>Form: ZodError
        Form->>User: inline field errors (i18n)
    else valid
        Form->>SWR: trigger(payload)
        SWR->>BE: POST /api/invoices
        BE->>Svc: create(dto, userId)
        Svc->>Svc: check unique invoiceNumber<br/>+ dueDate >= invoiceDate
        Svc->>Svc: calc subTotal / tax / total / balance
        Svc->>DB: TX: INSERT invoice + INSERT line item
        DB-->>Svc: inserted rows
        Svc-->>BE: full invoice + items
        BE-->>SWR: 201 invoice
        SWR->>SWR: revalidate ['invoices', *]
        SWR-->>Form: success
        Form->>User: toast.success + navigate('/')
    end
```

### Soft delete flow

```mermaid
flowchart TD
    A[User clicks 🗑 icon] --> B{Status check<br/>in UI}
    B -- Paid --> X[Icon hidden — no action]
    B -- Draft/Pending --> C[Open confirm dialog]
    C --> D{User confirms?}
    D -- Cancel --> E[Dialog closes]
    D -- Delete --> F[DELETE /api/invoices/:id]
    F --> G{Server checks}
    G -- not found --> H[404]
    G -- already deleted --> H
    G -- status = Paid --> I["400 'Paid invoices cannot be deleted'"]
    G -- ok --> J["UPDATE invoices<br/>SET deleted_at = NOW()<br/>WHERE id = :id"]
    J --> K[204 No Content]
    K --> L[SWR revalidate lists]
    L --> M["Row vanishes from list<br/>+ detail returns 404"]

    classDef ok fill:#dcfce7,stroke:#16a34a;
    classDef err fill:#fee2e2,stroke:#dc2626;
    class K,M,L ok;
    class H,I,X err;
```

### Invoice status state machine

```mermaid
stateDiagram-v2
    [*] --> Draft: POST /invoices<br/>(always saved as Draft)
    Draft --> Pending: PUT (status=Pending)
    Draft --> Paid: PUT (status=Paid)
    Pending --> Paid: PUT (status=Paid)
    Pending --> Overdue: dueDate < today<br/>(derived at read time)
    Overdue --> Paid: PUT (status=Paid)

    Draft --> Deleted: DELETE
    Pending --> Deleted: DELETE
    Overdue --> Deleted: DELETE
    Paid --> Paid: ❌ PUT/DELETE rejected<br/>(400 — immutable)
    Deleted --> Draft: POST /restore<br/>(reverts to DB status)
    Deleted --> Pending: POST /restore
    Deleted --> Deleted: ❌ PUT rejected<br/>(400 — restore first)

    Deleted: deleted_at IS NOT NULL<br/>(hidden from default list,<br/>visible via ?status=Deleted)
```

### Data model

```mermaid
erDiagram
    USERS ||--o{ INVOICES : creates
    INVOICES ||--o{ INVOICE_ITEMS : has

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar fullname
        timestamp created_at
    }
    INVOICES {
        uuid invoice_id PK
        varchar invoice_number UK
        date invoice_date
        date due_date
        enum status "Draft|Pending|Paid"
        varchar customer_name
        varchar customer_email
        numeric invoice_sub_total
        numeric total_tax
        numeric total_discount
        numeric total_amount
        numeric total_paid
        numeric balance_amount
        timestamp created_at
        timestamp deleted_at "NULL = active"
        uuid created_by FK
    }
    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        varchar name
        integer quantity
        numeric rate
    }
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4, shadcn/ui |
| **Data fetching** | SWR (with `keepPreviousData` + optimistic updates) |
| **Forms** | react-hook-form + Zod (shared validators) |
| **i18n** | react-intl (EN / VI / ZH, per-screen JSON catalogs auto-discovered via `import.meta.glob`) |
| **Date picker** | react-day-picker + date-fns |
| **Toasts** | sonner |
| **State** | Zustand (persistent auth store) |
| **Backend** | NestJS 11, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL 17 |
| **Runtime** | Bun (monorepo workspaces) |
| **Auth** | JWT (Passport + @nestjs/jwt), bcrypt |
| **API Docs** | Swagger/OpenAPI (@nestjs/swagger) |
| **Testing** | bun:test (unit + e2e), Playwright (screenshot automation) |

## Feature highlights

- **Server-driven invoice list** — search by invoice # / customer, filter by status (Draft / Pending / Paid / Overdue), date range picker with calendar + 5 presets, sortable columns (3-state ASC → DESC → cleared), URL-persisted state for sharable links.
- **Optimistic updates** — edits to invoice details reflect instantly via SWR `optimisticData`, then reconcile with the server-recalculated totals.
- **Dark mode** — light / dark / system (follows `prefers-color-scheme` live). No-flash theme switch via `useLayoutEffect` + scoped CSS transition.
- **i18n** — English, Tiếng Việt, 中文. JSON files per screen so translation tools (Crowdin, Lokalise, …) consume them directly. Form validation errors are localized too via a Zod-message → i18n-key map.
- **Responsive** — sidebar auto-collapses below 768px (preference persisted), forms collapse to one column on tablet, detail sheet adapts padding/stack on mobile.
- **Sticky chrome** — slim top-level breadcrumb + page bar both stick to the top while content scrolls, with a Sticky Invoice # column on horizontal table scroll.
- **Paid invoices are immutable** — enforced server-side (`400 BadRequestException`) and reinforced across 4 UI layers (edit action hidden in list + detail, save button disabled, edit URL auto-redirects to detail).

## Project structure

```
simple-invoice/
├── apps/
│   ├── be/                    # NestJS backend API
│   │   ├── src/
│   │   │   ├── auth/          # Login + JWT strategy + guards
│   │   │   ├── invoices/      # Controller, service, DTOs
│   │   │   ├── db/            # Drizzle schema, migrations, seed
│   │   │   └── main.ts        # Bootstrap (Swagger + CORS + validation)
│   │   └── test/              # Unit + e2e tests
│   └── fe/                    # React frontend SPA
│       └── src/
│           ├── features/
│           │   ├── auth/      # Login page
│           │   ├── invoices/  # List, detail, create, edit
│           │   └── layout/    # AppLayout, Sidebar, UserDropdown, SettingsDropdown
│           ├── components/ui/ # shadcn primitives + Calendar wrapper
│           ├── lib/
│           │   ├── api.ts     # Centralized fetch wrapper
│           │   ├── auth.ts    # Zustand store (persisted)
│           │   ├── swr.ts     # SWR hooks for invoices
│           │   ├── theme.tsx  # Light/dark/system provider
│           │   ├── i18n/      # LocaleProvider + per-screen JSON
│           │   └── form-error.ts  # Zod → i18n message map
│           └── index.css      # Tailwind v4 theme + dark-mode overrides
├── packages/
│   └── shared/                # Types, Zod schemas, constants — used by FE + BE
├── docs/screenshots/          # README screenshots (regen via scripts/)
├── scripts/screenshots.ts     # Playwright capture script
├── docker-compose.yml
├── Makefile
└── README.md
```

## API documentation

Swagger UI: <http://localhost:4001/api/docs> (when the backend is running).

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Authenticate, return JWT + user |
| `GET` | `/api/auth/me` | ✅ | Current user profile |
| `GET` | `/api/invoices` | ✅ | List with search / status / date range / sort / pagination |
| `GET` | `/api/invoices/:id` | ✅ | Invoice detail with line items |
| `POST` | `/api/invoices` | ✅ | Create invoice (always saved as Draft) |
| `PUT` | `/api/invoices/:id` | ✅ | Update invoice (400 if status = Paid or Deleted) |
| `DELETE` | `/api/invoices/:id` | ✅ | Soft-delete (sets deletedAt; 400 if Paid) |
| `POST` | `/api/invoices/:id/restore` | ✅ | Restore a soft-deleted invoice (clears deletedAt) |

## Available commands

| Command | Description |
|---------|-------------|
| `make setup` | Install deps, start DB, migrate, seed 100 invoices |
| `make dev` | Start both FE and BE dev servers |
| `make dev-be` | Backend only |
| `make dev-fe` | Frontend only |
| `make migrate` | Run database migrations |
| `make seed` | Reseed the database |
| `make test` | Run BE unit + API contract tests |
| `make test-e2e` | Run FE Playwright E2E suite (needs `make dev` running) |
| `make lint` | Lint via Biome |
| `make format` | Format via Biome |
| `make kill` | Kill dev servers on ports 4001 / 3041 |
| `bun run scripts/screenshots.ts` | Regenerate the README screenshots |

## Environment variables

`.env.example` documents the full set. Most users only need to copy it as `.env` and run.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5441/simple_invoice` |
| `BACKEND_PORT` | Backend HTTP port (preferred over `PORT` to avoid collisions with process supervisors) | `4001` |
| `JWT_SECRET` | JWT signing secret | (required in production) |
| `JWT_EXPIRATION` | Token TTL in seconds | `3600` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:3041` |

## Exposed ports

| Service | Port |
|---------|------|
| Frontend (dev — Vite) | `3041` |
| Backend (dev + Docker) | `4001` |
| Frontend (Docker — nginx) | `3041` |
| PostgreSQL | `5441` |

## Design decisions

1. **Monorepo with Bun workspaces** — shared types/validators between FE and BE, single `bun install` brings up everything.
2. **Customer embedded in `invoices` table** — no separate `customers` table. The form collects customer data inline per invoice; embedding avoids join complexity for the assessment scope.
3. **Overdue is derived, not stored** — the DB only persists `Draft`/`Pending`/`Paid`. The backend marks a row as `Overdue` at read time when `status = 'Pending' AND dueDate < CURRENT_DATE`. Same logic is used for both the display badge and the filter, so counts match.
4. **Server-side calculations** — subtotal, tax, discount, total, and balance are computed exclusively by the backend. The FE shows a live preview for UX but the server is the source of truth.
5. **Drizzle ORM + NestJS** — custom `DbModule` injects a Drizzle instance via a `DRIZZLE` symbol provider so services can use `@Inject(DRIZZLE)`.
6. **Money as PostgreSQL `numeric(15,2)`** — exact decimal arithmetic. Drizzle returns strings, which the response mapper parses to floats.
7. **Filter state in URL params** — list filters / sort / pagination are stored in `useSearchParams` so a filtered list is bookmarkable and shareable.
8. **SWR over TanStack Query** — picked for the lighter API surface, native `optimisticData` + `populateCache` mutation flow, and `keepPreviousData` (eliminates the flash on filter changes).
9. **i18n via JSON files per screen** — `messages/<locale>/<screen>.json`. Auto-discovered through `import.meta.glob`; translation tools consume these directly without conversion.
10. **`BACKEND_PORT` env (not `PORT`)** — process supervisors and preview servers commonly inject `PORT` for their own purposes; reading from `BACKEND_PORT` keeps the backend stable when run under e.g. Claude Preview, PM2, or Docker orchestrators that set `PORT`.
11. **Class-based dark mode (Tailwind v4)** — `.dark` on `<html>` flips a small set of CSS variables and a focused override sheet. `useLayoutEffect` applies the class synchronously before paint to eliminate the post-render flash; a scoped `.theme-switching` class enables a 220ms color transition only during the switch.

## Testing

```bash
# Unit tests (calculations, overdue derivation, validation)
cd apps/be && bun test ./test/invoices.service.spec.ts

# E2E tests (requires backend running)
cd apps/be && bun test ./test/app.e2e.spec.ts

# All tests
make test
```

### Coverage

Tests live in three layers:

| Layer | Where | Coverage | Driver |
|-------|-------|----------|--------|
| **Unit (BE)** | `apps/be/test/invoices.service.spec.ts` | Invoice calc correctness (8), Overdue derivation (6), due-date validation (3) | `bun:test` |
| **API contract (BE)** | `apps/be/test/app.e2e.spec.ts` + `invoices.bdd.spec.ts` | 13 traditional endpoint tests + **18 BDD scenarios** (Given/When/Then) covering auth, list filters, create, edit, soft delete, Paid immutability | `bun:test` over the running BE on :4001 |
| **User journey (FE)** | `apps/fe/e2e/*.spec.ts` | **19 Playwright scenarios** covering login (guest), browse/filter/sort/paginate, create→edit→delete lifecycle, theme + locale switching | Playwright Chromium over the running dev stack |

```bash
# BE unit + API contract
make test          # = cd apps/be && bun test

# FE E2E (requires `make dev` running)
make test-e2e      # = cd apps/fe && bun run test:e2e
# or interactive UI mode:
cd apps/fe && bun run test:e2e:ui
```

#### Playwright E2E details

The `apps/fe/e2e/` suite is driven by `playwright.config.ts` with two projects:

- **`guest`** — no shared auth state. Tests the login / signup-style flow, deep-link redirect to /login, and the guest settings dropdown.
- **`authenticated`** — `globalSetup` logs in once as admin and persists the Zustand auth store + cookies to `e2e/.auth/admin.json`; every subsequent spec loads from that storage state so we don't burn ~1s per test re-typing credentials.

Tests run serially (`workers: 1`) because they share a database. Per-test isolation comes from `uniqueInvoiceNumber()` (timestamp + random suffix), not a per-test DB reset. Each lifecycle scenario creates its own invoice, then either deletes it or leaves it behind harmlessly — the seed dataset isn't mutated in a way that matters.

Failures retain trace, screenshot, and video under `e2e/.results/` (gitignored). Trace viewer:

```bash
bunx playwright show-trace apps/fe/e2e/.results/<scenario>/trace.zip
```

## Seed data

`make seed` (or `cd apps/be && bun run db:seed`) populates:

- 1 admin user (`admin@simpleinvoice.com` / `password123`)
- 100 invoices over Jan 2025 – Jun 2026 (≈ 10 pages × 10 rows)
- Distribution: 30% Draft / 40% Pending / 30% Paid — with ~40% of Pending invoices intentionally past-due so the Overdue filter has data
- Three currencies: AUD / USD / GBP

## Screenshot script

`scripts/screenshots.ts` uses Playwright (Chromium headless) to log in, navigate each screen, toggle theme, and save PNGs to `docs/screenshots/`. Used by this README.

Run it whenever the UI changes:

```bash
bun run scripts/screenshots.ts
```

Requires `make dev` (or `make up && make dev`) running so the FE is reachable at `localhost:3041`.

## Known limitations

- Single line item per invoice (matches the assessment spec; schema supports many).
- No password reset or user registration flow.
- No refresh-token rotation — single JWT with a configurable expiry.
- No file attachments on invoices.
