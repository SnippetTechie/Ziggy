import { Suspense, type ReactNode } from "react";
import type { Access, Role } from "@/modules/access/policy";
import { requirePageRole } from "@/server/authorization";
import { PageLoading } from "@/components/auth/require-sign-in";
async function Content({ minimum, children }: { minimum: Role; children: (access: Access) => ReactNode }) {
  const access = await requirePageRole(minimum);
  return <>{children(access)}</>;
}
export function ProtectedPage({ minimum, children }: { minimum: Role; children: (access: Access) => ReactNode }) {
  return <Suspense fallback={<PageLoading />}><Content minimum={minimum}>{children}</Content></Suspense>;
}
