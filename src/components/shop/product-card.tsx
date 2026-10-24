import Link from "next/link";
import { StatusPill } from "@/components/wireframe";

/** Pin-card style product tile (DESIGN.md `pin-card`), adapted to show price. */
export function ProductCard({
  href,
  stock = "in",
}: {
  href: string;
  stock?: "in" | "low" | "out";
}) {
  return (
    <div className="group">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-md bg-surface-card">
        <span className="absolute inset-0 grid place-items-center text-caption text-ash">Product image</span>
        {stock !== "in" && (
          <span className="absolute left-2 top-2">
            {stock === "low" ? (
              <StatusPill tone="warning">Only a few left</StatusPill>
            ) : (
              <StatusPill tone="danger">Out of stock</StatusPill>
            )}
          </span>
        )}
      </Link>
      <div className="mt-2 space-y-1.5 px-0.5">
        <span className="block h-3 w-4/5 rounded-full bg-secondary-bg" />
        <span className="block h-3 w-1/3 rounded-full bg-secondary-bg" />
        <div className="flex items-center justify-between pt-1">
          <span className="text-body-sm font-bold text-ink">₹ —</span>
          <button
            type="button"
            disabled={stock === "out"}
            className="h-9 rounded-md bg-secondary-bg px-4 text-caption font-bold text-ink disabled:bg-surface-card disabled:text-ash"
          >
            {stock === "out" ? "Notify me" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
