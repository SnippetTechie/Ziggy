import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Choose a workspace" };

/**
 * After sign-in, business users pick a workspace. Memberships come from
 * Ziggy's workspace_members table, not from Clerk (doc 02 §4.2).
 */
export default function SelectWorkspacePage() {
  return (
    <>
      <h1 className="text-heading-lg text-ink">Choose a workspace</h1>
      <p className="mt-1 text-body-md text-mute">You belong to these businesses.</p>
      <ul className="mt-6 space-y-2">
        {["Admin", "Staff"].map((role, i) => (
          <li key={i}>
            <Link
              href={role === "Admin" ? "/admin" : "/dashboard"}
              className="flex items-center gap-3 rounded-md border border-hairline p-3 hover:bg-surface-soft"
            >
              <span className="grid size-10 place-items-center rounded-sm bg-surface-card text-caption font-bold">—</span>
              <span className="flex-1">
                <span className="block h-3 w-32 rounded-full bg-secondary-bg" />
                <span className="mt-1.5 block text-caption text-mute">{role}</span>
              </span>
              <ChevronRight className="size-4 text-mute" />
            </Link>
          </li>
        ))}
      </ul>
      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-secondary-bg py-2.5 text-body-sm font-bold text-ink">
        <Plus className="size-4" /> Create a new workspace
      </button>
    </>
  );
}
