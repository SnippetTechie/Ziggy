import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Purchasing" };

export default async function Page() {
  await requirePageRole("STAFF");
  return (
    <ListPage
      title="Purchasing"
      description="Purchase orders and goods receipts. Stock increases only when a receipt is posted."
      primaryAction="New purchase order"
      secondaryAction="Receive goods"
      chips={["All", "Draft", "Submitted", "Partially received", "Received", "Cancelled"]}
      columns={["Order #", "Supplier", "Destination", "Status", "Expected", "Ordered", "Received", "Total"]}
      numericFrom={5}
    />
  );
}
