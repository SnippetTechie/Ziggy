import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamClient } from "@/components/team/team-client";
import { LoadingBlock } from "@/components/ui/state-cards";
import { requirePageRole } from "@/server/authorization/session";

export const metadata: Metadata = { title: "Team & roles" };

/** Grant, change, and suspend member access. ADMIN only. */
export default function TeamPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading team" />}>
      <TeamContent />
    </Suspense>
  );
}

async function TeamContent() {
  const access = await requirePageRole("ADMIN");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-heading-xl text-ink">Team &amp; roles</h1>
        <p className="mt-1 max-w-2xl text-body-md text-mute">
          Decide who can use {access.workspaceName} and what they can do. Roles are enforced on the server.
        </p>
      </header>
      <TeamClient currentUserId={access.userId} />
    </div>
  );
}
