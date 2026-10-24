import { ProtectedPage } from "@/components/inventory/protected-page";
import { AuditScreen } from "@/components/inventory/admin";
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <AuditScreen />}</ProtectedPage>; }
