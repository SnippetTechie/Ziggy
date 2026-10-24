import { ProtectedPage } from "@/components/inventory/protected-page";
import { TeamScreen } from "@/components/inventory/admin";
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <TeamScreen />}</ProtectedPage>; }
