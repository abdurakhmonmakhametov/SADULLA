import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/** Brand mark: public/logo-mark.png (trimmed, square copy of public/logo.png). */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={512} height={512} sizes="64px" priority className={cn("shrink-0 object-contain", className)} />;
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 text-ink" aria-label={`${APP_NAME} — bosh sahifa`}>
      <LogoMark />
      <span className="text-[17px] font-extrabold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
