import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInWithRole } from "@/components/auth/sign-in-with-role";
import { parseDestination } from "@/server/authorization/roles";

export const metadata: Metadata = { title: "Sign in" };

// Clerk's catch-all sign-in route. Suspense is required with cacheComponents
// (searchParams and <SignIn /> are both request-time).
export default function SignInPage({ searchParams }: { searchParams: Promise<{ as?: string | string[] }> }) {
  return (
    <Suspense>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInContent({ searchParams }: { searchParams: Promise<{ as?: string | string[] }> }) {
  const { as } = await searchParams;
  // Untrusted: parsed against the allowlist, defaulting to "user".
  return <SignInWithRole initial={parseDestination(as)} />;
}
