import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Transfers" };

export default async function Page() {
  await requirePageRole("ADMIN");
  return (
    <ListPage
      title="Transfers"
      description="Move stock between branches and warehouses. Both locations update together, at cost."
      primaryAction="New transfer"
      chips={["All", "Draft", "Posted", "Reversed"]}
      columns={["Transfer #", "From", "To", "Status", "Created by", "Date", "Items"]}
      numericFrom={6}
    />
  );
}
