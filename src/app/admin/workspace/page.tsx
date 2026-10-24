import type { Metadata } from "next";
import { Button, Card, PageHeader, Placeholder } from "@/components/wireframe";

export const metadata: Metadata = { title: "Workspace profile" };

const fields = ["Business name", "Workspace URL (slug)", "Default currency", "Timezone"];

export default function WorkspaceProfilePage() {
  return (
    <>
      <PageHeader title="Workspace profile" description="Your business details, currency, and timezone." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Business details" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f} className="block">
                <span className="mb-1.5 block text-body-sm font-semibold text-ink">{f}</span>
                <span className="block h-11 rounded-md border border-ash bg-canvas" />
              </label>
            ))}
          </div>
          <p className="mt-4 text-caption text-mute">
            Currency defaults to INR. Changing it does not reinterpret historical values.
          </p>
          <div className="mt-5 flex justify-end">
            <Button>Save changes</Button>
          </div>
        </Card>
        <Card title="Logo">
          <Placeholder label="Business logo" hint="Shown in the workspace switcher" />
        </Card>
      </div>
    </>
  );
}
