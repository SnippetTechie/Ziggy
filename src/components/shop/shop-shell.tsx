"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { Home, Package, Search, ShoppingCart, User } from "lucide-react";

/**
 * Consumer storefront shell. Each business has its own shop at /shop/[store],
 * so every shopper action is scoped to one workspace.
 *
 * The store slug and pathname are unknown while Next.js prerenders the
 * fallback shell for /shop/[store], so URL-dependent parts sit in Suspense.
 */
export function ShopShell({ storeName, children }: { storeName: string; children: React.ReactNode }) {
  const brand = (
    <>
      <Image src="/images/ziggy-logo.png" alt="" width={32} height={32} className="rounded-sm" />
      <span className="text-heading-md text-ink">{storeName}</span>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
          <Suspense fallback={<span className="flex shrink-0 items-center gap-2">{brand}</span>}>
            <BrandLink>{brand}</BrandLink>
          </Suspense>

          <label className="relative mx-auto hidden w-full max-w-md md:block">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
            <input
              type="search"
              placeholder="Search rice, milk, snacks…"
              className="h-12 w-full rounded-full bg-surface-card pl-10 pr-4 text-body-md text-ink placeholder:text-ash focus:bg-canvas"
            />
          </label>

          <Suspense fallback={null}>
            <HeaderNav />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-12">
        {children}
      </main>

      <footer className="hidden border-t border-hairline px-6 py-8 text-caption text-mute md:block">
        <div className="mx-auto max-w-[1280px]">Powered by Ziggy · Prices include applicable taxes</div>
      </footer>

      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </div>
  );
}

function useShopTabs() {
  const { store } = useParams<{ store: string }>();
  const pathname = usePathname();
  const base = `/shop/${store}`;
  const tabs = [
    { label: "Shop", href: base, icon: Home },
    { label: "Orders", href: `${base}/orders`, icon: Package },
    { label: "Cart", href: `${base}/cart`, icon: ShoppingCart },
    { label: "Account", href: `${base}/account`, icon: User },
  ];
  const isActive = (href: string) => (href === base ? pathname === base : pathname.startsWith(href));
  return { base, tabs, isActive };
}

function BrandLink({ children }: { children: React.ReactNode }) {
  const { base } = useShopTabs();
  return (
    <Link href={base} className="flex shrink-0 items-center gap-2">
      {children}
    </Link>
  );
}

function HeaderNav() {
  const { tabs, isActive } = useShopTabs();
  return (
    <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Shop">
      {tabs.slice(1).map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-body-sm font-bold text-ink hover:bg-surface-card aria-[current=page]:bg-ink aria-[current=page]:text-on-dark"
        >
          <Icon className="size-4" />
          {label}
          {label === "Cart" && (
            <span className="rounded-full bg-primary px-1.5 text-caption text-on-primary">2</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function BottomTabBar() {
  const { tabs, isActive } = useShopTabs();
  return (
    <nav
      aria-label="Shop"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-hairline bg-canvas md:hidden"
    >
      {tabs.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex flex-col items-center gap-1 py-2.5 text-caption font-bold ${isActive(href) ? "text-ink" : "text-mute"}`}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
