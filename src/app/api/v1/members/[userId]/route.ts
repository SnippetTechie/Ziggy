import { z } from "zod";
import { db } from "@/server/db";
import { MemberError, updateMember } from "@/modules/access/members";
import { ROLES } from "@/server/authorization/roles";
import { errorResponse, privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";
import { parseWith, readJson } from "@/server/http/validate";

const patchBody = z
  .object({ role: z.enum(ROLES).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional() })
  .strict()
  .refine((b) => b.role !== undefined || b.status !== undefined, { message: "Provide a role or status." });

/**
 * Change a member's role or suspend/reactivate them. ADMIN only. The last
 * ACTIVE admin cannot be demoted or suspended (409 LAST_ADMIN).
 */
export const PATCH = withRole(
  "ADMIN",
  async (request, { access, requestId }, ctx: RouteContext<"/api/v1/members/[userId]">) => {
    const { userId } = await ctx.params;
    const id = parseWith(z.uuid(), userId, requestId);
    if (!id.ok) return id.response;

    const body = await readJson(request, requestId);
    if (!body.ok) return body.response;
    const parsed = parseWith(patchBody, body.data, requestId);
    if (!parsed.ok) return parsed.response;

    try {
      await updateMember(db, {
        workspaceId: access.workspaceId,
        actorUserId: access.userId,
        targetUserId: id.data,
        role: parsed.data.role,
        status: parsed.data.status,
      });
    } catch (error) {
      if (error instanceof MemberError) return errorResponse(error.status, error.code, error.message, requestId);
      throw error;
    }
    return privateJson({ ok: true });
  },
);
