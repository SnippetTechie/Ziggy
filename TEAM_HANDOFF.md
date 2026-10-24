# TEAM_HANDOFF.md

> **Implementation update (2026-10-24):** `feat/inventory-mvp` now implements the role/access helpers, safe post-login routing, catalogue CRUD, stock posting, live inventory/dashboard screens, reports/CSV, team access and preferences. Historical "planned/not built" statements below describe the starting point and have not all been rewritten. See README.md and docs/DATA_ENTRY.md for current usage and verification. The existing Neon database has externally-created migrations; local initial migrations must not be applied over its public schema. The guarded migration runner refuses unknown histories. No real inventory rows have been supplied/imported. First-Admin provisioning for a fresh database and full interactive Google/browser testing remain setup work; the supplied database already has the requested active Admin.

Single page for the three-person team. If this file disagrees with another doc, fix the other doc — this is the shortest statement of the corrected plan. Detailed rules live in `Project Requirements/` (see [README](README.md#where-things-are)).

> **Scope correction.** Our required project is an **Online Inventory and Stock Management System** for small businesses, college laboratories, or campus stores. We previously added an ecommerce storefront by mistake. The consumer storefront, cart, checkout, delivery, shopper accounts, and customer-order fulfilment are **out of scope**; the earlier "consumer storefront" scope change in the PRD is **superseded**.

## 1. Corrected MVP

Demonstration flow: **Admin login → add products → record stock in/out → quantities update → low-stock alerts → reports.**

Required features:

1. Add, edit, view, and delete products (delete only when the product has no stock history; otherwise archive).
2. Manage categories and suppliers.
3. Record stock purchases (**stock in**) and issues (**stock out** — stock leaving inventory; not a complaint).
4. Quantities update automatically, on the server, when a stock movement is saved.
5. Low-stock alerts: a product is low when `available quantity <= configured threshold`.
6. Inventory summaries and transaction (movement) history.

Deferred (kept in the specs as reference, **not** needed to finish the prototype): purchase-order approval workflows, partial receipts, multiple warehouses/branches and transfers, advanced unit conversions, weighted-average costing/valuation, AI forecasting (Ziggy Intelligence), product image uploads, rate limiting, Playwright suite.

## 2. Three dashboards (proposed interpretation)

One Next.js app, one database, one set of inventory services, one design system. The three dashboards are **role-based views**, not separate apps. No super-admin platform, no supplier dashboard.

> The third dashboard (**USER**) is our proposed reading of the brief; confirm with the course supervisor if unsure. Roles nest: `ADMIN` ⊇ `STAFF` ⊇ `USER`.

| Role | Dashboard | Landing route | Purpose |
|---|---|---|---|
| `USER` | Inventory viewer (default) | `/inventory` | Search/filter products, check stock availability. Never changes stock. Also has the **demo shopping extension** in §13 (cart + simulated checkout, no real stock effect). |
| `STAFF` | Operations | `/dashboard` | Record stock in/out, review movements and low-stock items. |
| `ADMIN` | Administration | `/admin` | Manage products, categories, suppliers, members; stock operations; alerts, summaries, reports. |

## 3. Entry and authentication (built by the auth/schema owner; Google login itself not browser-verified — see §13)

- `/` is the User-facing inventory entry: shared shell, short explanation, **Sign in** button. Signed-out visitors get **no** inventory or supplier data. There is no three-door picker. A signed-in member is redirected to their landing route.
- `/sign-in` shows **Login as: User | Staff | Admin** (User preselected) above Clerk's Google sign-in. The choice is only a *requested destination* (`?as=user|staff|admin`). It never creates or changes a role.
- After sign-in Clerk redirects to `/auth/continue?as=…` (server route). It: verifies identity with Clerk → loads the `users` row (creating it if new, with **no membership**) → loads `workspace_members` → checks `ACTIVE`.
  - Requested value must be one of `user|staff|admin`; anything else is treated as `user`. Redirect targets come from our own table (§2), never from a client-supplied URL.
  - Role covers the request → go to that landing route.
  - Role is lower than requested → go to the highest landing the role permits, with a notice ("Your account does not have Admin access"). No role change.
  - No membership, or `SUSPENDED` → `/access-required` (explains how to request access from an Admin). No inventory data is shown.
- **No automatic membership or promotion on sign-up.** A new signed-in user appears under "Pending access" in `/admin/team`; an Admin assigns a role.
- The first Admin is created by a seed script from a configured email (planned `SEED_ADMIN_EMAIL`, to be added to `.env.example` when the script exists).
- Every protected page **and** API route re-checks membership server-side. Typing `/admin` as a STAFF user is rejected by the server (pages: redirect to the user's landing with a notice; API: `403` error envelope).
- Demo setup: **one seeded workspace and one seeded location ("Main store")**, no onboarding. Tables keep `workspace_id` / `location_id` so the isolation model and a later multi-location extension stay valid. The client never sends a workspace id.

## 4. Permissions matrix (the only one — all specs point here)

| Capability | USER | STAFF | ADMIN |
|---|---|---|---|
| View products, categories, stock quantities and stock status (In stock / Low / Out) | ✅ | ✅ | ✅ |
| Search / filter products | ✅ | ✅ | ✅ |
| View suppliers | — | ✅ (read-only) | ✅ |
| Create / edit / archive / delete products | — | — | ✅ |
| Manage categories | — | — | ✅ |
| Manage suppliers | — | — | ✅ |
| Record stock in (purchase) | — | ✅ | ✅ |
| Record stock out (issue) | — | ✅ | ✅ |
| View movement history | — | ✅ | ✅ |
| Reverse a movement (compensating entry) — stretch goal | — | — | ✅ |
| View low-stock alerts and dashboard summary | — (sees status badges only) | ✅ | ✅ |
| Change low-stock thresholds / default threshold | — | — | ✅ |
| Reports and CSV export | — | — | ✅ |
| View members, grant / change role, suspend | — | — | ✅ |
| View audit history | — | — | ✅ |

## 5. Route contract

Existing wireframe routes are reused where practical. **New** = does not exist yet. Roles are the *minimum* role.

| Route | Min role | Status / note |
|---|---|---|
| `/` | public | Exists as a three-door wireframe; to be replaced by the entry in §3 |
| `/sign-in`, `/sign-up` | public | Clerk `<SignIn />` / `<SignUp />` connected (catch-all routes). Still to add: the "Login as" selector |
| `/auth/continue` | signed-in | **New** — server redirect resolver (§3) |
| `/access-required` | signed-in | **New** — no / suspended membership |
| `/inventory` | USER | Exists (wireframe) — product list with search, category and stock-status filters |
| `/inventory/[productId]` | USER | **New** — product detail + stock status; movement list only for STAFF+ |
| `/dashboard` | STAFF | Exists (wireframe) — KPIs, low-stock list, recent movements, quick stock in/out |
| `/purchasing` | STAFF | Exists (wireframe) — repurposed as **Stock in** (record purchase) |
| `/issues` | STAFF | **New** — **Stock out** (record issue). Replaces `/sales` (see §9) |
| `/movements` | STAFF | **New** — transaction history with filters |
| `/suppliers` | STAFF view / ADMIN manage | Exists (wireframe) |
| `/products` | ADMIN | Exists (wireframe) — product management (add/edit/archive/delete) |
| `/categories` | ADMIN | **New** |
| `/reports` | ADMIN | Exists (wireframe) — stock summary, movement report, low-stock, CSV |
| `/settings` | any member | Exists (wireframe) — own account only |
| `/admin` | ADMIN | Exists (wireframe) — admin overview with summaries and alerts |
| `/admin/team` | ADMIN | Exists (wireframe) — pending access, roles, suspend |
| `/admin/preferences` | ADMIN | Exists (wireframe) — default low-stock threshold |
| `/admin/audit` | ADMIN | Exists (wireframe) |

Hidden/deferred routes (leave files in place, remove from nav in cleanup): `/transfers`, `/intelligence`, `/admin/locations`, `/admin/units`, `/admin/data`, `/admin/workspace`, `/select-workspace` (single seeded workspace).

## 6. API contract (`/api/v1`)

> Implemented as one catch-all handler, `src/app/api/v1/[...path]/route.ts`. Success is `{ data }`, failure is `{ error: { code, message, requestId } }`. `GET /alerts/low-stock` returns `{ items, nextCursor: null, total }` (most urgent first). Differences from the table below (e.g. `GET /members/pending`) are called out in §12.

The workspace is resolved on the server from the caller's membership. Errors use the standard envelope in doc 05 §8. Every request is Zod-validated.

| Method | Endpoint | Min role | Notes |
|---|---|---|---|
| GET | `/me` | member | Role, status, landing route |
| GET | `/products` | USER | `search`, `categoryId`, `stock=all\|low\|out`, `status=active\|archived` (archived: ADMIN), `sort`, `limit`, `cursor` |
| POST | `/products` | ADMIN | Optional `openingQuantity` creates an `OPENING_STOCK` movement in the same transaction |
| GET | `/products/{id}` | USER | |
| PATCH | `/products/{id}` | ADMIN | Cannot change quantity — quantity moves only via stock movements |
| DELETE | `/products/{id}` | ADMIN | `409 PRODUCT_HAS_HISTORY` if any movement exists; use deactivate |
| POST | `/products/{id}/deactivate`, `/reactivate` | ADMIN | Archive |
| GET | `/categories` | USER | |
| POST / PATCH / DELETE | `/categories`, `/categories/{id}` | ADMIN | Delete rejected while products use it |
| GET | `/suppliers`, `/suppliers/{id}` | STAFF | |
| POST / PATCH / DELETE | `/suppliers`, `/suppliers/{id}` | ADMIN | Delete only with no movements; else `/deactivate` |
| POST | `/stock-in` | STAFF | One product per request. **`Idempotency-Key` required.** Creates + posts the movement |
| POST | `/stock-out` | STAFF | As above. `422 INSUFFICIENT_STOCK` if quantity > available |
| GET | `/stock-movements` | STAFF | Filters: `productId`, `type`, `supplierId`, `from`, `to`, `actorId`; cursor paging |
| POST | `/stock-movements/{id}/reverse` | ADMIN | Stretch goal — compensating movement |
| GET | `/dashboard/summary` | STAFF | Totals, low/out counts, recent in/out |
| GET | `/alerts/low-stock` | STAFF | Active products with `quantity <= threshold` |
| GET | `/reports/stock-summary`, `/reports/movements` | ADMIN | `?format=csv` for export |
| GET | `/members`, `/members/pending` | ADMIN | |
| POST | `/members` | ADMIN | Grant a role to an existing (signed-in) user |
| PATCH | `/members/{userId}` | ADMIN | Role / status |
| GET / PATCH | `/settings` | ADMIN | Default low-stock threshold |
| GET | `/audit-logs` | ADMIN | |

## 7. Core database entities (MVP) — exist in the dev database (see §12 for the migration-baseline caveat)

Details in doc 03, "MVP data model". Money/quantities are `numeric`. Tables carry `workspace_id`.

| Entity | Schema file (proposed) | Owner |
|---|---|---|
| `users`, `workspaces`, `workspace_members`, `locations`, `audit_logs` | `src/server/db/schema/identity.ts` | Shoaeb |
| `product_categories`, `products`, `suppliers` | `src/server/db/schema/catalogue.ts` | Teammate 1 |
| `inventory_balances`, `stock_movements`, `idempotency_keys` | `src/server/db/schema/inventory.ts` | Teammate 2 |
| Barrel `src/server/db/schema/index.ts` (replaces today's empty `schema.ts`) | | Shoaeb |

Low-stock rule (everywhere): `quantity_on_hand <= effective_threshold`, where `effective_threshold = product.low_stock_threshold ?? workspace default`. Only active products. Label `Out of stock` when quantity is 0, `Low stock` when above 0 but at/below threshold, `In stock` otherwise. One helper (`stockStatus`) in `src/modules/inventory/stock-status.ts` (Teammate 2) is the only place this is computed.

## 8. Ownership and coordination (final, after the 2026-10-24 reconciliation)

| Area | Owner |
|---|---|
| **Auth, access control and identity** — Clerk setup, `/sign-in` "Login as", `/sign-up`, `/auth/continue`, `/access-required`; `src/server/auth`, `src/server/authorization`, `src/modules/access`; memberships and the `/members`, `/settings`, `/audit-logs` endpoints; `/admin/team`, `/admin/preferences`; first-Admin bootstrap; identity schema (`src/server/db/schema/identity.ts`) and **all migrations** (`drizzle/`, `scripts/migrate.ts`) | **Auth/schema owner** (the teammate who pushed `feat/inventory-mvp`) |
| **Catalogue and stock** — products, categories, suppliers, stock in/out, inventory and movement screens (`src/modules/products`, `src/modules/inventory`, `src/server/services`, `src/server/validation.ts`, `src/components/inventory/{products,catalogue,stock}.tsx`) | Teammates, as built in `feat/inventory-mvp` |
| **Dashboard, alerts, reports** — `src/components/inventory/overview.tsx` (Staff dashboard and Admin overview), `src/components/inventory/reports.tsx`, `lowStockAlerts()` and the movement date-range/cursor fixes in `src/server/services/queries.ts`, report/CSV formatting (`src/modules/reports/*`, `csv()` in `src/modules/access/api-policy.ts`), `scripts/use-public-dns.cjs`, `tests/live/*`, `tests/unit/{reports,navigation,api-matrix}.test.ts` | **Shoaeb** |
| Shared single-owner files | `package.json` + lockfile, `.env.example`, `drizzle.config.ts`, `src/server/db/index.ts`, `nav-config.ts`, `app-shell.tsx`: auth/schema owner (Shoaeb sends requests). `DESIGN.md`, this file, `CLAUDE.md`: Shoaeb via PR |

**Member management belongs to the auth/schema owner.** An earlier duplicate implementation (role helpers, `/auth/continue`, `/access-required`, "Login as", `/admin/team`, members and access-request APIs, an identity schema mirror) was written on `feat/shoaeb-dashboard-reports` before the teammate's work was pushed. It was **not** carried into the integration branch; it remains in git history (`53e52dd`, PR #1, superseded) for reference only.

**Access-control contract** (implemented — use it, do not re-implement it):

```ts
getAccess(): Promise<{ userId, workspaceId, locationId, role } | null>; // ACTIVE membership only
requireRole(min): Promise<Access>;      // API: throws AppError 401 / 403
requirePageRole(min): Promise<Access>;  // pages: redirects to /sign-in, /access-required, or the role's own landing
```

Call `requireRole()` at the top of every API handler and `requirePageRole()` (via `<ProtectedPage minimum="…">`) on every page; take `workspaceId`/`locationId` from the result, never from the request.

**Schema / migration rules**
1. Edit only your own schema file. Cross-file foreign keys reference the other file's table by import.
2. Pull `main` before `npm run db:generate`. One migration per PR; never edit a merged migration.
3. If two PRs both add a migration, the later PR deletes its own migration + journal entry, rebases, and regenerates.
4. Merge order: identity (Shoaeb) → `products` (Teammate 1, in a small early PR, because inventory tables reference it) → rest of catalogue and inventory.
5. Test migrations on a Neon branch before merging. No ad-hoc SQL against the shared database.

**Integration dependencies:** Teammate 2 needs `products` + `locations` + `requireRole` stub. Shoaeb's alerts/summary need `inventory_balances` + `products`. Teammate 1's opening-stock option calls Teammate 2's `postStockIn` service. Everyone needs the `stockStatus` helper.

## 9. Phased checklist

- [ ] **P0 Align** — read this file; confirm the USER-role interpretation; agree on seed admin email.
- [ ] **P1 Foundation** — Shoaeb: `schema/` folder, identity tables, Clerk (+ `.env.example`), `requireRole` (stub first), seed script. Teammate 1: `products`/`product_categories` schema PR. Teammate 2: `inventory_*` schema + `stockStatus` + service skeleton.
- [ ] **P2 Core features** — T1: product/category/supplier CRUD APIs + admin UI, delete-vs-archive rule. T2: `postStockIn`/`postStockOut` transaction (balance lock, no negative stock, idempotency) + tests. Shoaeb: entry/login flow, `/auth/continue`, `/access-required`, `/admin/team`.
- [ ] **P3 Screens** — T2: `/inventory`, `/issues`, `/purchasing`, `/movements`. Shoaeb: `/dashboard`, `/admin` summaries, low-stock alerts. T1: finish forms, validation, empty/error states.
- [ ] **P4 Reports + hardening** — reports + CSV; cross-role access tests (USER/STAFF denied admin routes and APIs); duplicate-submit and concurrent stock-out tests; stock reversal if time allows.
- [ ] **P5 Cleanup + demo** — remove obsolete ecommerce code (§10); hide deferred nav items; rehearse the demo flow end to end.

Rename note: `/sales` → `/issues` removes the sales/ecommerce wording. Do it in P3 together with the nav change (Shoaeb owns nav).

## 10. Obsolete ecommerce code — clean up later (not in this docs-only change)

Routes: `src/app/shop/[store]/**` (`page`, `layout`, `products/[productId]`, `cart`, `checkout`, `orders`, `orders/[orderId]`, `account`), `src/app/(app)/orders/**` (`page`, `[orderId]`).
Components: `src/components/shop/*` (`shop-shell`, `product-card`, `order-summary`, `order-timeline`).
Other: `src/lib/demo.ts` (`DEMO_STORE`, `DEMO_ORDER_ID`, `ORDER_STATUSES`; keep or replace `DEMO_PRODUCT_ID` with inventory demo data), the "Customer orders" item and "Buy & sell" group in `nav-config.ts`, the Shop door on `src/app/page.tsx`, shopper wording in `(auth)/sign-up/page.tsx` and the shopper note in `(auth)/sign-in/page.tsx`.
Reusable (keep): logo, `DESIGN.md` tokens, `app-shell.tsx`, `wireframe/` primitives (replace as real screens land), Drizzle/Neon setup.

## 11. Current implementation status (integration branch)

| Item | Status |
|---|---|
| Clerk (Core 3) sign-in/up with Google, "Login as" selector, `/auth/continue` role-based landing, `/access-required` | Built (auth/schema owner). Selector only requests a destination; server decides from the ACTIVE membership |
| Server-side roles (`USER` < `STAFF` < `ADMIN`) on every page and API route | Built; verified by an offline matrix over 31 endpoints and by the live rolled-back flow |
| Database: identity + catalogue + inventory tables, one workspace, an ACTIVE Admin, real inventory loaded by the team | Exists in the dev database (created outside this checkout) |
| Products, categories, suppliers, stock in/out with locking, idempotency, immutable history | Built (teammates); verified by the live flow test |
| Staff dashboard, Admin overview, low-stock alerts, movement history, reports, CSV, team access, preferences | Built; this branch adds quick links, ordered alerts, workspace-timezone date ranges, filterable reports, safer CSV, and the cursor fix below |
| Obsolete ecommerce/deferred routes | Not linked; `/orders` and `/shop/**` return 404 |
| Tests | `npm test` (unit, offline), `npm run test:live` (real tables, rolled back), `npm run test:db` (teammate's disposable-schema runner, not run here) |
| Interactive Google sign-in and signed-in pages in a browser | **Unverified** — steps in §13 |

## 12. Unresolved items and findings

For the **auth/schema owner** (not changed here, because it is their area or needs a schema decision):

1. **`GET /members/pending` is not workspace-scoped.** It lists every user who has no membership anywhere, and `POST /members` / `PATCH /members/{id}` can add any known user id to the caller's workspace. With one workspace this is tolerable; with more it exposes other tenants' sign-ups. Recommended: an `access_requests` table (user, workspace, created_at) written by `/access-required`, and grants restricted to pending requests for the caller's workspace.
2. **Migration baseline.** The live database was created outside this checkout and its migration history differs from `drizzle/migrations`; `db:migrate` correctly refuses it. The repo's Drizzle models also omit columns the live tables have (for example `workspaces.timezone`), and a fresh database built from the repo would lack them. Reports therefore read `settings.timezone` and fall back to `Asia/Kolkata`; a real `timezone` column would be cleaner.
3. **First-Admin bootstrap is not in the repository.** `SEED_ADMIN_EMAIL` appears in `.env.example` but nothing reads it. The existing Admin was created out of band. I verified only that exactly one ACTIVE Admin exists and that the sole code path that writes `workspace_members` is the ADMIN-only `setMember` service (no auto-promotion). A documented, explicit bootstrap for fresh databases is still needed.
4. **Unverified email** makes `getIdentity()` throw `EMAIL_REQUIRED`, which surfaces as an error page from `/auth/continue` rather than a friendly message.
5. **Suspended and never-approved users see the same `/access-required` page**, with no way to request access.
6. `npm run test:db` creates and drops a scratch schema in the shared database. It was not run during this integration.

Fixed on this branch (found by the live tests): **movement pagination silently skipped rows** — the cursor round-tripped `created_at` through a JavaScript `Date` (millisecond precision) while Postgres stores microseconds, so on the real history the screen and the movements CSV returned 860 of 891 rows. The cursor now compares against the anchor row inside Postgres.

Other assumptions: the `USER` role is our reading of "three dashboards" (confirm with the supervisor); one workspace and one location; one product per stock movement; saving a movement posts it immediately; product images, unit conversions, valuation and AI are deferred.

## 13. Integration record and manual test steps

**Branch:** `integration/dashboard-reports` (based on the teammate's `main` / `feat/inventory-mvp`, commit `42186d4`).

**Retained from the teammate unchanged:** Clerk setup, `getIdentity`/`getAccess`/`requireRole`/`requirePageRole`, role policy and `destination()`, identity/catalogue/inventory schema and migrations, the catch-all API, stock/catalogue/member services, all screens not listed below, their tests.

**Changed or added by Shoaeb (dashboards, alerts, reports):** see the ownership table in §8. Specifically: `lowStockAlerts()` (active products only, `quantity <= threshold` with workspace default, products with no balance row count as zero, Out of stock first then lowest quantity, full `total`); movement date filters use `occurred_at` and whole days in the workspace timezone; movements CSV has local and UTC time columns; CSV guards formulas after leading spaces and writes dates as ISO; Reports screen with search/status/type/date filters whose export carries the same filters and always contains every matching record (up to 10,000, otherwise a clear error); dashboard and Admin overview quick links, separate Low/Out counts and an "n of total" alerts note; cursor pagination fix; `scripts/use-public-dns.cjs` (opt-in dev/test fallback for networks whose DNS refuses `*.neon.tech`: `NODE_OPTIONS="--require ./scripts/use-public-dns.cjs" npm run dev`).

**Manual test steps (Google sign-in is unverified):**
1. `npm ci`, create `.env.local` from `.env.example`, `npm run dev`, open http://localhost:3000. Signed out you see only the intro page.
2. Sign in with the configured Admin's Google account. Choose **Admin** → `/admin`; choose **Staff** → `/dashboard`; choose **User** → `/inventory`. The choice never changes the role.
3. As Admin: add a category and a product with opening stock; on **Stock out** issue part of it, then more than the remainder (rejected); double-click submit (one movement). Check the dashboard counts, **Needs attention**, **Movement history**, then **Reports**: filter by dates and export both CSVs and open them in a spreadsheet.
4. Sign in with a second Google account that has no role: you reach `/access-required` and no data. In `/admin/team` grant it **USER**, then try `/dashboard`, `/reports`, `/admin` as that user: each redirects to `/inventory`.
5. Suspend a member in `/admin/team`: they lose access immediately. Try to demote or suspend the only active Admin: it is refused.

## 14. USER demo shopping extension (explicit exception to the inventory-only scope)

> Added on request as a **demo-only** extension. It does not reinstate the superseded storefront: no real payments, no fulfilment, no shopper accounts, and **no effect on real inventory**. The obsolete `src/app/shop/**`, `(app)/orders/**` and `src/components/shop/**` stay untouched and are still scheduled for cleanup (§10).

**What USER gets** (all roles can open the URLs; only USER sees the nav links and header cart badge): product-card catalog with images, search / category / availability / sort, product detail with quantity, cart, simulated checkout, "My demo orders".

| Route | Notes |
|---|---|
| `/inventory` | USER → card catalog; STAFF/ADMIN keep the operational table. `/catalog` shows the card view to any role |
| `/inventory/[productId]` | USER and `demo-…` ids → shopping detail; STAFF/ADMIN keep the operational detail for live products |
| `/cart`, `/checkout`, `/my-orders`, `/my-orders/[ref]` | min role USER |

| API (`/api/v1/catalog…`, min role USER; own route files, the main catch-all handler is untouched) | |
|---|---|
| `GET /catalog?source=demo\|live&search&categoryId&stock&sort` | USER-safe cards only: no supplier, threshold, cost, workspace or timestamps |
| `GET /catalog/{id}` | demo ids start `demo-`; live ids are UUIDs |
| `POST /catalog/validate` | re-prices and re-checks cart lines (read-only) |
| `POST /catalog/demo-checkout` | `Idempotency-Key` required; **simulation only** |

**Two sources, never mixed**
- *Live inventory*: read-only via the existing `listProducts` (workspace-scoped, active products). **Gap:** the schema has no selling price and no image field, so live products show "Price not set", a photo placeholder, and cannot be added to the cart. Live checkout needs (1) a `price` (numeric, per product or price list) and (2) an `image_url` on `products`: a schema change for the catalogue owner, not done here.
- *Demo store*: fictional products, prices and stock in `src/modules/demo-store/demo-catalog.ts`, ids `demo-*`, SKUs `DEMO-*`, labelled "Demo" in the UI.

**Checkout simulation**: Demo UPI / Demo Card. No card number, CVV, UPI PIN or bank data is collected or accepted (request schema is `strict`). The outcome is chosen with visible "Demo controls": approve, decline, or fail-first-then-succeed. The order reference is deterministic from user + `Idempotency-Key`, and the UI locks double submits. The server is stateless: no database access, no `stock_movements`, no balance change (a unit test fails if demo code imports the database or `postStock`). Demo stock is not decremented either.

**Persistence limits**: cart selections (`productId`, quantity, seen price) and demo orders live in this browser's `localStorage`, keyed `ziggy:demo-cart:v1:{workspaceId}:{userId}` and `ziggy:demo-orders:v1:…` (max 25 orders). Clearing site data or switching device loses them; there is no server-side order history. Prices and availability are re-validated server-side when the cart opens and at checkout (409 `CART_CHANGED` with per-line issues).

**Images**: 12 Wikimedia Commons photos in `public/images/demo/`, with source, author, licence and alt text in `public/images/demo/manifest.json`. Most are CC BY / CC BY-SA, so the attribution shown on each product page must be kept.

**Verification status**: unit/route tests, lint, typecheck and production build pass. UI flows were exercised in a real browser against a mock-backed harness (no sign-in). The signed-in path (Clerk, real `/api/v1/me`, the live-inventory tab against Neon) still needs a manual check with a USER account.

## 15. Presentation continuation (24 October 2026; explicit owner-authorized exception)

The current presentation also supports **real quantity-only stock requests** from the In-store stock tab. This supersedes the read-only live-stock limitation in section 14 for this flow. It does not introduce selling prices, totals, payment or migrations. Simulated demo purchases remain browser-only and separate from operational requests.

- Development sign-in has exactly two public demo accounts: `demo-user` / `ziggy-demo-user`, and `demo-admin` / `ziggy-demo-admin`. Requires `ZIGGY_DEV_LOGIN=1`, `ZIGGY_DEV_SESSION_SECRET` (16+ characters), and `NEXT_PUBLIC_ZIGGY_DEV_LOGIN=1` for the development logout UI. Preserve the ignored local environment files. Production continues to use Clerk.
- The signed HttpOnly cookie is authoritative when demo login is configured. The old `ZIGGY_DEV_AUTH_ROLE` is suppressed even when the session secret is misconfigured. Sign out and sign in to switch roles; no environment change or restart.
- Real requests use the existing `customer_orders` and `customer_order_items` tables, mirrored in `src/modules/orders/tables.ts`. They are deliberately outside the migration schema exports. **Do not run migrations against the shared database.**
- `/api/v1/orders` places idempotent requests and lists the caller's own requests. Admins use `/admin/orders` and `/api/v1/orders?scope=all`. Action endpoints require Admin. Transitions are PLACED -> CONFIRMED -> FULFILLED, or cancellation before fulfilment.
- Fulfilment locks the order, uses its recorded location, and posts through the existing stock service in the same transaction as status/audit updates. A retry cannot post another deduction; any item failure rolls the entire fulfilment back. Placement rechecks active membership inside its transaction.
- `connection()` before the session clock is retained for Next Cache Components. Dedicated demo user insertion retains `clerkUserId: "demo-local-user"` for the live NOT NULL column. Existing identity collisions, suspended or promoted demo-user memberships fail closed.
- Browser verification used development cookie login, not interactive production Clerk login. See `PRESENTATION_VERIFICATION.md` for evidence and limitations.
