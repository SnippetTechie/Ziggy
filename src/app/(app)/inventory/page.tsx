import { ProtectedPage } from "@/components/inventory/protected-page";
import { ProductsScreen } from "@/components/inventory/products";
export const metadata = { title: "Inventory" };
export default function Page() { return <ProtectedPage minimum="USER">{() => <ProductsScreen />}</ProtectedPage>; }
