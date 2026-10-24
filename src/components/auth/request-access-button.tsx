"use client";

import { useState } from "react";

type State = "idle" | "sending" | "requested" | "already-requested" | "error";

const MESSAGE: Record<Exclude<State, "idle" | "sending">, string> = {
  requested: "Request sent. An admin can now grant you a role. Check again once they have.",
  "already-requested": "You already requested access. An admin has not granted it yet.",
  error: "We could not send your request. Please try again.",
};

/** Records an access request for the workspace. It never grants a role itself. */
export function RequestAccessButton() {
  const [state, setState] = useState<State>("idle");

  async function send() {
    setState("sending");
    try {
      const res = await fetch("/api/v1/access-requests", { method: "POST" });
      if (!res.ok) return setState("error");
      const body = (await res.json()) as { status?: string };
      setState(body.status === "already-requested" ? "already-requested" : "requested");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={send}
        disabled={state === "sending" || state === "requested" || state === "already-requested"}
        className="h-11 w-full rounded-md bg-primary px-4 text-body-sm font-bold text-on-primary disabled:bg-secondary-bg disabled:text-ash"
      >
        {state === "sending" ? "Sending…" : "Request access"}
      </button>
      {state !== "idle" && state !== "sending" && (
        <p role="status" className={`text-body-sm ${state === "error" ? "text-error" : "text-mute"}`}>
          {MESSAGE[state]}
        </p>
      )}
    </div>
  );
}
