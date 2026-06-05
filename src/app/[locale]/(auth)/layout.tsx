import Image from "next/image";
import { LucarneLogo } from "@/components/brand/lucarne-mark";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-12">
      <Image
        src="/assets/lucarne/world-cup-2026/11-algeria-2026-home-celebration.png"
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover object-[62%_40%] opacity-[0.22]"
      />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_72%_46%_at_50%_0%,rgba(34,217,130,0.15),transparent_58%),linear-gradient(180deg,rgba(5,6,5,0.78),rgba(5,6,5,0.96))]" />
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 inline-flex transition hover:opacity-85">
          <LucarneLogo />
        </Link>
        <div className="rounded-sm border border-white/[0.12] bg-surface-1/[0.82] p-8 shadow-2xl shadow-black/[0.35] backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
