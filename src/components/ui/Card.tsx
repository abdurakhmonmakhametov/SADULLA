import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, pop, ...rest }: ComponentProps<"div"> & { pop?: boolean }) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)] bg-paper", pop ? "pop-card" : "border border-line", className)}
      {...rest}
    />
  );
}
