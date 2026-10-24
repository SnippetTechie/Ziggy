import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { Button, Card, PageHeader } from "@/components/wireframe";

export const metadata: Metadata = { title: "Operational preferences" };

const settings = [
  ["Negative stock", "Disallowed by default (PRD §7)"],
  ["Staff can post stock adjustments", "Policy decision pending (doc 05 §4.2)"],
  ["Staff can reverse transactions", "Policy decision pending"],
  ["Staff can export reports", "Policy decision pending"],
  ["Low-stock alerts", "Notify when a product falls below its reorder point"],
  ["Costing method", "Moving weighted average, per product per location"],
];

export default async function PreferencesPage() {
  await requirePageRole("ADMIN");
  return (
    <>
      <PageHeader title="Operational preferences" description="Rules that govern how stock operations work in this workspace." />
      <Card>
        <ul className="divide-y divide-hairline-soft">
          {settings.map(([label, hint]) => (
            <li key={label} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-body-sm font-bold text-ink">{label}</p>
                <p className="text-caption text-mute">{hint}</p>
              </div>
              <span aria-hidden className="h-6 w-11 shrink-0 rounded-full bg-secondary-bg" />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button>Save preferences</Button>
        </div>
      </Card>
    </>
  );
}
