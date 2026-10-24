import { ProtectedPage } from "@/components/inventory/protected-page";
import { CheckoutScreen } from "@/components/user/checkout";
export const metadata = { title: "Demo checkout" };
export default function Page() { return <ProtectedPage minimum="USER">{() => <CheckoutScreen />}</ProtectedPage>; }
