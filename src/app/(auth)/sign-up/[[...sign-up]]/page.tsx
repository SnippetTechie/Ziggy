import { Suspense } from "react";
import { Login } from "@/components/auth/login";
export const metadata = { title: "Create account" };
export default function Page() { return <Suspense fallback={<p role="status">Loading sign-up…</p>}><Login signup /></Suspense>; }
