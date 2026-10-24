# Ziggy — AI & Analytics Specification

**Document:** 06 — AI & Analytics Specification  
**Version:** 1.1

**Status:** **Deferred — future enhancement, not required for the college prototype**

> **Scope correction.** Ziggy is an Online Inventory and Stock Management System (PRD v1.1). AI forecasting, stock-out risk estimation, and reorder recommendations are **not prerequisites** for the MVP and nothing in this document is implemented. The MVP instead includes **simple, rule-based low-stock alerts** (`available quantity <= configured threshold`, doc 03) and inventory summaries, which remain core and do not depend on this document. The principles below (advisory only, transparent, never mutates stock) are kept as the contract for any future intelligence work. References below to sales, purchase orders, receipts, transfers, and lead times describe data the MVP does not yet capture.

## 1. Purpose

Ziggy Intelligence would help small businesses, laboratories, and campus stores make better inventory decisions using historical demand, current stock, purchasing activity, and supplier lead times.

The initial release focuses on three capabilities:

1. Demand forecasting.
2. Stock-out risk detection.
3. Reorder recommendations.

The system should also provide understandable explanations so business owners can see why a recommendation was generated.

## 2. Product Principles

### 2.1 Recommendations, not autonomous transactions

Ziggy Intelligence may recommend a purchase quantity or identify a stock risk, but it must not automatically:

- Change inventory balances.
- Post a stock adjustment.
- Receive a purchase order.
- Create a completed sale.
- Approve or post a purchase order.

The user remains responsible for reviewing and initiating consequential actions.

### 2.2 Transparent recommendations

Each recommendation should show:

- What product and location it concerns.
- The risk or opportunity identified.
- The data and assumptions used.
- The suggested action.
- When the analysis was generated.
- Whether historical data is sufficient.

### 2.3 Gradual sophistication

Start with transparent statistical and rule-based methods. Introduce more sophisticated machine-learning models only when they demonstrate better forecasting accuracy on historical holdout data.

An LLM may explain a result, but it should not be the primary numerical forecasting engine.

## 3. Scope

### Planned scope when built *(deferred; not in the college MVP)*

- Demand summaries.
- Forecasted demand.
- Low-stock alerts.
- Estimated stock-out risk.
- Suggested reorder quantities.
- Historical demand charts.
- Confidence or data-quality indicators.
- Recommendation explanations.
- Scheduled forecast generation.

### Excluded unless separately approved

- Autonomous purchasing.
- Supplier price negotiation.
- Automated supplier ordering.
- Full financial planning.
- Complex seasonal optimization across many external variables.
- Computer vision-based shelf monitoring.
- Fully autonomous inventory management.

## 4. Required Data

The intelligence engine should use authorized, workspace-scoped data.

### 4.1 Sales history

Fields may include:

- Product ID.
- Location ID.
- Sale timestamp.
- Quantity sold in base units.
- Return or reversal information.
- Historical selling price, where tracked.

Use posted sales rather than draft sales.

### 4.2 Inventory movements

Fields may include:

- Product and location.
- Movement type.
- Quantity change.
- Business event timestamp.
- Reversal relationships.
- Source document.

Inventory movements help distinguish genuine demand from purchases, transfers, and adjustments.

### 4.3 Current inventory

Fields may include:

- On-hand quantity.
- Reorder threshold.
- Recent consumption.
- Product status.
- Location status.

### 4.4 Purchasing data

Where available:

- Supplier.
- Purchase order dates.
- Receipt dates.
- Ordered and received quantities.
- Observed lead times.
- Outstanding quantities.

Supplier lead times should be calculated from suitable historical records when sufficient data exists. Otherwise, use an explicitly configured estimate.

### 4.5 Data-quality checks

Before producing recommendations, detect:

- Duplicate transaction records.
- Unreconciled reversals.
- Invalid unit conversions.
- Missing historical periods.
- Inactive products or locations.
- Unusual spikes or drops in recorded sales.
- Potentially misleading periods when stock was unavailable.

Periods without stock availability require special treatment: low recorded sales during a stock-out do not necessarily mean low customer demand.

## 5. Demand Forecasting

### 5.1 Forecast objective

Estimate the quantity likely to be sold
