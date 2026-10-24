# Ziggy — Implementation & Testing Plan

**Document:** 07 — Implementation & Testing Plan  
**Version:** 1.0  
**Status:** Corrected MVP delivery plan (proposed)

## 1. Objective

> **Scope correction.** Our required project is an Online Inventory and Stock Management System for small businesses, college laboratories, or campus stores (PRD v1.1). Earlier versions of this plan included a consumer storefront and heavy purchasing/valuation/AI phases; those are **superseded or deferred**. The three-person split of this work is in `TEAM_HANDOFF.md`.

Build a working, demonstrable prototype of Ziggy. The MVP must support:

- Google sign-in (Clerk) with server-side membership checks and three roles (USER, STAFF, ADMIN).
- Add, edit, view, and delete products (archive when history exists).
- Categories and suppliers.
- Stock in (purchases) and stock out (issues) with automatic quantity updates and immutable history.
- Low-stock alerts, inventory summaries, transaction history, and reports.
- One seeded workspace and one seeded location.

Demonstration: **Admin login → add products → record stock in/out → quantities update → low-stock alerts → reports.**

The primary objective is to deliver reliable stock-in/stock-out workflows with correct access control. Deferred: purchase-order approval workflows, partial receipts, multiple warehouses and transfers, advanced unit conversions, weighted-average costing, AI forecasting.

## 2. Implementation Principles

1. Build the inventory engine (stock in/out) before dashboards and reports.
2. Implement authorization before exposing business data.
3. Define the database schema and migrations before building dependent workflows; coordinate schema changes by owner (`TEAM_HANDOFF.md` §8).
4. Use a modular monolith.
5. Keep stock-changing operations transactional, idempotent, and auditable.
6. Test inventory calculations and access rules independently.
7. Deliver features incrementally in working, testable slices.
8. Do not consider a feature complete merely because its UI exists.
9. Keep assumptions and unresolved product decisions visible.
10. Do not claim a planned feature works until it is merged and tested.

## 3. Recommended Repository Structure

A single Next.js repository. The tree shows the target; directories are created as features land. **Currently present:** `src/app` (wireframe routes), `src/components/{layout,shop,wireframe}`, `src/lib/demo.ts`, `src/server/db/{index,schema}.ts`, `drizzle/migrations/meta`. Everything else is planned.

```text
ziggy/
├── public/images/                 # logo
├── src/
│   ├── app/
│   │   ├── page.tsx               # public inventory entry
│   │   ├── (auth)/                # sign-in, sign-up
│   │   ├── auth/continue/         # planned: destination resolver
│   │   ├── access-required/       # planned
│   │   ├── (app)/                 # USER + STAFF + ADMIN routes
│   │   │   ├── inventory/         # USER landing
│   │   │   ├── dashboard/         # STAFF landing
│   │   │   ├── purchasing/        # stock in
│   │   │   ├── issues/            # planned: stock out
│   │   │   ├── movements/         # planned
│   │   │   ├── products/          # ADMIN
│   │   │   ├── categories/        # planned, ADMIN
│   │   │   ├── suppliers/
│   │   │   ├── reports/           # ADMIN
│   │   │   └── settings/
│   │   ├── admin/                 # ADMIN landing and admin pages
│   │   └── api/v1/                # planned
│   ├── components/{ui,layout,tables,forms}/
│   ├── modules/                   # planned: access, products, categories, suppliers, inventory, reports
│   ├── server/
│   │   ├── db/schema/             # planned: identity.ts, catalogue.ts, inventory.ts, index.ts
│   │   ├── auth/  authorization/  # planned: getAccess, requireRole
│   │   ├── services/  validation/
│   ├── lib/
├── drizzle/migrations/
├── tests/{unit,integration,e2e,fixtures}/
├── scripts/                       # planned: seed
├── .env.example
└── package.json
```

Obsolete (to be removed in a focused cleanup, see `TEAM_HANDOFF.md` §10): `src/app/shop/**`, `src/app/(app)/orders/**`, `src/components/shop/**`.

Keep domain logic independent of UI components. Inventory services must be reusable from API routes and automated tests.

## 4. Development Environment

### Recommended stack

Installed today: Next.js 16 with TypeScript, React 19, Tailwind CSS 4, Neon PostgreSQL client, Drizzle ORM + drizzle-kit, Lucide icons, ESLint.

Planned, **not installed yet**: Clerk, Zod, shadcn/ui, a decimal library (e.g. `decimal.js`), Vitest, and Playwright (optional, for the demo-flow test). Adding a dependency goes through the `package.json` owner (see `TEAM_HANDOFF.md` §8).

Choose compatible, stable versions and pin dependencies through the package manager lockfile.

### Environment variables

Maintain an `.env.example` containing variable names and placeholder values, without real credentials.

Expected configuration includes:

- Neon database connection strings (pooled and unpooled) — already in `.env.example`.
- Clerk publishable and secret keys — already listed in `.env.example`; not yet used.
- Seed admin email (planned, e.g. `SEED_ADMIN_EMAIL`).
- *Deferred:* object-storage configuration, background-job credentials, AI provider configuration, error-monitoring configuration.

Never commit actual secrets to source control.

## 5. Phased Delivery (corrected MVP)

Phases map to the checklist in `TEAM_HANDOFF.md` §9. Owners: Teammate 1 = catalogue; Teammate 2 = inventory; Shoaeb = auth, access control, dashboards/reports. Work within a phase proceeds in parallel against the agreed contracts.

### Phase 1 — Foundation *(partly done)*

- Done: Next.js 16 scaffold, Tailwind, Drizzle + Neon client, ESLint, wireframes, app shell.
- To do: install Clerk, Zod, a decimal library (single owner of `package.json`: Shoaeb); schema folder + identity tables; `getAccess`/`requireRole` (dev stub first); seed script (workspace, "Main store" location, first Admin); `products`/`product_categories` and `inventory_*` schema PRs; Vitest and CI checks.
- Exit: signed-in user reaches the app; a user without membership cannot reach business data; migrations run on a Neon branch.

### Phase 2 — Catalogue and inventory engine (parallel)

- **Catalogue (T1):** product, category, supplier CRUD APIs with Zod validation; delete-vs-archive rule; admin screens.
- **Inventory engine (T2, highest priority):** `postStockIn` / `postStockOut` in one transaction with balance locking, no negative stock, idempotency keys, audit rows; `stockStatus` helper; opening-stock option on product creation.
- **Access (Shoaeb):** entry page, `/sign-in` with "Login as", `/auth/continue`, `/access-required`, `/admin/team` (pending access, grant role, suspend).
- Required tests: stock in/out correctness, insufficient stock, duplicate submission, concurrent stock-outs, rollback on failure, product delete blocked with history, role denial for each protected route/API.

### Phase 3 — Screens

- T2: `/inventory`, `/inventory/[productId]`, `/purchasing` (stock in), `/issues` (stock out), `/movements`.
- Shoaeb: `/dashboard` and `/admin` summaries, low-stock alerts.
- T1: finish forms, validation messages, empty/error states.

### Phase 4 — Reports and hardening

- `/reports` stock summary and movement report with CSV export (Shoaeb).
- Cross-role and cross-tenant tests; low-stock rule tests; summary-vs-history reconciliation tests.
- Stretch: ADMIN reversal of a movement; basic rate limiting.

### Phase 5 — Cleanup and demonstration

- Remove obsolete ecommerce code; hide deferred nav items; rename `/sales` to `/issues` in the nav.
- Rehearse the demo end to end; one Playwright test for the flow if time allows.

### Deferred phases (reference only; not required for the college prototype)

Purchase orders and partial receipts; multiple locations, transfers, and adjustments workflow; unit conversions and weighted-average valuation; Ziggy Intelligence (doc 06); production security hardening (headers, rate limiting, backup/restore drills, load tests).

## 14. Testing Strategy

### Unit tests

- `stockStatus` / the low-stock rule (`quantity <= threshold`, quantity 0 = out of stock).
- Decimal quantity arithmetic.
- Permission evaluation (`requireRole`, nested roles, destination handling for `as=`).
- Idempotency request hashing.

### Integration tests (against a Neon test branch or local Postgres)

- Posting stock in and stock out; insufficient stock rejected; rollback on failure.
- Duplicate request with the same `Idempotency-Key` creates one movement; different payload with same key returns conflict.
- Concurrent stock-outs on one product never go below zero.
- Product with history cannot be deleted; product without history can.
- Role matrix: USER/STAFF/ADMIN against each protected route and endpoint; no-membership and suspended users get nothing.
- Cross-workspace references are rejected.
- Dashboard summary and reports reconcile with the movement history.

### End-to-end test (demo flow, if time allows)

1. Sign in as Admin. 2. Add a category, supplier, and products. 3. Record stock in. 4. Record stock out. 5. Verify quantities. 6. Reduce a product to its threshold and see the low-stock alert. 7. Open the movement history and a report.

### Concurrency tests

Simulate simultaneous stock-outs against the same product balance and verify the second request is rejected or sees the reduced quantity.

### Deferred

Forecast evaluation against historical holdout data, load tests, and recovery drills.

## 15. Suggested
