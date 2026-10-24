import Image from "next/image";
import Link from "next/link";

/** Centered card layout for sign-in, sign-up, and workspace selection. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-card px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <Image src="/images/ziggy-logo.png" alt="" width={40} height={40} className="rounded-sm" />
        <span className="text-heading-lg text-ink">Ziggy</span>
      </Link>
      <div className="w-full max-w-md rounded-lg bg-canvas p-8">{children}</div>
    </div>
  );
}
