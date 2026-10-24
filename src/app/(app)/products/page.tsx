import { ProtectedPage } from "@/components/inventory/protected-page";
import { ProductsScreen } from "@/components/inventory/products";
export const metadata = { title: "Products" };
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <ProductsScreen manage />}</ProtectedPage>; }
