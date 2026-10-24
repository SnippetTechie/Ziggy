# Presentation verification — 24 October 2026

Continued the existing implementation at `2adcf43`; no redesign or migrations. Both named checkouts originally pointed to that commit and were clean. The project-root checkout was on `release/presentation`, while Claude's worktree was on `feat/user-dashboard-checkout`. The process serving port 3000 was root `next dev -p 3000` (parent PID 22940, server PID 23288), not the worktree. Refreshed `origin/main` was `e515cbd`, already an ancestor of the presentation implementation. Local `main` was older (`1eaae97`). Integration retains the teammate's inventory/auth/report contributions through existing history rather than merging the superseded duplicate dashboard branch.

## Real presentation request

- Read Admin request and current stock first: `REQ-71409F12`, PLACED, 2 pcs of `DEMO-PRES-001`; current on-hand 7.
- Confirmed and fulfilled through the browser. Request became FULFILLED.
- Scoped database read: exactly one STOCK_OUT movement, ID `a1e9fad5-4cb7-4e38-98cc-ee82307e8421`, quantity `2.000000`, reference `REQ-71409F12`, balance after `5.000000`.
- Two concurrent HTTP fulfilment retries both returned FULFILLED; movement and balance snapshots were identical before/after.
- Unsigned `/api/v1/me`: 401. Signed User/Admin identities differ and report USER/ADMIN. User action endpoint and all-customer list: 403. Cancel after fulfilment: 409. User list contains only that identity's requests.
- Admin logout reached `/sign-in`. User login in the same browser reached USER navigation. My Orders showed FULFILLED after full refresh, separately from demo purchases. No server restart or environment changes were used for switching.
- Admin navigation already excludes My Orders and retains Customer orders.

## Existing demo shopping

Real Chrome browser: Demo shop -> A7 notebook -> cart -> checkout -> simulated timeout -> retry -> successful simulated UPI purchase `ZGY-DEMO-EBE49723`. Cart became empty. My Orders showed the browser-only simulated purchase below the real fulfilled request. No payment credentials were collected. Subsequent request checks confirmed the real product remained at 5 with one fulfilment movement.

## Presentation-only catalogue and stock checks

Authenticated HTTP checks created/read/renamed/deleted a clearly labeled empty `DEMO-PRES` product with no movements. A separate labeled stock product (`e68ba402-a3fd-4da1-80b8-dd36fce74bd1`) went through opening 4 -> issue 1 -> same-key retry unchanged -> excess issue rejected -> return 1 -> archive at 4. Deletion with history returned 409. Its movements and audit history were preserved; no unrelated product was changed.

## Automated verification

- `npm test`: 191 passed. 29 database tests are intentionally gated out of the offline command.
- `npm run test:live`: 24 passed on existing tables inside transactions that always roll back, including 4 new order/demo-member tests. These cover idempotent placement, customer/workspace isolation, role denial, invalid transitions, request-location stock, exactly-once fulfilment, multi-item failure rollback, suspended actors, dedicated demo identity stability and fail-closed membership. The Clerk flow suite explicitly disables local demo flags within its test process.
- The remaining 5 gated tests require a disposable schema via `test:db`; that runner was not used because it creates/drops schema. Live rollback tests and HTTP retries cover the presentation's relevant stock invariants.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed. The production build ran in Claude's worktree using the same final source/test files, keeping the root development server running. Build emitted two generic catalog-request prerender diagnostic messages but exited successfully with all routes generated.
- Regression tests were observed failing before fixes for legacy-role precedence, malformed/Unicode tokens, suspended placement, wrong fulfilment location, and promoted demo-user membership. The final checks passed after targeted fixes.

## Limits

- Production Clerk/Google interaction was not exercised. Demo login is disabled in production; local browser results are development-session results.
- Order lists currently expose the newest 100 matching records with no pagination. This presentation has one real request; larger histories need a separately scoped pagination change.
- Live database baseline/schema differences noted in TEAM_HANDOFF remain; no migration or deployment was performed.
