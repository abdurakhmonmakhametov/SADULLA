import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  aside,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
          {label}
          {optional && <span className="ml-1.5 font-normal text-muted">ixtiyoriy</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p role="alert" className="mt-2 text-[13px] font-medium text-bad">
          {error}
        </p>
      ) : (
        hint && <p className="mt-2 text-[13px] leading-relaxed text-muted">{hint}</p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-[var(--radius-md)] border border-line-strong bg-paper px-3.5 text-[15px] text-ink shadow-[var(--shadow-pop)] placeholder:text-muted/80 transition-[border-color,box-shadow] hover:border-muted/60 focus:border-ink focus:ring-4 focus:ring-ink/8 focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-bad";
