# SimpleInvoice

Full-stack invoice management application built for the **101 Digital Web Engineer Assessment v2.3.1**.

A polished invoice CRUD app with auth, search/filter/sort/pagination, dark mode, and i18n (English / Tiếng Việt / 中文).

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

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

## Quick start (local development)

```bash
# Clone & install
git clone <repo-url> && cd simple-invoice
cp .env.example .env

# One-shot: install deps, start DB, run migrations, seed 100 invoices
make setup

# Start FE + BE concurrently (with hot reload on both)
make dev
```

Open <http://localhost:3041> and sign in with the default credentials below.

## Docker (production)

```bash
docker compose up --build
```

This starts PostgreSQL, the backend, and an nginx-served production frontend bundle. The app is available at <http://localhost:3041>.

After containers are up, run migrations and seed once:

```bash
docker compose exec backend bun run apps/be/src/db/migrate.ts
docker compose exec backend bun run apps/be/src/db/seed.ts
```

## Default credentials

| Email | Password |
|-------|----------|
| `admin@simpleinvoice.com` | `password123` |

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
| `PUT` | `/api/invoices/:id` | ✅ | Update invoice (400 if status = Paid) |

## Available commands

| Command | Description |
|---------|-------------|
| `make setup` | Install deps, start DB, migrate, seed 100 invoices |
| `make dev` | Start both FE and BE dev servers |
| `make dev-be` | Backend only |
| `make dev-fe` | Frontend only |
| `make migrate` | Run database migrations |
| `make seed` | Reseed the database |
| `make test` | Run all tests (BE unit + e2e) |
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

- **Unit**: invoice calculation correctness (8 cases), Overdue derivation (6 cases), due-date validation (3 cases)
- **E2E**: full login → list → create → detail → update flow (13 cases) including 400/401/404 error paths

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
