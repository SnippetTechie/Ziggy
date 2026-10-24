import "server-only";
import { getAccessState } from "@/server/authorization/session";
import { createRoleGuard } from "./api";

/** Production route guard: Clerk session + database membership + role. */
export const withRole = createRoleGuard(getAccessState);
