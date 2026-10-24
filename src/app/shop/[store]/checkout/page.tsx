import type { Metadata } from "next";
import { Card, PageHeader, Placeholder } from "@/components/wireframe";
import { DEMO_ORDER_ID, DEMO_STORE } from "@/lib/demo";
import { OrderSummary } from "@/components/shop/order-summary";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Checkout" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="1. Delivery or pickup">
            <div className="flex gap-2">
              <span className="rounded-full bg-ink px-4 py-2 text-body-sm font-bold text-on-dark">Home delivery</span>
              <span className="rounded-full bg-surface-card px-4 py-2 text-body-sm font-bold text-ink">Store pickup</span>
            </div>
          </Card>
          <Card title="2. Address & time slot">
            <Placeholder label="Saved addresses + delivery slot picker" height="h-32" />
          </Card>
          <Card title="3. Payment">
            <p className="text-body-sm text-body">
              Pay on delivery or at pickup. Online payment is not part of the MVP.
            </p>
          </Card>
        </div>
        <OrderSummary cta="Place order" href={`/shop/${DEMO_STORE.slug}/orders/${DEMO_ORDER_ID}`} />
      </div>
    </>
  );
}
