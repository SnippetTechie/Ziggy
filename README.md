# Ziggy

**Online Inventory and Stock Management System** for small businesses, college laboratories, and campus stores.

> **Status:** Phase 1 — clickable wireframes with placeholder data only. **Working:** Clerk sign-in (Google), signed-in check on app pages. **Not built yet:** roles/access control, database tables, API routes, stock logic.
>
> **Scope correction:** an earlier version added a consumer storefront (shop, cart, checkout, delivery). That was a misreading of the problem statement and is **superseded**; the shop and customer-order wireframes still in the repo are obsolete and will be removed in a focused cleanup.
>
> **Team: start with [`TEAM_HANDOFF.md`](TEAM_HANDOFF.md).**

## MVP

Demonstration: **Admin login → add products → record stock in/out → quantities update → low-stock alerts → reports.**

- Add, edit, view, and delete products (archive when they have history).
- Manage categories and suppliers.
- Record stock purchases (stock in) and issues (stock out); quantities update automatically.
- Low-stock alerts (`quantity <= threshold`), inventory summaries, and transaction history.

Deferred: purchase-order workflows, multiple warehouses and transfers, unit conversions, costing/valuation, AI forecasting.

## Dashboards (one app, three role-based views)

| Role | Dashboard | Start at | For |
|---|---|---|---|
| `USER` *(proposed)* | Inventory viewer — default | `/inventory` | Search products, check availability (read-only) |
| `STAFF` | Operations | `/dashboard` | Record stock in/out, review movements and low stock |
| `ADMIN` | Administration | `/admin` | Manage products, categories, suppliers, members; alerts and reports |

Planned entry: `/` is the inventory entry page (no private data when signed out); `/sign-in` offers **Login as: User | Staff | Admin** above Google sign-in. The selector only requests a destination — the server checks the real role. Clerk sign-in is connected; the "Login as" selector and role routing are not built yet.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL / DATABASE_URL_UNPOOLED
npm run dev                  # http://localhost:3000
```

**Database:** the Neon project is `ziggy` (`old-wave-42339493`, region `aws-ap-southeast-1`). Ask the project owner for access, then run:

```bash
npx neon@latest login
npx neon@latest link --project-id old-wave-42339493 -y   # writes .env.local
```

If the database host fails to resolve (`REFUSED` / `ENOTFOUND`), your network's DNS is blocking `*.aws.neon.tech`. Switch your DNS to `1.1.1.1` / `8.8.8.8`.

## Where things are

- [`TEAM_HANDOFF.md`](TEAM_HANDOFF.md) — corrected MVP, permissions matrix, route/API contracts, ownership, checklist, obsolete code list.
- `Project Requirements/` — PRD and specs (architecture, schema, UI/UX, API & security, deferred AI, implementation plan). Each doc starts with a scope-correction note; *deferred* sections are reference only.
- `CLAUDE.md` — project rules and conventions, also used by Claude Code.
- `DESIGN.md` — visual design system (colors, type, components).
- `src/app/` — routes: `(app)` = USER/STAFF/ADMIN pages, `admin` = admin pages, `(auth)` = sign-in. `shop/` and `(app)/orders/` are **obsolete**.
- `src/components/wireframe/` — placeholder building blocks; replace them as real features land.
- `src/server/db/` — Drizzle + Neon client; schema is empty until the foundation phase.

## Scripts

`npm run dev` · `build` · `lint` · `typecheck` · `db:generate` · `db:migrate` · `db:studio`

Installed: Next.js 16, React 19, Tailwind 4, Drizzle, Neon client, Clerk (`@clerk/nextjs`). Planned (not installed): Zod, shadcn/ui, a decimal library, Vitest, Playwright.
