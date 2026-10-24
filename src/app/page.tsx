import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAccess } from "@/server/auth";
import { landings } from "@/modules/access/policy";
async function Entry() {
  const session = await auth();
  if (session.userId) { const access = await getAccess(); redirect(access ? landings[access.role] : "/access-required"); }
  return <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16"><div className="flex items-center gap-3"><Image src="/images/ziggy-logo.png" alt="" width={48} height={48} /><span className="text-heading-lg text-ink">Ziggy</span></div><p className="mt-12 text-caption font-semibold uppercase tracking-widest text-mute">Inventory & stock management</p><h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">Know what’s in stock.<br />Keep every movement in view.</h1><p className="mt-6 max-w-xl text-body-md text-mute">Manage your products, record stock in and out, and see what needs replenishing. Sign in to view your workspace’s inventory.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/sign-in" className="rounded-md bg-primary px-6 py-3 font-bold text-on-primary hover:bg-primary-pressed">Sign in</Link><Link href="/sign-up" className="rounded-md bg-secondary-bg px-6 py-3 font-semibold text-ink">Create an account</Link></div><div className="mt-14 grid gap-6 border-t border-hairline pt-6 text-body-sm text-mute sm:grid-cols-3"><p><strong className="mb-2 block text-ink">Current quantities</strong>View availability across your catalogue.</p><p><strong className="mb-2 block text-ink">Accountable history</strong>Track stock changes and who recorded them.</p><p><strong className="mb-2 block text-ink">Low-stock alerts</strong>Know what to restock before you run out.</p></div></main>;
}
export default function Page() { return <Suspense fallback={<p className="p-8" role="status">Loading Ziggy…</p>}><Entry /></Suspense>; }
