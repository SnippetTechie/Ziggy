"use client";
import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Menu, X, Shield } from "lucide-react";
import { appNav, adminNav } from "./nav-config";
import { canAccess, landings, type Role } from "@/modules/access/policy";
export function AppShell({ variant, role, children }: { variant: "app" | "admin"; role: Role; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]"><aside className={`${open ? "fixed inset-y-0 left-0 z-50 block w-64" : "hidden"} border-r border-hairline bg-canvas lg:sticky lg:top-0 lg:block lg:h-screen`}><div className="flex h-full flex-col"><Link href={landings[role]} className="flex h-16 items-center gap-3 px-5"><Image src="/images/ziggy-logo.png" width={34} height={34} alt="" /><span className="text-heading-md text-ink">Ziggy</span></Link><button className="absolute right-3 top-5 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}><X /></button><Suspense><Navigation variant={variant} role={role} close={() => setOpen(false)} /></Suspense>{role === "ADMIN" && <Link className="m-3 flex min-h-11 items-center gap-3 rounded-md bg-surface-card px-3 text-body-sm font-semibold" href={variant === "admin" ? "/dashboard" : "/admin"}><Shield className="size-4" />{variant === "admin" ? "Operations" : "Administration"}</Link>}<p className="mt-auto p-5 text-caption text-mute">Inventory & stock management</p></div></aside>{open && <button onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="Close navigation backdrop" />}<div className="min-w-0"><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas px-4 sm:px-8"><button onClick={() => setOpen(true)} aria-label="Open navigation" className="grid size-11 place-items-center lg:hidden"><Menu /></button><span className="text-body-sm font-semibold text-ink">Main store</span><span className="rounded-full bg-surface-card px-3 py-1 text-caption font-bold">{role}</span><div className="ml-auto"><UserButton /></div></header><main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8"><Suspense><AccessNotice /></Suspense>{children}</main></div></div>;
}
function AccessNotice() {
  const params = useSearchParams();
  return params.get("notice") === "access-denied" ? <p role="alert" className="mb-5 rounded-md bg-warning-pale p-4 text-body-sm text-warning-deep">Your account does not have access to that area. You have been returned to your dashboard.</p> : null;
}
function Navigation({ variant, role, close }: { variant: "app" | "admin"; role: Role; close: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="flex-1 space-y-5 overflow-y-auto p-3">{(variant === "admin" ? adminNav : appNav).map((section, i) => {
    const items = section.items.filter(item => canAccess(role, item.minimum));
    if (!items.length) return null;
    return <div key={i}>{section.title && <p className="px-3 pb-2 text-caption font-semibold uppercase tracking-wide text-mute">{section.title}</p>}<ul className="space-y-1">{items.map(item => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/")); return <li key={item.href}><Link onClick={close} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-body-sm font-semibold ${active ? "bg-ink text-on-dark" : "text-charcoal hover:bg-surface-card"}`}><Icon className="size-[18px]" />{item.label}</Link></li>; })}</ul></div>;
  })}</nav>;
}
