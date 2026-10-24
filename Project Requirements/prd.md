# Ziggy — Online Inventory and Stock Management System

**Version 1.1 · Corrected MVP specification · October 2026**

| | |
|---|---|
| **Product** | Ziggy |
| **Project** | Online Inventory and Stock Management System for small businesses, college laboratories, or campus stores (college project) |
| **Dashboards** | USER, STAFF, ADMIN — role-based views of one application |
| **Platform** | Web application |

> **Scope correction (supersedes v1.0).** An earlier version added a consumer storefront (shop, cart, checkout, delivery, customer orders). That was a misreading of the problem statement and is **superseded and removed from the MVP**. The MVP is defined in sections 5–9 below and summarised for the team in [`TEAM_HANDOFF.md`](../TEAM_HANDOFF.md). Capabilities from v1.0 that are no longer required (purchase-order workflows, partial receipts, multi-location transfers, weighted-average costing, AI forecasting) are kept in the other docs as **deferred reference material** and are marked as such.

---

## 1. Product overview

Ziggy is an online inventory and stock management system for small businesses, college laboratories, and campus stores. It lets a team keep an accurate, auditable record of products, categories, suppliers, stock purchased (stock in), and stock issued (stock out), with automatic quantity updates, low-stock alerts, inventory summaries, and transaction history.

Ziggy keeps `workspace_id` on business data so tenant isolation is correct from the start, but the prototype runs with **one seeded workspace and one seeded location**.

### Dashboards (proposed interpretation of "three dashboards")

One application, one database, one set of inventory services, one design system. Roles nest: `ADMIN` ⊇ `STAFF` ⊇ `USER`. The `USER` role is a **proposed interpretation** of the requested third dashboard.

| Role | Dashboard | Purpose |
|---|---|---|
| `USER` | Inventory viewer — default | Search/filter products and check stock availability. Read-only: no cart, no checkout, no stock changes. |
| `STAFF` | Operations | Record stock in/out; review movement history and low-stock items. |
| `ADMIN` | Administration | Manage products, categories, suppliers, members; stock operations; low-stock alerts, summaries, reports. |

There is no super-admin platform and no supplier dashboard. The permissions matrix is in [`TEAM_HANDOFF.md`](../TEAM_HANDOFF.md) §4 and is the single source of truth.

## 2. Problem statement

Small businesses, college laboratories, and campus stores frequently manage stock using spreadsheets, paper registers, or disconnected systems. This results in inaccurate counts, unnoticed shortages, and no record of who took or received what.

Ziggy addresses these problems through a central product catalogue, traceable stock movements, automatic quantity updates, and simple low-stock alerts and summaries.

## 3. Product goals

1. Keep accurate, server-trusted stock quantities for every product.
2. Record every stock purchase (stock in) and issue (stock out) with who, when, how much, and why.
3. Update quantities automatically and atomically when a movement is saved.
4. Warn users about low stock before it runs out.
5. Show inventory summaries and searchable transaction history.
6. Restrict what each role can see and do, enforced on the server.

## 4. Target users

| Persona | Role | Primary needs |
|---|---|---|
| Student, lab member, other store visitor | `USER` | Look up products and check whether something is in stock |
| Store keeper / lab technician | `STAFF` | Record stock arriving and leaving; see recent movements and low-stock items |
| Owner / lab manager / supervisor | `ADMIN` | Maintain the catalogue, categories, suppliers and members; review alerts, summaries and reports |

Suppliers are records in the system, not users.

## 5. Scope

### Included in the MVP

- Google authentication through Clerk; access decided by Ziggy's own membership table.
- Three role-based dashboards (USER, STAFF, ADMIN) in one application.
- Add, edit, view, and delete products (delete only when no stock history exists; otherwise archive).
- Category and supplier management.
- Stock in (purchases, opening stock, returns in) and stock out (issues) recorded as immutable movements.
- Automatic, server-calculated quantity updates; no negative stock.
- Low-stock alerts (`available quantity <= threshold`) and out-of-stock status.
- Inventory summaries, transaction history, and basic reports with CSV export.
- Responsive desktop and mobile web interfaces.
- One seeded workspace and one seeded location for the demonstration.

### Deferred (future enhancements, not prerequisites for the college prototype)

- Purchase-order approval workflows and partial goods receipts.
- Multiple branches/warehouses and stock transfers.
- Advanced unit conversions and moving weighted-average costing / valuation.
- AI forecasting and reorder recommendations (Ziggy Intelligence).
- Product image uploads, batch/lot/expiry tracking, GST invoicing, native mobile apps.
- Member invitation emails and multi-workspace onboarding.

### Excluded (not part of this project)

- **Consumer storefront, shopping cart, checkout, delivery, shopper accounts, and customer-order fulfilment.** These were added in v1.0 by mistake and are **superseded**.
- Point-of-sale and payment processing; accounting software replacement.
- A super-admin/platform dashboard and a supplier dashboard.
- Autonomous AI purchasing or inventory mutation.

## 6. Functional requirements

### FR-01 — Authentication and access

Users sign in with Google through Clerk. The sign-in page offers **Login as: User | Staff | Admin** (User selected initially); this only states the requested destination and never creates or changes a role. After sign-in the server checks `ACTIVE` membership and the member's role before granting any dashboard. New sign-ups have no membership and no automatic promotion; an Admin grants a role. Users without membership see an access-required state. Visiting `/` opens the User-facing inventory entry; signed-out visitors see explanatory content and a sign-in button, and no private inventory or supplier data.

### FR-02 — Product management

Admins add, edit, view, archive, and delete products. Each product has a unique SKU within the workspace, name, optional description, category, unit label (e.g. pcs, kg, box), and low-stock threshold. All roles can view and search/filter products and see stock status. A product with any stock history cannot be deleted; it is archived (deactivated) instead.

### FR-03 — Categories and suppliers

Admins create, edit, and delete categories (not while products use them) and manage suppliers (deleted only with no history, otherwise deactivated). Staff can view suppliers. Users can view categories but not suppliers.

### FR-04 — Stock in and stock out

Staff and Admins record **stock in** (purchases from a supplier, opening stock, returns in) and **stock out** (issues: stock leaving inventory — used, consumed, sold, damaged, lost). Each movement stores product, quantity, type, reason/reference, actor, and timestamp. Saving a confirmed movement updates the quantity and history in one transaction.

### FR-05 — Automatic quantity updates

Product quantity is derived from posted movements and kept in `inventory_balances`; it is never edited directly. A stock out cannot exceed available stock, including under simultaneous requests. Repeated submission of the same request does not duplicate the change.

### FR-06 — Low-stock alerts

A product is **low stock** when `available quantity <= configured threshold` (product threshold, else the workspace default). Quantity 0 is shown as **out of stock**. Alerts appear on the Staff and Admin dashboards and as status badges for Users.

### FR-07 — Summaries, history, and reports

Staff and Admins view an inventory summary (product counts, total units, low and out-of-stock counts, recent movements) and a searchable movement history. Admins also get stock-summary and movement reports with CSV export.

### FR-08 — Members and audit

Admins view pending users, grant or change roles, and suspend members. Significant actions (product changes, stock movements, role changes) are recorded in an audit log viewable by Admins.

### Deferred requirements (reference only)

Purchase orders, partial receipts, transfers, valuation, and AI insights (formerly FR-03/04/06/08 in v1.0) remain described in docs 02–07 as deferred reference. They are not required to complete the prototype.

## 7. Core business rules

- Stock changes only when a stock movement is **saved as confirmed** (posted). The MVP has no separate draft documents; if drafts are ever added, they never change stock.
- Saving a movement updates the movement history and the stock balance atomically; any failure rolls everything back.
- A stock out cannot exceed available stock. Negative stock is disallowed. Concurrent requests are serialized by locking the balance row.
- Every movement records product, quantity, type, actor, timestamp, and reason/reference.
- Movements are immutable. Corrections use compensating (reversal) movements; there is no edit or delete of a movement.
- Repeated submission (double click, network retry) must not duplicate a stock change: stock-changing requests carry an `Idempotency-Key`.
- A product with any movement is archived, never deleted. A product with none can be deleted.
- Low stock is defined once: `available quantity <= configured threshold` (active products only).
- **Issue** means stock leaving inventory. It is not a complaint or support ticket.
- Quantities and money use decimal arithmetic, never floating point. The server calculates all quantities; client-supplied totals are ignored.
- Roles are enforced on the server for every request; the UI only hides what the server would reject.
- All data is scoped to the workspace resolved from the caller's membership; the client never supplies a workspace id.
- Advanced rules from v1.0 (purchase-order receipts, unit conversions, weighted-average cost, transfers, AI advisory limits) are **deferred**; see docs 02–07.

## 8. Non-functional requirements

- Responsive and accessible UI.
- Secure server-side authentication and authorization.
- Tenant isolation across all database operations.
- Concurrency-safe stock updates.
- Validated inputs and idempotent stock-changing requests.
- Clear loading, empty, success, and error states.
- Automated tests for stock integrity and authorization.
- Secrets kept out of client-side code.
- Database backups and a tested recovery procedure are recommended before any real-world deployment (not required for the college demonstration).

## 9. MVP acceptance criteria

The MVP is acceptable when the following demonstration works end to end:

**Admin login → add products → record stock in/out → quantities update → low-stock alerts → reports**

and:

- An Admin signs in with Google and lands on `/admin`; a signed-in user with no membership sees the access-required state and no data.
- An Admin can add, edit, view, archive, and delete products (delete only without history), and manage categories and suppliers.
- Staff can record stock in and stock out; a User cannot, and a Staff member cannot open admin pages or call admin APIs (server returns 403).
- Quantities update automatically after each movement; the movement appears in history with actor, timestamp, type, quantity, and reason/reference.
- A stock out larger than available stock is rejected; two simultaneous stock outs cannot take quantity below zero.
- Submitting the same stock request twice (same idempotency key) changes quantity once.
- A product at or below its threshold appears as a low-stock alert; quantity 0 shows out of stock.
- The dashboard summary and reports reconcile with the movement history.
- A user cannot access another workspace's data by changing IDs.
- Critical flows (access control, stock in/out, concurrency, idempotency, low-stock rule) have automated tests.

## 10. Success metrics

For a college prototype these are optional. If measured during a pilot:

- Inventory discrepancy rate.
- Frequency of items running out.
- Time required to record stock in and out.
- Percentage of stock movements recorded in Ziggy.
- Failed or duplicate stock transaction rates.

Targets can be set after collecting baseline measurements.

## 11. Explicit assumptions

- Default currency is INR (used only if a unit cost is recorded); the prototype does not value inventory.
- One seeded workspace and one seeded location; tables keep `workspace_id`/`location_id` so isolation and a later multi-location extension remain valid.
- Roles are `USER`, `STAFF`, `ADMIN` (nested). `USER` is a proposed interpretation of the third dashboard.
- The first Admin is created by a seed script; other users are granted roles by an Admin. There is no automatic membership.
- One product per stock-in/stock-out submission; each product has a simple unit label and no unit conversions.
- Products with movement history are archived instead of deleted.
- Product images, valuation, and AI forecasting are deferred.
