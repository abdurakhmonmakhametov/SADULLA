import { cn } from "@/lib/cn";
import { scoreLabel, scoreTone } from "@/lib/format";

const toneStroke = { good: "var(--color-good)", warn: "var(--color-warn)", bad: "var(--color-bad)" };
const toneText = { good: "text-good", warn: "text-warn", bad: "text-bad" };
const toneBg = { good: "bg-good-soft", warn: "bg-warn-soft", bad: "bg-bad-soft" };

export function ScoreDial({ score, size = 180 }: { score: number; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-sunken)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={toneStroke[tone]}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(c * score) / 100} ${c}`}
          className="transition-[stroke-dasharray] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[44px] font-extrabold leading-none tracking-tight tabular" aria-label={`Umumiy ball: 100 dan ${score}`}>
          {score}
        </span>
        <span className={cn("mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold", toneText[tone], toneBg[tone])}>{scoreLabel(score)}</span>
      </div>
    </div>
  );
}

export function MetricBar({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-sm font-bold tabular text-ink">
          {value}
          <span className="font-sans font-medium text-muted">/100</span>
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${value}%`, background: toneStroke[tone] }} />
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <span className={cn("inline-flex h-7 min-w-11 items-center justify-center rounded-md px-2 text-[13px] font-bold tabular", toneBg[tone], toneText[tone])}>
      {score}
    </span>
  );
}
