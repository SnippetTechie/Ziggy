"use client";
import Image from "next/image";
import { useActionState, useState } from "react";
import { demoSignIn } from "@/app/(auth)/sign-in/actions";
import { buttonClass, inputClass, secondaryClass } from "@/components/inventory/ui";

const accounts = [
  { label: "Demo User", note: "Shop and place stock requests", username: "demo-user", password: "ziggy-demo-user" },
  { label: "Demo Admin", note: "Manage inventory and orders", username: "demo-admin", password: "ziggy-demo-admin" },
] as const;

export function DemoLogin() {
  const [state, action, pending] = useActionState(demoSignIn, { error: "" });
  const [username, setUsername] = useState(""), [password, setPassword] = useState("");
  return <div className="w-full max-w-md rounded-md bg-canvas p-6">
    <div className="flex items-center gap-3"><Image src="/images/ziggy-logo.png" alt="" width={40} height={40} /><h1 className="text-heading-lg text-ink">Sign in to Ziggy</h1></div>
    <p className="mt-3 rounded-md bg-surface-card p-3 text-caption text-body">Presentation demo sign-in (local only). Pick an account, or type its credentials.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{accounts.map(account => <button key={account.username} type="button" className={`${secondaryClass} h-auto flex-col items-start gap-0.5 py-3 text-left`} onClick={() => { setUsername(account.username); setPassword(account.password); }}><span>{account.label}</span><span className="text-caption font-normal text-mute">{account.note}</span></button>)}</div>
    <form action={action} className="mt-5 grid gap-4">
      <label className="grid gap-1.5 text-body-sm font-semibold text-ink">Username<input name="username" className={inputClass} autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} /></label>
      <label className="grid gap-1.5 text-body-sm font-semibold text-ink">Password<input name="password" type="password" className={inputClass} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
      {state.error && <p role="alert" className="rounded-md bg-error-pale p-3 text-body-sm text-error">{state.error}</p>}
      <button className={buttonClass} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
    <dl className="mt-5 grid gap-1 border-t border-hairline pt-4 text-caption text-mute">{accounts.map(account => <div key={account.username} className="flex justify-between gap-3"><dt>{account.label}</dt><dd className="font-mono">{account.username} / {account.password}</dd></div>)}</dl>
  </div>;
}
