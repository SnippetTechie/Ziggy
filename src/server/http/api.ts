import { unstable_rethrow } from "next/navigation";
import { roleAtLeast, type Role } from "@/server/authorization/roles";
import type { Access, AccessState } from "@/server/authorization/access";

/** Standard error envelope (doc 05 §8). Never carries SQL, stacks, or secrets. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): Response {
  return Response.json(
    { error: { code, message, requestId, details: details ?? {} } },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

/** JSON success response that must never be stored by shared caches. */
export function privateJson(body: unknown, init?: { status?: number }): Response {
  return Response.json(body, { status: init?.status ?? 200, headers: { "Cache-Control": "private, no-store" } });
}

export type GuardContext = { access: Access; requestId: string };
type GetState = () => Promise<AccessState>;

/**
 * Build a route guard around an access-state source. Production uses the Clerk
 * + database source; tests inject fixed states. Every protected route handler
 * is wrapped so authentication, ACTIVE membership, and role are re-checked on
 * the server for every request:
 *   no session -> 401; no/suspended membership or low role -> 403.
 */
export function createRoleGuard(getState: GetState) {
  return function withRole<A extends unknown[]>(
    min: Role,
    handler: (request: Request, ctx: GuardContext, ...rest: A) => Promise<Response>,
  ) {
    return async (request: Request, ...rest: A): Promise<Response> => {
      const requestId = crypto.randomUUID();
      try {
        const state = await getState();
        if (state.status === "unauthenticated") {
          return errorResponse(401, "UNAUTHENTICATED", "Sign in to continue.", requestId);
        }
        if (state.status !== "ok") {
          return errorResponse(403, "ACCESS_REQUIRED", "Your account has no active access to this workspace.", requestId);
        }
        if (!roleAtLeast(state.access.role, min)) {
          return errorResponse(403, "FORBIDDEN", "Your role does not allow this action.", requestId);
        }
        return await handler(request, { access: state.access, requestId }, ...rest);
      } catch (error) {
        // Let Next.js control-flow errors (prerender abort, redirects) pass through untouched.
        unstable_rethrow(error);
        // Log server-side only; the client gets a generic envelope.
        console.error(`[api ${requestId}]`, error instanceof Error ? error.message : "unknown error");
        return errorResponse(500, "INTERNAL_ERROR", "Something went wrong. Please try again.", requestId);
      }
    };
  };
}
