import { z } from "zod";
import { listOrders, placeOrder } from "@/modules/orders/service";
import { keyInput } from "@/server/validation";
import { shopRoute } from "@/server/shop/handler";

const listQuery = z.object({ scope: z.enum(["mine", "all"]).default("mine"), status: z.enum(["PLACED", "CONFIRMED", "FULFILLED", "CANCELLED"]).optional() }).strict();

/** GET /api/v1/orders?scope=mine|all&status — USER sees only their own requests; scope=all is ADMIN-only. */
export function GET(request: Request) {
  return shopRoute(request, async ({ access, url }) => {
    const query = listQuery.parse(Object.fromEntries(url.searchParams));
    return listOrders(access, query.scope, query.status);
  });
}

/** POST /api/v1/orders — place a quantity-only stock request. Idempotency-Key required; a retry returns the original order. */
export function POST(request: Request) {
  return shopRoute(request, async ({ access, body }) => placeOrder(access, await body() as never, keyInput.parse(request.headers.get("idempotency-key"))));
}
