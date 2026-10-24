import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { viewCookie, viewRole } from "@/modules/access/policy";
import { requirePageRole } from "@/server/authorization";
import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/auth/require-sign-in";
async function MemberLayout({ children }: { children: ReactNode }) {
  const access = await requirePageRole("USER");
  const view = viewRole(access.role, (await cookies()).get(viewCookie)?.value);
  return <AppShell variant="app" role={view}>{children}</AppShell>;
}
export default function Layout({ children }: { children: ReactNode }) { return <Suspense fallback={<PageLoading />}><MemberLayout>{children}</MemberLayout></Suspense>; }
