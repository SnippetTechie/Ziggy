import { db } from "@/server/db";
import { listPendingRequests } from "@/modules/access/members";
import { privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";

/** Users who requested access to THIS workspace and have no role yet. ADMIN only. */
export const GET = withRole("ADMIN", async (_request, { access }) => {
  return privateJson({ pending: await listPendingRequests(db, access.workspaceId) });
});
