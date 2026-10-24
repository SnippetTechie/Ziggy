import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Sales & issues" };

export default async function Page() {
  await requirePageRole("STAFF");
  return (
    <ListPage
      title="Sales & issues"
      description="Record sales and non-sale stock issues. Stock is deducted when a document is posted."
      primaryAction="Record sale"
      secondaryAction="Issue stock"
      chips={["Sales", "Stock issues", "Drafts", "Posted", "Reversed"]}
      columns={["Reference", "Type", "Location", "Status", "Posted by", "Date", "Items", "Total"]}
      numericFrom={6}
      note="Sales and stock issues stay separate in the ledger and in reports."
    />
  );
}
