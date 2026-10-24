import type { Metadata } from "next";
import { Card, PageHeader, Placeholder, StatTile, WireTable } from "@/components/wireframe";

export const metadata: Metadata = { title: "Admin overview" };

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader
        title="Workspace admin"
        description="Manage your business, locations, team, and how Ziggy operates."
        primaryAction="Invite member"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Locations" hint="Branches & warehouses" />
        <StatTile label="Team members" hint="Active" />
        <StatTile label="Pending invitations" />
        <StatTile label="Products" hint="Active in catalogue" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Setup checklist">
          <ol className="space-y-3 text-body-sm text-body">
            {[
              "Complete workspace profile",
              "Add branches and warehouses",
              "Invite your team",
              "Set up units and products",
              "Record opening stock",
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary-bg text-caption font-bold text-ink">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Recent admin activity" action="Audit history" className="xl:col-span-2">
          <WireTable columns={["When", "Who", "Action", "Target"]} rows={5} />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Locations at a glance">
          <Placeholder label="Branch & warehouse cards" hint="Name, type, stock value, low-stock count" height="h-32" />
        </Card>
      </div>
    </>
  );
}
