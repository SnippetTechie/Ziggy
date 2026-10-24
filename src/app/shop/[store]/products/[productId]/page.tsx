import type { Metadata } from "next";
import { Button, Card, StatusPill } from "@/components/wireframe";
import { DEMO_PRODUCT_ID } from "@/lib/demo";

export const metadata: Metadata = { title: "Product" };

export function generateStaticParams() {
  return [{ productId: DEMO_PRODUCT_ID }];
}

export default function ProductPage() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div className="grid aspect-square place-items-center rounded-lg bg-surface-card text-body-sm text-ash">
        Product image
      </div>
      <div>
        <p className="text-body-sm font-semibold text-mute">Category · Brand</p>
        <h1 className="mt-1 text-heading-xl text-ink">Product name</h1>
        <p className="mt-3 text-heading-lg text-ink">₹ —</p>
        <div className="mt-3">
          <StatusPill tone="success">In stock</StatusPill>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-body-sm font-bold text-ink">Pack size</p>
          {/* Sold in units defined by the store's product unit conversions (doc 03 §5.3) */}
          <div className="flex flex-wrap gap-2">
            {["1 kg", "5 kg", "25 kg bag"].map((u, i) => (
              <span
                key={u}
                className={`rounded-full px-4 py-2 text-body-sm font-bold ${i === 1 ? "bg-ink text-on-dark" : "bg-surface-card text-ink"}`}
              >
                {u}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-10 items-center rounded-md bg-surface-card">
            <span className="grid w-10 place-items-center font-bold">−</span>
            <span className="w-8 text-center font-bold">1</span>
            <span className="grid w-10 place-items-center font-bold">+</span>
          </div>
          <Button>Add to cart</Button>
        </div>

        <Card title="About this product" className="mt-8">
          <div className="space-y-2">
            <span className="block h-3 w-full rounded-full bg-secondary-bg" />
            <span className="block h-3 w-5/6 rounded-full bg-secondary-bg" />
            <span className="block h-3 w-2/3 rounded-full bg-secondary-bg" />
          </div>
        </Card>
      </div>
    </div>
  );
}
