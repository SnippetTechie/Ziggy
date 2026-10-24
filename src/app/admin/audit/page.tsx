import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Audit history" };

export default async function Page() {
  await requirePageRole("ADMIN");
  return (
    <ListPage
      title="Audit history"
      description="A record of significant actions: membership changes, settings, postings, and reversals."
      secondaryAction="Export CSV"
      chips={["All", "Members", "Settings", "Postings", "Reversals", "Permission failures"]}
      columns={["When", "Actor", "Action", "Entity", "Location", "Details"]}
    />
  );
}
