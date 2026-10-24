import { SignOutButton } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RequestAccessButton } from "@/components/auth/request-access-button";
import { getAccessState } from "@/server/authorization/session";
import { LANDING, highestDestination } from "@/server/authorization/roles";

export const metadata: Metadata = { title: "Access required" };

/**
 * Shown to signed-in users with no ACTIVE workspace membership. Shows no
 * inventory data. It never redirects back to /auth/continue on its own, so it
 * cannot form a redirect loop.
 */
export default function AccessRequiredPage() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading" className="h-48 w-full max-w-[400px] animate-pulse rounded-md bg-canvas" />}>
      <AccessRequiredContent />
    </Suspense>
  );
}

async function AccessRequiredContent() {
  const state = await getAccessState();
  if (state.status === "unauthenticated") redirect("/sign-in");
  // Already a member (e.g. an admin just granted access): go straight to the landing page.
  if (state.status === "ok") redirect(LANDING[highestDestination(state.access.role)]);

  const suspended = state.status === "suspended";
  return (
    <div className="w-full max-w-[400px] rounded-md bg-canvas p-6 shadow-sm">
      <h1 className="text-heading-lg text-ink">{suspended ? "Access suspended" : "Access required"}</h1>
      <p className="mt-2 text-body-md text-mute">
        {suspended
          ? "Your access to this workspace has been suspended. Contact an admin to have it restored."
          : "You are signed in, but your account has not been given access to this workspace yet. Ask an admin to grant you a role."}
      </p>
      <div className="mt-6 space-y-3">
        {!suspended && <RequestAccessButton />}
        <Link
          href="/auth/continue"
          className="flex h-11 w-full items-center justify-center rounded-md bg-secondary-bg text-body-sm font-bold text-ink"
        >
          Check again
        </Link>
        <SignOutButton redirectUrl="/">
          <button type="button" className="h-11 w-full rounded-md text-body-sm font-bold text-ink hover:bg-surface-card">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
