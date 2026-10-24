import type { Metadata } from "next";
import { Button, Card, PageHeader, Placeholder } from "@/components/wireframe";

export const metadata: Metadata = { title: "Data & account" };

export default function DataPage() {
  return (
    <>
      <PageHeader title="Data & account" description="Export your data and manage the workspace account." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Export data">
          <Placeholder label="CSV exports" hint="Products, stock balances, movements, purchase orders" height="h-32" />
          <div className="mt-4">
            <Button variant="secondary">Request export</Button>
          </div>
        </Card>
        <Card title="Plan & billing">
          <Placeholder label="Subscription details" hint="Out of MVP scope" height="h-32" />
        </Card>
        <Card title="Danger zone" className="lg:col-span-2">
          <p className="text-body-sm text-body">
            Transfer ownership or close this workspace. These actions require confirmation.
          </p>
        </Card>
      </div>
    </>
  );
}
