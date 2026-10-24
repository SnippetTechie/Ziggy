import { z } from "zod";
import { demoItems } from "@/modules/demo-store/catalog";
import { isDemoId } from "@/modules/demo-store/demo-catalog";
import { AppError } from "@/server/errors";
import { idInput } from "@/server/validation";
import { liveCatalog } from "@/server/shop/live-catalog";
import { shopRoute } from "@/server/shop/handler";

/** GET /api/v1/catalog/{productId} — one USER-safe product (demo ids start with "demo-"). */
export function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  return shopRoute(request, async ({ access }) => {
    const { productId } = await context.params;
    const id = isDemoId(productId) ? z.string().max(64).parse(productId) : idInput.parse(productId);
    const item = isDemoId(id) ? demoItems().find(candidate => candidate.id === id) : (await liveCatalog(access)).items.find(candidate => candidate.id === id);
    if (!item) throw new AppError("NOT_FOUND", "Product not found.", 404);
    return item;
  });
}
