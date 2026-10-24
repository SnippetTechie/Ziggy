import { ShopShell } from "@/components/shop/shop-shell";
import { DEMO_STORE } from "@/lib/demo";

// Wireframe: one demo store. Later this lists stores whose shop is enabled,
// and the store name comes from the workspace record.
export function generateStaticParams() {
  return [{ store: DEMO_STORE.slug }];
}

export default function ShopLayout({ children }: LayoutProps<"/shop/[store]">) {
  return <ShopShell storeName={DEMO_STORE.name}>{children}</ShopShell>;
}
