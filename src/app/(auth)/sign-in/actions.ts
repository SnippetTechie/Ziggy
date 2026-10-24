"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_COOKIE, checkDemoLogin, devLoginEnabled, makeToken } from "@/server/auth/dev-login";
import { landings, viewCookie } from "@/modules/access/policy";

/** Demo sign-in (local presentation only; see src/server/auth/dev-login.ts). */
export async function demoSignIn(_previous: { error: string }, form: FormData) {
  if (!devLoginEnabled()) return { error: "Demo sign-in is not enabled." };
  const key = checkDemoLogin(String(form.get("username") ?? "").trim(), String(form.get("password") ?? ""));
  if (!key) return { error: "Wrong username or password." };
  const jar = await cookies();
  jar.set(DEV_COOKIE, makeToken(key), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
  jar.delete(viewCookie);
  redirect(key === "admin" ? landings.ADMIN : landings.USER);
}

export async function demoSignOut() {
  const jar = await cookies();
  jar.delete(DEV_COOKIE);
  jar.delete(viewCookie);
  redirect("/sign-in");
}
