import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Database,
  History,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Ruler,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

/** Ziggy — day-to-day operations (doc 04 §2). */
export const appNav: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Stock",
    items: [
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Products", href: "/products", icon: Package },
      { label: "Transfers", href: "/transfers", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Buy & sell",
    items: [
      { label: "Customer orders", href: "/orders", icon: ShoppingBag },
      { label: "Purchasing", href: "/purchasing", icon: ShoppingCart },
      { label: "Sales & issues", href: "/sales", icon: ClipboardList },
      { label: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Ziggy Intelligence", href: "/intelligence", icon: Sparkles },
    ],
  },
  {
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** Ziggy Admin — workspace administration (doc 04 §2). ADMIN role only. */
export const adminNav: NavSection[] = [
  {
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "Business",
    items: [
      { label: "Workspace profile", href: "/admin/workspace", icon: Store },
      { label: "Branches & warehouses", href: "/admin/locations", icon: Warehouse },
      { label: "Team & roles", href: "/admin/team", icon: Users },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Units & product settings", href: "/admin/units", icon: Ruler },
      { label: "Operational preferences", href: "/admin/preferences", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Audit history", href: "/admin/audit", icon: History },
      { label: "Data & account", href: "/admin/data", icon: Database },
    ],
  },
];

export const workspaceIcon = Building2;
