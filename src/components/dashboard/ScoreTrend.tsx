"use client";

import { useState } from "react";
import type { Interview } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { INTERVIEW_TYPES } from "@/lib/catalog";

/** Bars of overall score for the last completed interviews (oldest → newest). */
export function ScoreTrend({ list }: { list: Interview[] }) {
  const done = list
    .filter((i) => i.report)
    .sort((a, b) => a.report!.createdAt - b.report!.createdAt)
    .slice(-8);
  const [hover, setHover] = useState<number | null>(null);

  if (done.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-[var(--radius-md)] border border-dashed border-line-strong bg-canvas px-6 text-center text-sm text-muted">
        Birinchi suhbatni yakunlang — natijalaringiz shu yerda ko‘rinadi.
      </div>
    );
  }

  const W = 100 / Math.max(done.length, 4);
  const best = Math.max(...done.map((d) => d.report!.overall));
  const summary = done.map((d) => `${formatDate(d.report!.createdAt)}: ${d.report!.overall}`).join(", ");

  return (
    <div>
      <div className="relative h-48" role="img" aria-label={`Oxirgi ${done.length} ta suhbat bo‘yicha umumiy ball: ${summary}`}>
        {/* recessive grid */}
        {[100, 50].map((v) => (
          <div key={v} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${v}%` }}>
            <span className="absolute -top-2.5 right-0 bg-paper pl-1 text-[10px] font-semibold text-muted">{v}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-2 pr-7">
          {done.map((d, i) => {
            const s = d.report!.overall;
            const last = i === done.length - 1;
            const label = last || s === best;
            return (
              <div
                key={d.id}
                className="relative flex h-full flex-1 items-end justify-center"
                style={{ maxWidth: `${W}%` }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
              >
                <div
                  className={`w-full max-w-10 origin-bottom animate-rise rounded-t-[6px] rounded-b-[2px] transition-colors ${last ? "bg-lime" : hover === i ? "bg-[#94a3b8]" : "bg-[#cbd5e1]"}`}
                  style={{ height: `${Math.max(s, 3)}%`, animationDelay: `${i * 50}ms` }}
                />
                {label && hover !== i && (
                  <span className="absolute text-[11px] font-bold text-ink" style={{ bottom: `calc(${Math.max(s, 3)}% + 4px)` }}>
                    {s}
                  </span>
                )}
                {hover === i && (
                  <div className="pop-card absolute z-10 w-44 rounded-[var(--radius-md)] bg-paper px-3 py-2 text-left shadow-lg" style={{ bottom: `calc(${Math.max(s, 3)}% + 8px)` }}>
                    <p className="truncate text-xs font-bold">{d.config.role}</p>
                    <p className="text-[11px] text-muted">
                      {INTERVIEW_TYPES[d.config.type].label} · {formatDate(d.report!.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-bold">{s} ball</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2 pr-7">
        {done.map((d) => (
          <span key={d.id} className="flex-1 truncate text-center text-[10px] font-medium text-muted" style={{ maxWidth: `${W}%` }}>
            {formatDate(d.report!.createdAt).replace(/^(Bugun|Kecha), .*/, "$1")}
          </span>
        ))}
      </div>
    </div>
  );
}
