"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Accessible modal built on <dialog>. Closes on Escape and backdrop click. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[var(--radius-xl)] border border-line bg-paper p-0 text-ink shadow-[0_20px_50px_-12px_rgb(16_24_40/0.25)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-pop"
    >
      <div className="p-6 sm:p-7">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {description && <div className="mt-2.5 text-[15px] leading-relaxed text-ink-2">{description}</div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">{children}</div>
      </div>
    </dialog>
  );
}
