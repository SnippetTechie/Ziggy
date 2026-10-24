import { ProtectedPage } from "@/components/inventory/protected-page";
import { CartScreen } from "@/components/user/cart";
export const metadata = { title: "Cart" };
export default function Page() { return <ProtectedPage minimum="USER">{() => <CartScreen />}</ProtectedPage>; }
