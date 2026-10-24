import { ProtectedPage } from "@/components/inventory/protected-page";
import { PreferencesScreen } from "@/components/inventory/admin";
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <PreferencesScreen />}</ProtectedPage>; }
