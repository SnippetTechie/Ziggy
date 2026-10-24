# Ziggy — API & Security Specification

**Document:** 05 — API & Security Specification  
**Version:** 1.1

**Status:** Corrected MVP contract — **proposed; no API routes, authentication, or database exist yet**

> **Scope correction.** Ziggy is an Online Inventory and Stock Management System (PRD v1.1). Shop, cart, checkout, customer-order, and shopper-account endpoints are **superseded and removed**. Purchase orders, goods receipts, sales documents, transfers, valuation, uploads, and intelligence endpoints are **deferred reference**, not prerequisites for the college prototype. The MVP contract is §3–§6 and §10; the permissions matrix lives in `TEAM_HANDOFF.md` §4.

## 1. Objectives

The API must:

- Expose consistent, versioned endpoints.
- Authenticate every protected request.
- Enforce workspace-level authorization.
- Validate all incoming data on the server.
- Preserve transactional inventory integrity.
- Prevent duplicate stock-changing operations.
- Provide consistent error responses.
- Record auditable events for consequential actions.
- Protect sensitive business data and operational credentials.

## 2. API Architecture

Use REST-style HTTP endpoints under:

`/api/v1/`

The frontend communicates with the backend over HTTPS in production.

The backend is responsible for:

1. Authenticating the caller.
2. Resolving the active workspace.
3. Checking membership and permissions.
4. Validating the request schema.
5. Executing domain logic.
6. Committing transactional changes.
7. Returning a structured response.

Business rules must reside in server-side services, not only in frontend components.

### Recommended implementation

- Next.js Route Handlers for HTTP endpoints.
- Clerk for authentication.
- Zod for request validation.
- Neon PostgreSQL for persistence.
- A typed database access layer such as Drizzle ORM.
- Shared domain services for the catalogue, inventory (stock in/out), reporting, and authorization.

Avoid calling the database directly from browser components.

## 3. Authentication

### 3.1 Sign-in

Use Clerk with Google OAuth for the initial release. *(Planned — Clerk is not installed or connected yet.)*

The authentication flow is:

1. The user opens `/sign-in`, which shows **Login as: User | Staff | Admin** (User selected initially) above Clerk's Google sign-in. The selection becomes `?as=user|staff|admin`.
2. The user signs in through Clerk; Clerk establishes the authenticated session.
3. Clerk redirects to the server route `/auth/continue?as=…`.
4. Ziggy validates the session server-side and resolves (or creates) the internal `users` row. A new row has **no membership**.
5. Ziggy loads the user's `workspace_members` row and requires `status = ACTIVE`.
6. Ziggy chooses the landing route (§4.4) and redirects. The backend verifies membership again on every later request.

The "Login as" choice only communicates a *requested destination*. It never creates or modifies a role, and nothing is granted automatically on sign-up.

### 3.2 Internal user mapping

Maintain a database record mapping the Clerk user identifier to Ziggy's internal user ID.

The backend must not trust a client-supplied user ID to establish identity.

### 3.3 Session handling

- Use supported Clerk session mechanisms.
- Do not store session tokens in application-managed browser storage unnecessarily.
- Never expose secret authentication keys to the frontend.
- Enforce secure cookie and HTTPS settings in production.
- Ensure suspended users and revoked memberships lose access promptly.

## 4. Authorization Model

### 4.1 Workspace-based authorization

Every business request is scoped to the caller's authorized workspace. In the prototype there is one seeded workspace and one seeded location. The server resolves the workspace from the caller's `ACTIVE` membership; **the client never supplies a workspace id** (no `workspace_id` in URLs, bodies, or query strings). Multi-workspace selection is deferred.

### 4.2 Roles and permissions

Roles are `USER`, `STAFF`, and `ADMIN` and are nested (`ADMIN` ⊇ `STAFF` ⊇ `USER`). `USER` is a proposed interpretation of the third dashboard. There is no super-admin and no supplier role.

The permissions matrix is defined once, in [`TEAM_HANDOFF.md`](../TEAM_HANDOFF.md) §4, and applies unchanged to every endpoint in §6. Summary:

- **USER:** read products, categories, and stock status.
- **STAFF:** everything USER can do, plus view suppliers, record stock in/out, view movement history, low-stock alerts, and the dashboard summary.
- **ADMIN:** everything STAFF can do, plus manage products, categories, suppliers, members, thresholds, reports/exports, and audit history.

Enforcement is server-side in a shared helper (`requireRole(min)`); hiding a link or button in the UI is never access control. Reversing a movement is an ADMIN-only stretch goal.

### 4.3 Authorization checks

For each request:

1. Authenticate the caller (Clerk).
2. Resolve the internal user.
3. Confirm `ACTIVE` workspace membership (no membership or `SUSPENDED` → no data).
4. Check the minimum role for the operation.
5. Verify that every referenced entity (product, category, supplier, location) belongs to the authorized workspace.
6. Execute the operation.

Never authorize access solely because a record ID exists or because a client sends a particular id.

Failures: unauthenticated → `401`; authenticated but insufficient role or no/suspended membership → `403`. Pages respond to the same conditions with a redirect (see §4.4).

### 4.4 Dashboard destination handling

| Requested `as` | Allowed when role is | Landing route |
|---|---|---|
| `user` (default, also used for any unrecognized value) | USER, STAFF, ADMIN | `/inventory` |
| `staff` | STAFF, ADMIN | `/dashboard` |
| `admin` | ADMIN | `/admin` |

- If the role covers the request, redirect to its landing route.
- If the role is lower than requested, redirect to the highest landing route the role allows and show a notice (for example, "Your account does not have Admin access"). The role is not changed.
- No membership or `SUSPENDED` → `/access-required`.
- Redirect targets come only from this table. A client-supplied `redirect_url` or path is never followed (prevents open redirects).
- Direct URL access is checked independently: a STAFF user opening `/admin` or calling an ADMIN API is rejected by the server; a USER opening `/dashboard` or calling `POST /stock-in` is rejected the same way.
- Signed-out visitors may load `/`, `/sign-in`, and `/sign-up` only. These pages contain no private inventory or supplier data.

## 5. API Conventions

### Base path

`/api/v1`

### Content type

Requests with JSON bodies use:

`Content-Type: application/json`

### Naming

Use plural resource names and explicit action endpoints for state-changing operations.

Examples:

- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/{productId}`
- `PATCH /api/v1/products/{productId}`
- `POST /api/v1/stock-in`
- `POST /api/v1/products/{productId}/deactivate`

### Pagination

Use cursor-based pagination for large or frequently changing datasets where practical.

Example query parameters:

- `limit`
- `cursor`
- `search`
- `sort`
- `status`
- `locationId`

Enforce a maximum page size.

### Filtering and sorting

Allow only explicitly supported filters and sort fields. Do not directly interpolate user-provided values into SQL identifiers or SQL fragments.

## 6. Endpoint Catalogue

The workspace is **resolved on the server** from the caller's `ACTIVE` membership (the prototype has one seeded workspace). Clients never send a workspace id. Roles in the tables are the *minimum* role (`USER` < `STAFF` < `ADMIN`); the full permissions matrix is in [`TEAM_HANDOFF.md`](../TEAM_HANDOFF.md) §4. **None of these endpoints exist yet** (`src/app/api` has not been created).

### 6.1 Session and members

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| GET | `/me` | any member | Caller's role, status, and landing route |
| GET | `/members` | ADMIN | List members |
| GET | `/members/pending` | ADMIN | Signed-in users who have no membership yet |
| POST | `/members` | ADMIN | Grant a role to an existing user (never automatic) |
| PATCH | `/members/{userId}` | ADMIN | Change role or suspend |
| GET, PATCH | `/settings` | ADMIN | Default low-stock threshold |
| GET | `/audit-logs` | ADMIN | Audit history |

Sign-in landing is handled by the page route `/auth/continue?as=user|staff|admin` (not an API). It treats `as` as a *request* only; see §4.4.

### 6.2 Products

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| GET | `/products` | USER | List/search. Filters: `search`, `categoryId`, `stock=all\|low\|out`, `status=active\|archived` (`archived` requires ADMIN), `sort`, `limit`, `cursor` |
| POST | `/products` | ADMIN | Create. Optional `openingQuantity` creates an `OPENING_STOCK` movement in the same transaction |
| GET | `/products/{id}` | USER | Detail with stock quantity and status |
| PATCH | `/products/{id}` | ADMIN | Edit name, description, category, unit label, threshold. **Cannot change quantity** |
| DELETE | `/products/{id}` | ADMIN | Only if the product has no stock movements; otherwise `409 PRODUCT_HAS_HISTORY` |
| POST | `/products/{id}/deactivate` | ADMIN | Archive |
| POST | `/products/{id}/reactivate` | ADMIN | Restore |

### 6.3 Categories and suppliers

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| GET | `/categories` | USER | List |
| POST, PATCH, DELETE | `/categories`, `/categories/{id}` | ADMIN | Manage. Delete rejected (`409 CATEGORY_IN_USE`) while products use it |
| GET | `/suppliers`, `/suppliers/{id}` | STAFF | View |
| POST, PATCH | `/suppliers`, `/suppliers/{id}` | ADMIN | Manage |
| DELETE | `/suppliers/{id}` | ADMIN | Only if no movement references it; else `409` and use deactivate |
| POST | `/suppliers/{id}/deactivate` | ADMIN | Archive |

### 6.4 Stock in, stock out, and history

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| POST | `/stock-in` | STAFF | Record a purchase / opening stock / return in. One product per request. `Idempotency-Key` **required** |
| POST | `/stock-out` | STAFF | Record an issue (stock leaving inventory). One product per request. `Idempotency-Key` **required**. `422 INSUFFICIENT_STOCK` if quantity exceeds available |
| GET | `/stock-movements` | STAFF | Search history. Filters: `productId`, `type`, `supplierId`, `from`, `to`, `actorId`; cursor paging |
| GET | `/stock-movements/{id}` | STAFF | Movement detail |
| POST | `/stock-movements/{id}/reverse` | ADMIN | *Stretch goal.* Creates a compensating movement; never edits the original |

Request bodies carry `productId`, `quantity` (decimal string, `> 0`), `reasonCode`, optional `supplierId`, `unitCost`, `reference`, `note`, `occurredAt`. Actor and workspace come from the session. Saving a confirmed request **posts** it: there are no draft stock documents in the MVP, and a request that fails changes nothing.

### 6.5 Summaries, alerts, and reports

| Method | Endpoint | Min role | Purpose |
|---|---|---|---|
| GET | `/dashboard/summary` | STAFF | Product count, total units, low and out-of-stock counts, recent movements |
| GET | `/alerts/low-stock` | STAFF | Active products where `quantity <= threshold` (rule in doc 03) |
| GET | `/reports/stock-summary` | ADMIN | Stock by product/category. `?format=csv` for export |
| GET | `/reports/movements` | ADMIN | Movement report for a date range. `?format=csv` for export |

Users see stock status through `GET /products`; they do not get the alerts or summary endpoints.

### 6.6 Deferred endpoints (reference only — not required for the prototype)

The v1.0 catalogue for workspaces/invitations, `/locations`, `/products/{id}/units`, `/purchase-orders`, `/goods-receipts`, `/sales`, `/stock-issues`, `/transfers`, `/stock-adjustments`, `/reports/inventory-valuation`, `/reports/sales-summary`, and `/intelligence/*` is **deferred**. The posting patterns in §10 for receipts, sales, and transfers remain valid reference when those features are built.

> **Removed (superseded):** shop, cart, checkout, customer-order, and customer-account endpoints. Ziggy has no consumer storefront.

## 7. Request Validation

Use Zod or an equivalent schema-validation library at the API boundary.

Validate:

- UUID formats.
- Required fields.
- String length limits.
- Supported status transitions.
- Numeric ranges and decimal precision.
- Positive quantities where required.
- Valid product units and conversions.
- Date and timestamp formats.
- Workspace and location relationships.
- Maximum request payload sizes.
- Supported filter and sort values.

The server must recalculate authoritative values such as stock availability and resulting quantity (and, in deferred features, inventory value and weighted-average cost).

Do not trust client-calculated quantities or totals.

## 8. Error Response Format

Use a consistent error envelope.

Example:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "There is not enough stock to complete this operation.",
    "requestId": "server-generated-request-id",
    "details": {
      "productId": "example-product-id",
      "availableQuantity": "8",
      "requestedQuantity": "12"
    }
  }
}
```

The example is illustrative; production identifiers and quantities must come from the actual request and database.

Recommended status codes:

| HTTP status | Meaning |
|---|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 400 | Malformed request |
| 401 | Unauthenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found or intentionally concealed |
| 409 | State conflict, duplicate operation, or inventory conflict |
| 422 | Valid request structure but invalid business rules |
| 429 | Rate limit exceeded |
| 500 | Unexpected server failure |

Do not expose SQL errors, stack traces, secrets, or internal service details.

## 9. Idempotency

Stock-changing requests must be safe against duplicate submissions and network retries.

For eligible endpoints, accept an `Idempotency-Key` header.

Example:

```http
POST /api/v1/stock-out
Idempotency-Key: unique-client-operation-key
```

The server must associate the key with the authenticated workspace and operation. Store the operation outcome so a legitimate retry can return the original result.

Requirements:

- Reusing the same key with the same operation returns the original outcome.
- Reusing a key with a different request payload returns a conflict.
- The key and the resulting stock movement must be persisted atomically or coordinated through a reliable transaction design.
- Keys must have defined retention and cleanup rules.

An idempotency key does not replace database constraints or concurrency control.

## 10. Inventory Transaction Safety

All stock-posting operations must run through shared domain services (callable from API routes and tests alike).

### Posting stock in / stock out (MVP)

`POST /stock-in` and `POST /stock-out` create and post a movement in one step. There is no draft stage; a failed request changes nothing.

1. Authenticate and authorize (`STAFF` or above).
2. Validate the body with Zod (positive decimal quantity, allowed `reasonCode` for the direction, product and optional supplier belong to the caller's workspace, product is active).
3. Begin a transaction.
4. Look up the `Idempotency-Key` for this workspace and operation. Same key + same payload hash → return the stored result. Same key + different payload → `409`.
5. Lock the `inventory_balances` row for the product/location (`SELECT … FOR UPDATE`, or a conditional `UPDATE … WHERE quantity_on_hand >= :qty RETURNING`). Create the row at zero if missing.
6. For `STOCK_OUT`, verify `quantity_on_hand >= quantity`; otherwise roll back with `422 INSUFFICIENT_STOCK`.
7. Insert the immutable `stock_movements` row (actor, timestamp, type, reason, reference, `balance_after`).
8. Update the balance, store the idempotency record, and write an audit row.
9. Commit. Any failure rolls back the whole transaction.

Two simultaneous stock-outs for the same product must serialize on the balance lock; the second sees the reduced quantity. Quantities are decimal strings/`numeric` end to end — never JavaScript floats.

Reversal (ADMIN, stretch goal) inserts a compensating movement with `reverses_movement_id`; it never edits or deletes the original and is also blocked if it would make stock negative.

### Deferred posting flows (reference only)

The receipt, sale, and transfer flows below describe future purchase-order, sales, and multi-location features. They are **not required** for the college prototype.

### Posting a receipt *(deferred)*

1. Authenticate and authorize.
2. Validate the receipt and destination location.
3. Lock or safely serialize the relevant order lines and inventory balances.
4. Check remaining receivable quantities.
5. Insert stock movements.
6. Update inventory balances.
7. Recalculate inventory valuation.
8. Mark the receipt as posted.
9. Record the audit event.
10. Commit.

### Posting a sale *(deferred)*

1. Authenticate and authorize.
2. Lock or safely serialize affected balances.
3. Verify stock availability.
4. Calculate outgoing inventory cost.
5. Insert stock movements.
6. Update balances and valuations.
7. Mark the sale as posted.
8. Record the audit event.
9. Commit.

### Posting a transfer *(deferred)*

1. Validate source and destination locations.
2. Lock both locations' affected balances in a deterministic order.
3. Verify sufficient source stock.
4. Insert linked outgoing and incoming movements.
5. Update both balances and their valuations.
6. Mark the transfer as posted.
7. Record the audit event.
8. Commit.

Any failure must roll back the entire database transaction.

## 11. Database Access and Tenant Isolation

Every database operation involving workspace data must be scoped to an authorized workspace.

Use:

- Composite foreign keys where appropriate.
- Workspace-scoped unique constraints.
- Parameterized queries or safe ORM query builders.
- Explicit authorization checks.
- Transactional writes for stock-changing operations.

If PostgreSQL Row-Level Security is enabled, validate its behavior with the selected Neon connection and pooling configuration.

The application must never assume that an opaque UUID is sufficient authorization to access a record.

## 12. File Upload Security *(deferred — product images are not in the MVP)*

Product image uploads should use signed object-storage URLs.

The backend must:

1. Authenticate and authorize the request.
2. Validate permitted file types and size.
3. Generate an unpredictable object key.
4. Issue a short-lived upload URL.
5. Verify the uploaded object before associating it with a product.
6. Store the object key and metadata in PostgreSQL.

Do not expose storage credentials to the browser. Do not trust the original filename or content type without verification.

## 13. Rate Limiting and Abuse Prevention

*MVP: optional. Implement basic limits only if time allows; the AI and upload items below are deferred.*

Apply appropriate rate limits to:

- Authentication-adjacent endpoints.
- Member-management endpoints.
- Image-upload URL generation.
- Expensive report queries.
- AI generation requests.
- Repeated failed or suspicious requests.

Apply stricter controls to resource-intensive endpoints. Rate limits must not interfere with normal bulk inventory operations; legitimate bulk workflows should have explicit limits and validation.

## 14. Audit Logging

Record meaningful events, including:

- Role grants, role changes, and suspensions.
- Workspace setting changes (including the default low-stock threshold).
- Product, category, and supplier creation, edits, archiving, and deletion.
- Stock-in and stock-out posting.
- Transaction reversals (stretch goal).
- Repeated duplicate-posting attempts.
- Sensitive permission failures.

Each relevant event should capture the workspace, actor, action, affected entity, timestamp, and minimal useful context.

Audit records must not contain authentication secrets or unnecessary personal information.

## 15. Security Headers and Browser Protection

Configure production security controls appropriate to the application, including:

- HTTPS.
- Secure session handling.
- A suitable Content Security Policy.
- Appropriate frame and content-type protections.
- Safe CORS configuration if cross-origin access is required.
- CSRF protection where applicable to the authentication and cookie model.
- Secure handling of redirects and uploaded content.

Do not use wildcard CORS rules for credentialed requests.

## 16. API Testing

### Authentication and authorization

- Unauthenticated requests are rejected (`401`).
- A signed-in user with no membership, or a `SUSPENDED` member, gets no data (`403` / access-required).
- `USER` cannot call `POST /stock-in`, `POST /stock-out`, `/stock-movements`, `/suppliers`, `/dashboard/summary`, or any ADMIN endpoint.
- `STAFF` cannot call ADMIN endpoints (product/category/supplier writes, members, reports, audit, settings).
- The "Login as" value (`as=`) never changes a role; an unknown value falls back to `user`; a client-supplied redirect URL is ignored.
- A user cannot access another workspace's records by changing IDs; cross-workspace product, category, and supplier references are rejected.

### Inventory integrity

- Stock in increases the quantity and creates exactly one movement; stock out decreases it.
- Stock out greater than available stock is rejected (`422`) and changes nothing.
- Duplicate submission with the same `Idempotency-Key` does not duplicate the movement; the same key with a different payload returns `409`.
- Concurrent stock-outs on the same product cannot take quantity below zero.
- A failed request rolls back completely (no movement without a balance change, and vice versa).
- A product with movements cannot be deleted (`409`); a product without movements can.
- Low-stock rule: `quantity <= threshold` is flagged, `quantity > threshold` is not; quantity 0 is out of stock.
- Reversals (if built) create compensating movements.

### Validation

- Invalid, zero, or negative quantities are rejected; quantities are handled as decimals.
- Unknown reason codes, or a reason that does not match the direction, are rejected.
- Client-provided totals or quantities-on-hand cannot override server calculations.
- Malformed identifiers and excessive payloads are rejected.

### Reliability

- Database errors result in transaction rollback.
- Sensitive details are not returned in error messages.

## 17. Definition of Done

The MVP API and security implementation is ready when:

1. All protected endpoints validate the caller's session.
2. Membership (`ACTIVE`) and role checks are enforced server-side on every page and endpoint.
3. Every referenced business record is verified against the authorized workspace.
4. All requests are validated at the API boundary.
5. Stock in/out use a transactional domain service with balance locking.
6. Idempotency and concurrency tests pass.
7. Consistent error responses are implemented.
8. Important actions generate audit records.
9. Secrets stay out of the client and out of git.
10. Cross-role and cross-tenant access tests pass.
11. API contracts are documented and version-controlled.

*Deferred before any production use:* signed-URL image uploads, rate limiting, security headers/CSP review, backup and restore testing.

**End of Document 05 — API & Security Specification**
