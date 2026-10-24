import { ProtectedPage } from "@/components/inventory/protected-page";
import { AdminOrdersScreen } from "@/components/user/admin-orders";
export const metadata = { title: "Customer orders" };
export default function Page() { return <ProtectedPage minimum="ADMIN">{() => <AdminOrdersScreen />}</ProtectedPage>; }
