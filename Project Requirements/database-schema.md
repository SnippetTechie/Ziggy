# Ziggy — Database Schema Specification

**Document:** 03 — Database Schema  
**Version:** 1.0  
**Database:** Neon PostgreSQL  
**Status:** Proposed schema for MVP

## 1. Database Design Principles

The database must:

- Support multiple businesses and multiple locations per business.
- Prevent users from accessing another workspace's data.
- Preserve a traceable history of inventory transactions.
- Maintain accurate quantities and inventory valuation.
- Support partial purchase receipts.
- Support product-specific unit conversions.
- Provide reliable reporting and AI analytics.
- Enforce integrity through database constraints and transactions.

### Naming conventions

- Table and column names use `snake_case`.
- Primary keys use UUIDs.
- Timestamps are stored as `timestamptz` in UTC.
- Monetary values and unit costs use `numeric`, never floating-point types.
- Quantities use `numeric` to support fractional units.
- Business-owned records include `workspace_id` wherever appropriate.
- Posted inventory transactions are not silently overwritten.

## 2. Entity Relationship Overview

```mermaid
erDiagram
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
    WORKSPACES ||--o{ LOCATIONS : owns
    WORKSPACES ||--o{ PRODUCTS : owns
    WORKSPACES ||--o{ SUPPLIERS : owns

    WORKSPACES ||--o{ PRODUCT_CATEGORIES : defines
    PRODUCTS }o--o| PRODUCT_CATEGORIES : classified_as
    PRODUCTS ||--o{ PRODUCT_UNITS : supports

    LOCATIONS ||--o{ INVENTORY_BALANCES : holds
    PRODUCTS ||--o{ INVENTORY_BALANCES : tracked_as
    PRODUCTS ||--o{ STOCK_MOVEMENTS : affected_by
    LOCATIONS ||--o{ STOCK_MOVEMENTS : records

    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : contains
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : fulfilled_by
    GOODS_RECEIPTS ||--o{ GOODS_RECEIPT_ITEMS : contains

    WORKSPACES ||--o{ SALES : records
    SALES ||--o{ SALE_ITEMS : contains

    WORKSPACES ||--o{ AUDIT_LOGS : records
    WORKSPACES ||--o{ FORECASTS : generates
    WORKSPACES ||--o{ REORDER_RECOMMENDATIONS : generates
```

The diagram is conceptual. Production migrations must include all foreign keys, composite constraints, and transaction-source relationships described below.

## 3. Workspace and User Tables

### 3.1 `workspaces`

Represents a business account.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | Required |
| `slug` | TEXT | Unique |
| `default_currency` | CHAR(3) | Default `INR` |
| `timezone` | TEXT | Required |
| `settings` | JSONB | Default empty object |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

The workspace's default currency is configurable. Currency changes must not silently reinterpret historical financial values.

### 3.2 `users`

Stores the application's internal user profile linked to Clerk.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `clerk_user_id` | TEXT | Unique, required |
| `display_name` | TEXT | Optional |
| `email` | TEXT | Optional |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Clerk remains the authentication provider. Passwords and authentication secrets must not be stored in this table.

### 3.3 `workspace_members`

Associates users with businesses.

| Column | Type | Rules |
|---|---|---|
| `workspace_id` | UUID | FK to workspaces |
| `user_id` | UUID | FK to users |
| `role` | TEXT | `ADMIN` or `STAFF` |
| `status` | TEXT | `ACTIVE` or `SUSPENDED` |
| `created_at` | TIMESTAMPTZ | Required |

**Primary key:** `(workspace_id, user_id)`

A user can belong to multiple workspaces, with a separate role in each. Membership status must be checked before access is granted.

## 4. Locations

### `locations`

Represents a branch or warehouse.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | FK to workspaces |
| `name` | TEXT | Required |
| `code` | TEXT | Required within workspace |
| `location_type` | TEXT | `BRANCH` or `WAREHOUSE` |
| `address` | JSONB | Optional |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Constraints:

- Unique `(workspace_id, code)`.
- Foreign keys must prevent cross-workspace references.
- Referenced locations should be deactivated rather than deleted when historical transactions exist.

## 5. Product Catalogue

### 5.1 `product_categories`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | FK to workspaces |
| `name` | TEXT | Required |
| `parent_id` | UUID | Optional self-reference |
| `created_at` | TIMESTAMPTZ | Required |

Unique category names may be enforced within the relevant parent/category scope.

### 5.2 `products`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | FK to workspaces |
| `category_id` | UUID | Optional FK |
| `sku` | TEXT | Required within workspace |
| `name` | TEXT | Required |
| `description` | TEXT | Optional |
| `base_unit_code` | TEXT | Required |
| `barcode` | TEXT | Optional |
| `image_object_key` | TEXT | Optional |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Constraints:

- Unique `(workspace_id, sku)`.
- If barcode uniqueness is required, enforce it within the workspace.
- Product references must remain valid for historical transactions.
- Product images are stored in object storage; the database holds the object key.

The base unit defines how inventory quantities are stored. For example, a product sold in bags may use `kg` as its base stock unit, with a conversion of one bag to 25 kg.

### 5.3 `product_units`

Stores supported units and conversions for each product.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Required |
| `product_id` | UUID | FK to products |
| `unit_code` | TEXT | Required |
| `conversion_to_base` | NUMERIC(20,8) | Greater than zero |
| `is_base_unit` | BOOLEAN | Default false |

Constraints:

- Unique `(product_id, unit_code)`.
- Exactly one base unit per product.
- The base unit conversion equals 1.
- Conversion definitions used by posted transactions must not be changed retroactively.

If a business changes packaging or a conversion factor, create a controlled version or new unit definition so historical quantities remain interpretable.

## 6. Suppliers

### `suppliers`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | FK to workspaces |
| `name` | TEXT | Required |
| `contact_name` | TEXT | Optional |
| `email` | TEXT | Optional |
| `phone` | TEXT | Optional |
| `address` | JSONB | Optional |
| `notes` | TEXT | Optional |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Supplier details are workspace-specific. The same supplier may be entered separately by different businesses.

## 7. Purchasing Tables

### 7.1 `purchase_orders`

Represents a procurement order.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Required |
| `supplier_id` | UUID | Required |
| `destination_location_id` | UUID | Required |
| `order_number` | TEXT | Unique within workspace |
| `status` | TEXT | See statuses below |
| `ordered_at` | TIMESTAMPTZ | Required |
| `expected_at` | TIMESTAMPTZ | Optional |
| `currency_code` | CHAR(3) | Required |
| `notes` | TEXT | Optional |
| `created_by` | UUID | FK to users |
| `created_at` | TIMESTAMPTZ | Required |
| `updated_at` | TIMESTAMPTZ | Required |

Suggested statuses:

- `DRAFT`
- `SUBMITTED`
- `PARTIALLY_RECEIVED`
- `RECEIVED`
- `CANCELLED`

The valid state transitions must be enforced by application logic.

### 7.2 `purchase_order_items`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Required |
| `purchase_order_id` | UUID | Required |
| `product_id` | UUID | Required |
| `ordered_quantity` | NUMERIC(20,6) | Greater than zero |
| `unit_code` | TEXT | Required |
| `conversion_to_base_snapshot` | NUMERIC(20,8) | Greater than zero |
| `unit_cost` | NUMERIC(20,6) | Non-negative |
| `created_at` | TIMESTAMPTZ | Required |

Store the conversion factor used when the order was created so subsequent unit-definition changes do not alter historical order quantities.

### 7.3 `goods_receipts`

Represents a physical receipt against a purchase order.

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Required |
| `purchase_order_id` | UUID | Required |
| `receipt_number` | TEXT | Unique within workspace |
| `status` | TEXT | `DRAFT`, `POSTED`, `REVERSED` |
| `received_at` | TIMESTAMPTZ | Required |
| `posted_at` | TIMESTAMPTZ | Optional |
| `created_by` | UUID | FK to users |
| `posted_by` | UUID | Optional FK to users |
| `created_at` | TIMESTAMPTZ | Required |

### 7.4 `goods_receipt_items`

| Column | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `workspace_id` | UUID | Required |
| `goods_receipt_id` | UUID | Required |
| `purchase_order_item_id` | UUID | Required |
| `product_id` | UUID | Required |
| `received_quantity` | NUMERIC(20,6) | Greater than zero |
| `base_quantity` | NUMERIC(20,6) | Greater than zero |
| `unit_cost` | NUMERIC(20,6) | Non-negative |
| `created_at` | TIMESTAMPTZ | Required |

The posting process must validate cumulative accepted receipts against the ordered quantity, unless an explicitly authorized over-receipt policy is introduced.

A posted receipt creates stock movements. Saving a draft receipt does
