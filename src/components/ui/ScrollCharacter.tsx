"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/cn";

const SIZE = 36; // ball diameter, px
const PAD = 10; // gap at the top and bottom of the track

/**
 * Custom scrollbar: the brand logo travels down a thin track as the page
 * scrolls. It leans into the scroll direction and squashes with speed, then
 * settles upright; it can be dragged (or the track clicked) to scroll.
 * Native scrolling (wheel, keys, touch) is untouched — this only replaces the
 * visible bar. Tracks the window by default, or `target` (an overflow element).
 */
export function ScrollCharacter({ target, className }: { target?: RefObject<HTMLElement | null>; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = target?.current ?? null;
    const scroller = () => el ?? document.scrollingElement ?? document.documentElement;
    const eventTarget: HTMLElement | Window = el ?? window;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lastTop = scroller().scrollTop;
    let velocity = 0;
    let raf = 0;
    let dragging = false;

    const metrics = () => {
      const s = scroller();
      const root = rootRef.current!;
      const trackH = root.clientHeight - PAD * 2 - SIZE;
      const max = s.scrollHeight - s.clientHeight;
      return { s, trackH, max };
    };

    const render = () => {
      raf = 0;
      const root = rootRef.current;
      const ball = ballRef.current;
      if (!root || !ball) return;
      const { s, trackH, max } = metrics();
      const visible = max > 8;
      root.style.opacity = visible ? "1" : "0";
      root.style.pointerEvents = visible ? "auto" : "none";
      if (!visible) return;

      const top = s.scrollTop;
      const p = Math.min(1, Math.max(0, top / max));
      const y = PAD + p * trackH;
      const delta = top - lastTop;
      lastTop = top;
      velocity = velocity * 0.6 + delta * 0.4;
      const speed = Math.min(1, Math.abs(velocity) / 60);
      const squash = reduced ? 0 : speed * 0.14;

      ball.style.transform = `translate3d(0, ${y}px, 0) scale(${1 + squash * 0.6}, ${1 - squash})`;
      // Lean into the scroll direction (scrolling down tips the face forward).
      const lean = reduced ? 0 : Math.max(-18, Math.min(18, velocity * 0.5));
      bodyRef.current!.style.transform = `rotate(${-lean}deg)`;
      trailRef.current!.style.height = `${y + SIZE / 2}px`;
      labelRef.current!.textContent = `${Math.round(p * 100)}%`;
      labelRef.current!.style.transform = `translate3d(0, ${y + SIZE / 2 - 11}px, 0)`;

      // Keep settling (lean and squash ease back) while velocity decays.
      if (Math.abs(velocity) > 0.3) {
        velocity *= 0.85;
        raf = requestAnimationFrame(render);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    const scrollToY = (clientY: number, smooth: boolean) => {
      const root = rootRef.current!;
      const { s, trackH, max } = metrics();
      const rect = root.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (clientY - rect.top - PAD - SIZE / 2) / trackH));
      s.scrollTo({ top: p * max, behavior: smooth ? "smooth" : "auto" });
    };

    const onBallDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      rootRef.current!.dataset.active = "true";
      ballRef.current!.setPointerCapture(e.pointerId);
    };
    const onBallMove = (e: PointerEvent) => dragging && scrollToY(e.clientY, false);
    const onBallUp = () => {
      dragging = false;
      delete rootRef.current!.dataset.active;
    };
    const onTrackDown = (e: PointerEvent) => {
      if (e.target === ballRef.current || ballRef.current?.contains(e.target as Node)) return;
      scrollToY(e.clientY, true);
    };

    const ball = ballRef.current!;
    const root = rootRef.current!;
    eventTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    ball.addEventListener("pointerdown", onBallDown);
    ball.addEventListener("pointermove", onBallMove);
    ball.addEventListener("pointerup", onBallUp);
    ball.addEventListener("pointercancel", onBallUp);
    root.addEventListener("pointerdown", onTrackDown);
    // Page height changes without scrolling (content loading, accordions…).
    const ro = new ResizeObserver(schedule);
    ro.observe(el ?? document.body);
    if (el?.firstElementChild) ro.observe(el.firstElementChild);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      eventTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ball.removeEventListener("pointerdown", onBallDown);
      ball.removeEventListener("pointermove", onBallMove);
      ball.removeEventListener("pointerup", onBallUp);
      ball.removeEventListener("pointercancel", onBallUp);
      root.removeEventListener("pointerdown", onTrackDown);
      ro.disconnect();
    };
  }, [target]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={cn("scroll-character no-print group fixed bottom-2 right-0.5 top-2 z-[60] hidden w-10 cursor-pointer opacity-0 transition-opacity duration-300 sm:block", className)}
    >
      {/* track + progress trail */}
      <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-ink/10" />
      <div ref={trailRef} className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 rounded-full bg-[linear-gradient(to_bottom,transparent,var(--color-lime-strong))]" />

      {/* percent label (hover / drag) */}
      <span
        ref={labelRef}
        className="pointer-events-none absolute right-full top-0 mr-1 rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-bold tabular text-lime opacity-0 transition-opacity group-hover:opacity-100 group-data-[active]:opacity-100"
      />

      {/* the character */}
      <div
        ref={ballRef}
        className="absolute left-1/2 top-0 cursor-grab touch-none active:cursor-grabbing"
        style={{ width: SIZE, height: SIZE, marginLeft: -SIZE / 2, transformOrigin: "50% 50%" }}
      >
        <div
          ref={bodyRef}
          className="relative size-full rounded-full shadow-[0_4px_12px_rgb(11_19_36/0.28)] transition-[box-shadow] group-hover:shadow-[0_0_0_5px_rgb(173_255_47/0.45),0_4px_12px_rgb(11_19_36/0.28)]"
        >
          <Image src="/logo-mark.png" alt="" width={512} height={512} sizes="72px" draggable={false} className="size-full select-none" />
        </div>
      </div>
    </div>
  );
}
