import { Suspense } from "react";
import { Login } from "@/components/auth/login";
export const metadata = { title: "Sign in" };
export default function Page() { return <Suspense fallback={<p role="status">Loading sign-in…</p>}><Login /></Suspense>; }
