# ReTeam

ReTeam is the remotely maintained operating system for an **AI real estate company**.

Real estate agents buy a pre-trained AI workforce. They do not receive PDFs of prompts. Instead they receive one **private, tokenized installation URL** and hand it to an AI Chief of Staff running in an external agent environment (Grok / GrokBot or similar). The Chief of Staff fetches its operating instructions from ReTeam, onboards the Realtor, discovers the factory-trained AI employees, and retrieves each employee's current published operating manual on demand.

V1 proves exactly one thing: *an external AI agent, given only the installation link, can retrieve the operating system and employee manuals and behave as the Chief of Staff.*

---

## Architecture

```
┌──────────────────┐   bootstrap prompt    ┌──────────────────────────────┐
│  Realtor         │ ─────────────────────▶│  AI Chief of Staff (GrokBot) │
└──────────────────┘                       └──────────────┬───────────────┘
                                                          │ HTTPS GET (token in URL)
                                                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  ReTeam (Next.js 16, TypeScript)                                         │
│                                                                          │
│  /install/[token]            human install page (copy bootstrap prompt)  │
│  /api/install/[token]        bootstrap manifest ─┐                       │
│      /company                Chief of Staff manual │ machine-readable    │
│      /standards              Global Operating Standards │ operating      │
│      /employees              employee catalog          │ library         │
│      /employees/[slug]       published employee manual │                 │
│      /profile                Realtor profile (GET/PUT) │                 │
│      /updates                current version numbers  ─┘                 │
│                                                                          │
│  /admin/*                    owner admin (customers, licenses, manuals)  │
│                                                                          │
│  Drizzle ORM ──▶ Neon Postgres (serverless HTTP driver)                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Stack:** Next.js 16 (App Router, server actions), TypeScript, Tailwind CSS v4, Drizzle ORM, Neon Postgres via `@neondatabase/serverless`, Zod, Vitest (+ PGlite for in-process Postgres in tests and local development).

**Key directories**

| Path | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle schema (source of truth for the database) |
| `drizzle/` | Generated SQL migrations (`npm run db:generate`) |
| `src/lib/tokens.ts` | Token generation, hashing, validation |
| `src/lib/licenses.ts` | Issue / revoke / rotate / resolve installation tokens |
| `src/lib/documents.ts` | Versioned Chief of Staff manual and Global Standards |
| `src/lib/employees.ts` | Employee catalog and versioned employee manuals |
| `src/lib/install/` | Installation API guard, URL builder, response shapes |
| `src/app/api/install/[token]/` | Installation API route handlers |
| `src/app/install/[token]/` | Human installation page |
| `src/app/admin/` | Owner admin pages and server actions |
| `src/content/` | Seed content: factory employees, Chief of Staff manual v1, standards v1 |
| `scripts/` | `migrate`, `seed`, `issue-token` |
| `tests/` | Vitest suite (runs against real migrations on PGlite) |
| `neon.ts` | Neon config-as-code policy (`neon deploy`) |

---

## Local setup

Requirements: Node.js 22+, npm.

```bash
npm install
cp .env.example .env.local        # fill in values (see below)
npm run db:migrate                # apply ./drizzle migrations
npm run db:seed -- --with-test-customer
npm run token:test                # prints a one-time installation URL
npm run dev                       # http://localhost:3000
```

### Run locally without Neon (embedded database)

For development you can point `DATABASE_URL` at an embedded PGlite database. Migrations are applied automatically on first connection.

```
DATABASE_URL=pglite://.pglite-dev
```

This mode is refused when `NODE_ENV=production`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Neon Postgres connection string (`postgresql://…?sslmode=require`) or `pglite://<dir>` for local dev |
| `APP_URL` | yes in production | Public base URL, no trailing slash. Used to build installation URLs and resource links |
| `ADMIN_PASSWORD` | yes | Owner admin password |
| `ADMIN_SESSION_SECRET` | yes | Random secret (≥32 bytes) that signs the admin session cookie and salts IP hashes in access logs |

Never commit `.env`, `.env.local` or real values. `.env.example` documents the shape only.

---

## Neon setup

The Neon project for production is `flat-silence-65078530`, branch `production`.

```bash
npm i -g neon@latest
neon auth                                   # browser login (once)
neon skills -y                              # agent skills (already committed under .claude/skills)
neon mcp -y                                 # Neon MCP server for coding agents
neon link --project-id flat-silence-65078530 --branch production -y
neon config init                            # neon.ts already exists; safe to re-run
neon connection-string production           # -> DATABASE_URL for .env.local / Vercel
```

`neon.ts` is the config-as-code policy (`defineConfig({})` = project defaults). Apply it with:

```bash
neon deploy
```

### Database migration / deploy process

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` — drizzle-kit writes a new SQL file into `drizzle/`.
3. Review the SQL, commit it.
4. `npm run db:migrate` — applies pending migrations to `DATABASE_URL` (Neon or PGlite). Migrations are tracked in `drizzle.__drizzle_migrations`.
5. `neon deploy` — applies the `neon.ts` branch policy.

Run migrations against the production branch before deploying application code that depends on them.

### Seed process

```bash
npm run db:seed                       # factory content only (idempotent)
npm run db:seed -- --with-test-customer
```

The seed:

- upserts the five factory employees' metadata (never touches manual content once a version exists);
- publishes a **placeholder** manual v1 for any employee with no versions, clearly marked `DEVELOPMENT PLACEHOLDER — replace with factory-tested operating manual before production sales.`;
- publishes the Chief of Staff manual v1 and Global Operating Standards v1 if none exist.

Real employee manuals are pasted into the admin area as new versions and published from there.

---

## Admin access

Admin lives at `/admin`. Authentication is deliberately simple for V1:

- one owner password from `ADMIN_PASSWORD`;
- on success an HMAC-SHA256 signed, expiring (7 days) `httpOnly` cookie is set, keyed by `ADMIN_SESSION_SECRET`;
- the request proxy (`src/proxy.ts`) redirects unauthenticated `/admin/*` requests to `/admin/login`;
- every server action re-verifies the cookie (`requireAdmin()`), so a forged POST cannot bypass the proxy;
- failed logins are delayed 400 ms.

Rotate the password by changing the env var; rotate sessions by changing the secret.

Admin capabilities:

| Area | Actions |
|---|---|
| Customers | create, list, disable / re-enable |
| Licenses | generate installation token (shown once), revoke, rotate, copy URL and bootstrap prompt, see access log |
| Employees | edit metadata, create manual draft, save draft, publish, version history |
| Chief of Staff manual | new version, draft/publish, history |
| Global standards | new version, draft/publish, history |

---

## Generating a test customer and token

Either:

```bash
npm run db:seed -- --with-test-customer
npm run token:test          # creates the test customer if needed, prints URL once
```

or in admin: **Customers → New customer → Generate installation token**.

For any existing customer: `npm run token:issue -- --email realtor@example.com`.

Raw tokens are printed/shown once and never stored.

---

## Testing the installation API

```bash
TOKEN=rt_…                     # from token:test
BASE=http://localhost:3000

curl -s $BASE/api/install/$TOKEN | jq .                 # manifest
curl -s $BASE/api/install/$TOKEN/company | jq .version
curl -s $BASE/api/install/$TOKEN/standards | jq .version
curl -s $BASE/api/install/$TOKEN/employees | jq '.employees[].slug'
curl -s $BASE/api/install/$TOKEN/employees/listing-appointment-manager | jq .manual.version
curl -s $BASE/api/install/$TOKEN/updates | jq .
curl -s -X PUT -d '{"name":"Jordan"}' $BASE/api/install/$TOKEN/profile | jq .saved

# Non-browser clients requesting the human URL get the manifest too:
curl -s -H 'Accept: application/json' $BASE/install/$TOKEN | jq .schema
```

Invalid, revoked, or disabled-customer tokens all return the same `404` body and no content.

Every response is self-describing: `what_this_is`, `instructions` / `how_to_use`, `resources` with absolute URLs, version numbers, and `next_action`.

### Testing with GrokBot

1. Open `/admin`, create a customer, generate an installation token, copy the bootstrap instruction (or open the `/install/<token>` page and press **Copy instruction**).
2. Create a brand-new Chief of Staff agent in GrokBot with web access.
3. Send it only the bootstrap instruction:

   ```
   You are my AI Chief of Staff. I want you to help build and manage my AI real estate company.

   Your private ReTeam operating system is available here:

   https://<your-domain>/install/<token>

   Read the operating instructions there completely, follow them, and begin my onboarding.
   ```

4. Expected behavior: it fetches the manifest, then the company manual, standards and employee catalog; introduces itself as the Chief of Staff; asks onboarding questions one at a time; after onboarding says the company is ready and offers listing appointment / new listing / open house / content / property website / something else; when asked about a listing appointment it fetches the Listing Appointment Manager manual before working.
5. Watch **Customers → (customer) → Recent access** in admin to confirm each resource was fetched.

---

## Security model

- **Tokens:** 32 random bytes (`crypto.randomBytes`) as base64url with an `rt_` tag — 256 bits of entropy, URL-safe, no customer data.
- **Storage:** only the SHA-256 hash and an 11-character display prefix are stored. The raw token is shown once at issue time.
- **Validation:** syntactic check → hash lookup → constant-time hash compare → license must be `active` → customer must be `active`.
- **Uniform failure:** malformed, unknown, revoked and disabled all yield the identical `404` body. Nothing indicates whether a customer exists.
- **Revocation / rotation:** licenses can be revoked or rotated (old revoked, new issued, link recorded). Disabling a customer refuses all their tokens immediately.
- **Drafts never leak:** only `published` versions are served; drafts and superseded versions are admin-only.
- **Rate limiting:** in-memory per-IP limits (120 requests/min, 20 failed lookups/min) — best effort per instance, no extra infrastructure.
- **Access logs:** resource type, salted IP hash, truncated user agent. Raw IPs and tokens are never stored or logged by the app. `redactTokens()` is available for any custom logging.
- **Headers:** `Cache-Control: no-store`, `X-Robots-Tag: noindex`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`.
- **Not DRM:** a customer can still share their link. The goal is to prevent casual public access, make links revocable and keep instructions centrally maintained.

---

## Deployment

Any Node.js host works; Vercel is the simplest.

1. Create the Vercel project from this repository.
2. Set environment variables: `DATABASE_URL` (Neon pooled connection string for the `production` branch), `APP_URL` (e.g. `https://app.reteam.ai`), `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
3. Run migrations and seed once from your machine against the production `DATABASE_URL`:
   ```bash
   npm run db:migrate && npm run db:seed
   ```
4. Deploy (`vercel --prod` or push to the production branch).
5. `neon deploy` to apply `neon.ts`.
6. Open `https://<APP_URL>/admin`, create a customer, generate a token, run the GrokBot test.

`npm run check` runs typecheck, lint, tests and the production build.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / start |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (PGlite, real migrations) |
| `npm run check` | typecheck + lint + test + build |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |
| `npm run db:seed [-- --with-test-customer]` | Seed factory content |
| `npm run db:setup` | migrate + seed |
| `npm run token:test` | Issue a token for the test customer |
| `npm run token:issue -- --email <email>` | Issue a token for a customer |

---

## Data model

| Table | Notes |
|---|---|
| `customers` | email (unique), name, company_name, status `active/disabled` |
| `licenses` | customer_id, `token_hash` (unique), `token_prefix`, status `active/revoked`, activated_at, revoked_at, last_accessed_at, replaced_by_license_id |
| `employees` | slug, name, description, category, `employee_type` `factory/custom`, `owner_customer_id` (null for factory), status, current_version, trigger_examples (jsonb), input/output summaries, sort_order |
| `employee_manual_versions` | employee_id, version, content, status `draft/published/superseded`, change_notes, published_at |
| `chief_of_staff_manual_versions` | version, content, status, change_notes, published_at |
| `global_standard_versions` | version, content, status, change_notes, published_at |
| `customer_profiles` | customer_id (unique), profile_json (jsonb) |
| `access_logs` | license_id, resource_type, resource_identifier, ip_hash, user_agent |

**Custom employees (future AI Hiring System):** live in the same `employees` table with `employee_type = 'custom'` and `owner_customer_id` set. They are only visible to their owner, use the same manual versioning, and slugs are unique per owner. No builder UI exists in V1 by design.

**Versioning rule:** exactly one `published` version per document; publishing a draft marks the previous published version `superseded`. Nothing is ever overwritten or deleted.
