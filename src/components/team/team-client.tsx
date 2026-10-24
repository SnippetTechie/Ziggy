"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/state-cards";
import { StatusPill } from "@/components/wireframe";
import { ROLES, type Role } from "@/server/authorization/roles";

type Member = { userId: string; displayName: string | null; email: string | null; role: Role; status: "ACTIVE" | "SUSPENDED"; joinedAt: string };
type Pending = { userId: string; displayName: string | null; email: string | null; requestedAt: string };

type Data = { members: Member[]; pending: Pending[] };

const select = "h-9 rounded-md border border-hairline bg-canvas px-2 text-body-sm text-ink";

async function api(path: string, init?: RequestInit): Promise<{ ok: true; body: unknown } | { ok: false; message: string }> {
  try {
    const res = await fetch(path, { cache: "no-store", ...init });
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    if (!res.ok) return { ok: false, message: body?.error?.message ?? "Request failed." };
    return { ok: true, body };
  } catch {
    return { ok: false, message: "We could not reach the server." };
  }
}

/**
 * Admin-only access management. All changes go through /api/v1/members, which
 * re-checks the ADMIN role and protects the last active admin on the server.
 */
export function TeamClient({ currentUserId }: { currentUserId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [grantRole, setGrantRole] = useState<Record<string, Role>>({});

  const refresh = useCallback(async () => {
    const [m, p] = await Promise.all([api("/api/v1/members"), api("/api/v1/members/pending")]);
    if (!m.ok) return setError(m.message);
    if (!p.ok) return setError(p.message);
    setError(null);
    setData({
      members: (m.body as { members: Member[] }).members,
      pending: (p.body as { pending: Pending[] }).pending,
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void refresh();
  }, [refresh]);

  async function run(key: string, path: string, init: RequestInit) {
    setBusy(key);
    setNotice(null);
    const res = await api(path, { ...init, headers: { "Content-Type": "application/json" } });
    setBusy(null);
    if (!res.ok) setNotice(res.message);
    await refresh();
  }

  if (error) return <ErrorState message={error} onRetry={() => { setData(null); setError(null); void refresh(); }} />;
  if (!data) return <LoadingBlock label="Loading team" />;

  return (
    <div className="space-y-8">
      {notice && <p role="alert" className="rounded-md bg-error-pale p-3 text-body-sm font-semibold text-error">{notice}</p>}

      <section aria-labelledby="pending-h" className="space-y-3">
        <h2 id="pending-h" className="text-heading-md text-ink">Access requests</h2>
        {data.pending.length === 0 ? (
          <EmptyState title="No pending requests" message="People who sign in and ask for access will appear here. Nobody is added automatically." />
        ) : (
          <ul className="divide-y divide-hairline-soft rounded-md border border-hairline bg-canvas">
            {data.pending.map((p) => {
              const role = grantRole[p.userId] ?? "USER";
              return (
                <li key={p.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-body-sm font-semibold text-ink">{p.displayName ?? p.email ?? "Unnamed user"}</p>
                    <p className="text-caption text-mute">{p.email ?? "No email"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`grant-${p.userId}`}>Role to grant</label>
                    <select id={`grant-${p.userId}`} value={role} onChange={(e) => setGrantRole({ ...grantRole, [p.userId]: e.target.value as Role })} className={select}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button
                      disabled={busy !== null}
                      onClick={() => run(`grant-${p.userId}`, "/api/v1/members", { method: "POST", body: JSON.stringify({ userId: p.userId, role }) })}
                      className="h-9 rounded-md bg-primary px-3 text-body-sm font-bold text-on-primary disabled:opacity-50"
                    >
                      {busy === `grant-${p.userId}` ? "Granting…" : "Grant access"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="members-h" className="space-y-3">
        <h2 id="members-h" className="text-heading-md text-ink">Members</h2>
        {data.members.length === 0 ? (
          <EmptyState title="No members" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
            <table className="w-full text-left text-body-sm">
              <thead className="border-b border-hairline bg-surface-soft text-mute">
                <tr>{["Member", "Role", "Status", "Actions"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.members.map((m) => {
                  const self = m.userId === currentUserId;
                  return (
                    <tr key={m.userId} className="border-b border-hairline-soft last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{m.displayName ?? m.email ?? "Unnamed user"}{self ? " (you)" : ""}</p>
                        <p className="text-caption text-mute">{m.email ?? "No email"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <label className="sr-only" htmlFor={`role-${m.userId}`}>Role for {m.displayName ?? m.email ?? "member"}</label>
                        <select
                          id={`role-${m.userId}`}
                          value={m.role}
                          disabled={busy !== null}
                          onChange={(e) => run(`role-${m.userId}`, `/api/v1/members/${m.userId}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) })}
                          className={select}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={m.status === "ACTIVE" ? "success" : "warning"}>{m.status === "ACTIVE" ? "Active" : "Suspended"}</StatusPill>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          disabled={busy !== null}
                          onClick={() => run(`status-${m.userId}`, `/api/v1/members/${m.userId}`, { method: "PATCH", body: JSON.stringify({ status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }) })}
                          className="h-9 rounded-md bg-secondary-bg px-3 text-body-sm font-bold text-ink disabled:opacity-50"
                        >
                          {m.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-caption text-mute">The last active admin cannot be demoted or suspended.</p>
      </section>
    </div>
  );
}
