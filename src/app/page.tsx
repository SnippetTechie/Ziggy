import { auth } from "@clerk/nextjs/server";
import { Boxes, ClipboardList, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Public inventory entry. Static, explanatory content only — no inventory,
 * supplier, or member data is rendered for signed-out visitors.
 */
export default function Home() {
  const roles = [
    { icon: Boxes, title: "User", text: "Search products and check what is in stock. Read-only." },
    { icon: ClipboardList, title: "Staff", text: "Record stock in and stock out, and review movement history and low stock." },
    { icon: ShieldCheck, title: "Admin", text: "Manage products, categories, suppliers and team access, and run reports." },
  ];
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-16">
      <div className="flex items-center gap-3">
        <Image src="/images/ziggy-logo.png" alt="" width={56} height={56} className="rounded-md" priority />
        <h1 className="text-[44px] font-bold leading-[1.15] tracking-[-0.8px] text-ink">Ziggy</h1>
      </div>
      <p className="mt-3 max-w-2xl text-body-md text-mute">
        Online inventory and stock management for small businesses, college laboratories, and campus stores. Track
        products, record stock in and out, and get warned before items run low.
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {roles.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-md bg-surface-card p-6">
            <Icon className="size-5 text-mute" aria-hidden />
            <p className="mt-3 text-heading-md text-ink">{title}</p>
            <p className="mt-1 text-body-sm text-mute">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Suspense fallback={<span className="inline-block h-11 w-28 animate-pulse rounded-md bg-secondary-bg" aria-hidden />}>
          <EntryCta />
        </Suspense>
        <p className="mt-3 text-body-sm text-mute">Access depends on the role an admin has assigned to your account.</p>
      </div>
    </div>
  );
}

/** Signed-in visitors continue to their dashboard; others sign in. */
async function EntryCta() {
  const { userId } = await auth();
  const href = userId ? "/auth/continue" : "/sign-in";
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-body-sm font-bold text-on-primary active:bg-primary-pressed"
    >
      {userId ? "Open Ziggy" : "Sign in"}
    </Link>
  );
}
