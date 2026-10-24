import { z } from "zod";
import { errorResponse } from "./api";

/** First value of every query parameter as a plain object (empty strings dropped). */
export function queryObject(request: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (!(key in out) && value.trim() !== "") out[key] = value.trim();
  }
  return out;
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

export function parseWith<S extends z.ZodType>(schema: S, input: unknown, requestId: string): Parsed<z.infer<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    response: errorResponse(422, "VALIDATION_ERROR", "The request is not valid.", requestId, {
      issues: result.error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
    }),
  };
}

export async function readJson(request: Request, requestId: string): Promise<Parsed<unknown>> {
  try {
    const text = await request.text();
    if (text.length > 10_000) {
      return { ok: false, response: errorResponse(413, "PAYLOAD_TOO_LARGE", "Request body is too large.", requestId) };
    }
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: errorResponse(400, "BAD_REQUEST", "Request body must be valid JSON.", requestId) };
  }
}

export function inventoryUnavailable(requestId: string, missing: string[]): Response {
  // Table names are logged server-side only.
  console.warn(`[api ${requestId}] inventory tables not available: ${missing.join(", ")}`);
  return errorResponse(
    503,
    "INVENTORY_UNAVAILABLE",
    "Inventory data is not available yet in this environment.",
    requestId,
  );
}
