import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import { Card, PageHeader, Placeholder } from "@/components/wireframe";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePageRole("USER");
  return (
    <>
      <PageHeader title="Settings" description="Your personal profile and preferences." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <Placeholder label="Name, email, avatar" hint="Managed through Google sign-in (Clerk)" />
        </Card>
        <Card title="Preferences">
          <Placeholder label="Default location, notifications" />
        </Card>
        <Card title="My workspaces" className="lg:col-span-2">
          <Placeholder label="Workspaces you belong to, with your role in each" height="h-32" />
        </Card>
      </div>
    </>
  );
}
