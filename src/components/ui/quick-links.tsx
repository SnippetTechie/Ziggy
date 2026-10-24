import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type QuickLink = { label: string; href: string; icon: LucideIcon; description?: string };

/** Plain navigation links (the wireframe Button is not a link). */
export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {links.map(({ label, href, icon: Icon, description }) => (
        <li key={href + label}>
          <Link
            href={href}
            className="flex h-full items-center gap-3 rounded-md bg-surface-card p-4 hover:bg-secondary-bg"
          >
            <Icon className="size-5 shrink-0 text-charcoal" aria-hidden />
            <span>
              <span className="block text-body-sm font-bold text-ink">{label}</span>
              {description && <span className="block text-caption text-mute">{description}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
