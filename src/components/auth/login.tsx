"use client";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
export function Login({ signup = false }: { signup?: boolean }) {
  const params = useSearchParams(), router = useRouter();
  const requested = params.get("as");
  const role = requested === "admin" || requested === "staff" ? requested : "user";
  const redirect = `/auth/continue?as=${role}`;
  return <div className="w-full max-w-md"><fieldset className="mb-5 rounded-md border border-hairline bg-canvas p-4"><legend className="px-2 text-body-sm font-semibold">{signup ? "Create an account" : "Login as"}</legend><div className="flex flex-wrap gap-5">{["user", "staff", "admin"].map(value => <label className="flex min-h-11 items-center gap-2 text-body-sm capitalize" key={value}><input type="radio" name="as" checked={role === value} onChange={() => router.replace(`/${signup ? "sign-up" : "sign-in"}?as=${value}`)} />{value}</label>)}</div><p className="text-caption text-mute">Your Admin assigns your permissions. This selection only chooses where to take you after sign-in.</p></fieldset>{signup ? <SignUp forceRedirectUrl={redirect} signInForceRedirectUrl={redirect} /> : <SignIn forceRedirectUrl={redirect} signUpForceRedirectUrl={redirect} />}</div>;
}
