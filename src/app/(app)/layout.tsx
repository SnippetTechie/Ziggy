import { AppShell } from "@/components/layout/app-shell";

/** Ziggy — day-to-day operations for ADMIN and STAFF members. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell variant="app">{children}</AppShell>;
}
