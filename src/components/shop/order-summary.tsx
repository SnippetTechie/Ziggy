import Link from "next/link";
import { Card } from "@/components/wireframe";

export function OrderSummary({ cta, href }: { cta: string; href: string }) {
  return (
    <Card title="Summary">
      <dl className="space-y-2 text-body-sm">
        {["Items", "Delivery", "Total"].map((k) => (
          <div key={k} className={`flex justify-between ${k === "Total" ? "border-t border-hairline pt-2 font-bold text-ink" : "text-body"}`}>
            <dt>{k}</dt>
            <dd>₹ —</dd>
          </div>
        ))}
      </dl>
      <Link
        href={href}
        className="mt-5 flex h-10 items-center justify-center rounded-md bg-primary text-body-sm font-bold text-on-primary"
      >
        {cta}
      </Link>
    </Card>
  );
}
