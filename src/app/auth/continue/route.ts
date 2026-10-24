import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAccess, getIdentity } from "@/server/auth";
import { destination, landings, viewCookie } from "@/modules/access/policy";
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("as");
  if (!await getIdentity()) redirect(requested ? `/sign-in?as=${encodeURIComponent(requested)}` : "/sign-in");
  const access = await getAccess();
  const result = destination(access?.role ?? null, requested);
  const view = Object.entries(landings).find(([, path]) => path === result.path)?.[0];
  const jar = await cookies();
  if (view) jar.set(viewCookie, view, { path: "/", httpOnly: true, sameSite: "lax" });
  else jar.delete(viewCookie);
  redirect(result.path + (result.denied ? "?notice=access-denied" : ""));
}
