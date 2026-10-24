# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Ziggy** is a multi-tenant inventory management SaaS for grocery shops, wholesalers, and distributors (initial market: India, default currency INR). It manages products, suppliers, purchasing, stock movements, sales, and inventory across multiple branches and warehouses, plus advisory AI forecasting ("Ziggy Intelligence").

Two interfaces share one app shell and design system:
- **Ziggy** — day-to-day operations (inventory, sales/issues, transfers, purchasing, reports).
- **Ziggy Admin** — workspace settings, locations, team and roles, audit history.

**Current state:** Phase 1 (foundation) in progress. Ziggy, Ziggy Admin, and the consumer shop exist as navigable wireframes with placeholder data. Neon project `ziggy` is linked; no auth, database tables, or business logic yet.

**Next.js 16:** this project uses Next.js 16 with `cacheComponents` and `partialPrefetching` on. APIs differ from older versions — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (see `AGENTS.md`).

## Specifications

All requirements live in `Project Requirements/`. Read the relevant doc before implementing a feature; the specs win over assumptions.

| Doc | File | Covers |
|---|---|---|
| 01 | `prd.md` | Product scope, functional requirements, business rules, acceptance criteria |
| 02 | `system-architecture.md` | Stack, layers, domain services, tenant isolation |
| 03 | `database-schema.md` | Tables, columns, constraints |
| 04 | `ui-ux-specification.md` | Design principles, interfaces, color tokens, typography |
| 05 | `api-security-specification.md` | Endpoints, authz, validation, errors, idempotency, posting flows |
| 06 | `ai-analytics-specification.md` | Forecasting, stock-out risk, reorder recommendations |
| 07 | `implementation-testing-plan.md` | Repo structure, phased delivery, testing strategy |

Note: docs 02, 03, 04, 06 and 07 are currently truncated (the source pastes were cut off). Where a spec stops mid-section, ask rather than invent the missing detail.

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + shadcn/ui
- Clerk (Google OAuth) for authentication
- Neon PostgreSQL + Drizzle ORM (migrations in `drizzle/migrations/`)
- Zod for validation at the API boundary
- S3-compatible object storage for product images (DB stores only the object key)
- Vitest for unit/integration tests, Playwright for e2e
- Architecture: **modular monolith**. Do not split into microservices. A separate Python AI service is extracted only when justified.

## Non-negotiable rules

These come straight from the specs. Treat violations as bugs.

### Tenant isolation and auth
- Every business-owned record is scoped to a `workspace_id`. Every query filters by the authorized workspace.
- Clerk proves identity only. Workspace access is decided by Ziggy's own `workspace_members` table (role + `ACTIVE` status), checked server-side on every request.
- Never trust a client-supplied user ID or `workspace_id`, and never treat knowing a UUID as authorization. Verify every referenced entity (product, location, supplier…) belongs to the authorized workspace.
- Roles: `ADMIN` and `STAFF`. Permissions are enforced on the server, never only in the UI.

### Inventory integrity
- Stock changes only when a document is **posted** (receipt, sale, issue, adjustment, transfer). Drafts and purchase orders never change stock.
- A posting updates `stock_movements`, `inventory_balances`, and valuation **in one database transaction**. Any failure rolls back everything.
- Lock affected balances before checking availability; for transfers, lock both locations in a deterministic order.
- Negative stock is disallowed by default.
- Posted movements are immutable — corrections use compensating (reversal) movements, never edits or deletes.
- Every movement records actor, timestamp, product, location, quantity, and reason/reference.
- Stock-changing endpoints accept an `Idempotency-Key` header; a retry returns the original result and never duplicates movements.
- Sales and non-sale stock issues stay distinguishable in the ledger.

### Units, money, and valuation
- Quantities are stored in each product's base unit; conversions use explicit factors from `product_units`.
- Snapshot the conversion factor on transaction lines — later unit changes must not alter history.
- Money and quantities use `numeric`, never floating point (in the DB **and** in TypeScript — use a decimal library, not `number`, for calculations).
- Moving weighted-average cost is per product **per location**. Transfers carry the source cost basis.
- The server recalculates all totals, availability, and valuation; never trust client-computed figures.
- Records with history are archived/deactivated, not deleted.

### AI
- Ziggy Intelligence is advisory only. It must never post, adjust, receive, or approve anything. At most it may prefill a **draft** purchase order for a user to review.
- Every recommendation shows its data period, assumptions, generation time, and data sufficiency.
- Use statistical/rule-based forecasting first. An LLM may explain results but is not the numeric forecasting engine.
- Analytics failures must never block stock operations.

## Interface architecture

One Next.js app, one deployment, one database, three route areas. The two business areas share a single `AppShell` (doc 04 §2: Admin must not feel like a separate product); the shop has its own consumer shell.

| Area | Routes | Who | Layout |
|---|---|---|---|
| Ziggy (operations) | `/dashboard`, `/inventory`, `/products`, `/orders`, `/purchasing`, `/sales`, `/transfers`, `/suppliers`, `/reports`, `/intelligence`, `/settings` | ADMIN + STAFF | `src/app/(app)/layout.tsx` |
| Ziggy Admin | `/admin`, `/admin/workspace`, `/admin/locations`, `/admin/team`, `/admin/units`, `/admin/preferences`, `/admin/audit`, `/admin/data` | ADMIN only | `src/app/admin/layout.tsx` |
| Shop (consumer) | `/shop/[store]`, `…/products/[productId]`, `…/cart`, `…/checkout`, `…/orders`, `…/orders/[orderId]`, `…/account` | Shoppers | `src/app/shop/[store]/layout.tsx` |
| Auth | `/sign-in`, `/sign-up`, `/select-workspace` | Everyone | `src/app/(auth)/layout.tsx` |

- The consumer storefront is a scope change recorded in the PRD (§5 "Scope change", FR-09). Shoppers are **not** workspace members; every shop query must be scoped to the store's workspace.
- Customer orders: shoppers create/read/edit/cancel (edit and cancel only while `Placed`); store users confirm, adjust, fulfil, or cancel at `/orders`. Fulfilment deducts stock as a posted sale through the inventory engine.
- **Clerk is not connected yet** (a teammate is wiring it). `/sign-in` and `/sign-up` are placeholders with instructions in each file; don't add Clerk code unless asked.
- With `cacheComponents`, client hooks that read the URL (`usePathname`, `useParams`) must sit inside `<Suspense>` on any route below a dynamic segment, or the build fails. See `app-shell.tsx` and `shop-shell.tsx`.
- `src/lib/demo.ts` holds wireframe placeholder values (demo store, order, product). Never use it in server logic.

- Navigation for both areas lives in `src/components/layout/nav-config.ts`; the shell is `src/components/layout/app-shell.tsx`.
- `/admin/*` must be protected by a **server-side** ADMIN role check (Phase 2). Hiding the link in the UI is not access control.
- Active workspace is not in the URL yet; decide between a `/w/[slug]` prefix and session-held selection when Phase 2 adds membership.
- `src/components/wireframe/` holds placeholder primitives (`PageHeader`, `StatTile`, `WireTable`, `Placeholder`…). Replace them with real components as each phase lands; don't build features on top of them.

## Code organization

Follow the structure in doc 07, §3. Key points:
- Domain logic lives in `src/modules/*` and `src/server/services` — **not** in React components or route handlers. Inventory services must be callable from API routes, background jobs, and tests alike.
- API routes live under `src/app/api/v1/`, REST-style, with explicit action endpoints for state changes (e.g. `POST /goods-receipts/{id}/post`).
- Use the standard error envelope (`{ error: { code, message, requestId, details } }`) and never leak SQL errors, stack traces, or secrets.
- Browser components never talk to the database directly.
- Allow only explicitly supported filter/sort fields; never interpolate user input into SQL.

## Conventions

- DB: `snake_case` tables/columns, UUID primary keys, `timestamptz` in UTC.
- Secrets go in `.env` (never committed); keep `.env.example` updated with placeholder values.
- Logo: `public/images/ziggy-logo.png` (1254×1254 PNG, white background, orange/red "Z" with grocery cart).

## UI and visual design

**Read `DESIGN.md` (repo root) before writing any UI.** It is the source of truth for visual tokens — colors, typography, spacing, radii, elevation, and component styling (Pinterest-inspired system). Reference its tokens by name (e.g. `{colors.primary}`, `{rounded.md}`) rather than hard-coding values, and follow its Do's/Don'ts and Iteration Guide.

- `DESIGN.md` overrides the color tokens and typography in doc 04 §3.2–3.3. Doc 04 still governs UX: information priorities, design principles, page structure, and accessibility.
- Pin Sans is proprietary — use **Inter** (DESIGN.md's documented substitute).
- DESIGN.md describes a photo-heavy consumer site; Ziggy is a data-dense business tool. Adopt its tokens and components, but keep tables, forms, and dense data views readable — don't force masonry grids or 70px heroes onto operational screens.
- DESIGN.md does not cover form validation, warning, or hover states. Derive these from its existing tokens and add them to DESIGN.md as new component entries.
- Status must be conveyed by text/icon, not color alone. Every screen needs loading, empty, success, and error states.
- After editing DESIGN.md, run `npx @google/design.md lint DESIGN.md`.

## Delivery order

Build in the phases from doc 07 and don't skip ahead:

1. Foundation (Next.js, Clerk, Neon, Drizzle, CI)
2. Workspaces and access control
3. Product catalogue and units
4. **Inventory engine** — highest priority; must pass unit, integration, and concurrency tests before purchasing/sales UIs count as done
5. Purchasing and receipts
6. Sales, issues, adjustments, transfers
7. Dashboard, reports, alerts
8. Ziggy Intelligence
9. Security and production readiness

A feature is not done just because its UI exists — it needs server-side validation, authorization, and tests.

## Testing

Critical paths require automated tests:
- Cross-workspace access is rejected (changing IDs, cross-tenant references).
- Duplicate posting does not duplicate movements; concurrent sales cannot oversell.
- Failed receipts/transfers roll back fully (no half-updated location).
- Weighted-average cost and unit conversions are correct.
- Reversals create compensating movements.

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

## Database (Neon)

- One Neon project serves both interfaces. Connection strings live in `.env.local` (git-ignored); `.env.example` lists the variables.
- App traffic uses the pooled `DATABASE_URL` via `src/server/db/index.ts` (Neon serverless `Pool` + Drizzle, which supports the interactive transactions stock posting needs). Migrations use the direct `DATABASE_URL_UNPOOLED`.
- Schema changes go through Drizzle migrations only — never ad-hoc SQL against the database. Test migrations on a Neon branch first.
- Neon agent skills are installed in `.claude/skills/` (`neon`, `neon-postgres`).
