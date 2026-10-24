# Ziggy

Online inventory and stock management for small businesses, college laboratories and campus stores.

The application includes Clerk sign-in, server-checked USER/STAFF/ADMIN membership, product/category/supplier management, stock in/out, low-stock alerts, movement history, reports/CSV, team access and preferences. Screens use Neon data. New signups receive no workspace access until an Admin approves them. The obsolete ecommerce and deferred feature routes are unavailable.

## Run locally

Use Node 24. Install with `npm ci`, copy `.env.example` to `.env.local`, fill in Neon and Clerk credentials, and run `npm run dev`. Open http://localhost:3000.

Secrets stay in the Git-ignored `.env.local`. Enable Google in your Clerk application's social connections. Google OAuth is configured in the supplied development instance, but interactive Google sign-in must still be tested in the browser.

## Add your real data

Sign in with an active Admin account and open **Products → Add product**. Add categories and suppliers first if needed. Enter the actual opening quantity to create its initial stock movement. Later changes use **Stock in** or **Stock out**; quantity is never edited directly. See [Data entry instructions](docs/DATA_ENTRY.md).

| Role | Landing | Access |
|---|---|---|
| USER | `/inventory` | Read products and stock availability |
| STAFF | `/dashboard` | Stock in/out, movements, supplier viewing and alerts |
| ADMIN | `/admin` | All operations, catalogue management, team access and reports |

## Database safety

Drizzle schema is in `src/server/db/schema/`; stock operations are shared transactional services with decimal arithmetic, row locking, idempotency and immutable history.

The supplied live database was initialized outside this checkout and has a different migration history. **Do not replace its tables or apply the local initial migrations to public.** The guarded `db:migrate` command rejects unknown migration hashes. Coordinate the existing migration baseline with the repository owner before future deployment migrations. The existing workspace and Admin were preserved; no real product rows were invented or imported.

## Verification

- `npm test` — unit and API authorization tests; database tests skip unless run through the dedicated runner.
- `npm run test:db` — creates a disposable schema over the direct Neon connection, tests local migrations and stock transactions, then removes only that schema.
- `npm run db:check` — checks migrations in a private schema inside a transaction and rolls everything back.
- `npm run lint`, `npm run typecheck`, `npm run build` — static checks and production build.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:studio` — migration tools (respect the baseline warning above).

Full scope and permissions: [TEAM_HANDOFF.md](TEAM_HANDOFF.md). Deferred: AI, ecommerce, multiple warehouses/transfers, valuation, image uploads, movement reversals and advanced purchasing.
