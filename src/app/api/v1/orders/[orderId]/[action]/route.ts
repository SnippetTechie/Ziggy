import { orderAction, transitionOrder } from "@/modules/orders/service";
import { shopRoute } from "@/server/shop/handler";

/** POST /api/v1/orders/{orderId}/{confirm|fulfil|cancel} — ADMIN only. Fulfil posts the stock-out and marks the order in one transaction. */
export function POST(request: Request, context: { params: Promise<{ orderId: string; action: string }> }) {
  return shopRoute(request, async ({ access }) => {
    const { orderId, action } = await context.params;
    return transitionOrder(access, orderId, orderAction.parse(action));
  }, "ADMIN");
}
