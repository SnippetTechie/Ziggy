import type { Metadata } from "next";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { Button, Card, PageHeader, StatusPill, WireTable } from "@/components/wireframe";
import { DEMO_ORDER_ID } from "@/lib/demo";

export const metadata: Metadata = { title: "Order details" };

export function generateStaticParams() {
  return [{ orderId: DEMO_ORDER_ID }];
}

/**
 * Shopper view of one order. Shoppers can edit or cancel only while the
 * order is "Placed" — once the store confirms it, changes go through the store.
 */
export default function ShopperOrderPage() {
  return (
    <>
      <PageHeader title="Order #—" description="Placed on — · Home delivery" />
      <Card>
        <OrderTimeline current={0} />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Items" className="lg:col-span-2">
          <WireTable columns={["Product", "Pack", "Qty", "Price"]} numericFrom={2} rows={3} />
        </Card>
        <Card title="Manage order">
          <div className="mb-4">
            <StatusPill tone="warning">Waiting for store confirmation</StatusPill>
          </div>
          <p className="mb-4 text-body-sm text-body">
            You can change or cancel this order until the store confirms it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary">Edit items</Button>
            <Button variant="tertiary">Cancel order</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
