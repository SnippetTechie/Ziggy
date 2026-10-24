import { ProtectedPage } from "@/components/inventory/protected-page";
import { MovementsScreen } from "@/components/inventory/stock";
export const metadata = { title: "Movement history" };
export default function Page() { return <ProtectedPage minimum="STAFF">{() => <MovementsScreen />}</ProtectedPage>; }
