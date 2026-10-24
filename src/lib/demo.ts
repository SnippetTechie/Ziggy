/**
 * Placeholder data for wireframes only. Replace with database-backed values
 * as each feature is implemented. Never import this from server services.
 */
export const DEMO_STORE = { slug: "sharma-groceries", name: "Sharma Groceries" };
export const DEMO_ORDER_ID = "ORD-1001";
export const DEMO_PRODUCT_ID = "basmati-rice-5kg";

/** Customer order lifecycle shared by the shop and the admin Orders screen. */
export const ORDER_STATUSES = [
  "Placed",
  "Confirmed",
  "Packed",
  "Out for delivery",
  "Delivered",
] as const;
