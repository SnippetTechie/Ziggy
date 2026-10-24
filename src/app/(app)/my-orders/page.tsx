import { ProtectedPage } from "@/components/inventory/protected-page";
import { OrdersScreen } from "@/components/user/orders";
export const metadata = { title: "My Orders" };
export default function Page() { return <ProtectedPage minimum="USER">{() => <OrdersScreen />}</ProtectedPage>; }
