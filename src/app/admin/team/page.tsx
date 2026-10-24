import type { Metadata } from "next";
import { ListPage } from "@/components/wireframe";

export const metadata: Metadata = { title: "Team & roles" };

export default function Page() {
  return (
    <ListPage
      title="Team & roles"
      description="Invite staff and control what they can do. Roles are enforced on the server."
      primaryAction="Invite member"
      chips={["Active", "Invited", "Suspended"]}
      columns={["Member", "Email", "Role", "Status", "Joined", "Last active"]}
      note="Roles: Admin manages the workspace; Staff performs day-to-day stock operations."
    />
  );
}
