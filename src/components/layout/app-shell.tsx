"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { ChevronDown, Menu, Search, Shield, X, ArrowLeft, MapPin } from "lucide-react";
import { adminNav, appNav, type NavSection } from "./nav-config";

type Variant = "app" | "admin";

type AppShellProps = {
  variant: Variant;
  children: React.ReactNode;
};

/**
 * Shared application shell for both interfaces (doc 04 §2: Ziggy Admin shares
 * the same design system and shell). The variant only changes the label,
 * navigation, and the cross-link between the two areas.
 */
export function AppShell({ variant, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Nav config holds icon components, so it is resolved here on the client
  // rather than passed in as a prop from a Server Component.
  const nav = variant === "admin" ? adminNav : appNav;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-hairline bg-canvas lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Sidebar variant={variant} nav={nav} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-canvas">
            <button
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-surface-card"
            >
              <X className="size-5" />
            </button>
            <Sidebar variant={variant} nav={nav} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <TopBar variant={variant} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  variant,
  nav,
  onNavigate,
}: {
  variant: Variant;
  nav: NavSection[];
  onNavigate?: () => void;
}) {
  const home = variant === "admin" ? "/admin" : "/dashboard";

  return (
    <>
      <Link href={home} onClick={onNavigate} className="flex h-16 items-center gap-2.5 px-5">
        <Image src="/images/ziggy-logo.png" alt="" width={32} height={32} className="rounded-sm" />
        <span className="text-heading-md text-ink">Ziggy</span>
        {variant === "admin" && (
          <span className="rounded-full bg-ink px-2.5 py-1 text-caption font-bold text-on-dark">
            Admin
          </span>
        )}
      </Link>

      {/* Pages with dynamic params prerender a shell where the pathname is
          unknown, so the active-link highlight must sit inside Suspense. */}
      <Suspense fallback={<NavLinks nav={nav} home={home} pathname="" onNavigate={onNavigate} />}>
        <ActiveNavLinks nav={nav} home={home} onNavigate={onNavigate} />
      </Suspense>

      <div className="border-t border-hairline p-3">
        {variant === "app" ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-semibold text-charcoal hover:bg-surface-card"
          >
            <Shield className="size-[18px]" />
            Ziggy Admin
          </Link>
        ) : (
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-semibold text-charcoal hover:bg-surface-card"
          >
            <ArrowLeft className="size-[18px]" />
            Back to Ziggy
          </Link>
        )}
      </div>
    </>
  );
}

type NavLinksProps = {
  nav: NavSection[];
  home: string;
  onNavigate?: () => void;
};

function ActiveNavLinks(props: NavLinksProps) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({ nav, home, pathname, onNavigate }: NavLinksProps & { pathname: string }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2" aria-label="Main">
      {nav.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && (
            <p className="px-3 pb-1.5 text-caption font-medium uppercase tracking-wide text-ash">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === home ? pathname === home : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-semibold transition-colors " +
                      (active
                        ? "bg-ink text-on-dark"
                        : "text-charcoal hover:bg-surface-card")
                    }
                  >
                    <Icon className="size-[18px] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TopBar({ variant, onOpenMenu }: { variant: Variant; onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas px-4 sm:px-6 lg:px-8">
      <button
        aria-label="Open navigation"
        onClick={onOpenMenu}
        className="grid size-10 place-items-center rounded-full bg-surface-card lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Workspace switcher — a user can belong to several workspaces (PRD §11) */}
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-body-sm font-semibold text-ink hover:bg-surface-card">
        <span className="grid size-7 place-items-center rounded-sm bg-surface-card text-caption font-bold">
          SG
        </span>
        <span className="hidden sm:inline">Sharma Groceries</span>
        <ChevronDown className="size-4 text-mute" />
      </button>

      {variant === "app" && (
        <button className="hidden items-center gap-2 rounded-full bg-surface-card px-4 py-2 text-body-sm font-semibold text-ink md:flex">
          <MapPin className="size-4 text-mute" />
          All locations
          <ChevronDown className="size-4 text-mute" />
        </button>
      )}

      <div className="ml-auto flex flex-1 items-center justify-end gap-3">
        <label className="relative hidden w-full max-w-sm sm:block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
          <input
            type="search"
            placeholder={variant === "admin" ? "Search settings, members…" : "Search products, SKUs, orders…"}
            className="h-11 w-full rounded-full bg-surface-card pl-10 pr-4 text-body-sm text-ink placeholder:text-ash focus:bg-canvas"
          />
        </label>
        <span
          aria-label="Account"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary-bg text-body-sm font-bold text-ink"
        >
          AS
        </span>
      </div>
    </header>
  );
}
