import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Units & product settings" };

export default function Page() {
  return (
    <ListPage
      title="Units & product settings"
      description="Units of measure and conversion rules. Conversions used by posted transactions are never changed retroactively."
      primaryAction="Add unit"
      secondaryAction="Categories"
      chips={["Units", "Categories", "SKU rules"]}
      columns={["Unit", "Code", "Used by products", "Conversions"]}
      numericFrom={2}
    />
  );
}
