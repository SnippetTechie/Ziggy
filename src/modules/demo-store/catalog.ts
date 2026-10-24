import Decimal from "decimal.js";
import { z } from "zod";
import { stockStatus } from "../inventory/stock-status";
import manifest from "../../../public/images/demo/manifest.json";
import { MAX_LINE_QUANTITY } from "./cart";
import { CURRENCY, toMoney } from "./money";
import { DEMO_CATEGORIES, DEMO_DEFAULT_THRESHOLD, DEMO_PRODUCTS } from "./demo-catalog";

export type ImageInfo = { src: string; alt: string; credit?: { author: string; license: string; licenseUrl: string; sourceUrl: string } };
/** The only product shape the USER role ever receives: no supplier, threshold, cost or workspace data. */
export type CatalogItem = {
  id: string; source: "demo" | "live"; sku: string; name: string; description: string;
  category: string | null; categoryId: string | null; unit: string;
  quantity: string; stockStatus: string;
  /** Present only for demo items. Live products have no selling price in the schema. */
  price: { amount: string; currency: string; label: string } | null;
  purchasable: boolean; maxQuantity: number; image: ImageInfo | null;
};
export type CatalogCategory = { id: string; name: string };

export const catalogQuery = z.object({
  source: z.enum(["demo", "live"]).default("demo"),
  search: z.string().trim().max(80).default(""),
  categoryId: z.string().max(64).default(""),
  stock: z.enum(["all", "available"]).default("all"),
  sort: z.enum(["name", "price-asc", "price-desc", "availability"]).default("name"),
}).strict();
export type CatalogQuery = z.infer<typeof catalogQuery>;

const images = manifest.images as Record<string, { file: string; alt: string; source: string; author: string; license: string; licenseUrl: string }>;
function demoImage(key: string): ImageInfo | null {
  const entry = images[key];
  return entry ? { src: entry.file, alt: entry.alt, credit: { author: entry.author, license: entry.license, licenseUrl: entry.licenseUrl, sourceUrl: entry.source } } : null;
}

export function demoItems(): CatalogItem[] {
  return DEMO_PRODUCTS.map(product => {
    const quantity = String(product.stock);
    return {
      id: product.id, source: "demo", sku: product.sku, name: product.name, description: product.description,
      category: DEMO_CATEGORIES.find(c => c.id === product.categoryId)?.name ?? null, categoryId: product.categoryId, unit: product.unit,
      quantity, stockStatus: stockStatus(quantity, null, DEMO_DEFAULT_THRESHOLD),
      price: { amount: toMoney(product.price), currency: CURRENCY, label: "Demo price" },
      purchasable: product.stock > 0, maxQuantity: Math.min(product.stock, MAX_LINE_QUANTITY), image: demoImage(product.image),
    };
  });
}
export const demoCategories = (): CatalogCategory[] => DEMO_CATEGORIES.map(c => ({ ...c }));

/** Live inventory row (already authorised and workspace-scoped by the caller) -> USER-safe item. */
export function liveItem(row: { id: string; sku: string; name: string; description: string | null; category: string | null; categoryId: string | null; unitLabel: string; quantity: string; stockStatus: string }): CatalogItem {
  return {
    id: row.id, source: "live", sku: row.sku, name: row.name, description: row.description ?? "", category: row.category, categoryId: row.categoryId, unit: row.unitLabel,
    quantity: row.quantity, stockStatus: row.stockStatus, price: null, purchasable: false, maxQuantity: 0, image: null,
  };
}

export function applyQuery(items: CatalogItem[], query: CatalogQuery) {
  const needle = query.search.toLowerCase();
  const result = items.filter(item =>
    (!needle || item.name.toLowerCase().includes(needle) || item.sku.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle)) &&
    (!query.categoryId || item.categoryId === query.categoryId) &&
    (query.stock === "all" || new Decimal(item.quantity).gt(0)));
  const byName = (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name);
  const price = (item: CatalogItem) => (item.price ? new Decimal(item.price.amount) : null);
  const byPrice = (direction: 1 | -1) => (a: CatalogItem, b: CatalogItem) => {
    const x = price(a), y = price(b);
    if (!x && !y) return byName(a, b);
    if (!x) return 1; // unpriced items always last
    if (!y) return -1;
    return direction * x.comparedTo(y) || byName(a, b);
  };
  return result.sort(query.sort === "price-asc" ? byPrice(1) : query.sort === "price-desc" ? byPrice(-1) : query.sort === "availability" ? (a, b) => new Decimal(b.quantity).comparedTo(a.quantity) || byName(a, b) : byName);
}
