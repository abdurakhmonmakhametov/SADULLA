"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { VideoOff } from "lucide-react";
import { cn } from "@/lib/cn";

export function VideoTile({
  stream,
  hidden,
  compact,
  className,
  children,
}: {
  stream: MediaStream | null;
  /** Camera turned off by the user. */
  hidden?: boolean;
  /** Small thumbnail: tighter corners, icon-only placeholder. */
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className={cn("relative overflow-hidden bg-[#111a2e]", compact ? "rounded-[var(--radius-md)]" : "rounded-[var(--radius-lg)]", className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={cn("size-full -scale-x-100 object-cover transition-opacity duration-300", (!stream || hidden) && "opacity-0")}
      />
      {(!stream || hidden) && (
        <div className="absolute inset-0 grid place-items-center bg-[#111a2e] text-white/60">
          <div className="flex flex-col items-center gap-2 text-sm font-semibold">
            <VideoOff className={compact ? "size-4" : "size-6"} strokeWidth={1.75} />
            {!compact && (hidden ? "Kamera o‘chirilgan" : "Kamera yo‘q")}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function LevelMeter({ level, bars = 5, className }: { level: number; bars?: number; className?: string }) {
  return (
    <div className={cn("flex h-4 items-end gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const threshold = (i + 1) / (bars + 1);
        return (
          <span
            key={i}
            className={cn("w-[3px] rounded-full transition-[height,background-color] duration-100", level > threshold ? "bg-lime" : "bg-current opacity-30")}
            style={{ height: `${30 + (i / (bars - 1)) * 70}%` }}
          />
        );
      })}
    </div>
  );
}
