import { Check } from "lucide-react";
import { ORDER_STATUSES } from "@/lib/demo";

/** Status steps shared by the shopper and admin order views. */
export function OrderTimeline({ current }: { current: number }) {
  return (
    <ol className="flex flex-col gap-4 sm:flex-row sm:gap-0">
      {ORDER_STATUSES.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-ink text-on-dark" : "bg-secondary-bg text-mute"}`}
            >
              {done ? <Check className="size-4" /> : <span className="text-caption font-bold">{i + 1}</span>}
            </span>
            <span className={`text-body-sm ${done ? "font-bold text-ink" : "text-mute"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
