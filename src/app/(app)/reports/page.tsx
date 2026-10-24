import { ProtectedPage } from "@/components/inventory/protected-page";
import { ReportsScreen } from "@/components/inventory/overview";
export const metadata = { title: "Reports" };
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <ReportsScreen />}</ProtectedPage>; }
