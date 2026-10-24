import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Access } from "@/modules/access/policy";
import { liveItem, type CatalogCategory, type CatalogItem } from "@/modules/demo-store/catalog";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { listProducts } from "@/server/services/queries";

const PAGE_LIMIT = 200, MAX_PAGES = 5;

/**
 * Read-only view of the live inventory for USER. Reuses the existing (workspace-scoped,
 * active-only) listProducts query and then projects to the USER-safe CatalogItem shape,
 * dropping thresholds, timestamps and workspace ids.
 */
export async function liveCatalog(access: Access): Promise<{ items: CatalogItem[]; categories: CatalogCategory[] }> {
  const items: CatalogItem[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await listProducts(access, { limit: String(PAGE_LIMIT), status: "active", ...(cursor ? { cursor } : {}) });
    items.push(...result.items.map(liveItem));
    cursor = result.nextCursor;
    if (!cursor) break;
  }
  const rows = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.workspaceId, access.workspaceId)).orderBy(asc(categories.name));
  return { items, categories: rows };
}
