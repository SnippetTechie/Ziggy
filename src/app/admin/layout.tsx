import { Suspense } from "react";
import { MemberShell, ShellLoading } from "@/components/auth/member-shell";

/** Ziggy Admin. Requires an ACTIVE ADMIN, checked on the server for every request. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellLoading />}>
      <MemberShell variant="admin" minRole="ADMIN">
        {children}
      </MemberShell>
    </Suspense>
  );
}
