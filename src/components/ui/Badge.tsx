import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "lime" | "ink" | "good" | "warn" | "bad";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2",
  lime: "bg-lime-soft text-lime-ink",
  ink: "bg-ink text-white",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-semibold", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
