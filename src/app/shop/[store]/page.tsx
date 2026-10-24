import type { Metadata } from "next";
import { ProductCard } from "@/components/shop/product-card";
import { FilterChips } from "@/components/wireframe";
import { DEMO_PRODUCT_ID, DEMO_STORE } from "@/lib/demo";

export const metadata: Metadata = { title: "Shop" };

const categories = ["Staples", "Dairy & eggs", "Snacks", "Beverages", "Household", "Personal care"];
const stock: ("in" | "low" | "out")[] = ["in", "in", "low", "in", "out", "in", "in", "low", "in", "in", "in", "in"];

export default function ShopHomePage() {
  const base = `/shop/${DEMO_STORE.slug}`;
  return (
    <>
      <section className="rounded-lg bg-surface-card px-6 py-10 sm:px-10">
        <h1 className="max-w-xl text-[36px] font-semibold leading-[1.1] tracking-[-1.2px] text-ink sm:text-[44px]">
          Groceries from your neighbourhood store
        </h1>
        <p className="mt-3 max-w-lg text-body-md text-body">
          Order for home delivery or store pickup. Live stock, so what you order is what you get.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-heading-lg text-ink">Shop by category</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {categories.map((c) => (
            <div key={c} className="rounded-md bg-surface-card p-4 text-center">
              <span className="mx-auto mb-2 block size-10 rounded-full bg-secondary-bg" />
              <span className="text-body-sm font-semibold text-ink">{c}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-heading-lg text-ink">All products</h2>
          <FilterChips chips={["Popular", "In stock", "Price: low to high", "New"]} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {stock.map((s, i) => (
            <ProductCard key={i} stock={s} href={`${base}/products/${DEMO_PRODUCT_ID}`} />
          ))}
        </div>
      </section>
    </>
  );
}
