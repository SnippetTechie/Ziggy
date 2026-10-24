import { ProtectedPage } from "@/components/inventory/protected-page";
import { StockScreen } from "@/components/inventory/stock";
export const metadata = { title: "Stock out" };
export default function Page() { return <ProtectedPage minimum="STAFF">{() => <StockScreen direction="out" />}</ProtectedPage>; }
