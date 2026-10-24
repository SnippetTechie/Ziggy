import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/server/authorization";
import { OrderDetail } from "@/components/user/orders";
import { PageLoading } from "@/components/auth/require-sign-in";
async function Content({ params }: { params: Promise<{ ref: string }> }) {
  await requirePageRole("USER");
  const { ref } = await params;
  if (!/^ZGY-DEMO-[0-9A-F]{8}$/.test(ref)) notFound();
  return <OrderDetail orderRef={ref} />;
}
export const metadata = { title: "Demo order" };
export default function Page({ params }: { params: Promise<{ ref: string }> }) { return <Suspense fallback={<PageLoading />}><Content params={params} /></Suspense>; }
