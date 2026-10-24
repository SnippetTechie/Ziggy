import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getAccessState } from "@/server/authorization/session";
import { forbiddenRedirectPath, roleAtLeast, type Role } from "@/server/authorization/roles";
import { PageLoading } from "./require-sign-in";

/**
 * Server-side gate + shell for a protected area. Requires an ACTIVE workspace
 * member (and `minRole`), then renders the shared shell with navigation
 * filtered to that role. Must be rendered inside <Suspense> (cacheComponents).
 *
 * This is defence in depth only: layouts do not re-run on client navigation,
 * so every page ALSO calls requirePageRole() for its own minimum role.
 */
export async function MemberShell({
  variant,
  minRole,
  children,
}: {
  variant: "app" | "admin";
  minRole: Role;
  children: React.ReactNode;
}) {
  const state = await getAccessState();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "ok") redirect("/access-required");
  const { role, workspaceName } = state.access;
  if (!roleAtLeast(role, minRole)) redirect(forbiddenRedirectPath(role, minRole));

  return (
    <AppShell variant={variant} role={role} workspaceName={workspaceName}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </AppShell>
  );
}

export function ShellLoading() {
  return (
    <div className="min-h-screen p-8">
      <PageLoading />
    </div>
  );
}
