import { Suspense } from "react";
import { PageLoading, RequireSignIn } from "@/components/auth/require-sign-in";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Ziggy Admin — workspace administration. Signed-in users only for now;
 * the ADMIN role check is added once workspace membership is in the database.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell variant="admin">
      <Suspense fallback={<PageLoading />}>
        <RequireSignIn>{children}</RequireSignIn>
      </Suspense>
    </AppShell>
  );
}
