"use client";
import { useState, type FormEvent } from "react";
import { api, useRemote, Field, Notice, Table, Cell, Loading, inputClass, buttonClass, secondaryClass, type Category, type Supplier } from "./ui";
export function CatalogueScreen({ kind, canManage = true }: { kind: "categories" | "suppliers"; canManage?: boolean }) {
  const resource = useRemote<(Category & Partial<Supplier>)[]>(kind);
  const [editing, setEditing] = useState<(Category & Partial<Supplier>) | "new" | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const supplier = kind === "suppliers";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    const id = editing && editing !== "new" ? editing.id : null;
    try { await api(id ? `${kind}/${id}` : kind, id ? "PATCH" : "POST", values); setEditing(null); resource.refresh(); setSuccess("Saved to your database."); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function action(id: string, action: "delete" | "deactivate" | "reactivate") {
    if (action === "delete" && !window.confirm("Delete this record? Records in use cannot be deleted.")) return;
    setBusy(true); setError(""); setSuccess("");
    try { await api(`${kind}/${id}${action === "delete" ? "" : "/" + action}`, action === "delete" ? "DELETE" : "POST"); resource.refresh(); setSuccess("Record updated."); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const current = editing && editing !== "new" ? editing : undefined;
  return <><div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-heading-xl capitalize text-ink">{kind}</h1><p className="mt-2 text-body-sm text-mute">{supplier ? "Your purchasing contacts and suppliers." : "Organize your product catalogue."}</p></div>{canManage && <button className={buttonClass} onClick={() => setEditing("new")}>Add {supplier ? "supplier" : "category"}</button>}</div><Notice error={error || resource.error} success={success} />
    {editing && <form key={current?.id ?? "new"} className="mt-6 rounded-md border border-hairline bg-canvas p-5" onSubmit={save}><h2 className="mb-4 text-heading-md">{current ? "Edit" : "Add"} {supplier ? "supplier" : "category"}</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input className={inputClass} name="name" required maxLength={supplier ? 180 : 100} defaultValue={current?.name} /></Field>{supplier && <><Field label="Email"><input className={inputClass} type="email" name="email" defaultValue={current?.email ?? ""} /></Field><Field label="Phone"><input className={inputClass} name="phone" maxLength={40} defaultValue={current?.phone ?? ""} /></Field><Field label="Address"><input className={inputClass} name="address" maxLength={500} defaultValue={current?.address ?? ""} /></Field></>}</div><div className="mt-5 flex gap-3"><button className={buttonClass} disabled={busy}>{busy ? "Saving…" : "Save"}</button><button type="button" className={secondaryClass} onClick={() => setEditing(null)} disabled={busy}>Cancel</button></div></form>}
    {resource.loading ? <Loading /> : <Table headings={["Name", ...(supplier ? ["Contact", "Status"] : []), ...(canManage ? ["Actions"] : [])]} empty={!resource.data?.length}>{resource.data?.map(row => <tr key={row.id}><Cell><span className="font-semibold">{row.name}</span></Cell>{supplier && <><Cell>{row.email || "—"}<br />{row.phone || ""}</Cell><Cell>{row.isActive ? "Active" : "Archived"}</Cell></>}{canManage && <Cell><div className="flex flex-wrap gap-2"><button className={secondaryClass} disabled={busy} onClick={() => setEditing(row)}>Edit</button>{supplier && <button className={secondaryClass} disabled={busy} onClick={() => action(row.id, row.isActive ? "deactivate" : "reactivate")}>{row.isActive ? "Archive" : "Restore"}</button>}<button className={secondaryClass} disabled={busy} onClick={() => action(row.id, "delete")}>Delete</button></div></Cell>}</tr>)}</Table>}</>;
}
