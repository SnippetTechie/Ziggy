import Image from "next/image";
import Link from "next/link";
import { DEMO_STORE } from "@/lib/demo";

/** Wireframe entry point linking the three interfaces. */
export default function Home() {
  const doors = [
    { href: `/shop/${DEMO_STORE.slug}`, title: "Shop", text: "Shoppers browse a store and place orders." },
    { href: "/dashboard", title: "Ziggy", text: "Store teams run daily inventory operations." },
    { href: "/admin", title: "Ziggy Admin", text: "Owners manage the workspace, locations, and team." },
  ];
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-16">
      <div className="flex items-center gap-3">
        <Image src="/images/ziggy-logo.png" alt="" width={56} height={56} className="rounded-md" />
        <h1 className="text-[44px] font-bold leading-[1.15] tracking-[-0.8px] text-ink">Ziggy</h1>
      </div>
      <p className="mt-3 text-body-md text-mute">Smart inventory management for grocery shops, wholesalers, and distributors.</p>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {doors.map((d) => (
          <Link key={d.href} href={d.href} className="rounded-md bg-surface-card p-6 hover:bg-secondary-bg">
            <p className="text-heading-md text-ink">{d.title}</p>
            <p className="mt-1 text-body-sm text-mute">{d.text}</p>
          </Link>
        ))}
      </div>
      <Link href="/sign-in" className="mt-8 self-start rounded-md bg-primary px-4 py-2.5 text-body-sm font-bold text-on-primary">
        Sign in
      </Link>
    </div>
  );
}
