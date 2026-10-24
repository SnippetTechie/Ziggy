import type { Metadata } from "next";
import { BarChart3, FolderTree, Package, Truck, Users } from "lucide-react";
import { Suspense } from "react";
import { InventoryOverview } from "@/components/inventory/inventory-overview";
import { LoadingBlock } from "@/components/ui/state-cards";
import { QuickLinks } from "@/components/ui/quick-links";
import { requirePageRole } from "@/server/authorization/session";

export const metadata: Metadata = { title: "Admin overview" };

/** Admin overview: shared inventory summary and alerts plus management links. ADMIN only. */
export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading overview" />}>
      <AdminOverviewContent />
    </Suspense>
  );
}

async function AdminOverviewContent() {
  const access = await requirePageRole("ADMIN");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading-xl text-ink">Admin overview</h1>
        <p className="mt-1 max-w-2xl text-body-md text-mute">
          Manage {access.workspaceName}: the catalogue, who has access, and reports.
        </p>
      </header>

      <QuickLinks
        links={[
          { label: "Products", href: "/products", icon: Package, description: "Add, edit, archive" },
          { label: "Categories", href: "/categories", icon: FolderTree, description: "Group products" },
          { label: "Suppliers", href: "/suppliers", icon: Truck, description: "Who you buy from" },
          { label: "Team & roles", href: "/admin/team", icon: Users, description: "Grant and manage access" },
          { label: "Reports", href: "/reports", icon: BarChart3, description: "Stock and movements, CSV" },
        ]}
      />

      <InventoryOverview access={access} />
    </div>
  );
}
