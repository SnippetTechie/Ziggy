import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Suppliers" };

export default async function Page() {
  await requirePageRole("STAFF");
  return (
    <ListPage
      title="Suppliers"
      description="Supplier contacts, lead times, and purchasing history."
      primaryAction="Add supplier"
      chips={["Active", "Inactive"]}
      columns={["Supplier", "Contact", "Phone", "Email", "Open POs", "Avg. lead time"]}
      numericFrom={4}
    />
  );
}
