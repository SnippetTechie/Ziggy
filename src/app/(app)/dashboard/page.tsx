import type { Metadata } from "next";
import { Boxes, History, PackageMinus, PackagePlus } from "lucide-react";
import { Suspense } from "react";
import { InventoryOverview } from "@/components/inventory/inventory-overview";
import { LoadingBlock } from "@/components/ui/state-cards";
import { QuickLinks } from "@/components/ui/quick-links";
import { requirePageRole } from "@/server/authorization/session";

export const metadata: Metadata = { title: "Dashboard" };

/** Staff operations dashboard. STAFF and ADMIN. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading dashboard" />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const access = await requirePageRole("STAFF");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading-xl text-ink">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-body-md text-mute">
          Stock health for {access.workspaceName}: what is low, what just moved, and where to record changes.
        </p>
      </header>

      <QuickLinks
        links={[
          { label: "Stock in", href: "/purchasing", icon: PackagePlus, description: "Record stock received" },
          { label: "Stock out", href: "/issues", icon: PackageMinus, description: "Record stock issued" },
          { label: "Inventory", href: "/inventory", icon: Boxes, description: "Search products and stock" },
          { label: "Movement history", href: "/movements", icon: History, description: "Every stock change" },
        ]}
      />

      <InventoryOverview access={access} />
    </div>
  );
}
