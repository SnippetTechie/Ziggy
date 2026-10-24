import { auth, currentUser } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/server/db";
import { ensureUserRow, getDefaultWorkspace, resolveAccess } from "@/server/authorization/access";
import { requestAccess } from "@/modules/access/members";
import { errorResponse, privateJson } from "@/server/http/api";

/**
 * A signed-in user without membership asks an Admin for access to the (single)
 * workspace. This only records a request; it never grants a role. Users who
 * already have an ACTIVE or SUSPENDED membership cannot use it.
 */
export async function POST(): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return errorResponse(401, "UNAUTHENTICATED", "Sign in to continue.", requestId);

    const state = await resolveAccess(db, clerkUserId);
    if (state.status === "ok") {
      return errorResponse(409, "ALREADY_MEMBER", "Your account already has access.", requestId);
    }
    if (state.status === "suspended") {
      return errorResponse(403, "SUSPENDED", "Your access was suspended. Contact an admin.", requestId);
    }

    const workspace = await getDefaultWorkspace(db);
    if (!workspace) {
      return errorResponse(503, "WORKSPACE_UNAVAILABLE", "No workspace is available to request access to.", requestId);
    }

    const clerkUser = await currentUser();
    const userId = await ensureUserRow(db, {
      clerkUserId,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      displayName: clerkUser?.fullName ?? clerkUser?.username ?? null,
    });
    const result = await requestAccess(db, { userId, workspaceId: workspace.id });
    if (result === "already-member") {
      return errorResponse(409, "ALREADY_MEMBER", "Your account already has access.", requestId);
    }
    return privateJson({ status: result }, { status: result === "requested" ? 201 : 200 });
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[api ${requestId}]`, error instanceof Error ? error.message : "unknown error");
    return errorResponse(500, "INTERNAL_ERROR", "Something went wrong. Please try again.", requestId);
  }
}
