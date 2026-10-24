import { LANDING, highestDestination } from "@/server/authorization/roles";
import { privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";

/** Caller's role, workspace, and landing route. Any ACTIVE member. */
export const GET = withRole("USER", async (_request, { access }) => {
  return privateJson({
    role: access.role,
    workspace: { name: access.workspaceName },
    landing: LANDING[highestDestination(access.role)],
  });
});
