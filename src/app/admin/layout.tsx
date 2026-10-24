import { AppShell } from "@/components/layout/app-shell";

/**
 * Ziggy Admin — workspace administration. Restricted to the ADMIN role;
 * the server-side role check is added with Clerk in Phase 2.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AppShell variant="admin">{children}</AppShell>;
}
