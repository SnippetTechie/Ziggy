import { ProtectedPage } from "@/components/inventory/protected-page";
import { OverviewScreen } from "@/components/inventory/overview";
export const metadata = { title: "Admin overview" };
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <OverviewScreen admin />}</ProtectedPage>; }
