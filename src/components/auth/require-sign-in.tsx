import { auth } from "@clerk/nextjs/server";

/**
 * Server-side gate for protected areas. Signed-out visitors are redirected
 * to /sign-in. Must be rendered inside <Suspense> (cacheComponents).
 *
 * This only proves identity. Workspace membership and the ADMIN role are
 * checked against Ziggy's own database once those tables exist.
 */
export async function RequireSignIn({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return <>{children}</>;
}

export function PageLoading() {
  return (
    <div role="status" className="space-y-4" aria-label="Loading">
      <div className="h-8 w-56 animate-pulse rounded-full bg-secondary-bg" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-secondary-bg" />
      <div className="h-64 animate-pulse rounded-md bg-surface-card" />
    </div>
  );
}
