"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lightbulb, Mic, Search, Shuffle } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { BANK_TOTAL, QUESTION_BANK, readDone, saveDone, type BankCategory, type BankQuestion } from "@/lib/questionBank";

const workshopHref = (q: BankQuestion, c: BankCategory) => `/workshop?q=${encodeURIComponent(q.q)}&lang=${c.lang}`;

export default function QuestionBankPage() {
  const router = useRouter();
  const [done, setDone] = useState<string[]>([]);
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [hideDone, setHideDone] = useState(false);

  useEffect(() => {
    // Progress is per browser; read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(readDone());
  }, []);

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    saveDone(next);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QUESTION_BANK.filter((c) => cat === "all" || c.id === cat)
      .map((c) => ({ ...c, questions: c.questions.filter((x) => (!q || x.q.toLowerCase().includes(q)) && (!hideDone || !done.includes(x.id))) }))
      .filter((c) => c.questions.length);
  }, [cat, query, hideDone, done]);

  function random() {
    const pool = QUESTION_BANK.flatMap((c) => c.questions.filter((q) => !done.includes(q.id)).map((q) => ({ q, c })));
    const all = pool.length ? pool : QUESTION_BANK.flatMap((c) => c.questions.map((q) => ({ q, c })));
    const pick = all[Math.floor(Math.random() * all.length)];
    router.push(workshopHref(pick.q, pick.c));
  }

  const pct = Math.round((done.length / BANK_TOTAL) * 100);

  return (
    <>
      <PageHeader
        title="Savollar banki"
        description="Eng ko‘p beriladigan savollar, maslahatlar bilan. Har birini ustaxonada mashq qiling."
        actions={
          <Button variant="accent" onClick={random} icon={<Shuffle className="size-4" />}>
            Tasodifiy savol
          </Button>
        }
      />

      <Card pop className="mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] font-bold">O‘zlashtirilgan savollar</p>
            <p className="text-sm font-bold tabular">
              {done.length} / {BANK_TOTAL}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Savolni mashq qilib, javobingizdan mamnun bo‘lsangiz — “O‘zlashtirdim” deb belgilang.</p>
        </div>
      </Card>

      <div className="mb-4 space-y-3">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {[{ id: "all", label: "Barchasi", total: BANK_TOTAL, d: done.length }, ...QUESTION_BANK.map((c) => ({ id: c.id, label: c.label, total: c.questions.length, d: c.questions.filter((q) => done.includes(q.id)).length }))].map(
            (c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-pressed={cat === c.id}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 text-[13px] font-semibold transition-colors",
                  cat === c.id ? "border-ink bg-lime text-ink" : "border-line-strong bg-paper text-ink-2 hover:border-muted hover:text-ink",
                )}
              >
                {c.label}
                <span className={cn("text-[11px] tabular", cat === c.id ? "text-ink/70" : "text-muted")}>
                  {c.d}/{c.total}
                </span>
              </button>
            ),
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-2">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
            O‘zlashtirilganlarni yashirish
          </label>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qidirish" aria-label="Savollarni qidirish" className={cn(inputClass, "h-9 pl-9 text-sm")} />
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">Hech narsa topilmadi.</Card>
      ) : (
        <div className="space-y-6">
          {visible.map((c) => (
            <section key={c.id}>
              <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-[15px] font-bold">{c.label}</h2>
                  <p className="text-[13px] text-muted">{c.blurb}</p>
                </div>
                {c.id !== "ask" && (
                  <Link href={`/new?type=${c.type}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
                    Shu mavzuda to‘liq suhbat <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>
              <Card pop className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {c.questions.map((q) => {
                    const isDone = done.includes(q.id);
                    return (
                      <li key={q.id} className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5", isDone && "bg-lime-soft/40")}>
                        <button
                          onClick={() => toggle(q.id)}
                          aria-pressed={isDone}
                          title={isDone ? "Belgini olib tashlash" : "O‘zlashtirdim"}
                          className={cn(
                            "hidden size-6 shrink-0 place-items-center rounded-full border transition-colors sm:grid",
                            isDone ? "border-ink bg-lime text-ink" : "border-line-strong text-transparent hover:border-ink",
                          )}
                        >
                          <Check className="size-3.5" strokeWidth={3} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[15px] font-semibold leading-snug", isDone ? "text-ink-2" : "text-ink")}>{q.q}</p>
                          <p className="mt-1 flex gap-1.5 text-[13px] leading-snug text-muted">
                            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-lime-strong" /> {q.tip}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => toggle(q.id)}
                            className={cn(
                              "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-3 text-[13px] font-semibold sm:hidden",
                              isDone ? "border-ink bg-lime text-ink" : "border-line-strong text-ink-2",
                            )}
                          >
                            <Check className="size-3.5" strokeWidth={3} /> {isDone ? "O‘zlashtirildi" : "O‘zlashtirdim"}
                          </button>
                          {c.id !== "ask" && (
                            <ButtonLink href={workshopHref(q, c)} variant="secondary" size="sm" icon={<Mic className="size-3.5" />}>
                              Mashq qilish
                            </ButtonLink>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
