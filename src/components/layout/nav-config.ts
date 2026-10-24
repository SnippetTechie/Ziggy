import { BarChart3, Boxes, ClipboardList, History, LayoutDashboard, Package, Settings, SlidersHorizontal, Tags, Truck, Users, ArrowDownToLine, ArrowUpFromLine, type LucideIcon } from "lucide-react";
import type { Role } from "@/modules/access/policy";
export type NavItem = { label: string; href: string; icon: LucideIcon; minimum: Role };
export type NavSection = { title?: string; items: NavItem[] };
export const appNav: NavSection[] = [
  { title: "Workspace", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, minimum: "STAFF" },
    { label: "Inventory", href: "/inventory", icon: Boxes, minimum: "USER" },
  ] },
  { title: "Stock", items: [
    { label: "Stock in", href: "/purchasing", icon: ArrowDownToLine, minimum: "STAFF" },
    { label: "Stock out", href: "/issues", icon: ArrowUpFromLine, minimum: "STAFF" },
    { label: "Movement history", href: "/movements", icon: ClipboardList, minimum: "STAFF" },
  ] },
  { title: "Catalogue", items: [
    { label: "Products", href: "/products", icon: Package, minimum: "ADMIN" },
    { label: "Categories", href: "/categories", icon: Tags, minimum: "ADMIN" },
    { label: "Suppliers", href: "/suppliers", icon: Truck, minimum: "STAFF" },
  ] },
  { items: [
    { label: "Reports", href: "/reports", icon: BarChart3, minimum: "ADMIN" },
    { label: "My account", href: "/settings", icon: Settings, minimum: "USER" },
  ] },
];
export const adminNav: NavSection[] = [
  { title: "Administration", items: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard, minimum: "ADMIN" },
    { label: "Team & access", href: "/admin/team", icon: Users, minimum: "ADMIN" },
    { label: "Preferences", href: "/admin/preferences", icon: SlidersHorizontal, minimum: "ADMIN" },
    { label: "Audit history", href: "/admin/audit", icon: History, minimum: "ADMIN" },
  ] },
  ...appNav,
];
