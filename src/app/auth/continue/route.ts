import { redirect } from "next/navigation";
import { getAccess, getIdentity } from "@/server/auth";
import { destination } from "@/modules/access/policy";
export async function GET(request: Request) {
  if (!await getIdentity()) redirect("/sign-in");
  const access = await getAccess();
  const result = destination(access?.role ?? null, new URL(request.url).searchParams.get("as"));
  redirect(result.path + (result.denied ? "?notice=access-denied" : ""));
}
