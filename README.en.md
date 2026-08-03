[繁體中文](./README.md)

# Mackay Rehabilitation Data Backend (MackayBackend)

> Data backend for the rehabilitation hardware project by Mackay Memorial Hospital × National Taiwan University of Science and Technology. Rehabilitation devices upload training data via the API, and clinical staff review patients' rehabilitation history and per-attempt records through a web admin dashboard.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [API Documentation](#api-documentation)
8. [Admin Dashboard](#admin-dashboard)
9. [Testing](#testing)
10. [Deployment (Vercel)](#deployment-vercel)
11. [Project Structure](#project-structure)
12. [Notes and FAQ](#notes-and-faq)
13. [Handover Notes](#handover-notes)
14. [Related Documents](#related-documents)

---

## Project Overview

This project is the **data backend** for the rehabilitation hardware project jointly developed by Mackay Memorial Hospital and the National Taiwan University of Science and Technology. It plays two roles at once:

- **Device Data API**: Rehabilitation devices (the hardware side) authenticate with `X-API-Key` and batch-upload each of a patient's training attempts to the backend. The backend automatically maintains the data hierarchy of "patient → daily rehab session → session exercise → individual attempt."
- **Admin Dashboard**: Clinical staff log in to the web dashboard with a username and password, then drill down through the patient list, rehabilitation history, the exercise breakdown of a single session, and the success/failure and sensor data of every attempt.

The entire system is built on the Next.js 14 App Router; a single codebase serves both the API routes and the server-side-rendered (SSR) dashboard pages. The database is PostgreSQL (Neon in production), deployed on Vercel.

> Note in particular: the database's **tables, columns, and enum values are all named in Traditional Chinese** (via Prisma `@map`) — for example, the table `病患` and the column `API金鑰`. See the [Database](#database) section for details.

---

## System Architecture

The system has three layers:

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│   復健裝置（硬體端）          │        │   醫護人員（瀏覽器）          │
│   X-API-Key 認證             │        │   帳號密碼登入 (NextAuth)     │
└──────────────┬──────────────┘        └──────────────┬──────────────┘
               │ HTTPS                                 │ HTTPS
               ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js 14 (App Router)                        │
│                                                                   │
│   裝置 API 層                        管理後台層                     │
│   /api/patients/*                    /  、/patients/*             │
│   /api/sessions/*                    (SSR 後台頁面)               │
│   (X-API-Key)                        /api/admin/*  (NextAuth)     │
│                                                                   │
│   middleware.ts（Edge）：rate limit + API key 存在性 + session gate │
│   route handler（Node.js）：實際 DB 驗證與商業邏輯                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Prisma
                               ▼
              ┌────────────────────────────────┐
              │  PostgreSQL（Neon / 本地 Docker）│
              │  中文命名的資料表與欄位           │
              └────────────────────────────────┘

              ┌────────────────────────────────┐
              │  Upstash Redis（rate limiting） │
              └────────────────────────────────┘
```

**Data flow (device upload)**:

1. The device calls `POST /api/patients/exercise-attempts` with `X-API-Key`, sending an `exerciseCode` and a batch of `attempts`.
2. The Edge middleware first performs rate limiting and an API-key presence check (**without touching the database**, because the Edge runtime cannot run Prisma).
3. The Node.js route handler performs the real authentication via `authenticateApiRequest`, looking up `病患.API金鑰` to obtain the `patientId`.
4. Based on `sessionDate`, the handler upserts that day's `RehabSession` and `RehabSessionExercise`, then batch-inserts the `ExerciseAttempt` records.

**Data flow (dashboard viewing)**:

1. Clinical staff log in at `/login` with a username and password; NextAuth issues a JWT session.
2. The home page `/` obtains the patient list by making a server-side `fetch` to its own `/api/admin/patients` (which requires `role === 'admin'`).
3. The deeper patient sub-pages (rehabilitation history, session details, attempt details) **query Prisma directly** from server components, bypassing the API.

---

## Tech Stack

| Category | Technology | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) | ^14.2.33 | Serves both API routes and SSR dashboard pages; `"type": "module"` (ESM) |
| UI | React / React DOM | ^18.3.1 | Primarily server components |
| Language | TypeScript | ^5.9.3 | `strict: true`, path alias `@/* → ./src/*` |
| ORM | Prisma / @prisma/client | ^6.17.1 / ^6.16.3 | Tables/columns `@map`ped to Traditional Chinese |
| Database | PostgreSQL | Neon (production) / `postgres:15` (local Docker) | provider `postgresql` |
| Dashboard auth | NextAuth | ^4.24.11 | Credentials provider, JWT session |
| Password hashing | bcryptjs | ^2.4.3 | Login uses `compareSync` (synchronous, blocking) |
| Rate limit | @upstash/ratelimit + @upstash/redis | ^2.0.6 / ^1.35.6 | Sliding window, 3 req / 10s |
| Testing | Node built-in `node:test` + tsx | tsx ^4.20.6 | Dependency injection; tests need no database |
| Lint | ESLint + eslint-config-next | ^8.57.0 / ^15.5.4 | Note: the lint config is Next 15, the runtime is Next 14 |

> The Node version is **not pinned in the project** (no `engines`, no `.nvmrc`). Node >= 21 is recommended (because of the glob-expansion behavior of `npm test`; see [Testing](#testing)).

---

## Quick Start

Below are the complete steps to go **from a fresh clone to logging into the dashboard**, each ready to copy and paste.

### Prerequisites

- Node.js (>= 21 recommended, >= 18.17 minimum) and npm
- Docker (local PostgreSQL)
- A set of Upstash Redis credentials (**required even for local development**; see the note below)

> **Why is Upstash needed even locally?** `src/lib/ratelimit.ts` calls `Redis.fromEnv()` at module load time, and `src/middleware.ts` imports it. If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset, `fromEnv()` throws right at load time, causing every route matched by the middleware (`/`, `/login`, `/patients/*`, `/api/patients/*`, `/api/sessions/*`, `/api/admin/*`) to return 500 (`/api/health` and `/api/auth/*` are not in the matcher and still work even without the Upstash env vars). There is no in-memory fallback. Ask the original team for a set of Upstash credentials, or create a free Redis database yourself at [upstash.com](https://upstash.com).

### Step 1: Start local PostgreSQL

```bash
docker compose up -d
```

This starts `postgres:15`, listening on `localhost:5432`, with username/password `user` / `password` and database `localdb`.

> **Wait for the database to be ready**: `docker compose up -d` returning only means the container has *started*; on first launch it still needs to pull the `postgres:15` image and run `initdb`, during which Postgres may not yet accept connections, so running migrate too early will fail. Wait for the database to be ready first:
>
> ```bash
> until docker compose exec -T postgres pg_isready -U user; do sleep 1; done
> ```
>
> (Or just wait about 3–5 seconds on first launch.)

### Step 2: Create `.env`

> **Important**: create `.env` (**not just `.env.local`**). The Prisma CLI and the `tsx` seed scripts only read `.env`, not `.env.local` (see [Environment Variables](#environment-variables) for details). The safest approach is to put every variable into `.env`.

In the project root, create `.env` with the following contents (local Docker version):

```bash
# Local Docker: be sure to remove sslmode — postgres:15 does not support SSL
DATABASE_URL="postgresql://user:password@localhost:5432/localdb?schema=public"

# NEXTAUTH_SECRET: run openssl rand -base64 32 in your terminal, then paste the output inside the quotes below.
# .env is parsed by dotenv and does not run a shell; $(...) is treated as a literal string (see the note below).
NEXTAUTH_SECRET="<paste the output of openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Required — otherwise the middleware crashes at load time
UPSTASH_REDIS_REST_URL="https://<your-db>.upstash.io"
UPSTASH_REDIS_REST_TOKEN="<your-upstash-token>"

# Only needed when running prisma:seed:prod
ADMIN_EMAIL="admin@example.com"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="<choose-a-password>"
ADMIN_NAME="Admin"
SEED_ALLOW_PROD="true"
```

> **Do not** keep `sslmode=require` or `channel_binding=require` in the local Docker `DATABASE_URL` (those are for Neon). Against local `postgres:15` you'll get "The server does not support SSL connections."

> **Generating `NEXTAUTH_SECRET`**: `.env` is parsed by dotenv and **does not run shell command substitution `$(...)`**. If you paste `NEXTAUTH_SECRET="$(openssl rand -base64 32)"` literally into `.env`, the value becomes the literal string `$(openssl rand -base64 32)` — login still works (NextAuth accepts any non-empty secret), but this hard-codes a publicly known key, which is a security risk. The correct approach is to run `openssl rand -base64 32` in your terminal and paste the output inside the quotes; or use a shell append that actually triggers substitution (run in the terminal, not written as `.env` file content): `echo "NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env`.

### Step 3: Install dependencies

```bash
npm install
```

`postinstall` automatically runs `prisma generate`.

### Step 4: Apply the database schema (migration)

```bash
npx prisma migrate deploy
```

This applies the existing `20251029062111_initial_schema`.

> If migrate reports `Can't reach database server at localhost:5432`, Postgres is not ready yet — wait a moment and retry (see "Wait for the database to be ready" in Step 1).

### Step 5: Seed demo data

```bash
npm run prisma:seed
```

`prisma:seed` (`prisma/seed.ts`) **truncates all tables** and then inserts demo data: 5 exercise types, 3 patients, one session with attempts, and one administrator (username `admin` / password `password`). It also prints the `apiKey` of the first patient (王大明) to the console for use in `X-API-Key` testing.

> ⚠️ `prisma:seed` is destructive (`TRUNCATE ... RESTART IDENTITY`). **Never run it against a shared or production database.** For the differences between the three seeds, see [Database](#database).

### Step 6: Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

### Step 7: Log into the dashboard

Go to http://localhost:3000/login and log in with the credentials created by the seed:

- Username: `admin`
- Password: `password`

After logging in you'll see the patient list and can drill down through the rehabilitation data.

---

## Environment Variables

| Variable | Purpose | Example | Required in |
| --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/localdb?schema=public` (local) / Neon with `?sslmode=require` (production) | All |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret | generated by `openssl rand -base64 32` | All (required for dashboard login) |
| `NEXTAUTH_URL` | NextAuth public-facing URL | `http://localhost:3000` (local) / production URL | All |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint | `https://xxx.upstash.io` | All (needed as soon as the middleware loads) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | `<token>` | All |
| `ADMIN_EMAIL` | Admin email created by the prod seed | `admin@example.com` | `prisma:seed:prod` only |
| `ADMIN_USERNAME` | Admin username created by the prod seed | `admin` | `prisma:seed:prod` only |
| `ADMIN_PASSWORD` | Admin password created by the prod seed | `<secret>` | `prisma:seed:prod` only |
| `ADMIN_NAME` | Admin display name (optional, default `Admin`) | `Admin` | `prisma:seed:prod` only (optional) |
| `SEED_ALLOW_PROD` | Flag that permits the prod seed to run | `true` / `false` | Only when running the prod seed while `NODE_ENV != production` |
| `NODE_ENV` | Runtime environment (Prisma log level / global cache / prod-seed gate) | `development` / `production` | Set by the platform (not listed in `.env.example`) |

### The loading difference between `.env` and `.env.local` (important)

The project root has three env files: `.env`, `.env.local`, and `.env.example`. The `.gitignore` rule ignores all `.env*`, with **only `!.env.example` excepted** — so a fresh clone has no `.env` at all, and you must recreate it yourself.

The three execution scenarios load **different** sets of files:

| Scenario | Files loaded | Notes |
| --- | --- | --- |
| Next.js runtime (`next dev` / `build` / `start`) | `.env` + `.env.local` | `.env.local` overrides `.env` (except in the test environment) |
| Prisma CLI (`migrate` / `generate` / `studio` / `postinstall`) | **only `.env`** | Does not read `.env.local`. The `DATABASE_URL` used by all migrations and client generation comes from `.env` |
| tsx seed scripts (`tsx prisma/seed*.ts`) | **only `.env`** | The seeds do not import dotenv; env is loaded as a **side effect** when `new PrismaClient()` is constructed (the Prisma runtime reads the project-root `.env`). This is also why `seed.prod.ts` can read `ADMIN_*` / `SEED_ALLOW_PROD` without importing dotenv |

> **Bottom line**: if you only copy `.env.example → .env.local`, `prisma migrate` and all seeds won't see `DATABASE_URL`. Put your variables (at least `DATABASE_URL`) into `.env`. The safest bet is to put every variable into `.env`.

> Also note: if `.env.local` contains `AUTH_SECRET` (the NextAuth v5 / Auth.js name), this project uses NextAuth **v4**, which only reads `NEXTAUTH_SECRET` (in `.env`); that `AUTH_SECRET` is almost certainly leftover and unused.

---

## Database

### Model overview

There are 10 models in total (5 rehabilitation-domain models, 4 NextAuth adapter models, and `Admin`) plus 3 enums; the table below deliberately collapses the 4 NextAuth models (`User`/`Account`/`Session`/`VerificationToken`) into a single row. The Prisma fields of the **domain models (rehabilitation-related)** are English camelCase but `@map` to Traditional Chinese database column/table names; the **authentication models** (NextAuth adapter + the custom `Admin`) stay in English with no `@map`.

| Prisma model | DB table (`@@map`) | Notes |
| --- | --- | --- |
| `Patient` | `病患` | Patient. `id` is a **String provided by the caller** (like a national ID, not auto-generated); `apiKey` (`API金鑰`) is `@unique @default(cuid())`, i.e. the device's `X-API-Key` |
| `ExerciseType` | `運動類型` | Exercise type; `code` is unique (e.g. `squat`), referenced by devices via `exerciseCode` |
| `RehabSession` | `運動會話` | **One rehab session per patient per day** (`@@unique([patientId, sessionDate])`) |
| `RehabSessionExercise` | `會話運動` | A given exercise within one session (`@@unique([sessionId, exerciseTypeId])`) |
| `ExerciseAttempt` | `運動紀錄` | Individual attempts; `data` (`數據`) is `Json?` free-form sensor data |
| `Admin` | `Admin` | Dashboard administrator; `passwordHash` is bcrypt, `userId` is 1:1 with `User` |
| `User` / `Account` / `Session` / `VerificationToken` | same names (English) | NextAuth v4 adapter schema. Because the session strategy is JWT, `Account`/`Session`/`VerificationToken` are **actually unused** (leftover schema) |

**Relationships (described in words)**:

```
Patient (病患)
  └─ 1:N ─ RehabSession (運動會話)          [onDelete: Cascade]
              └─ 1:N ─ RehabSessionExercise (會話運動)   [onDelete: Cascade]
                          ├─ N:1 ─ ExerciseType (運動類型) [onDelete: Restrict]
                          └─ 1:N ─ ExerciseAttempt (運動紀錄) [onDelete: Cascade]

Admin ─ 1:1 ─ User   (for auth; JWT sessions — DB sessions unused)
```

**Enums** (values are likewise `@map`ped to Chinese):

- `RehabSessionStatus`: `open`(開啟) / `closed`(關閉) / `aborted`(中止)
- `RehabSessionExerciseStatus`: `open`(開啟) / `closed`(關閉) / `aborted`(中止)
- `AttemptOutcome`: `success`(成功) / `fail`(失敗) / `invalid`(無效)

> **GOTCHA**: In the database, the **tables, columns, and enum values are all Traditional Chinese identifiers** (e.g. `病患`, `API金鑰`, `開啟`). Any raw SQL / psql / external tooling must use the Chinese identifiers, quoted, and cannot use Prisma's English field names. The `TRUNCATE` in `seed.ts` hard-codes the Chinese table names — changing any `@@map` will silently break that seed.

### Migration flow

- There is currently only **one** migration: `prisma/migrations/20251029062111_initial_schema/`.
- Apply locally: `npx prisma migrate deploy` (apply the existing migration) or `npx prisma migrate dev` (create a new migration during development; requires a shadow DB).
- Generate the client: `npm run prisma:generate` (`postinstall` also runs it automatically).
- Inspect data: `npm run prisma:studio`.

### Purpose and differences of the three seed scripts

package.json has **no** `"prisma": { "seed": ... }` block, so `npx prisma db seed` **does not work**. You must use the named npm scripts.

| Script | File | Destructive | Creates | Required env | Guardrail |
| --- | --- | --- | --- | --- | --- |
| `npm run prisma:seed` | `prisma/seed.ts` | ⚠️ **Extremely**: `TRUNCATE ... RESTART IDENTITY` empties all tables and resets sequences | 5 exercise types, 3 patients (hard-coded long numeric ids), 1 session + ~24 attempts, admin `admin`/`password` (bcrypt cost 10); prints the patient apiKey | `DATABASE_URL` | **None** |
| `npm run prisma:seed1` | `prisma/seed1.ts` | ⚠️ **High**: `deleteMany` on all tables (does not reset sequences) | 5 patients (short ids), 5 exercise types, 3 days of sessions and attempts per person (fixed timestamps), admin `admin`/`password` (cost 10) | `DATABASE_URL` | **None** |
| `npm run prisma:seed:prod` | `prisma/seed.prod.ts` | ✅ **None** (idempotent `upsert`) | upserts 5 exercise types, upserts the admin from the `ADMIN_*` env vars (bcrypt cost 12) | `DATABASE_URL` + `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` (all three required; missing any throws); `ADMIN_NAME` optional | ✅ Refuses to run unless `NODE_ENV=production` or `SEED_ALLOW_PROD=true` |

> ⚠️ `seed.ts` and `seed1.ts` have **no production guardrail** and will destroy all data, including admin/authentication. For a shared or production database you may **only** use `prisma:seed:prod`.
>
> ⚠️ `prisma/seed.prod.ts` is currently **untracked (not in git)** in this working directory; a fresh clone may not have this file — be sure to include it during handover. See [Handover Notes](#handover-notes).

---

## API Documentation

There are 8 route files and 9 handlers. Two authentication mechanisms: devices use the **`X-API-Key`** header; the dashboard uses the **NextAuth session cookie**.

| Method | Path | Auth | Rate limit | Purpose |
| --- | --- | --- | --- | --- |
| `POST` | `/api/patients/exercise-attempts` | X-API-Key | Middleware only | **Primary upload endpoint**: batch-upload attempts by `exerciseCode`, auto-upserting that day's session hierarchy |
| `GET` | `/api/patients/validate-key` | X-API-Key | ✅ **Double** (see below) | Validate an API key, return the patient's public data `{id,name,dob}` |
| `GET` | `/api/patients` | X-API-Key | Middleware only | Return the caller's full patient record |
| `GET` | `/api/patients/[id]` | X-API-Key + ownership | Middleware only | Return the patient including `sessions`; the key's patientId must equal `id`, otherwise 403 |
| `POST` | `/api/sessions/[sessionId]/exercises/[rehabSessionExerciseId]/attempts` | X-API-Key + ownership | Middleware only | **Legacy upload**: write attempts directly to a known `rehabSessionExerciseId` |
| `GET` | `/api/admin/patients` | NextAuth session (`role==='admin'`) | None | List all patients (including sessions) for the dashboard home page |
| `GET`/`POST` | `/api/auth/[...nextauth]` | NextAuth itself | None | NextAuth Credentials login handler |
| `GET` | `/api/health` | None | None | Liveness / DB check (`SELECT 1`) |

### `X-API-Key` authentication notes

- The header name is `x-api-key` (the code also reads `X-API-Key`, but `Headers.get` is case-insensitive anyway, so that's redundant).
- Verification flow (`src/lib/apiAuth.ts`): read the header → `prisma.patient.findUnique({ where: { apiKey } })` → if found, return `{ patientId }`; if not found, return `401`.
- The API key is `Patient.apiKey` (`API金鑰`), a cuid, **stored in plaintext and compared by value**. Anyone with DB read access holds every device's credentials.
- The Edge middleware **only checks whether the header is present** (the Edge runtime cannot run Prisma); the real DB verification happens inside the Node.js route handler.

### Rate limit numbers

- Engine: Upstash `Ratelimit.slidingWindow(3, "10 s")` → **3 requests / 10 seconds**. Redis key prefix `mackay_backend_ratelimit`.
- The middleware (`src/middleware.ts`) applies to any `/api/*`; the identifier is the `x-api-key` header, else `req.ip`, else `'127.0.0.1'`. Exceeding the limit returns `429` as plain text.
- The `validate-key` handler has **its own separate** rate limit (identifier = `x-forwarded-for[0]` / `x-real-ip` / `cf-connecting-ip` / `'unknown'`), returning `429 {ok:false,error:'Too Many Requests'}` with a `Retry-After` header when exceeded. As a result, `/api/patients/validate-key` is rate-limited **twice** (middleware by key + handler by IP), and may hit 429 earlier.
- ⚠️ The comment in `src/lib/ratelimit.ts` that says "10 requests per 10 seconds" is **wrong**; the real limit is 3.

### curl examples

Device upload (primary endpoint). Replace `<API_KEY>` with the patient's `apiKey` (printed by `npm run prisma:seed`):

```bash
curl -X POST http://localhost:3000/api/patients/exercise-attempts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{
    "exerciseCode": "alternating_knees",
    "sessionDate": "2025-10-10T00:00:00Z",
    "attempts": [
      { "startedAt": "2025-10-10T10:00:01Z", "endedAt": "2025-10-10T10:00:03Z", "outcome": "success", "data": { "angleDeg": 92.5 } },
      { "startedAt": "2025-10-10T10:05:01Z", "outcome": "fail" }
    ]
  }'
# 201 -> {"sessionId":<n>,"sessionExerciseId":<n>,"count":2}
```

Validate an API key:

```bash
curl -i -X GET http://localhost:3000/api/patients/validate-key \
  -H "X-API-Key: <API_KEY>"
# 200 -> {"ok":true,"patient":{"id":"...","name":"...","dob":"..."}}
# 401 -> {"error":"Unauthorized: Invalid API key."}
# 429 (with Retry-After) -> more than 3 requests / 10 seconds
```

Health check (public):

```bash
curl -s http://localhost:3000/api/health
# 200 -> {"ok":true,"status":"ok","latencyMs":<n>}
# 503 -> DATABASE_URL not set
```

> **Primary upload endpoint (#1) vs. legacy (#5)**: #1 validates strictly (checks the outcome enum, the ISO time format, and auto-creates the session hierarchy); #5 is looser (does not check the outcome enum, does not check ISO, and **completely ignores** the `sessionId` route parameter, authorizing solely by the patient the exercise belongs to). **New device code should always use #1.**
>
> ⚠️ `GET /api/patients` (#3) returns the entire patient record, **including `apiKey`**; `validate-key` (#2) deliberately returns only `id/name/dob`.

---

## Admin Dashboard

### How login works

- `/login` (`'use client'`): on mount it fetches a NextAuth CSRF token with `getCsrfToken()`, then renders a plain HTML `<form>` that POSTs to `/api/auth/callback/credentials` with the fields `username` and `password`. CSRF is handled entirely by NextAuth's built-in double-submit-cookie mechanism.
- Auth flow (`src/lib/auth.ts` `authorize`): `prisma.admin.findUnique({ where: { username } })` → `bcrypt.compareSync(password, admin.passwordHash)` → look up `User` → return `{ id, name, email, role: 'admin' }`.
- The session strategy is **JWT** (no DB session adapter); `role` is passed through via the `jwt` → `session` callbacks.

### Navigation levels (drill-down)

| Path | Page | Contents |
| --- | --- | --- |
| `/` | Patient list (home) | Server-side `fetch` to its own `/api/admin/patients`, showing patient names and ages, linking to each patient's rehabilitation history |
| `/patients/[id]/sessions` | Rehabilitation history | Queries Prisma directly, listing the patient's sessions grouped by date |
| `/patients/[id]/sessions/[sessionId]` | Session details | Lists each exercise in that session and its attempt count |
| `/patients/[id]/sessions/[sessionId]/exercises/[rehabSessionExerciseId]` | Attempt details | 3 stat cards (success / failure / success rate) + a dynamic-column table |

> Navigation is a one-way drill-down; the only back component is `BackHomeButton` (`回到首頁`) — there are **no breadcrumbs or back-one-level** controls, so every "back" jumps straight to the home page `/`.
>
> The deep sub-pages **bypass the API and query Prisma directly**, so these pages need `DATABASE_URL` to be reachable at request time, not just the API.

### Dynamic-column mechanism

The columns of the attempt-details table are **generated dynamically from the keys of `ExerciseAttempt.data` (`Json?`)**:

- It walks all attempts and collects the union of each `data` object's `Object.keys()` (in first-seen order); these become the dynamic columns.
- Fixed columns (always first): `ID`, `結果` (outcome), `紀錄時間`.
- The Chinese labels are handled by two local maps in the page: `headerLocalizationMap` (`angleDeg→角度`, `holdSeconds→維持秒數`, `steps→步數`, `deviations→偏移次數`, `reason→原因`) and `outcomeLocalizationMap` (`success→成功`, etc.).
- ⚠️ **Keys not in the mapping are shown verbatim as English column titles** (there is no schema / allowlist). Any key the upstream device writes into `data` becomes a visible column. Adding a key or outcome requires editing that page's file.
- Statistics: `success rate = success / (success + fail) × 100`; `invalid` is not counted in the denominator; when there are 0 records it shows 0%.

---

## Testing

```bash
npm test
```

- Runner: `node --import tsx --test tests/**/*.test.ts`, using the built-in `node:test` + `node:assert/strict`.
- 3 test files, 9 tests in total:

| Test file | Coverage |
| --- | --- |
| `tests/patients-route.test.ts` | `GET /api/patients` (200 / 401 / 404) + the admin-role check for admin patients (200 / 403); 4 in total |
| `tests/exercise-attempts-route.test.ts` | `POST exercise-attempts` happy path (201, session hierarchy) + invalid `exerciseCode` (400); 2 in total |
| `tests/validate-key-route.test.ts` | validate-key 200 / 401 forward / 429 rate limit; 3 in total |

### Dependency injection (DI) lets tests run without a database

Every testable route provides a `create*Handler(deps = defaultDeps)` factory function (in `handler.ts`), and the corresponding `route.ts` is just a thin `export const GET/POST = create*Handler()` using the real `defaultDeps`. In tests you inject **fully mocked** `prismaClient` / `authenticateRequest` / `rateLimiter` / `ensureSession`, etc., and call the handler directly with a single `new Request(...)` — **no Next server, no database, and no env vars required**. It's verified that `npm test` passes 9/9 with no database and no env.

> ⚠️ **GOTCHA (test glob)**: `tests/**/*.test.ts` is expanded by `node --test`, which requires **Node >= 21**. On Node 18/20 it may match zero files and "silently pass." The test files are actually flat under `tests/`, so the portable form should be `tests/*.test.ts`.

---

## Deployment (Vercel)

### 1. Provision external services

- **Database (Neon)**: create a PostgreSQL project and obtain the connection string. In production, **keep** `?sslmode=require` (Neon requires it).
- **Redis (Upstash)**: create a Redis database and obtain `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 2. Vercel environment variables

Set them under Vercel Project Settings → Environment Variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon connection string (with `sslmode=require`) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL (**not** localhost) |
| `UPSTASH_REDIS_REST_URL` | Upstash URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |
| (if you run the prod seed as a deployment step) `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` / `SEED_ALLOW_PROD` | See [Environment Variables](#environment-variables) |

### 3. CI/CD behavior

- This project has **no `vercel.json`, no `.vercelignore`, and no `.github/` CI**. "CI/CD" = Vercel's Git integration.
- Vercel's default flow: `npm install` (triggers `postinstall` → `prisma generate`) → Build Command `next build`. `postinstall` is what keeps the Prisma client valid on every fresh install on Vercel — **do not remove it**.
- ⚠️ **GOTCHA (migrations do not run automatically)**: Vercel does **not** run `prisma migrate deploy` automatically (nothing is wired up to do so). To apply migrations at deploy time, change Vercel's **Build Command to** `prisma migrate deploy && next build`. Otherwise schema changes will never reach the database.
- All 4 dashboard pages set `export const dynamic = "force-dynamic"` (the home page additionally sets `revalidate = 0`), deliberately forcing SSR and avoiding Vercel's build-time static optimization / DB calls.

### 4. Production seeding

The production database may **only** be seeded with the idempotent `seed.prod.ts`:

> **Prerequisite**: confirm that `prisma/seed.prod.ts` is committed to the repo (a clean clone does **not** have this file by default; see [Handover Notes](#handover-notes)). If the file is missing, `npm run prisma:seed:prod` fails immediately with a tsx "cannot find `prisma/seed.prod.ts`" error, so the admin account is never created and no one can log into the deployed dashboard.
>
> **Where to run it**: this step must be **run locally** — the Vercel build does **not** seed automatically. Point `DATABASE_URL` at Neon and first `export ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` (`ADMIN_NAME` optional).

```bash
# Prerequisite: prisma/seed.prod.ts is committed to the repo (a clean clone does not have it by default)
# Run locally; point DATABASE_URL at Neon and export ADMIN_EMAIL/ADMIN_USERNAME/ADMIN_PASSWORD first
SEED_ALLOW_PROD=true npm run prisma:seed:prod
# Or run directly in an environment where NODE_ENV=production
```

- It upserts 5 exercise types and one admin (from the `ADMIN_*` env vars, bcrypt cost 12), and **does not** wipe any data.
- Guardrail: unless `NODE_ENV=production` or `SEED_ALLOW_PROD=true`, it throws and refuses to run — to prevent accidentally running the production seed in the wrong environment.
- **Never** run `prisma:seed` or `prisma:seed1` against a production/shared database (both wipe all data).

---

## Project Structure

```
MackayBackend/
├── docker-compose.yml          # Local postgres:15 (user/password/localdb)
├── next.config.mjs             # Only reactStrictMode: true (no custom rewrites/headers)
├── package.json                # scripts / dependencies; type: module
├── tsconfig.json               # strict, path alias @/* → ./src/*
├── .env.example                # env template (the only env file in git)
├── prisma/
│   ├── schema.prisma           # 10 models + 3 enums, Chinese @map
│   ├── migrations/
│   │   └── 20251029062111_initial_schema/
│   ├── seed.ts                 # Destructive dev seed (TRUNCATE)
│   ├── seed1.ts                # Destructive dev seed (deleteMany)
│   └── seed.prod.ts            # Production idempotent seed (untracked!)
├── src/
│   ├── middleware.ts           # Edge: rate limit + API-key presence + session gate
│   ├── app/
│   │   ├── layout.tsx          # Root layout (note <html lang="en"> while the UI is all zh-TW)
│   │   ├── globals.css
│   │   ├── page.tsx            # Home: patient list (fetch /api/admin/patients)
│   │   ├── login/              # Login page (client component) + style.css
│   │   ├── patients/[id]/sessions/...   # Drill-down dashboard pages (query Prisma directly)
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── admin/patients/{route,handler}.ts
│   │       ├── patients/{route,handler}.ts
│   │       ├── patients/[id]/route.ts
│   │       ├── patients/validate-key/{route,handler}.ts
│   │       ├── patients/exercise-attempts/{route,handler}.ts
│   │       └── sessions/[sessionId]/exercises/[rehabSessionExerciseId]/attempts/route.ts
│   ├── components/
│   │   └── BackHomeButton.tsx  # The only component (back to home)
│   └── lib/
│       ├── prisma.ts           # PrismaClient singleton (global cache)
│       ├── auth.ts             # NextAuth authOptions + GET/POST
│       ├── apiAuth.ts          # authenticateApiRequest (X-API-Key)
│       ├── ratelimit.ts        # Upstash ratelimit singleton (needs env at load time)
│       └── rehabSessions.ts    # ensureDailySession / ensureSessionExercise (DI)
├── tests/                      # 3 test files, DI mocks, no DB needed
├── types/bcryptjs.d.ts         # Hand-written types (@types/bcryptjs not installed)
├── AGENTS.md / GEMINI.md       # Notes for AI tools
└── 5.4_API數據網頁後台.md       # System design chapter (academic report)
```

---

## Notes and FAQ

- **Upstash is a hard dependency (a fresh clone will crash)**: `src/lib/ratelimit.ts` calls `Redis.fromEnv()` at import time; if the Upstash env vars are missing, every route matched by the middleware (`/`, `/login`, `/patients/*`, `/api/patients/*`, `/api/sessions/*`, `/api/admin/*`) returns 500 — but `/api/health` and `/api/auth/*` are not in the matcher and still work even without the env. It must be set locally too.
- **`.env` vs `.env.local` loading difference**: the Prisma CLI and the seeds read only `.env`; the Next runtime reads both. Put your variables in `.env`. See [Environment Variables](#environment-variables) for details.
- **SSL with local Docker**: `.env.example` carries `sslmode=require` (for Neon). For local `postgres:15` you must remove `sslmode` / `channel_binding`, otherwise the connection fails.
- **Edge runtime limitation**: the middleware runs on Edge and cannot use Prisma (no TCP socket), so it only does an API-key **presence** check; the real DB verification is in the Node.js route handler (`authenticateApiRequest`). No API route sets `export const runtime = 'edge'`.
- **`force-dynamic` is only on pages, not the API**: `src/app/page.tsx` and the three patient sub-pages set `force-dynamic` (commit `c9ed7de`) to fix the "patients/sessions added after the build return 404" problem. API routes set **no** `dynamic`/`runtime`/`revalidate` (but since they read headers/DB, Next already treats them as dynamic).
- **Time zones**: every human-facing date/time hard-codes `timeZone: 'Asia/Taipei'` (`toLocaleDateString/TimeString('zh-TW', ...)`). But the home page's `calculateAge()` uses the server's local time zone via `new Date()` — if the server is not in the Taipei time zone, the age may be off by a day around birthdays. The session list groups by `.toISOString()` (UTC) but shows labels in Taipei time, so sessions crossing the UTC/Taipei midnight boundary may be grouped/labeled inconsistently.
- **Two coexisting upload paths**: `#1 /api/patients/exercise-attempts` (strict) and `#5 /api/sessions/.../attempts` (loose, ignores `sessionId`) both write `ExerciseAttempt`, with different validation strictness. Use #1 for new devices.
- **`/api/patients` leaks the apiKey**: #3 returns the whole record including `apiKey`; #2 validate-key deliberately returns only the allowlisted fields.
- **The API key is plaintext**: `Patient.apiKey` (`API金鑰`) is not hashed and is compared by value; anyone with DB read access holds every device's credentials.
- **Admin routes are protected only by the handler**: the middleware does not gate `/api/admin/*`; protection lives in the handler's `getServerSession` + `role==='admin'`. Any new `/api/admin/*` that forgets this check is completely unprotected.
- **Rate limiting is aggressive (3 / 10s)**: real devices trip 429 easily. `req.ip` is `undefined` on some Next 14 hosts, falling back to the shared `'127.0.0.1'` bucket, which effectively rate-limits anonymous API traffic globally.
- **JWT strategy, orphaned schema**: the `Account`/`Session`/`VerificationToken` in the schema are unused because of the JWT strategy; don't assume there are DB sessions.
- **bcrypt is synchronous/blocking**: login uses `compareSync` and the seeds use `hashSync`, blocking the event loop on every call.
- **`prisma db seed` doesn't work**: package.json has no `prisma.seed` block, so you can only use the named scripts (`prisma:seed` / `prisma:seed1` / `prisma:seed:prod`).
- **The test glob requires Node >= 21**: see [Testing](#testing).
- **`<html lang="en">` but the UI is entirely Traditional Chinese**: the `lang` attribute in `src/app/layout.tsx` is `en`, while the actual on-screen text is all `zh-TW`.
- **The (old) README's claim about automatic Vercel migrations is wrong**: Vercel does not run `prisma migrate deploy` automatically; see [Deployment](#deployment-vercel).

---

## Handover Notes

- **External-service accounts must be transferred separately**: access to the three accounts — Vercel, Neon, Upstash — must be handed over separately by the original team; or provision a brand-new Neon database and Upstash Redis yourself per the [Deployment (Vercel)](#deployment-vercel) section.
- **`prisma/seed.prod.ts` is currently not in git (untracked)**: production seeding depends on this file, and a fresh clone may not have it. During handover, be sure this file is included or committed to the repo.
- **Rotate all secrets**: before handover, rotate all existing secrets — the Neon database password, `NEXTAUTH_SECRET`, the Upstash token, and the existing admin password. If the working directory's `.env` contains the production Neon connection and live credentials, do not leak it, and replace them immediately after handover.
- **The local `.env` may point to remote Neon by default**: make sure the `.env` used for local development points to local Docker (`localhost:5432`), to avoid accidentally running a destructive seed against the production database.
- **The Node version is not pinned**: the project has no `engines` / `.nvmrc`. It's recommended that the team standardize on Node >= 21 (see [Testing](#testing)). If you need to pin a version, confirm with the original team.

---

## Related Documents

- [`5.4_API數據網頁後台.md`](./5.4_API數據網頁後台.md): a chapter from the academic report, fully describing the three-tier architecture, the data model, endpoint specs, the dashboard drill-down UX, the security model of the two-layer authentication and rate limiting, and the deployment / CI notes. Useful as extended reading and background for this README.
- `AGENTS.md` / `GEMINI.md`: notes for AI development tools; `GEMINI.md` has an important architectural note — because the Edge runtime cannot use Prisma in the middleware, DB verification must happen inside the route handler.