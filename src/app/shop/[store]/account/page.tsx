import type { Metadata } from "next";
import { Card, PageHeader, Placeholder } from "@/components/wireframe";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <Placeholder label="Name, phone, email" hint="From sign-in (Clerk)" height="h-28" />
        </Card>
        <Card title="Saved addresses" action="Add address">
          <Placeholder label="Delivery addresses" height="h-28" />
        </Card>
      </div>
    </>
  );
}
