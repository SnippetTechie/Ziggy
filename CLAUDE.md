# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Ziggy** is an **Online Inventory and Stock Management System** for small businesses, college laboratories, and campus stores (a college project). It manages products, categories, suppliers, stock purchases (stock in) and issues (stock out), with automatic quantity updates, low-stock alerts, inventory summaries, and transaction history. Default currency INR (informational only).

> **Scope correction (October 2026).** Earlier specs added a consumer storefront (shop, cart, checkout, delivery, shopper accounts, customer-order fulfilment). That was a misreading of the problem statement. It is **superseded and out of scope** — do not build, extend, or link to it. Existing shop/order wireframes are obsolete code awaiting a focused cleanup (listed in `TEAM_HANDOFF.md` §10).

Required demonstration: **Admin login → add products → record stock in/out → quantities update → low-stock alerts → reports.**

Three role-based dashboards in **one** app, sharing identity, database, inventory services, and design system (not three apps). Roles nest: `ADMIN` ⊇ `STAFF` ⊇ `USER`. `USER` is a *proposed interpretation* of the third dashboard.
- **USER** — read-only inventory viewer (default): search/filter products, check availability. No cart, no checkout, no stock changes.
- **STAFF** — operations: record stock in/out, review movement history and low-stock items.
- **ADMIN** — manage products, categories, suppliers, members; stock operations; alerts, summaries, reports.

No super-admin platform and no supplier dashboard.

**Start with [`TEAM_HANDOFF.md`](TEAM_HANDOFF.md)** — corrected MVP, the one permissions matrix, route/API contracts, ownership, and checklist.

**Current state (honest status):** Phase 1 in progress. Installed and working: Next.js 16 scaffold, Tailwind 4, ESLint, Drizzle + Neon client, app shell, and clickable wireframes with placeholder data. **Not built:** authentication (Clerk not installed), roles/access control, database tables and migrations, API routes, stock logic, alerts, reports. Planned but **not installed:** Clerk, Zod, shadcn/ui, a decimal library, Vitest, Playwright. Never describe a planned item as working.

**Next.js 16:** this project uses Next.js 16 with `cacheComponents` and `partialPrefetching` on. APIs differ from older versions — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).

## Specifications

All requirements live in `Project Requirements/`. Read the relevant doc before implementing a feature; the specs win over assumptions. Each doc opens with a scope-correction note; sections marked *deferred* are reference only, not MVP prerequisites.

| Doc | File | Covers |
|---|---|---|
| 01 | `prd.md` | Corrected MVP scope, functional requirements, business rules, acceptance criteria |
| 02 | `system-architecture.md` | Stack (installed vs planned), layers, domain services, tenant isolation |
| 03 | `database-schema.md` | "MVP data model" (authoritative) + deferred reference tables |
| 04 | `ui-ux-specification.md` | Dashboards, entry/login flow, core screens, design principles |
| 05 | `api-security-specification.md` | MVP endpoints, authz, destination handling, validation, errors, idempotency, stock posting |
| 06 | `ai-analytics-specification.md` | **Deferred** forecasting (low-stock alerts are rule-based and live in docs 01/03/05) |
| 07 | `implementation-testing-plan.md` | Repo structure, corrected phases, testing strategy |

Note: docs 02, 03, 04, 06 and 07 are truncated at their tail (source pastes were cut off). The MVP sections added during the scope correction are proposals the team agreed to start from; where a spec stops mid-section, ask rather than invent the missing detail.

## Tech stack

Installed: Next.js (App Router) + React + TypeScript, Tailwind CSS, Neon PostgreSQL client (`@neondatabase/serverless`), Drizzle ORM + drizzle-kit (migrations in `drizzle/migrations/`), Lucide icons, ESLint.

Planned (not installed — ask the `package.json` owner before adding): Clerk (Google OAuth), Zod (API-boundary validation), shadcn/ui, a decimal library for quantity math, Vitest, Playwright (optional).

Deferred: S3-compatible object storage for product images, a separate Python AI service.

Architecture: **modular monolith**. Do not split into microservices.

## Non-negotiable rules

These come from the specs. Treat violations as bugs.

### Tenant isolation and auth
- Every business-owned record is scoped to a `workspace_id`. The prototype has one seeded workspace and one seeded location, but queries still filter by the authorized workspace.
- Clerk proves identity only. Access is decided by Ziggy's own `workspace_members` table (role + `ACTIVE` status), checked server-side on **every** page and request.
- The "Login as: User | Staff | Admin" selector only requests a destination. It never creates or changes a role. New sign-ups have **no membership** and no automatic promotion; an Admin (or the seed script for the first Admin) grants access.
- Never trust a client-supplied user ID, `workspace_id`, role, or redirect URL. Landing routes come from a fixed server-side table (doc 05 §4.4). Verify every referenced entity (product, category, supplier) belongs to the authorized workspace.
- Roles are `USER`, `STAFF`, `ADMIN` (nested). Permissions follow `TEAM_HANDOFF.md` §4 and are enforced on the server, never only in the UI.

### Inventory integrity (MVP)
- Stock changes only when a movement is saved as confirmed (posted). Product quantity is never edited directly — only via `stock_movements`.
- Saving a movement writes the movement and updates `inventory_balances` **in one database transaction**; any failure rolls back everything.
- Lock the affected balance row before checking availability. Stock out cannot exceed available stock, including under concurrent requests. Negative stock is disallowed.
- Movements are immutable. Corrections use compensating (reversal) movements.
- Every movement records product, quantity, type, actor, timestamp, and reason/reference.
- Stock-changing endpoints require an `Idempotency-Key`; a retry returns the original result and never duplicates a movement.
- Low stock is defined once: `available quantity <= configured threshold` (product threshold, else workspace default; active products only). Quantity 0 is "Out of stock". Use the shared `stockStatus` helper; never re-implement the rule.
- A product with any movement is archived (deactivated), never deleted. A product without history can be deleted. Same idea for categories/suppliers in use.
- "Issue" means stock leaving inventory — not a complaint.

### Numbers
- Quantities and money use `numeric` in the DB and a decimal library in TypeScript — never floating point. The server recalculates all quantities; never trust client-computed figures.

### Deferred (do not build for the prototype)
Purchase-order approval workflows, partial receipts, multiple warehouses/transfers, unit conversions (`product_units`), weighted-average costing/valuation, AI forecasting (Ziggy Intelligence), product image uploads. Their specs remain as reference. If AI is ever built it stays advisory (never posts or approves anything) and must not block stock operations.

## Interface architecture

One Next.js app, one deployment, one database. Shared `AppShell`; nav filtered by role. Full route table: `TEAM_HANDOFF.md` §5.

| Area | Routes (min role) | Layout |
|---|---|---|
| Entry / auth | `/` (public inventory entry), `/sign-in`, `/sign-up`, `/auth/continue` *(planned)*, `/access-required` *(planned)* | `src/app/page.tsx`, `src/app/(auth)/layout.tsx` |
| USER | `/inventory`, `/inventory/[productId]` *(planned)* (USER) | `src/app/(app)/layout.tsx` |
| STAFF | `/dashboard`, `/purchasing` (stock in), `/issues` *(planned, stock out)*, `/movements` *(planned)*, `/suppliers` view (STAFF) | `src/app/(app)/layout.tsx` |
| ADMIN | `/admin`, `/admin/team`, `/admin/preferences`, `/admin/audit`, `/products`, `/categories` *(planned)*, `/reports`, `/suppliers` manage (ADMIN) | `src/app/admin/layout.tsx`, `(app)` |

- Hidden/deferred routes (files exist, remove from nav): `/transfers`, `/intelligence`, `/admin/locations`, `/admin/units`, `/admin/data`, `/admin/workspace`, `/select-workspace`.
- **Obsolete (do not extend):** `src/app/shop/**`, `src/app/(app)/orders/**`, `src/components/shop/**`, shop/order values in `src/lib/demo.ts`, the "Customer orders" nav item.
- **Clerk is not connected.** `/sign-in` and `/sign-up` are placeholders; Clerk code is added by the auth owner (Shoaeb) per `TEAM_HANDOFF.md`. Don't add Clerk code unless asked.
- `/admin/*` and every role-gated page/API must be protected by a **server-side** role check. Hiding the link is not access control.
- With `cacheComponents`, client hooks that read the URL (`usePathname`, `useParams`) must sit inside `<Suspense>` on any route below a dynamic segment, or the build fails. See `app-shell.tsx`.
- `src/lib/demo.ts` holds wireframe placeholder values. Never use it in server logic.
- Navigation lives in `src/components/layout/nav-config.ts`; the shell is `src/components/layout/app-shell.tsx`.
- `src/components/wireframe/` holds placeholder primitives (`PageHeader`, `StatTile`, `WireTable`, `Placeholder`…). Replace them with real components as features land; don't build features on top of them.

## Code organization

Follow the structure in doc 07, §3. Key points:
- Domain logic lives in `src/modules/*` and `src/server/services` — **not** in React components or route handlers. Inventory services must be callable from API routes and tests alike.
- API routes live under `src/app/api/v1/`, REST-style, with explicit action endpoints (e.g. `POST /stock-in`, `POST /products/{id}/deactivate`).
- Use the standard error envelope (`{ error: { code, message, requestId, details } }`) and never leak SQL errors, stack traces, or secrets.
- Browser components never talk to the database directly.
- Allow only explicitly supported filter/sort fields; never interpolate user input into SQL.
- Schema is split by owner: `src/server/db/schema/{identity,catalogue,inventory}.ts` (see `TEAM_HANDOFF.md` §8 for ownership and migration rules).

## Conventions

- DB: `snake_case` tables/columns, UUID primary keys, `timestamptz` in UTC.
- Secrets go in `.env.local` (never committed); keep `.env.example` updated with placeholder values.
- Logo: `public/images/ziggy-logo.png` (1254×1254 PNG, white background, orange/red "Z" with grocery cart). Reuse it.

## UI and visual design

**Read `DESIGN.md` (repo root) before writing any UI.** It is the source of truth for visual tokens — colors, typography, spacing, radii, elevation, and component styling (Pinterest-inspired system). Reference its tokens by name (e.g. `{colors.primary}`, `{rounded.md}`) rather than hard-coding values, and follow its Do's/Don'ts and Iteration Guide.

- `DESIGN.md` overrides the color tokens and typography in doc 04 §3.2–3.3. Doc 04 still governs UX: information priorities, design principles, page structure, and accessibility.
- Pin Sans is proprietary — use **Inter** (DESIGN.md's documented substitute).
- DESIGN.md describes a photo-heavy consumer site; Ziggy is a data-dense business tool. Adopt its tokens and components, but keep tables, forms, and dense data views readable — don't force masonry grids or 70px heroes onto operational screens.
- DESIGN.md does not cover form validation, warning, or hover states. Derive these from its existing tokens and add them to DESIGN.md as new component entries.
- Status must be conveyed by text/icon, not color alone (e.g. "Low stock" with an icon). Every screen needs loading, empty, success, and error states.
- After editing DESIGN.md, run `npx @google/design.md lint DESIGN.md`.

## Delivery order

Follow the corrected phases in doc 07 §5 and `TEAM_HANDOFF.md` §9:

1. Foundation (schema folder, identity tables, Clerk, `requireRole`, seed script, CI)
2. Catalogue (products, categories, suppliers) **and** inventory engine (stock in/out) in parallel
3. Screens (inventory, stock in/out, movements, dashboards)
4. Reports, hardening, cross-role and concurrency tests
5. Cleanup of obsolete ecommerce code, demo rehearsal

A feature is not done just because its UI exists — it needs server-side validation, authorization, and tests.

## Testing

Critical paths require automated tests:
- Role matrix: USER/STAFF/ADMIN against every protected route and endpoint; no-membership and suspended users get nothing; `as=` never changes a role.
- Cross-workspace access is rejected (changing IDs, cross-tenant references).
- Duplicate submission (same `Idempotency-Key`) does not duplicate movements; concurrent stock-outs cannot go below zero.
- Failed stock requests roll back fully.
- Low-stock rule (`quantity <= threshold`) and out-of-stock status.
- Products with history cannot be deleted; reversals (if built) create compensating movements.

## Commands

```bash
npm run dev          # start dev server (http://localhost:3000)
npm run build        # production build (also type-checks)
npm run lint         # ESLint
npm run typecheck    # generate route types + tsc
npm run db:generate  # create a migration from src/server/db/schema.ts
npm run db:migrate   # apply migrations (uses DATABASE_URL_UNPOOLED)
npm run db:studio    # browse the database
```

(`db:generate` reads the schema configured in `drizzle.config.ts`; when the schema is split into `src/server/db/schema/`, the config owner updates the path.)

## Database (Neon)

- One Neon project serves the whole app. Connection strings live in `.env.local` (git-ignored); `.env.example` lists the variables.
- App traffic uses the pooled `DATABASE_URL` via `src/server/db/index.ts` (Neon serverless `Pool` + Drizzle, which supports the interactive transactions stock posting needs). Migrations use the direct `DATABASE_URL_UNPOOLED`.
- Schema changes go through Drizzle migrations only — never ad-hoc SQL against the database. Test migrations on a Neon branch first. Follow the migration coordination rules in `TEAM_HANDOFF.md` §8.
- Neon agent skills are installed in `.claude/skills/` (`neon`, `neon-postgres`).
