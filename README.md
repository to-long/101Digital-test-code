# SimpleInvoice

Full-stack invoice management application built for the 101 Digital Web Engineer Assessment v2.3.1.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS 4, shadcn/ui |
| Backend | NestJS 11, TypeScript, Drizzle ORM |
| Database | PostgreSQL 17 |
| Runtime | Bun (monorepo workspaces) |
| Auth | JWT (Passport + @nestjs/jwt), bcrypt |
| API Docs | Swagger/OpenAPI (@nestjs/swagger) |
| Testing | bun:test |

## Project Structure

```
simple-invoice/
├── apps/
│   ├── be/          # NestJS backend API
│   └── fe/          # React frontend SPA
├── packages/
│   └── shared/      # Shared types, validators, constants
├── docker-compose.yml
├── Makefile
└── README.md
```

Monorepo approach — single repo with Bun workspaces for shared code between frontend and backend.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

## Quick Start (Local Development)

```bash
# 1. Clone and install
git clone <repo-url> && cd simple-invoice
cp .env.example .env
make setup    # installs deps, starts DB, runs migrations, seeds data

# 2. Start dev servers
make dev      # backend on :3000, frontend on :5173
```

Open http://localhost:5173 in your browser.

## Docker (Production)

```bash
docker compose up --build
```

This starts PostgreSQL, backend, and frontend. The app is available at http://localhost:80.

After containers are up, run migrations and seed:

```bash
docker compose exec backend bun run apps/be/src/db/migrate.ts
docker compose exec backend bun run apps/be/src/db/seed.ts
```

## Default Credentials

| Email | Password |
|-------|----------|
| admin@simpleinvoice.com | password123 |

## API Documentation

Swagger UI is available at http://localhost:3000/api/docs when the backend is running.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | No | Authenticate, return JWT |
| GET | /api/auth/me | Yes | Current user profile |
| GET | /api/invoices | Yes | List with search/filter/sort/pagination |
| GET | /api/invoices/:id | Yes | Invoice detail |
| POST | /api/invoices | Yes | Create invoice |

## Available Commands

| Command | Description |
|---------|-------------|
| `make setup` | Install deps, start DB, migrate, seed |
| `make dev` | Start both FE and BE dev servers |
| `make dev-be` | Start backend only |
| `make dev-fe` | Start frontend only |
| `make migrate` | Run database migrations |
| `make seed` | Seed database with sample data |
| `make test` | Run all tests |
| `make lint` | Lint codebase |
| `make format` | Format codebase |
| `make kill` | Kill dev servers on ports 3000/5173 |

## Seed Script

```bash
# Standalone
cd apps/be && bun run db:seed

# Or via Makefile
make seed
```

Seeds 1 admin user and 36 invoices with varied statuses, dates, amounts, and customers.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgres://postgres:postgres@localhost:5432/simple_invoice |
| PORT | Backend port | 3000 |
| JWT_SECRET | JWT signing secret | (required in production) |
| JWT_EXPIRATION | Token TTL in seconds | 3600 |
| FRONTEND_URL | CORS allowed origin | http://localhost:5173 |

## Exposed Ports

| Service | Port |
|---------|------|
| Frontend (dev) | 5173 |
| Backend | 3000 |
| Frontend (Docker) | 80 |
| PostgreSQL | 5432 |

## Design Decisions

1. **Monorepo with Bun workspaces** — shared types/validators between FE and BE, single install.
2. **Customer embedded in invoices table** — no separate customers table. The assessment form collects customer data inline per invoice; embedding avoids unnecessary join complexity.
3. **Overdue is derived, not stored** — the DB only persists Draft/Pending/Paid. The backend computes Overdue at read time when `status != 'Paid' AND dueDate < today`.
4. **Drizzle ORM with NestJS** — custom `DbModule` bridges Drizzle into NestJS DI via a `DRIZZLE` symbol provider.
5. **Money as PostgreSQL `numeric(15,2)`** — exact decimal arithmetic; Drizzle returns strings, parsed to floats in the response mapper.
6. **Server-side calculations** — subtotal, tax, total, and balance are calculated exclusively by the backend. Frontend shows a live preview for UX but the server is the source of truth.
7. **Filter state in URL params** — invoice list filters/sort/pagination are stored in URL search params for bookmarkability.

## Testing

```bash
# Unit tests (calculations, overdue derivation, validation)
cd apps/be && bun test ./test/invoices.service.spec.ts

# E2E tests (requires backend running)
cd apps/be && bun test ./test/app.e2e.spec.ts

# All tests
make test
```

### Test Coverage

- **17 unit tests**: invoice calculations (8), overdue derivation (6), due date validation (3)
- **13 E2E tests**: auth flow (4), invoice CRUD (9) including error cases

## Known Limitations

- Only one line item per invoice (as per assessment spec; data model supports multiple)
- No invoice editing or deletion (not required by spec)
- No password reset or user registration
- No refresh token mechanism (single JWT with configurable expiry)
