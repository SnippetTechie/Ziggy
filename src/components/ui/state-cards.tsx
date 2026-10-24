"use client";

import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

/** Shared loading / empty / error / unavailable states (CLAUDE.md: every screen needs all four). */

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      <div className="h-6 w-48 animate-pulse rounded-full bg-secondary-bg" />
      <div className="h-32 animate-pulse rounded-md bg-surface-card" />
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md bg-surface-card px-4 py-10 text-center">
      <Inbox className="size-6 text-ash" aria-hidden />
      <p className="text-body-md font-semibold text-ink">{title}</p>
      {message && <p className="max-w-md text-body-sm text-mute">{message}</p>}
    </div>
  );
}

/** Error with a retry action. `onRetry` defaults to refreshing the current route. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const router = useRouter();
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-error-pale p-5 text-error">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="text-body-sm font-semibold">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry ?? (() => router.refresh())}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-canvas px-3 text-body-sm font-bold text-ink"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}

/** The inventory tables owned by the catalogue/inventory teammates are not deployed yet. */
export function InventoryUnavailable() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-md bg-surface-card p-5">
      <Inbox className="mt-0.5 size-5 shrink-0 text-ash" aria-hidden />
      <div>
        <p className="text-body-md font-semibold text-ink">Inventory data is not available yet</p>
        <p className="mt-1 text-body-sm text-mute">
          Products and stock records have not been set up in this environment, so there is nothing to summarise. This
          page will fill in automatically once they exist.
        </p>
      </div>
    </div>
  );
}
