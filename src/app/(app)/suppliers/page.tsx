import { ProtectedPage } from "@/components/inventory/protected-page";
import { CatalogueScreen } from "@/components/inventory/catalogue";
export const metadata = { title: "Suppliers" };
export default function Page() { return <ProtectedPage minimum="STAFF">{access => <CatalogueScreen kind="suppliers" canManage={access.role === "ADMIN"} />}</ProtectedPage>; }
