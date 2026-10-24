"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu, Shield, X, ArrowLeft } from "lucide-react";
import type { Role } from "@/server/authorization/roles";
import { AccessNotice } from "./access-notice";
import { adminNav, appNav, navForRole, type NavSection } from "./nav-config";

type Variant = "app" | "admin";

type AppShellProps = {
  variant: Variant;
  /** The signed-in member's role, resolved on the server. Only filters links. */
  role: Role;
  workspaceName: string;
  children: React.ReactNode;
};

/**
 * Shared application shell for both interfaces (doc 04 §2: Ziggy Admin shares
 * the same design system and shell). The variant only changes the label,
 * navigation, and the cross-link between the two areas.
 */
export function AppShell({ variant, role, workspaceName, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Nav config holds icon components, so it is resolved here on the client
  // rather than passed in as a prop from a Server Component. Hiding links is
  // convenience only: every page re-checks the role on the server.
  const nav = navForRole(variant === "admin" ? adminNav : appNav, role);
  const home = variant === "admin" ? "/admin" : role === "USER" ? "/inventory" : "/dashboard";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-hairline bg-canvas lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <Sidebar variant={variant} role={role} home={home} nav={nav} />
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
            <Sidebar variant={variant} role={role} home={home} nav={nav} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <TopBar workspaceName={workspaceName} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <Suspense>
              <AccessNotice />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  variant,
  role,
  home,
  nav,
  onNavigate,
}: {
  variant: Variant;
  role: Role;
  home: string;
  nav: NavSection[];
  onNavigate?: () => void;
}) {

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
          role === "ADMIN" && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-semibold text-charcoal hover:bg-surface-card"
          >
            <Shield className="size-[18px]" />
            Ziggy Admin
          </Link>
          )
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

function TopBar({ workspaceName, onOpenMenu }: { workspaceName: string; onOpenMenu: () => void }) {
  const initials = workspaceName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas px-4 sm:px-6 lg:px-8">
      <button
        aria-label="Open navigation"
        onClick={onOpenMenu}
        className="grid size-10 place-items-center rounded-full bg-surface-card lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* One workspace per member in the prototype (PRD §11), so this is a label, not a switcher. */}
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-body-sm font-semibold text-ink">
        <span className="grid size-7 place-items-center rounded-sm bg-surface-card text-caption font-bold">
          {initials || "Z"}
        </span>
        <span className="hidden sm:inline">{workspaceName}</span>
      </div>

      <div className="ml-auto flex items-center justify-end gap-3">
        <div className="grid size-10 shrink-0 place-items-center">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
