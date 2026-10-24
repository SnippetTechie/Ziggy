import { Suspense, type ReactNode } from "react";
import { requirePageRole } from "@/server/authorization";
import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/auth/require-sign-in";
async function MemberLayout({ children }: { children: ReactNode }) {
  const access = await requirePageRole("USER");
  return <AppShell variant="app" role={access.role}>{children}</AppShell>;
}
export default function Layout({ children }: { children: ReactNode }) { return <Suspense fallback={<PageLoading />}><MemberLayout>{children}</MemberLayout></Suspense>; }
