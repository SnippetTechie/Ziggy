import { auth, currentUser } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { ensureUserRow, resolveAccess } from "@/server/authorization/access";
import { parseDestination, resolveLanding } from "@/server/authorization/roles";

/**
 * Post-sign-in destination resolver.
 *
 *   /auth/continue?as=user|staff|admin
 *
 * `as` is only a REQUEST (from the "Login as" selector). It is parsed against a
 * fixed allowlist, and the landing route comes from a fixed server-side table
 * based on the role the database grants — so tampering with `as` can neither
 * escalate access nor redirect anywhere outside this app.
 *
 * Redirect-loop safety: unauthenticated -> /sign-in (which never redirects back
 * here on its own); no/suspended membership -> /access-required (which never
 * redirects back here on its own); members -> a landing page they are allowed on.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;
  const requested = parseDestination(request.nextUrl.searchParams.get("as"));
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  };

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return go(`/sign-in?as=${requested}`);

  try {
    let state = await resolveAccess(db, clerkUserId);

    // First sign-in: create the identity row only. This grants nothing.
    if (state.status === "no-membership" && state.userId === null) {
      const clerkUser = await currentUser();
      await ensureUserRow(db, {
        clerkUserId,
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
        displayName: clerkUser?.fullName ?? clerkUser?.username ?? null,
      });
      state = await resolveAccess(db, clerkUserId);
    }

    if (state.status !== "ok") return go("/access-required");

    const decision = resolveLanding(state.access.role, requested);
    return go(decision.notice ? `${decision.path}?notice=${decision.notice}` : decision.path);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth/continue]", error instanceof Error ? error.message : "unknown error");
    return go("/access-required?error=1");
  }
}
