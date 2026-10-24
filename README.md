# Ziggy

Smart inventory management SaaS for grocery shops, wholesalers, and distributors, with a consumer storefront per store.

> **Status:** Phase 1 — clickable wireframes for all three interfaces, placeholder data only. No auth, database tables, or business logic yet.

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

## Interfaces

| Area | Start at | For |
|---|---|---|
| Shop | `/shop/sharma-groceries` | Shoppers placing orders (mobile-first) |
| Ziggy | `/dashboard` | Store teams: inventory, orders, purchasing, sales |
| Ziggy Admin | `/admin` | Owners: workspace, locations, team, settings |
| Auth | `/sign-in` | Placeholders; Clerk is not connected yet |

## Where things are

- `Project Requirements/` — PRD and specs (architecture, schema, UI/UX, API & security, AI, implementation plan). Read these first.
- `CLAUDE.md` — project rules and conventions, also used by Claude Code.
- `DESIGN.md` — visual design system (colors, type, components).
- `src/app/` — routes: `(app)` = Ziggy, `admin` = Ziggy Admin, `shop/[store]` = storefront, `(auth)` = sign-in.
- `src/components/wireframe/` — placeholder building blocks; replace them as real features land.
- `src/server/db/` — Drizzle + Neon client; schema is empty until Phase 2.

## Scripts

`npm run dev` · `build` · `lint` · `typecheck` · `db:generate` · `db:migrate` · `db:studio`
