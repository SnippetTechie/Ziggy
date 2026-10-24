# TEAM_HANDOFF.md

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
| `USER` | Inventory viewer (default) | `/inventory` | Search/filter products, check stock availability. Read-only: no cart, no checkout, no stock changes. |
| `STAFF` | Operations | `/dashboard` | Record stock in/out, review movements and low-stock items. |
| `ADMIN` | Administration | `/admin` | Manage products, categories, suppliers, members; stock operations; alerts, summaries, reports. |

## 3. Entry and authentication (planned — nothing below exists yet)

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
| `/sign-in`, `/sign-up` | public | Placeholders (no Clerk). Both Google-only; add the "Login as" selector to sign-in |
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

## 6. API contract (`/api/v1`, all planned)

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

## 7. Core database entities (MVP) — all planned, none created yet

Details in doc 03, "MVP data model". Money/quantities are `numeric`. Tables carry `workspace_id`.

| Entity | Schema file (proposed) | Owner |
|---|---|---|
| `users`, `workspaces`, `workspace_members`, `locations`, `audit_logs` | `src/server/db/schema/identity.ts` | Shoaeb |
| `product_categories`, `products`, `suppliers` | `src/server/db/schema/catalogue.ts` | Teammate 1 |
| `inventory_balances`, `stock_movements`, `idempotency_keys` | `src/server/db/schema/inventory.ts` | Teammate 2 |
| Barrel `src/server/db/schema/index.ts` (replaces today's empty `schema.ts`) | | Shoaeb |

Low-stock rule (everywhere): `quantity_on_hand <= effective_threshold`, where `effective_threshold = product.low_stock_threshold ?? workspace default`. Only active products. Label `Out of stock` when quantity is 0, `Low stock` when above 0 but at/below threshold, `In stock` otherwise. One helper (`stockStatus`) in `src/modules/inventory/stock-status.ts` (Teammate 2) is the only place this is computed.

## 8. Ownership and coordination

| Area | Owner |
|---|---|
| **Teammate 1** — Admin/product/category/supplier UI and APIs: `/products`, `/categories`, `/suppliers`, `src/modules/products`, `categories`, `suppliers`, `catalogue.ts` | Teammate 1 |
| **Teammate 2** — User/Staff inventory views and stock services: `/inventory`, `/issues`, `/purchasing`, `/movements`, `src/modules/inventory`, `inventory.ts`, stock-in/out/movement APIs, concurrency + idempotency tests | Teammate 2 |
| **Shoaeb** — Clerk auth, access-control helpers (`src/server/auth`, `src/server/authorization`), entry/login flow (`/`, `(auth)/*`, `/auth/continue`, `/access-required`), `/dashboard` + `/admin` summaries, alerts, reports, `/admin/team`, seed script, `identity.ts` | Shoaeb |
| Shared single-owner files | `package.json` + `package-lock.json` (Shoaeb — ask before adding a dependency), `.env.example`, `src/server/db/index.ts`, `drizzle.config.ts`, `src/components/layout/app-shell.tsx` and `nav-config.ts` (Shoaeb; send nav changes as a PR comment/request), `DESIGN.md` (Shoaeb), this file and `CLAUDE.md` (Shoaeb, via PR) |

**Access-control contract** (Shoaeb ships a dev stub first so others can code against it immediately):

```ts
type Role = "USER" | "STAFF" | "ADMIN";
getAccess(): Promise<{ userId: string; workspaceId: string; locationId: string; role: Role } | null>;
requireRole(min: Role): Promise<Access>; // throws UnauthenticatedError (401) / ForbiddenError (403)
```

Teammates call `requireRole()` at the top of every route handler and server page and take `workspaceId`/`locationId` from its result — never from the request.

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

## 11. Current implementation status

| Item | Status |
|---|---|
| Next.js 16 app, Tailwind 4, ESLint, Drizzle + Neon client, Lucide icons | Installed and configured |
| Navigable wireframes for ops, admin, auth, and (obsolete) shop | Exist, placeholder data only |
| Clerk, Zod, shadcn/ui, a decimal library (e.g. `decimal.js`), Vitest, Playwright | **Planned — not installed** |
| Authentication, authorization, workspace/membership | **Not built** |
| Database tables / migrations (`schema.ts` is empty, `drizzle/migrations` has only a journal) | **Not built** |
| API routes (`src/app/api` does not exist) | **Not built** |
| Stock movement logic, alerts, reports | **Not built** |

## 12. Unresolved assumptions

1. **USER role** is our interpretation of "three dashboards". Confirm with the supervisor.
2. First Admin comes from a seed script; later users get roles via an Admin granting access (no email invitations in the prototype).
3. Single workspace + single location for the demo; multi-location is a future extension.
4. One product per stock-in/out submission; multi-line documents are a future enhancement.
5. "Saving" a stock movement posts it immediately; there are no draft documents in the MVP. (If drafts are ever added, they must not change stock.)
6. Stock-out reasons and stock-in reasons use a fixed list (doc 03, `stock_movements` reason codes); confirm labels with the supervisor.
7. Docs 02, 03, 04, 06, 07 were truncated in their source. The MVP tables (`inventory_balances`, `stock_movements`, `idempotency_keys`) and sections are written fresh in this change and are proposals until the team agrees.
8. Product images, unit conversions, valuation and the Python AI service are deferred; Clerk redirect mechanics (`/auth/continue`) must be confirmed against current Clerk docs at implementation time.
