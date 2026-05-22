import { LucarneMark } from "@/components/brand/lucarne-mark";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center gap-2 text-text-primary">
          <LucarneMark className="h-7 w-7 text-primary-500" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Lucarne
          </span>
        </Link>
        <div className="rounded-2xl border border-border-subtle bg-surface-1/60 p-8 backdrop-blur shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
