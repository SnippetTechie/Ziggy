import { validateCart, validateInput } from "@/modules/demo-store/checkout";
import { shopRoute } from "@/server/shop/handler";

/** POST /api/v1/catalog/validate — re-prices and re-checks demo cart lines. Read-only; changes nothing. */
export function POST(request: Request) {
  return shopRoute(request, async ({ body }) => validateCart(validateInput.parse(await body()).lines));
}
