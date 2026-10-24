import "server-only";
import { ZodError } from "zod";
import { requireRole } from "@/server/authorization";
import { AppError, ensure } from "@/server/errors";
import { CartChangedError } from "@/modules/demo-store/checkout";
import type { Access, Role } from "@/modules/access/policy";

const headers = { "Cache-Control": "private, no-store" };

/**
 * Shared wrapper for the catalog, demo-checkout and customer-order endpoints. Same envelope,
 * origin and size rules as the main /api/v1 handler. `minimum` defaults to USER; the order
 * fulfilment endpoints pass ADMIN. Demo checkout never touches stock; fulfilment does, via the
 * existing inventory service.
 */
export async function shopRoute(request: Request, run: (ctx: { access: Access; url: URL; body: () => Promise<unknown> }) => Promise<unknown>, minimum: Role = "USER") {
  const requestId = crypto.randomUUID();
  try {
    const access = await requireRole(minimum);
    const url = new URL(request.url);
    const write = request.method !== "GET";
    if (write) {
      const origin = request.headers.get("origin");
      ensure(!origin || origin === url.origin, "INVALID_ORIGIN", "This request must come from the application.", 403);
      ensure(Number(request.headers.get("content-length") ?? 0) <= 16384, "PAYLOAD_TOO_LARGE", "The request is too large.", 413);
    }
    const body = async () => {
      ensure(request.headers.get("content-type")?.includes("application/json"), "INVALID_CONTENT_TYPE", "Send JSON data.", 400);
      const text = await request.text();
      ensure(Buffer.byteLength(text) <= 16384, "PAYLOAD_TOO_LARGE", "The request is too large.", 413);
      try { return JSON.parse(text); } catch { throw new AppError("INVALID_JSON", "The request body is not valid JSON.", 400); }
    };
    const data = await run({ access, url, body });
    return Response.json({ data }, { headers, status: 200 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ error: { code: "INVALID_INPUT", message: "Check your selection and try again.", requestId, details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })) } }, { status: 422, headers });
    if (error instanceof CartChangedError) return Response.json({ error: { code: error.code, message: error.message, requestId, validation: error.validation } }, { status: error.status, headers });
    if (error instanceof AppError) return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status, headers });
    console.error("Catalog request failed", { requestId });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed. Try again or contact the administrator.", requestId } }, { status: 500, headers });
  }
}
