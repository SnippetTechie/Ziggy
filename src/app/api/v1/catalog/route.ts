import { applyQuery, catalogQuery, demoCategories, demoItems } from "@/modules/demo-store/catalog";
import { liveCatalog } from "@/server/shop/live-catalog";
import { shopRoute } from "@/server/shop/handler";

/** GET /api/v1/catalog?source=demo|live&search&categoryId&stock&sort — USER-safe product cards. */
export function GET(request: Request) {
  return shopRoute(request, async ({ access, url }) => {
    const query = catalogQuery.parse(Object.fromEntries(url.searchParams));
    const source = query.source === "live" ? await liveCatalog(access) : { items: demoItems(), categories: demoCategories() };
    return { source: query.source, items: applyQuery(source.items, query), categories: source.categories, total: source.items.length };
  });
}
