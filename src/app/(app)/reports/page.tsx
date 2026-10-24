import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsClient } from "@/components/reports/reports-client";
import { LoadingBlock } from "@/components/ui/state-cards";
import { requirePageRole } from "@/server/authorization/session";

export const metadata: Metadata = { title: "Reports" };

/** Stock summary and movement reports with CSV export. ADMIN only. */
export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading reports" />}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  const access = await requirePageRole("ADMIN");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading-xl text-ink">Reports</h1>
        <p className="mt-1 max-w-2xl text-body-md text-mute">
          Stock levels and every stock movement, filterable and exportable as CSV.
        </p>
      </header>
      <ReportsClient timezone={access.workspaceTimezone} />
    </div>
  );
}
