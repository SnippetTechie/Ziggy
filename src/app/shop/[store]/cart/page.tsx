import type { Metadata } from "next";
import { OrderSummary } from "@/components/shop/order-summary";
import { Card, PageHeader } from "@/components/wireframe";
import { DEMO_STORE } from "@/lib/demo";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <>
      <PageHeader title="Your cart" description="Prices and availability are confirmed when you place the order." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <ul className="divide-y divide-hairline-soft">
            {[0, 1].map((i) => (
              <li key={i} className="flex items-center gap-4 py-4">
                <span className="size-16 shrink-0 rounded-md bg-surface-card" />
                <div className="flex-1 space-y-2">
                  <span className="block h-3 w-40 rounded-full bg-secondary-bg" />
                  <span className="block h-3 w-20 rounded-full bg-secondary-bg" />
                </div>
                <div className="flex h-9 items-center rounded-md bg-surface-card text-body-sm">
                  <span className="grid w-9 place-items-center font-bold">−</span>
                  <span className="w-6 text-center font-bold">1</span>
                  <span className="grid w-9 place-items-center font-bold">+</span>
                </div>
                <span className="w-16 text-right text-body-sm font-bold text-ink">₹ —</span>
                <button className="text-caption font-bold text-mute underline">Remove</button>
              </li>
            ))}
          </ul>
        </Card>
        <OrderSummary cta="Checkout" href={`/shop/${DEMO_STORE.slug}/checkout`} />
      </div>
    </>
  );
}
