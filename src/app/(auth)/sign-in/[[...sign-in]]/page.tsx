import { Suspense } from "react";
import { Login } from "@/components/auth/login";
import { DemoLogin } from "@/components/auth/demo-login";
import { devLoginEnabled } from "@/server/auth/dev-login";
export const metadata = { title: "Sign in" };
export default function Page() { return <Suspense fallback={<p role="status">Loading sign-in…</p>}>{devLoginEnabled() ? <DemoLogin /> : <Login />}</Suspense>; }
