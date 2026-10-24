import { ProtectedPage } from "@/components/inventory/protected-page";
import { UserCatalogue } from "@/components/user/catalogue";
// The USER shopping view, reachable by every role (Staff/Admin keep their table view at /inventory).
export const metadata = { title: "Catalog" };
export default function Page() { return <ProtectedPage minimum="USER">{() => <UserCatalogue />}</ProtectedPage>; }
