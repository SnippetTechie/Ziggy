import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Branches & warehouses" };

export default function Page() {
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
