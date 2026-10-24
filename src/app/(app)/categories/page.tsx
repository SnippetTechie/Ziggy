import { ProtectedPage } from "@/components/inventory/protected-page";
import { CatalogueScreen } from "@/components/inventory/catalogue";
export const metadata = { title: "Categories" };
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <CatalogueScreen kind="categories" />}</ProtectedPage>; }
