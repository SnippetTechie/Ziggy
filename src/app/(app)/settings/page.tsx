import { ProtectedPage } from "@/components/inventory/protected-page";
import { AccountScreen } from "@/components/inventory/admin";
export default function Page() { return <ProtectedPage minimum="USER">{() => <AccountScreen />}</ProtectedPage>; }
