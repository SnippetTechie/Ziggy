import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

// Clerk's catch-all sign-in route. Suspense is required with cacheComponents.
export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
