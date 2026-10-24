import { Suspense } from "react";
import { PageLoading, RequireSignIn } from "@/components/auth/require-sign-in";
import { AppShell } from "@/components/layout/app-shell";

/** Ziggy — day-to-day operations. Signed-in users only. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell variant="app">
      <Suspense fallback={<PageLoading />}>
        <RequireSignIn>{children}</RequireSignIn>
      </Suspense>
    </AppShell>
  );
}
