import { z } from "zod";
import { db } from "@/server/db";
import { listMembers, grantMember, MemberError } from "@/modules/access/members";
import { ROLES } from "@/server/authorization/roles";
import { errorResponse, privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";
import { parseWith, readJson } from "@/server/http/validate";

/** List this workspace's members. ADMIN only. */
export const GET = withRole("ADMIN", async (_request, { access }) => {
  return privateJson({ members: await listMembers(db, access.workspaceId) });
});

const grantBody = z.object({ userId: z.uuid(), role: z.enum(ROLES) }).strict();

/**
 * Grant a role to a user who asked for access to this workspace. ADMIN only.
 * Users who did not request access cannot be granted (no global user lookup).
 */
export const POST = withRole("ADMIN", async (request, { access, requestId }) => {
  const body = await readJson(request, requestId);
  if (!body.ok) return body.response;
  const parsed = parseWith(grantBody, body.data, requestId);
  if (!parsed.ok) return parsed.response;

  try {
    await grantMember(db, {
      workspaceId: access.workspaceId,
      actorUserId: access.userId,
      targetUserId: parsed.data.userId,
      role: parsed.data.role,
    });
  } catch (error) {
    if (error instanceof MemberError) return errorResponse(error.status, error.code, error.message, requestId);
    throw error;
  }
  return privateJson({ ok: true }, { status: 201 });
});
