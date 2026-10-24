import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in" };

/**
 * CLERK PLACEHOLDER — not connected.
 * To wire Clerk: move this to `sign-in/[[...sign-in]]/page.tsx` and render
 * Clerk's <SignIn /> in place of the placeholder below. Google OAuth only (PRD FR-01).
 * After sign-in: staff/admins go to /select-workspace, shoppers back to their shop.
 */
export default function SignInPage() {
  return (
    <>
      <h1 className="text-heading-lg text-ink">Welcome back</h1>
      <p className="mt-1 text-body-md text-mute">Sign in to continue to Ziggy.</p>
      <div className="mt-6 grid h-12 place-items-center rounded-md border-2 border-dashed border-stone bg-surface-card text-body-sm font-bold text-charcoal">
        Clerk &lt;SignIn /&gt; — Continue with Google
      </div>
      <p className="mt-6 text-center text-body-sm text-mute">
        New here?{" "}
        <Link href="/sign-up" className="font-semibold text-ink-soft underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
