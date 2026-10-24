import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Branches & warehouses" };

export default async function Page() {
  await requirePageRole("ADMIN");
  return (
    <ListPage
      title="Branches & warehouses"
      description="Locations where stock is held. Locations with history are deactivated, not deleted."
      primaryAction="Add location"
      chips={["Active", "Inactive", "Branches", "Warehouses"]}
      columns={["Name", "Code", "Type", "Address", "Status", "Products", "Stock value"]}
      numericFrom={5}
    />
  );
}
