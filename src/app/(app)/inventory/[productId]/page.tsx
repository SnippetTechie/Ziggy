import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/server/authorization";
import { ProductDetail } from "@/components/inventory/stock";
import { ShopProductDetail } from "@/components/user/product-detail";
import { isDemoId } from "@/modules/demo-store/demo-catalog";
import { idInput } from "@/server/validation";
import { PageLoading } from "@/components/auth/require-sign-in";
async function Content({ params }: { params: Promise<{ productId: string }> }) {
  const access = await requirePageRole("USER");
  const { productId } = await params;
  const demo = isDemoId(productId) && productId.length <= 64;
  if (!demo && !idInput.safeParse(productId).success) notFound();
  // USER (and any role opening a demo product) gets the shopping detail; STAFF/ADMIN keep the operational detail for live products.
  if (demo || access.role === "USER") return <ShopProductDetail productId={productId} />;
  return <ProductDetail productId={productId} canViewHistory />;
}
export default function Page({ params }: { params: Promise<{ productId: string }> }) { return <Suspense fallback={<PageLoading />}><Content params={params} /></Suspense>; }
