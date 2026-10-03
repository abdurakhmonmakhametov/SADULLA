import { BriefcaseBusiness, Code2, Languages, MessagesSquare, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { InterviewType } from "@/lib/types";
import { cn } from "@/lib/cn";

export const TYPE_ICONS: Record<InterviewType, LucideIcon> = {
  technical: Code2,
  behavioral: MessagesSquare,
  hr: BriefcaseBusiness,
  ielts: Languages,
  custom: SlidersHorizontal,
};

/** Quiet tinted tile per interview type. */
export const TYPE_TINT: Record<InterviewType, string> = {
  technical: "bg-[#eaf1ff] text-[#2453c7]",
  behavioral: "bg-[#f3ecff] text-[#6b3fc4]",
  hr: "bg-[#fff1e6] text-[#b4530f]",
  ielts: "bg-[#e7f7f1] text-[#0f7a55]",
  custom: "bg-sunken text-ink-2",
};

export function TypeIcon({ type, className }: { type: InterviewType; className?: string }) {
  const Icon = TYPE_ICONS[type];
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]", TYPE_TINT[type], className)}>
      <Icon className="size-[18px]" strokeWidth={2} />
    </span>
  );
}
