# Inventory MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver the corrected college-project inventory demonstration, with Google identity and server-enforced membership.

**Architecture:** One Next.js application, Clerk authentication, Neon PostgreSQL with Drizzle migrations. Shared domain services own catalogue and atomic stock posting; role-protected API routes serve functional client forms. Use one seeded workspace/location. Do not seed invented business transactions.

**Tech Stack:** Next.js 16, React, Clerk, Drizzle, Neon, Zod, decimal.js, Vitest.

**Spec:** TEAM_HANDOFF.md and Project Requirements/{prd,database-schema,api-security-specification}.md. User authorized implementation decisions and completing the project.

## Global Constraints

- Roles nest: ADMIN >= STAFF >= USER. New signups receive no membership.
- Every page/API checks active membership; workspace/location come from the server.
- Numeric(20,6) quantities, decimal arithmetic, immutable movements, balance locking and transactional idempotency.
- Low stock: active product quantity <= product threshold or workspace default; zero means out of stock.
- No ecommerce, transfers, valuation or AI in this MVP.
- Secrets remain in ignored .env.local. No external messages, deployment or shared-branch push.

## Review Focus

- Invalid role destination never elevates access or redirects externally.
- Cross-workspace foreign IDs are rejected, including archived suppliers/products.
- Duplicate stock requests and concurrent issues cannot duplicate or oversell.
- Admin cannot remove the last active administrator.
- Failed database operations return safe errors and roll back all writes.

### Task 1: Database and domain foundation
Files: src/server/db/schema/{identity,catalogue,inventory,index}.ts; src/modules/inventory/{stock-status,service}.ts; src/server/{errors,validation}.ts; scripts/{seed,migrate}.ts; tests/unit and tests/integration.
Interfaces: getDb() returns the application Drizzle client; Access contains userId/workspaceId/locationId/role; postStock(access,input,key) returns the saved movement; stockStatus(quantity,threshold,defaultThreshold) returns a text label.
- [ ] Add required dependencies and test scripts. Write failing decimal, status, permission, validation tests; verify failures.
- [ ] Implement tenant-safe schema, pure policies, validation, posting service and catalogue services. Generate migration.
- [ ] Run unit tests; apply migrations and execute integration tests on a separate test database/branch if available; otherwise document the limitation and use isolated transactional fixtures on the authorized empty database without changing existing business records.

### Task 2: Authentication and APIs
Files: src/server/{auth,authorization}; src/proxy.ts; src/app/(auth)/sign-{in,up}/[[...]]/page.tsx; src/app/auth/continue; src/app/access-required; src/app/api/v1/[...path]/route.ts.
Interfaces: getAccess(): Promise<Access|null>; requireRole(min): Promise<Access>; API envelopes {data} or {error:{code,message,requestId,details}}.
- [ ] Test destination routing, role comparisons, inactive/no membership and last-admin rules before implementation.
- [ ] Connect Clerk, Google-only configured through provider dashboard, safe server redirect and pending-access flow. Implement validated CRUD, stock, reporting, member and settings APIs, CSRF-origin checks.
- [ ] Run role and API tests; verify signed-out pages/API reveal no inventory data.

### Task 3: Functional screens and navigation
Files: src/components/{layout,inventory}; src/app/(app) pages; src/app/admin pages; src/app/page.tsx; globals.css.
Interfaces: UI uses protected APIs only, server pages use requirePageRole; all forms report success/error and prevent duplicate submissions.
- [ ] Replace wireframe routes with inventory, product/category/supplier CRUD, stock in/out, history, dashboards, reports/CSV, team and preferences screens.
- [ ] Filter navigation by role; include Clerk profile/signout. Retire obsolete/deferred routes behind 404.
- [ ] Run lint/typecheck/build, verify public entry and server guards and error states.

### Task 4: Verification and handoff
Files: README.md; .env.example; .github/workflows/ci.yml; tests.
- [ ] Run unit/integration tests, lint, typecheck and production build. Review the entire change with a fresh reviewer.
- [ ] Fix important findings with regression tests. Record actual results, remaining external Clerk/seed setup and migration status.
- [ ] Leave changes reviewable on the feature branch; no automatic push/deployment.
