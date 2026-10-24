# Ziggy — UI/UX Specification

**Document:** 04 — UI/UX Specification  
**Version:** 1.0  
**Status:** Corrected MVP design specification (proposed; wireframes only)

## 1. Design Vision

> **Scope correction.** Ziggy is an Online Inventory and Stock Management System for small businesses, college laboratories, and campus stores (PRD v1.1). It has **no consumer storefront**: no shop, cart, checkout, delivery, or shopper accounts. Everything below describes the corrected MVP; items marked *deferred* are future enhancements. Nothing here is built beyond clickable wireframes.

Ziggy's interface should help users answer five questions quickly:

1. What stock do I have?
2. What is running low?
3. What stock came in and went out, and who recorded it?
4. Which products and suppliers do we manage?
5. What should I pay attention to today?

The product should prioritize clarity, speed, and trustworthy data over decorative visual elements.

### Design principles

- **Clarity first:** quantities, units, statuses, and thresholds must be easy to understand.
- **Action-oriented:** recording stock in/out should take a few clicks.
- **Progressive disclosure:** show essential information first and advanced details when needed.
- **Consistent patterns:** forms, tables, dialogs, filters, and status indicators should behave consistently.
- **Responsive by default:** desktop is the primary workspace, with tablet and mobile support for everyday stock operations.
- **Accessible:** keyboard navigation, clear focus states, readable contrast, and accessible form labels.
- **Trustworthy:** saved movements, warnings, and quantity changes must be explicit; status is never conveyed by color alone.
- **Every screen has loading, empty, success, and error states.**

## 2. Dashboards and Entry Flow

Ziggy is **one application** with three role-based dashboards sharing one app shell, one design system, and one set of inventory services. They are not three separate apps. Roles nest: `ADMIN` ⊇ `STAFF` ⊇ `USER`. The `USER` dashboard is a proposed interpretation of the requested third dashboard. There is no super-admin platform and no supplier dashboard. The permissions matrix is in `TEAM_HANDOFF.md` §4.

| Role | Dashboard | Landing route | What it shows |
|---|---|---|---|
| `USER` | Inventory viewer (default) | `/inventory` | Product list with search, category and stock-status filters; product detail with quantity and status. No cart, no checkout, no stock-changing actions. |
| `STAFF` | Operations | `/dashboard` | KPIs, low-stock list, recent movements, quick **Stock in** (`/purchasing`) and **Stock out** (`/issues`), movement history (`/movements`), supplier list (read-only). |
| `ADMIN` | Administration | `/admin` | Summaries and alerts, plus management of products (`/products`), categories (`/categories`), suppliers (`/suppliers`), members (`/admin/team`), default threshold (`/admin/preferences`), reports (`/reports`), audit (`/admin/audit`). |

Navigation shows only what the signed-in role may use; the server enforces the same rules (hiding a link is not access control). Deferred nav items — Transfers, Ziggy Intelligence, Branches & warehouses, Units — are hidden in the MVP.

### Entry and sign-in

- **`/`** opens the User-facing inventory entry, not a picker of three dashboards. Signed-out visitors see the shared shell, a short explanation of Ziggy, and a **Sign in** call to action. No inventory or supplier data is rendered for them. A signed-in member is redirected to their landing route.
- **`/sign-in`** shows **Login as: User | Staff | Admin** (a segmented control, **User** selected initially) directly above the Google sign-in component. The selection only requests a destination; it never creates or changes a role. Helper text: "Your access depends on the role assigned to your account."
- After sign-in the server decides the destination (doc 05 §4.4): role covers the request → that dashboard; role is lower → the highest dashboard the role allows plus a notice; no membership or suspended → **`/access-required`**.
- **`/access-required`** explains that the account is signed in but has no active access, tells the user to ask an Admin to grant a role, shows no inventory data, and offers sign-out.
- Admins see signed-in users who have no role under **Pending access** in `/admin/team`.

### Core screens (MVP)

- **Product list** (`/inventory`, `/products`): table with SKU, name, category, quantity + unit, stock-status badge (**In stock**, **Low stock**, **Out of stock** — text plus icon). `/products` adds add/edit/archive/delete for Admins.
- **Stock in / Stock out forms** (`/purchasing`, `/issues`): product picker, quantity, reason, optional supplier/reference/note, confirmation step, success state showing the new quantity. The submit button is disabled while the request is in flight (the server also guards against duplicates). A rejected stock out shows the available quantity.
- **Movement history** (`/movements`): filterable table (product, type, date, actor) with quantity, resulting balance, reason, reference.
- **Dashboard / admin overview:** counts of products, units on hand, low-stock and out-of-stock items; low-stock list; recent movements.
- **Reports** (`/reports`, Admin): stock summary and movement report with CSV export.

*Deferred screens:* purchasing/receiving documents, transfers, locations, unit configuration, valuation, Ziggy Intelligence.

## 3. Visual Design System

### 3.1 Overall direction

Use a restrained, premium SaaS aesthetic:

- Neutral background surfaces.
- Clear typography hierarchy.
- Thin, subtle borders.
- Generous spacing without wasting screen space.
- Minimal shadows.
- Consistent icons.
- Strong emphasis on tables and data readability.
- One primary accent color used for actions and key highlights.

Avoid excessive gradients, glassmorphism, oversized rounded cards, and decorative charts that do not help users make decisions.

### 3.2 Color tokens

The following is the original proposed starting palette. **`DESIGN.md` overrides these color tokens and the typography below** for implementation; this document still governs UX (information priorities, page structure, accessibility).

| Token | Suggested value | Usage |
|---|---|---|
| Primary | `#2563EB` | Primary actions and selected controls |
| Background | `#F8FAFC` | Main application background |
| Surface | `#FFFFFF` | Cards, dialogs, and panels |
| Text primary | `#0F172A` | Headings and important data |
| Text secondary | `#64748B` | Supporting information |
| Border | `#E2E8F0` | Dividers and component borders |
| Success | `#15803D` | Successful states |
| Warning | `#B45309` | Low stock and pending actions |
| Danger | `#B91C1C` | Errors and destructive actions |
| Info | `#0369A1` | Informational states |

Status colors must also have text or icons so users are not required to distinguish statuses by color alone.

### 3.3 Typography

Use a modern, highly legible sans-serif typeface such as Inter.

Recommended hierarchy:

- Page title: 
