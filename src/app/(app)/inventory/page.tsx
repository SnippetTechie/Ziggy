import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <ListPage
      title="Inventory"
      description="On-hand stock for every product at every location, in base units."
      primaryAction="Adjust stock"
      secondaryAction="Export CSV"
      chips={["All", "Low stock", "Out of stock", "In stock"]}
      columns={["Product", "SKU", "Location", "Status", "On hand", "Unit", "Avg. cost", "Value"]}
      numericFrom={4}
      note="Quantities are shown in each product's base unit. Stock changes only through posted transactions."
    />
  );
}
