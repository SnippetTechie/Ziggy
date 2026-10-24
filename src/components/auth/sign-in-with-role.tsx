"use client";

import { SignIn } from "@clerk/nextjs";
import { useState } from "react";
import { DESTINATIONS, type Destination } from "@/server/authorization/roles";

const LABEL: Record<Destination, string> = { user: "User", staff: "Staff", admin: "Admin" };

/**
 * "Login as" selector above Clerk's Google sign-in.
 *
 * The choice only becomes the `as` query on the post-sign-in redirect. It does
 * not create or change a role: /auth/continue validates `as` against an
 * allowlist and picks the landing route from the role stored in the database.
 */
export function SignInWithRole({ initial }: { initial: Destination }) {
  const [requested, setRequested] = useState<Destination>(initial);
  const target = `/auth/continue?as=${requested}`;

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-4">
      <fieldset className="w-full">
        <legend className="mb-2 text-body-sm font-semibold text-ink">Login as</legend>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-secondary-bg p-1">
          {DESTINATIONS.map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-sm px-3 py-2 text-center text-body-sm font-bold text-ink has-checked:bg-ink has-checked:text-on-dark has-focus-visible:outline-2 has-focus-visible:outline-focus-outer"
            >
              <input
                type="radio"
                name="login-as"
                value={value}
                checked={requested === value}
                onChange={() => setRequested(value)}
                className="sr-only"
              />
              {LABEL[value]}
            </label>
          ))}
        </div>
        <p className="mt-2 text-caption text-mute">
          This only chooses where to go after sign-in. Your access depends on the role assigned to your account.
        </p>
      </fieldset>

      <SignIn forceRedirectUrl={target} signUpForceRedirectUrl={target} />
    </div>
  );
}
