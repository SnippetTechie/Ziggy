# Ziggy — API & Security Specification

**Document:** 05 — API & Security Specification  
**Version:** 1.0  
**Status:** Proposed for MVP implementation

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
- Shared domain services for inventory, purchasing, valuation, and authorization.

Avoid calling the database directly from browser components.

## 3. Authentication

### 3.1 Sign-in

Use Clerk with Google OAuth for the initial release.

The authentication flow is:

1. The user signs in through Clerk.
2. Clerk establishes the authenticated session.
3. Ziggy validates the session server-side.
4. The application resolves the internal user record.
5. The user selects or enters an authorized workspace.
6. The backend verifies workspace membership before returning business data.

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

Every business request must be scoped to an authorized workspace.

The workspace identifier can be provided through a route, validated request context, or another explicit application convention. Regardless of its source, the server must verify access.

### 4.2 Initial roles

| Action | ADMIN | STAFF |
|---|---|---|
| View inventory | Yes | Yes |
| View products | Yes | Yes |
| Create and edit products | Yes | As permitted by policy |
| View suppliers | Yes | Yes |
| Create purchase orders | Yes | Yes |
| Post goods receipts | Yes | Yes |
| Record sales and stock issues | Yes | Yes |
| Execute transfers | Yes | Yes |
| Post stock adjustments | Yes | Subject to policy |
| Manage workspace settings | Yes | No |
| Invite or suspend members | Yes | No |
| Change member roles | Yes | No |
| View audit history | Yes | Restricted |

This is the initial policy proposal. Before production, define whether staff may post adjustments, reverse transactions, export reports, or manage particular locations.

### 4.3 Authorization checks

For each request:

1. Authenticate the caller.
2. Resolve the internal user.
3. Confirm active workspace membership.
4. Check the required role or permission.
5. Verify that every referenced entity belongs to the authorized workspace.
6. Apply location-level restrictions if introduced.
7. Execute the operation.

Never authorize access solely because a record ID exists or because a client sends a particular `workspace_id`.

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
- `POST /api/v1/goods-receipts/{receiptId}/post`

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

The following endpoint catalogue is the proposed MVP contract. Detailed request and response schemas should be implemented alongside the routes.

### 6.1 Workspaces and members

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/workspaces` | List the caller's workspaces |
| GET | `/workspaces/{id}` | Retrieve authorized workspace details |
| PATCH | `/workspaces/{id}` | Update workspace settings |
| GET | `/workspaces/{id}/members` | List members |
| POST | `/workspaces/{id}/invitations` | Invite a member |
| PATCH | `/workspaces/{id}/members/{userId}` | Update role or status |

Workspace administration endpoints require appropriate permissions.

### 6.2 Locations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/locations` | List authorized locations |
| POST | `/locations` | Create a branch or warehouse |
| GET | `/locations/{id}` | Retrieve location details |
| PATCH | `/locations/{id}` | Update location details |
| POST | `/locations/{id}/deactivate` | Deactivate a location |

A location with historical inventory records should not be hard-deleted.

### 6.3 Products and units

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/products` | List products |
| POST | `/products` | Create a product |
| GET | `/products/{id}` | Retrieve product details |
| PATCH | `/products/{id}` | Update editable product fields |
| POST | `/products/{id}/deactivate` | Deactivate a product |
| GET | `/products/{id}/units` | List supported units |
| POST | `/products/{id}/units` | Add a unit conversion |
| GET | `/products/{id}/inventory` | Retrieve stock by location |

Do not allow an ordinary product update to rewrite unit conversions used by posted transactions.

### 6.4 Suppliers

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/suppliers` | List suppliers |
| POST | `/suppliers` | Create a supplier |
| GET | `/suppliers/{id}` | Retrieve supplier details |
| PATCH | `/suppliers/{id}` | Update supplier details |
| POST | `/suppliers/{id}/deactivate` | Deactivate a supplier |

### 6.5 Purchasing

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/purchase-orders` | List purchase orders |
| POST | `/purchase-orders` | Create a draft order |
| GET | `/purchase-orders/{id}` | Retrieve an order |
| PATCH | `/purchase-orders/{id}` | Update an eligible draft |
| POST | `/purchase-orders/{id}/submit` | Submit an order |
| POST | `/purchase-orders/{id}/cancel` | Cancel an eligible order |
| GET | `/goods-receipts` | List receipts |
| POST | `/goods-receipts` | Create a draft receipt |
| GET | `/goods-receipts/{id}` | Retrieve a receipt |
| PATCH | `/goods-receipts/{id}` | Update an eligible draft |
| POST | `/goods-receipts/{id}/post` | Post the receipt to inventory |
| POST | `/goods-receipts/{id}/reverse` | Initiate a controlled reversal |

A posted receipt creates stock movements. Creating or editing a draft does not.

### 6.6 Sales and stock issues

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/sales` | List sales |
| POST | `/sales` | Create a draft sale |
| GET | `/sales/{id}` | Retrieve a sale |
| PATCH | `/sales/{id}` | Update an eligible draft |
| POST | `/sales/{id}/post` | Deduct inventory |
| POST | `/sales/{id}/reverse` | Initiate a controlled reversal |
| GET | `/stock-issues` | List non-sale stock issues |
| POST | `/stock-issues` | Create a stock issue |
| POST | `/stock-issues/{id}/post` | Post the stock issue |

Sales and stock issues must remain distinguishable in the inventory ledger and reporting.

### 6.7 Transfers and adjustments

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/transfers` | List transfers |
| POST | `/transfers` | Create a transfer draft |
| GET | `/transfers/{id}` | Retrieve a transfer |
| POST | `/transfers/{id}/post` | Execute an immediate transfer |
| POST | `/transfers/{id}/reverse` | Initiate a controlled reversal |
| GET | `/stock-adjustments` | List adjustments |
| POST | `/stock-adjustments` | Create an adjustment |
| POST | `/stock-adjustments/{id}/post` | Post an adjustment |

A transfer must update both locations atomically in the MVP's immediate-transfer model.

### 6.8 Reports and intelligence

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/inventory/movements` | Search movement history |
| GET | `/reports/stock-summary` | Retrieve stock summaries |
| GET | `/reports/inventory-valuation` | Retrieve valuation data |
| GET | `/reports/low-stock` | Retrieve low-stock products |
| GET | `/reports/sales-summary` | Retrieve sales summaries |
| GET | `/intelligence/forecasts` | Retrieve demand forecasts |
| GET | `/intelligence/stockout-risks` | Retrieve stock-out risk estimates |
| GET | `/intelligence/reorder-recommendations` | Retrieve replenishment suggestions |

Long-running analytics should be generated asynchronously rather than blocking stock transactions.

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

The server must recalculate authoritative values such as inventory value, stock availability, and weighted-average cost.

Do not trust client-calculated totals or valuation figures.

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
POST /api/v1/goods-receipts/receipt-id/post
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

All stock-posting operations must run through shared domain services.

### Posting a receipt

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

### Posting a sale

1. Authenticate and authorize.
2. Lock or safely serialize affected balances.
3. Verify stock availability.
4. Calculate outgoing inventory cost.
5. Insert stock movements.
6. Update balances and valuations.
7. Mark the sale as posted.
8. Record the audit event.
9. Commit.

### Posting a transfer

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

## 12. File Upload Security

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

Apply appropriate rate limits to:

- Authentication-adjacent endpoints.
- Invitation endpoints.
- Image-upload URL generation.
- Expensive report queries.
- AI generation requests.
- Repeated failed or suspicious requests.

Apply stricter controls to resource-intensive endpoints. Rate limits must not interfere with normal bulk inventory operations; legitimate bulk workflows should have explicit limits and validation.

## 14. Audit Logging

Record meaningful events, including:

- Member invitations, role changes, and suspensions.
- Workspace setting changes.
- Product and location changes.
- Receipt, sale, adjustment, and transfer posting.
- Transaction reversals.
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

- Unauthenticated requests are rejected.
- Suspended members cannot perform protected actions.
- Staff cannot administer the workspace.
- A user cannot access another workspace's records by changing IDs.
- Cross-workspace product and location references are rejected.

### Inventory integrity

- Duplicate posting does not duplicate stock movements.
- Concurrent sales cannot oversell available stock.
- Failed transfers do not update only one location.
- Failed receipts do not partially update balances.
- Reversals create appropriate compensating movements.
- Weighted-average cost calculations use the correct location valuation.

### Validation

- Invalid quantities are rejected.
- Unsupported units are rejected.
- Invalid state transitions are rejected.
- Client-provided totals cannot override server calculations.
- Malformed identifiers and excessive payloads are rejected.

### Reliability

- Database errors result in transaction rollback.
- Retryable operations preserve idempotency.
- Background analytics failures do not block inventory operations.
- Sensitive details are not returned in error messages.

## 17. Definition of Done

The API and security implementation is ready when:

1. All protected endpoints validate the caller's session.
2. Workspace membership and role checks are enforced server-side.
3. Every referenced business record is verified against the authorized workspace.
4. All requests are validated at the API boundary.
5. Stock-posting endpoints use transactional domain services.
6. Idempotency and concurrency tests pass.
7. Consistent error responses are implemented.
8. File uploads use controlled object-storage access.
9. Important actions generate audit records.
10. Production secrets and security headers are configured.
11. Cross-tenant access tests pass.
12. API contracts are documented and version-controlled.

**End of Document 05 — API & Security Specification**
