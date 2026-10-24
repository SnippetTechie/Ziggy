"use client";

import { useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { NOTICES, isNoticeCode } from "@/server/authorization/roles";

/**
 * Explains a server-side redirect ("?notice=admin-denied"). The code is looked
 * up in a fixed table; arbitrary query text is never rendered. Must sit inside
 * <Suspense> because it reads the URL.
 */
export function AccessNotice() {
  const code = useSearchParams().get("notice");
  if (!isNoticeCode(code)) return null;
  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-md bg-warning-pale p-4 text-body-sm text-warning-deep">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{NOTICES[code]}</p>
    </div>
  );
}
