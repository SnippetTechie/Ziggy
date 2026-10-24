import { Suspense } from "react";
import { MemberShell, ShellLoading } from "@/components/auth/member-shell";

/**
 * Ziggy — inventory views. Requires an ACTIVE workspace member; each page then
 * enforces its own minimum role (USER / STAFF / ADMIN) with requirePageRole().
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellLoading />}>
      <MemberShell variant="app" minRole="USER">
        {children}
      </MemberShell>
    </Suspense>
  );
}
