import { ProtectedPage } from "@/components/inventory/protected-page";
import { OverviewScreen } from "@/components/inventory/overview";
export const metadata = { title: "Dashboard" };
export default function Page() { return <ProtectedPage minimum="STAFF">{() => <OverviewScreen />}</ProtectedPage>; }
