# Ziggy — Smart Inventory Management

**Version 1.0 · MVP specification · October 2026**

| | |
|---|---|
| **Product** | Ziggy |
| **Interfaces** | Ziggy Admin + Ziggy |
| **Platform** | Web SaaS |

---

## 1. Product overview

Ziggy is a multi-tenant inventory management SaaS designed for grocery shops, wholesalers, and distributors. It enables businesses to manage products, suppliers, purchasing, stock movements, sales, and inventory across multiple branches and warehouses.

Its AI-powered analytics help business owners identify stock-out risks, understand demand patterns, and make smarter replenishment decisions.

### Product interfaces

**Ziggy Admin** — for business owners and administrators.

- Inventory and location management
- Suppliers and purchase orders
- Reports and valuation
- AI insights
- Team and permissions

**Ziggy** — for daily inventory operations.

- Search and browse stock
- Record sales and issues
- View stock availability
- Review movement history
- Submit restock requests

## 2. Problem statement

Small and medium grocery businesses frequently manage stock using spreadsheets, paper registers, or disconnected systems. This can result in inaccurate stock counts, poor visibility across branches, delayed replenishment, and difficulty understanding which products are moving quickly.

Ziggy addresses these problems through centralized inventory records, traceable stock movements, purchasing workflows, and data-driven restocking recommendations.

## 3. Product goals

1. Maintain accurate inventory balances across multiple locations.
2. Reduce manual stock-management errors.
3. Track every stock receipt, sale, issue, return, and adjustment.
4. Prevent avoidable stock-outs through timely alerts.
5. Simplify supplier and purchase-order management.
6. Provide useful inventory and valuation reports.
7. Deliver explainable AI recommendations based on actual business data.
8. Securely isolate each business's data.

## 4. Target users

| Persona | Primary needs |
|---|---|
| Business owner/admin | Control inventory, manage staff, review reports and approve purchasing |
| Inventory staff | Find products, record stock movements and check availability |
| Warehouse/branch staff | Receive goods, transfer stock and maintain location accuracy |
| Purchasing manager | Track suppliers, purchase orders, receipts and reorder requirements |

For the MVP, purchasing manager responsibilities can be handled by the admin role.

## 5. Scope

### Included in the MVP

- Google authentication through Clerk.
- Business workspaces and invited staff.
- Multiple branches and warehouses.
- Product, category, and supplier management.
- Flexible product units and explicit unit conversions.
- Opening stock, receipts, sales, issues, returns, adjustments, and transfers.
- Purchase orders and partial receipts.
- Moving weighted-average inventory costing.
- Low-stock alerts and stock movement history.
- Inventory summaries, reports, and CSV export.
- AI-assisted demand forecasting, stock-out risk, and reorder recommendations.
- Responsive desktop and mobile web interfaces.
- Consumer storefront per workspace (see scope change below).

### Excluded from the MVP

- Full point-of-sale checkout and payment processing.
- Multi-store consumer marketplace (one storefront per workspace is in scope; a cross-store marketplace is not).
- Fresh-food and cold-chain workflows.
- Native mobile applications.
- Accounting software replacement.
- Automated AI purchasing or inventory mutations.
- GST invoicing and complex tax compliance.
- Batch, lot, and expiry tracking unless separately prioritized.

### Scope change — consumer storefront (October 2026)

The original MVP excluded a consumer marketplace. It now includes a **storefront for each workspace**, so shoppers can order from a single store:

- Shoppers browse the store's catalogue with live availability, add items to a cart, and place an order for home delivery or store pickup.
- Shoppers can view, edit, and cancel their own orders until the store confirms them.
- Store users manage customer orders: confirm, adjust quantities, pack, deliver, or cancel.
- Payment is collected on delivery or at pickup. Online payment processing stays out of scope.

Open decisions:

1. Does placing an order reserve stock, or is stock deducted only when the order is fulfilled?
2. Which location fulfils an online order, and can one order be fulfilled from several locations?
3. Are shoppers separate from workspace members (recommended), with their own customer record per store?
4. Doc 03 needs new tables (`customers`, `customer_addresses`, `customer_orders`, `customer_order_items`), and doc 05 needs shop endpoints.

## 6. Functional requirements

### FR-01 — Authentication and access

Users sign in with Google through Clerk. Admins invite staff. Roles are checked on the server, and users can access only authorized workspaces and locations.

### FR-02 — Product catalogue

Create, edit, search, filter, view, and archive products. Each product has a unique workspace SKU, category, base unit, conversion rules, reorder settings, and optional image.

### FR-03 — Branches and warehouses

Manage multiple locations and track quantities independently for each product at each location. Support authorized transfers between locations.

### FR-04 — Suppliers and purchasing

Maintain supplier records, create purchase orders, track expected deliveries, and receive goods partially or fully. Stock increases only when a receipt is posted.

### FR-05 — Stock movements

Record sales, manual issues, receipts, returns, adjustments, opening balances, and transfers. Every committed movement is traceable and immutable.

### FR-06 — Unit conversion and valuation

Normalize quantities to a product-specific base unit. Calculate inventory value using moving weighted-average cost per product and location.

### FR-07 — Alerts and reports

Generate low-stock and out-of-stock alerts. Provide inventory valuation, movement history, purchasing summaries, and fast-/slow-moving product reports.

### FR-08 — Ziggy Intelligence

Estimate demand, calculate days of stock coverage, identify stock-out risk, and recommend reorder quantities with supporting evidence and limitations.

### FR-09 — Consumer storefront and customer orders

Each workspace can publish a storefront at `/shop/{store}`. Shoppers place, view, edit, and cancel orders (editing and cancelling only before confirmation). Store users confirm, adjust, fulfil, and cancel orders. A fulfilled order deducts stock through the inventory engine as a posted sale, so it follows every stock rule in section 7 (atomic posting, no negative stock, traceable movements).

## 7. Core business rules

- A purchase order does not increase stock; a posted receipt does.
- A stock-changing operation must update the stock balance and ledger atomically.
- Negative stock is disallowed by default.
- Every movement records its actor, timestamp, product, location, quantity, and reason or reference.
- Stock movements cannot be silently edited or deleted. Corrections use compensating movements.
- Product units are converted using explicit conversion factors.
- Weighted-average cost is calculated per product per location.
- Transfers preserve the cost basis of the transferred stock.
- AI recommendations are advisory and cannot directly mutate inventory.
- All tenant-owned data is scoped to its business workspace.

## 8. Non-functional requirements

- Responsive and accessible UI.
- Secure server-side authentication and authorization.
- Tenant isolation across all database operations.
- Concurrency-safe stock updates.
- Validated inputs and idempotent stock-changing requests.
- Database backups and a tested recovery procedure before production.
- Clear loading, empty, success, and error states.
- Automated tests for stock integrity and authorization.
- Secrets kept out of client-side code.

## 9. MVP acceptance criteria

The MVP is acceptable when:

- An admin can create a workspace, add locations, invite staff, and manage products.
- Staff can perform permitted stock operations.
- Partial receipts update only the quantities actually received.
- Concurrent stock issues cannot oversell inventory.
- Weighted-average valuation is correct within the defined rounding policy.
- Transfers maintain correct quantities and valuation.
- Alerts and reports reconcile with the underlying records.
- AI insights display data periods, assumptions, and limitations.
- Users cannot access another workspace's information.
- Critical workflows pass automated tests.

## 10. Success metrics

During the pilot, measure:

- Inventory discrepancy rate.
- Frequency of stock-out incidents.
- Time required to receive and issue stock.
- Percentage of stock movements recorded in Ziggy.
- Forecast accuracy once sufficient historical data exists.
- Recommendation acceptance and dismissal rates.
- Failed or duplicate stock transaction rates.

Targets should be established after collecting baseline measurements from pilot businesses.

## 11. Explicit assumptions

- Initial market is India; workspace currency defaults to INR and is configurable.
- A workspace can contain multiple branches and warehouses.
- Users can belong to multiple workspaces, with a separate role in each.
- The MVP roles are Admin and Staff.
- Shelf-stable packaged groceries are the initial inventory domain.
- One canonical base unit is maintained per product.
- Object storage holds image files; Neon stores metadata and object keys.
- Products with transaction history are archived instead of deleted.
- AI forecasting quality depends on transaction history; new products use simpler rule-based guidance.
