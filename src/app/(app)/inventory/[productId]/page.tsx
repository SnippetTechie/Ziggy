import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/server/authorization";
import { ProductDetail } from "@/components/inventory/stock";
import { idInput } from "@/server/validation";
import { PageLoading } from "@/components/auth/require-sign-in";
async function Content({ params }: { params: Promise<{ productId: string }> }) {
  const access = await requirePageRole("USER");
  const { productId } = await params;
  if (!idInput.safeParse(productId).success) notFound();
  return <ProductDetail productId={productId} canViewHistory={access.role !== "USER"} />;
}
export default function Page({ params }: { params: Promise<{ productId: string }> }) { return <Suspense fallback={<PageLoading />}><Content params={params} /></Suspense>; }
