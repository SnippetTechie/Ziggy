"use client";
import { UserProfile } from "@clerk/nextjs";
import { useState, type FormEvent } from "react";
import { api, useRemote, Field, Notice, Table, Cell, Loading, inputClass, buttonClass, secondaryClass } from "./ui";
type Member = { userId: string; displayName: string; email: string; role?: "USER" | "STAFF" | "ADMIN"; status?: "ACTIVE" | "SUSPENDED" };
export function TeamScreen() {
  const members = useRemote<Member[]>("members"), pending = useRemote<Member[]>("members/pending");
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>, member: Member) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    try { await api(`members/${member.userId}`, "PATCH", { role: form.get("role"), status: form.get("status") }); members.refresh(); pending.refresh(); setSuccess("Access updated."); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const list = (rows: Member[]) => <Table headings={["Person", "Access"]} empty={!rows.length}>{rows.map(member => <tr key={member.userId}><Cell>{member.displayName}<span className="block text-caption text-mute">{member.email}</span></Cell><Cell><form className="flex flex-wrap gap-2" onSubmit={e => save(e, member)}><label><span className="sr-only">Role for {member.email}</span><select name="role" className={inputClass} defaultValue={member.role ?? "USER"}><option>USER</option><option>STAFF</option><option>ADMIN</option></select></label><label><span className="sr-only">Status for {member.email}</span><select name="status" className={inputClass} defaultValue={member.status ?? "ACTIVE"}><option>ACTIVE</option><option>SUSPENDED</option></select></label><button disabled={busy} className={secondaryClass}>{member.role ? "Update access" : "Grant access"}</button></form></Cell></tr>)}</Table>;
  return <><h1 className="text-heading-xl text-ink">Team & access</h1><p className="mt-2 text-body-sm text-mute">New signups stay pending until you approve them. Keep at least one active Admin.</p><Notice error={error || members.error || pending.error} success={success} /><h2 className="mt-8 text-heading-md">Pending access</h2>{pending.loading ? <Loading /> : list(pending.data ?? [])}<h2 className="mt-8 text-heading-md">Workspace members</h2>{members.loading ? <Loading /> : list(members.data ?? [])}</>;
}
export function PreferencesScreen() {
  const settings = useRemote<{ defaultLowStockThreshold: string }>("settings");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try { await api("settings", "PATCH", { defaultLowStockThreshold: String(new FormData(event.currentTarget).get("threshold")) }); setSuccess("Preferences saved."); settings.refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <><h1 className="text-heading-xl text-ink">Preferences</h1><Notice error={error || settings.error} success={success} />{settings.loading ? <Loading /> : <form className="mt-6 max-w-md space-y-5" onSubmit={save}><Field label="Default low-stock threshold" hint="Used when a product does not have its own threshold. Quantity at or below this value is low stock."><input className={inputClass} name="threshold" type="number" min="0" step="0.000001" required defaultValue={settings.data?.defaultLowStockThreshold ?? "10"} /></Field><button className={buttonClass} disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button></form>}</>;
}
export function AuditScreen() {
  const audit = useRemote<{ id: string; action: string; entityType: string; entityId: string; createdAt: string }[]>("audit-logs");
  return <><h1 className="text-heading-xl text-ink">Audit history</h1><p className="mt-2 text-body-sm text-mute">The most recent 100 administrative and stock events.</p><Notice error={audit.error} />{audit.loading ? <Loading /> : <Table headings={["Date", "Action", "Entity", "Record ID"]} empty={!audit.data?.length}>{audit.data?.map(row => <tr key={row.id}><Cell>{new Date(row.createdAt).toLocaleString()}</Cell><Cell>{row.action}</Cell><Cell>{row.entityType}</Cell><Cell>{row.entityId}</Cell></tr>)}</Table>}</>;
}
export function AccountScreen() { return <><h1 className="mb-6 text-heading-xl text-ink">My account</h1><UserProfile routing="hash" /></>; }
