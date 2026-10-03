"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Login / register artwork: just public/loginregister.png, shown whole at its
 * own square shape on every device. With a mouse, hovering plays a short clip.
 */
export function AuthShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Fetch the clip ahead of the first hover — only on devices that can hover.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    v.preload = "auto";
    v.load();
  }, []);

  function start() {
    const v = videoRef.current;
    if (!v || !window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.currentTime = 0;
    void v.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }

  function stop() {
    setPlaying(false);
    const v = videoRef.current;
    // Pause once the fade-out has finished.
    setTimeout(() => {
      if (v && !v.matches(":hover")) v.pause();
    }, 400);
  }

  return (
    <div className="flex items-center justify-center">
      <div onMouseEnter={start} onMouseLeave={stop} className="relative overflow-hidden rounded-[20px]">
        <Image
          src="/loginregister.png"
          alt="Suhbatdosh: ish suhbatiga ishonch bilan kiring — ovozli mashq, aniq baho va ishonchli natija"
          width={1254}
          height={1254}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="block h-auto max-h-[calc(100dvh-2rem)] w-auto max-w-full"
        />
        <video
          ref={videoRef}
          src="/animatedchar.mp4"
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-500", playing ? "opacity-100" : "opacity-0")}
        />
      </div>
    </div>
  );
}
