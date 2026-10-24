import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Transfers" };

export default function Page() {
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
