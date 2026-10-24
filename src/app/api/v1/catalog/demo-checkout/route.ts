import { checkoutInput, placeDemoOrder } from "@/modules/demo-store/checkout";
import { keyInput } from "@/server/validation";
import { shopRoute } from "@/server/shop/handler";

/**
 * POST /api/v1/catalog/demo-checkout — SIMULATED payment. Requires an Idempotency-Key.
 * No database writes, no stock movements, no payment gateway: the order is returned to
 * the browser, which stores it locally. See TEAM_HANDOFF.md §13.
 */
export function POST(request: Request) {
  return shopRoute(request, async ({ access, body }) => {
    const key = keyInput.parse(request.headers.get("idempotency-key"));
    return placeDemoOrder(checkoutInput.parse(await body()), `${access.workspaceId}:${access.userId}`, key);
  });
}
