import {
  BarChart3,
  Boxes,
  Building2,
  FolderTree,
  History,
  LayoutDashboard,
  type LucideIcon,
  PackageMinus,
  PackagePlus,
  Package,
  ScrollText,
  Settings,
  SlidersHorizontal,
  Truck,
  Users,
} from "lucide-react";
import type { Role } from "@/server/authorization/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Minimum role that sees the link. The server enforces the same rule on the page. */
  minRole: Role;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const RANK: Record<Role, number> = { USER: 1, STAFF: 2, ADMIN: 3 };

/**
 * Ziggy — inventory views for USER, STAFF, and ADMIN (TEAM_HANDOFF.md §5).
 * Deferred features (transfers, intelligence, locations, units) and the
 * obsolete ecommerce pages are intentionally not linked.
 */
export const appNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minRole: "STAFF" },
      { label: "Inventory", href: "/inventory", icon: Boxes, minRole: "USER" },
    ],
  },
  {
    title: "Stock",
    items: [
      { label: "Stock in", href: "/purchasing", icon: PackagePlus, minRole: "STAFF" },
      { label: "Stock out", href: "/issues", icon: PackageMinus, minRole: "STAFF" },
      { label: "Movement history", href: "/movements", icon: History, minRole: "STAFF" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Products", href: "/products", icon: Package, minRole: "ADMIN" },
      { label: "Categories", href: "/categories", icon: FolderTree, minRole: "ADMIN" },
      { label: "Suppliers", href: "/suppliers", icon: Truck, minRole: "STAFF" },
    ],
  },
  {
    title: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, minRole: "ADMIN" }],
  },
  {
    items: [{ label: "Settings", href: "/settings", icon: Settings, minRole: "USER" }],
  },
];

/** Ziggy Admin — ADMIN role only. */
export const adminNav: NavSection[] = [
  {
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard, minRole: "ADMIN" }],
  },
  {
    title: "Manage",
    items: [
      { label: "Products", href: "/products", icon: Package, minRole: "ADMIN" },
      { label: "Categories", href: "/categories", icon: FolderTree, minRole: "ADMIN" },
      { label: "Suppliers", href: "/suppliers", icon: Truck, minRole: "ADMIN" },
      { label: "Reports", href: "/reports", icon: BarChart3, minRole: "ADMIN" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Team & roles", href: "/admin/team", icon: Users, minRole: "ADMIN" },
      { label: "Preferences", href: "/admin/preferences", icon: SlidersHorizontal, minRole: "ADMIN" },
      { label: "Audit history", href: "/admin/audit", icon: ScrollText, minRole: "ADMIN" },
    ],
  },
];

/** Links the given role may see; empty sections are dropped. */
export function navForRole(nav: NavSection[], role: Role): NavSection[] {
  return nav
    .map((section) => ({ ...section, items: section.items.filter((i) => RANK[role] >= RANK[i.minRole]) }))
    .filter((section) => section.items.length > 0);
}

export const workspaceIcon = Building2;
