import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Create account" };

/**
 * CLERK PLACEHOLDER — not connected.
 * To wire Clerk: move to `sign-up/[[...sign-up]]/page.tsx` and render <SignUp />.
 */
export default function SignUpPage() {
  return (
    <>
      <h1 className="text-heading-lg text-ink">Create your account</h1>
      <p className="mt-1 text-body-md text-mute">Shop from your local store, or set up Ziggy for your business.</p>
      <div className="mt-6 grid h-12 place-items-center rounded-md border-2 border-dashed border-stone bg-surface-card text-body-sm font-bold text-charcoal">
        Clerk &lt;SignUp /&gt; — Continue with Google
      </div>
      <p className="mt-6 text-center text-body-sm text-mute">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-ink-soft underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
