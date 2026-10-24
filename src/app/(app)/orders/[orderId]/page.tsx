import type { Metadata } from "next";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { Button, Card, PageHeader, Placeholder, StatusPill, WireTable } from "@/components/wireframe";
import { DEMO_ORDER_ID } from "@/lib/demo";

export const metadata: Metadata = { title: "Order" };

export function generateStaticParams() {
  return [{ orderId: DEMO_ORDER_ID }];
}

/** Store-side view of a customer order: confirm, adjust, fulfil, or cancel. */
export default function AdminOrderPage() {
  return (
    <>
      <PageHeader
        title="Order #—"
        description="Placed — · Home delivery · Pay on delivery"
        secondaryAction="Cancel order"
        primaryAction="Confirm order"
      />
      <Card>
        <OrderTimeline current={0} />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Items" action="Edit quantities" className="xl:col-span-2">
          <WireTable
            columns={["Product", "Pack", "Ordered", "Available at location", "Price"]}
            numericFrom={2}
            rows={3}
          />
          <p className="mt-3 text-caption text-mute">
            Availability is checked again when the order is fulfilled. Negative stock is not allowed.
          </p>
        </Card>
        <div className="space-y-6">
          <Card title="Customer">
            <Placeholder label="Name, phone, delivery address" height="h-24" />
          </Card>
          <Card title="Fulfil from">
            <Placeholder label="Location picker" hint="Branch the stock is deducted from" height="h-20" />
          </Card>
          <Card title="Status">
            <div className="mb-3">
              <StatusPill tone="warning">Waiting for confirmation</StatusPill>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary">Mark packed</Button>
              <Button variant="secondary">Mark delivered</Button>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Activity" className="mt-6">
        <WireTable columns={["When", "Who", "Change"]} rows={3} />
      </Card>
    </>
  );
}
