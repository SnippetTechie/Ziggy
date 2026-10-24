import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <ListPage
      title="Products"
      description="Your catalogue: SKUs, categories, units, and reorder settings."
      primaryAction="Add product"
      secondaryAction="Import"
      chips={["Active", "Archived", "All categories"]}
      columns={["Product", "SKU", "Category", "Base unit", "Reorder point", "Status"]}
      numericFrom={4}
      note="Products with transaction history are archived, never deleted."
    />
  );
}
