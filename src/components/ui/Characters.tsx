import Image from "next/image";
import { cn } from "@/lib/cn";

/* Dashboard mascots (artwork in /public). Motion lives in globals.css (.char-*). */

/** Waves hello above the stat cards; the artwork ends at the shoulders. */
export function WavingCharacter({ className }: { className?: string }) {
  return (
    <span className={cn("char-bob block", className)}>
      <Image src="/characterabove.png" alt="" width={1510} height={1041} sizes="180px" className="size-full object-contain object-bottom" priority />
    </span>
  );
}

/** Holds a greenyellow tablet; sits on the edge of the AI coach card. */
export function TabletCharacter({ className }: { className?: string }) {
  return (
    <span className={cn("block", className)}>
      <Image src="/characterinsidediv.png" alt="" width={1254} height={1254} sizes="120px" loading="eager" className="size-full object-contain object-bottom" />
    </span>
  );
}
