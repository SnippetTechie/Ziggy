import { ProtectedPage } from "@/components/inventory/protected-page";
import { ProductsScreen } from "@/components/inventory/products";
import { UserCatalogue } from "@/components/user/catalogue";
export const metadata = { title: "Inventory" };
// USER gets the product-card catalog; STAFF/ADMIN keep the operational table.
export default function Page() { return <ProtectedPage minimum="USER">{access => access.role === "USER" ? <UserCatalogue /> : <ProductsScreen />}</ProtectedPage>; }
