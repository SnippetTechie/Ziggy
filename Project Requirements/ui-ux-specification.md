# Ziggy — UI/UX Specification

**Document:** 04 — UI/UX Specification  
**Version:** 1.0  
**Status:** Proposed design specification for MVP

## 1. Design Vision

Ziggy is an inventory management SaaS platform for grocery shops, wholesalers, and distributors.

Its interface should help users answer five questions quickly:

1. What stock do I have?
2. What is running low?
3. What stock is moving in and out?
4. What do I need to purchase?
5. What should I pay attention to today?

The product should prioritize clarity, speed, and trustworthy data over decorative visual elements.

### Design principles

- **Clarity first:** quantities, units, statuses, and costs must be easy to understand.
- **Action-oriented:** important tasks should be accessible within a few clicks.
- **Progressive disclosure:** show essential information first and advanced details when needed.
- **Consistent patterns:** forms, tables, dialogs, filters, and status indicators should behave consistently.
- **Responsive by default:** desktop is the primary workspace, with tablet and mobile support for everyday stock operations.
- **Accessible:** keyboard navigation, clear focus states, readable contrast, and accessible form labels.
- **Trustworthy:** posted transactions, warnings, and inventory changes must be explicit.

## 2. Product Interfaces

Ziggy consists of two closely related interfaces.

### Ziggy

The main business application used for day-to-day operations:

- Dashboard
- Inventory
- Products
- Purchasing
- Sales and stock issues
- Transfers
- Suppliers
- Reports
- Ziggy Intelligence
- Settings

### Ziggy Admin

The administrative area for managing the business workspace and its configuration:

- Workspace profile
- Branches and warehouses
- Team members and roles
- Units and product settings
- Operational preferences
- Audit history
- Data export and account settings

Ziggy Admin should share the same design system and application shell. It should not feel like a separate, unrelated product.

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

The following is the proposed starting palette. Final tokens should be validated in the design system.

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
