# Ziggy — Implementation & Testing Plan

**Document:** 07 — Implementation & Testing Plan  
**Version:** 1.0  
**Status:** Proposed MVP delivery plan

## 1. Objective

Build a production-minded MVP of Ziggy, an inventory management SaaS for grocery shops, wholesalers, and distributors.

The MVP must support:

- Multiple business workspaces.
- Workspace-based authentication and permissions.
- Multiple branches and warehouses.
- Product catalogue and unit conversions.
- Supplier management.
- Purchase orders and partial goods receipts.
- Sales and non-sale stock issues.
- Stock adjustments and transfers.
- Inventory balances and moving weighted-average valuation.
- Stock reports and low-stock alerts.
- Advisory demand forecasting and reorder recommendations.

The primary objective is to deliver reliable inventory workflows before adding advanced AI features.

## 2. Implementation Principles

1. Build the core inventory engine before the AI layer.
2. Implement authorization before exposing business data.
3. Define the database schema and migrations before building dependent workflows.
4. Use a modular monolith for the initial release.
5. Keep stock-changing operations transactional and auditable.
6. Test financial and inventory calculations independently.
7. Deliver features incrementally in working, testable slices.
8. Do not consider a feature complete merely because its UI exists.
9. Keep assumptions and unresolved product decisions visible.
10. Validate the product with real operational workflows before launch.

## 3. Recommended Repository Structure

A single Next.js repository is sufficient for the MVP.

```text
ziggy/
├── public/
│   ├── icons/
│   └── images/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── products/
│   │   │   ├── purchasing/
│   │   │   ├── sales/
│   │   │   ├── transfers/
│   │   │   ├── suppliers/
│   │   │   ├── reports/
│   │   │   ├── intelligence/
│   │   │   └── admin/
│   │   └── api/
│   │       └── v1/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── tables/
│   │   ├── forms/
│   │   └── charts/
│   ├── modules/
│   │   ├── auth/
│   │   ├── workspaces/
│   │   ├── locations/
│   │   ├── products/
│   │   ├── suppliers/
│   │   ├── purchasing/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── transfers/
│   │   ├── reports/
│   │   └── intelligence/
│   ├── server/
│   │   ├── db/
│   │   ├── auth/
│   │   ├── authorization/
│   │   ├── services/
│   │   ├── validation/
│   │   └── observability/
│   ├── lib/
│   └── types/
├── drizzle/
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── scripts/
├── docs/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

This is a recommended starting structure, not a requirement to create every directory immediately.

Keep domain logic independent of UI components. Inventory services should be reusable from API routes, background jobs, and automated tests.

## 4. Development Environment

### Recommended stack

- Next.js with TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui.
- Clerk.
- Neon PostgreSQL.
- Drizzle ORM.
- Zod.
- A suitable test runner such as Vitest.
- Playwright for browser-based end-to-end tests.

Choose compatible, stable versions and pin dependencies through the package manager lockfile.

### Environment variables

Maintain an `.env.example` containing variable names and placeholder values, without real credentials.

Expected configuration includes:

- Clerk publishable key.
- Clerk secret key.
- Clerk webhook secret, if webhooks are used.
- Neon database connection string.
- Object-storage configuration.
- Application base URL.
- Background-job credentials, if applicable.
- AI provider or model-service configuration, if applicable.
- Error-monitoring configuration.

Never commit actual secrets to source control.

## 5. Phase 1 — Project Foundation

### Tasks

- Initialize the Next.js application.
- Configure TypeScript and linting.
- Add Tailwind CSS and the component library.
- Establish the design tokens.
- Create the application shell and navigation.
- Configure Clerk authentication.
- Provision a development Neon database.
- Configure the database access layer.
- Set up schema migrations.
- Establish environment separation.
- Add unit and integration test commands.
- Configure CI checks.

### Deliverables

- Application starts locally.
- Authentication works.
- Protected pages require a valid session.
- Database connectivity is verified.
- Migrations run successfully.
- Automated checks run in CI.
- The initial dashboard shell is accessible.

### Exit criteria

A signed-in user can enter the application, but cannot access business records without valid workspace authorization.

## 6. Phase 2 — Workspaces and Access Control

### Tasks

- Implement users and workspace membership.
- Create workspace onboarding.
- Support multiple workspaces per user.
- Add ADMIN and STAFF roles.
- Implement workspace selection.
- Add branches and warehouses.
- Enforce server-side workspace authorization.
- Implement member invitations and access suspension.
- Add audit logging for membership changes.

### Deliverables

- A business can be created and configured.
- Administrators can invite staff.
- Users can access only authorized workspaces.
- Roles are enforced on the server.
- Workspace and location selection work consistently.

### Exit criteria

Automated tests confirm that one workspace cannot read or mutate another workspace's data.

## 7. Phase 3 — Product Catalogue and Units

### Tasks

- Implement product categories.
- Implement products and SKU validation.
- Add product search and filtering.
- Add unit definitions and conversion factors.
- Add product activation and deactivation.
- Implement product image uploads.
- Store image metadata in PostgreSQL.
- Store image objects in the configured object storage.
- Add product detail pages.

### Deliverables

- Products can be created and edited.
- SKUs are unique within a workspace.
- Product units convert to the canonical base unit.
- Invalid conversions are rejected.
- Historical conversion values can be preserved.

### Exit criteria

Unit-conversion tests pass and product references cannot cross workspace boundaries.

## 8. Phase 4 — Inventory Engine

This is the highest-priority business-logic phase.

### Tasks

- Implement stock movements.
- Implement inventory balances.
- Implement inventory valuation.
- Define stock movement sign conventions.
- Implement moving weighted-average cost.
- Add stock availability checks.
- Prevent negative inventory by default.
- Implement idempotent posting.
- Add transaction-safe balance updates.
- Add controlled reversal operations.
- Implement audit events for stock changes.

### Required test cases

- Receiving stock increases the correct balance.
- Selling stock decreases the correct balance.
- Stock issues are distinguished from sales.
- Transfers update both locations.
- Invalid operations roll back completely.
- Duplicate requests do not duplicate movements.
- Concurrent sales cannot oversell stock.
- Weighted-average cost is calculated correctly.
- Reversals create compensating movements.
- Unit conversion changes do not alter historical transactions.

### Exit criteria

The inventory engine passes its unit, integration, and concurrency tests before the main purchasing and sales interfaces are considered complete.

## 9. Phase 5 — Purchasing and Receipts

### Tasks

- Implement supplier management.
- Create purchase orders and line items.
- Implement purchase-order status transitions.
- Support draft and submitted orders.
- Implement goods receipt creation.
- Support partial receipts.
- Validate cumulative receipt quantities.
- Post receipts through the inventory engine.
- Implement receipt reversal.
- Add purchasing history and filters.

### Deliverables

- Users can create purchase orders.
- Orders can be partially received.
- Posting a receipt increases stock exactly once.
- Draft orders and draft receipts do not change stock.
- Outstanding quantities remain correct.

### Exit criteria

The purchase order → partial receipt → completed receipt workflow passes end-to-end tests.

## 10. Phase 6 — Sales, Issues, Adjustments, and Transfers

### Tasks

- Implement draft and posted sales.
- Implement non-sale stock issues.
- Implement stock adjustments with reasons.
- Implement transfer drafts.
- Implement atomic immediate transfers.
- Add transaction confirmation dialogs.
- Implement reversals where supported.
- Add movement history to product and inventory pages.

### Deliverables

- Users can record sales and stock issues separately.
- Stock is deducted only when the relevant transaction is posted.
- Transfers preserve cost basis.
- Adjustments are auditable.
- Stock cannot become negative under the default policy.

### Exit criteria

All stock-changing workflows are consistent with the inventory ledger and valuation engine.

## 11. Phase 7 — Dashboard, Reports, and Alerts

### Tasks

- Implement stock summary reports.
- Implement low-stock filtering.
- Implement inventory movement reports.
- Implement inventory valuation reports.
- Implement sales summaries.
- Add dashboard KPIs.
- Add low-stock alerts.
- Add date and location filters.
- Add report exports if included in the release scope.

### Deliverables

- Dashboard KPIs agree with underlying records.
- Reports respect workspace and location permissions.
- Inventory valuation matches the valuation engine.
- Filters and date ranges behave consistently.
- Empty and error states are present.

### Exit criteria

Report results reconcile with inventory movements and current balances for tested datasets.

## 12. Phase 8 — Ziggy Intelligence

Implement the initial intelligence layer after reliable transaction history is available.

### Tasks

- Define historical demand aggregation.
- Identify stock-out periods that may distort sales history.
- Implement a baseline forecasting method.
- Add forecast generation jobs.
- Implement stock-out risk heuristics.
- Implement reorder-point calculations.
- Store forecasts and recommendations.
- Add confidence and data-quality indicators.
- Display recommendation explanations.
- Allow users to create draft purchase orders from recommendations.

### Deliverables

- Forecasts are available for eligible products.
- Recommendations include timestamps and assumptions.
- Insufficient historical data is clearly disclosed.
- AI or analytics failures do not interrupt stock operations.
- Recommendations cannot automatically post transactions.

### Exit criteria

Forecasts are evaluated against a baseline using historical holdout data, and all recommendation flows preserve existing purchasing controls.

## 13. Phase 9 — Security and Production Readiness

### Tasks

- Review authorization logic.
- Test cross-workspace access attempts.
- Review database constraints and indexes.
- Verify secrets management.
- Configure production security headers.
- Configure rate limiting.
- Configure error monitoring and structured logs.
- Test backup and restore procedures.
- Review object-storage access.
- Test migration and rollback procedures.
- Perform responsive and accessibility checks.
- Run production-like load tests.

### Deliverables

- A documented production deployment process.
- Separate staging and production environments.
- Tested recovery procedures.
- Monitoring for critical transaction failures.
- A release checklist and known-limitations register.

### Exit criteria

No unresolved critical security or data-integrity issues remain.

## 14. Testing Strategy

### Unit tests

Test isolated calculations and business rules.

Examples:

- Unit conversion.
- Weighted-average valuation.
- Reorder-point calculations.
- Stock availability.
- Purchase-order state transitions.
- Permission evaluation.

### Integration tests

Test interactions among the API, database, and domain services.

Examples:

- Posting a receipt.
- Posting a sale.
- Reversing a movement.
- Transferring stock.
- Enforcing workspace isolation.
- Handling idempotency keys.

### End-to-end tests

Test complete user workflows in a browser.

Examples:

1. Sign in.
2. Create a workspace.
3. Add a location.
4. Create a product.
5. Create a purchase order.
6. Receive part of the order.
7. Verify stock.
8. Record a sale.
9. Verify the remaining stock.
10. Review the stock movement report.

### Concurrency tests

Simulate simultaneous operations against the same product-location balance. Verify that transactions serialize or conflict safely and that inventory never becomes inconsistent.

### AI evaluation tests

Use historical holdout data to evaluate forecast error, bias, and simulated replenishment outcomes.

## 15. Suggested
