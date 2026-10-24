import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { getIdentity } from "@/server/auth";
async function Content() {
  if (!await getIdentity()) redirect("/sign-in");
  return <main className="mx-auto my-20 max-w-lg rounded-lg border border-hairline bg-canvas p-8"><h1 className="text-heading-xl text-ink">Access required</h1><p className="mt-4 text-mute">You are signed in, but do not have an active workspace membership. Ask your inventory Admin to approve your account in Team & access.</p><p className="mt-4 text-body-sm text-mute">If your access has been suspended, contact your Admin to restore it.</p><div className="mt-6 flex items-center gap-5"><UserButton /><Link className="underline" href="/auth/continue">Check my access again</Link><SignOutButton redirectUrl="/sign-in"><button type="button" className="min-h-11 rounded-md bg-secondary-bg px-4 py-2 text-body-sm font-semibold text-ink hover:bg-secondary-pressed">Sign out / Switch account</button></SignOutButton></div></main>;
}
export default function Page() { return <Suspense fallback={<p className="p-8" role="status">Checking access…</p>}><Content /></Suspense>; }
