"use client";

import { Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Clock, Gauge, Languages, ListOrdered, MessageSquarePlus, Minus, Pencil, Plus, Sparkles, Tag, Timer, X } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { TypeIcon, TYPE_ICONS } from "@/components/TypeIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  FOCUS_SUGGESTIONS,
  INTERVIEW_TYPES,
  LANGUAGES,
  LEVELS,
  LEVEL_ORDER,
  ROLE_SUGGESTIONS,
  TIME_LIMITS,
  TYPE_ORDER,
} from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { FACTORY_DEFAULTS, readDefaults, saveDefaults } from "@/lib/prefs";
import { createInterview } from "@/lib/storage";
import type { Difficulty, ExperienceLevel, InterviewConfig, InterviewLanguage, InterviewType, Question, Source } from "@/lib/types";

const STEPS = [
  { title: "Suhbat turi", hint: "Nimaga tayyorlanyapsiz?" },
  { title: "Lavozim", hint: "Kim sifatida suhbatlashasiz?" },
  { title: "Format", hint: "Suhbat qanday o‘tsin?" },
  { title: "Tasdiqlash", hint: "Hammasi to‘g‘rimi?" },
];

const TIPS = [
  "Har bir tur o‘ziga xos savollar to‘plami va baholash mezonlariga ega.",
  "Mavzular va kompaniya qanchalik aniq bo‘lsa, savollar shunchalik real bo‘ladi.",
  "Birinchi marta bo‘lsa, “Do‘stona” suhbatdosh va 5–6 ta savol bilan boshlang.",
  "Keyingi qadamda kamera va mikrofon tekshiriladi, keyin suhbat boshlanadi.",
];

const TYPE_EXAMPLE: Record<InterviewType, string> = {
  technical: "“REST va GraphQL o‘rtasidagi farqni tushuntirib bering.”",
  behavioral: "“Jamoadoshingiz bilan kelishmovchilik bo‘lgan vaziyatni aytib bering.”",
  hr: "“Nega aynan bizning kompaniyamizni tanladingiz?”",
  ielts: "“Describe a place you would like to visit.”",
  custom: "Savollar siz yozgan tavsifga qarab tuziladi.",
};

/** Rough interview length in minutes. */
function estimateMinutes(count: number, limitSec: number, followUps: boolean) {
  const perAnswer = limitSec ? limitSec / 60 : 1.5;
  const total = count * (perAnswer + 0.4) + (followUps ? Math.ceil(count / 3) * 1.2 : 0);
  return Math.max(3, Math.round(total));
}

/* ---------- building blocks ---------- */

function Stepper({ step, maxReached, onGo }: { step: number; maxReached: number; onGo: (s: number) => void }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Qadamlar">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={s.title} className={cn("flex min-w-0 items-center gap-2 sm:gap-3", i < STEPS.length - 1 && "flex-1")}>
            <button
              type="button"
              disabled={active || i > maxReached}
              onClick={() => onGo(i)}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 items-center gap-2.5 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-bold transition-colors",
                  done ? "bg-lime text-ink" : active ? "bg-ink text-white ring-4 ring-lime/60" : "border border-line-strong bg-paper text-muted",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className={cn("block truncate text-[13px] font-bold", active || done ? "text-ink" : "text-muted")}>{s.title}</span>
                <span className="block truncate text-[11px] text-muted">{s.hint}</span>
              </span>
            </button>
            {i < STEPS.length - 1 && <span className={cn("h-0.5 min-w-3 flex-1 rounded-full transition-colors", i < step ? "bg-lime" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  body,
  icon,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "relative flex w-full gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-[border-color,box-shadow,background-color]",
        selected ? "border-ink bg-lime-soft shadow-[0_0_0_3px_var(--color-lime)]" : "border-line bg-paper hover:border-line-strong hover:bg-canvas",
        className,
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-ink">{title}</span>
        {body && <span className="mt-1 block text-[13px] leading-relaxed text-muted">{body}</span>}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
          selected ? "border-ink bg-lime text-ink" : "border-line-strong bg-paper text-transparent",
        )}
      >
        <Check className="size-3" strokeWidth={3.5} />
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-3 text-[13px] font-semibold transition-colors",
        active ? "border-ink bg-lime text-ink" : "border-line-strong bg-paper text-ink-2 hover:border-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function SummaryRow({ icon, label, value, onEdit }: { icon: ReactNode; label: string; value: ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-sunken text-ink-2">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted">{label}</p>
        <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-sunken hover:text-ink">
          <Pencil className="size-3" /> <span className="hidden sm:inline">O‘zgartirish</span>
        </button>
      )}
    </div>
  );
}

/* ---------- wizard ---------- */

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = (TYPE_ORDER as string[]).includes(params.get("type") ?? "") ? (params.get("type") as InterviewType) : null;

  const [step, setStep] = useState(preset ? 1 : 0);
  const [maxReached, setMaxReached] = useState(preset ? 1 : 0);
  const [type, setType] = useState<InterviewType | null>(preset);
  const [role, setRole] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>("junior");
  const [company, setCompany] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [focusDraft, setFocusDraft] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<InterviewLanguage>(FACTORY_DEFAULTS.language);
  const [difficulty, setDifficulty] = useState<Difficulty>(FACTORY_DEFAULTS.difficulty);
  const [count, setCount] = useState(FACTORY_DEFAULTS.questionCount);
  const [followUps, setFollowUps] = useState(FACTORY_DEFAULTS.followUps);
  const [timeLimit, setTimeLimit] = useState(FACTORY_DEFAULTS.timeLimitSec);
  const [remember, setRemember] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Saved per-browser defaults; read after mount to keep SSR markup stable.
    const d = readDefaults();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLanguage(d.language);
    setDifficulty(d.difficulty);
    setCount(d.questionCount);
    setFollowUps(d.followUps);
    setTimeLimit(d.timeLimitSec);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const isIelts = type === "ielts";
  const effLang: InterviewLanguage = isIelts ? "en" : language;
  const roleMissing = !role.trim();
  const minutes = estimateMinutes(count, timeLimit, followUps);

  function go(s: number) {
    setStep(s);
    setMaxReached((m) => Math.max(m, s));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Whether the current step is complete enough to move forward. */
  function validate(s: number): boolean {
    if (s === 0) return type !== null;
    if (s === 1 && roleMissing) {
      setTouched(true);
      document.getElementById("role")?.focus();
      return false;
    }
    return true;
  }

  function chooseType(t: InterviewType) {
    if (t !== type) {
      setRole("");
      setFocus([]);
      setTouched(false);
      setMaxReached(0);
    }
    setType(t);
    // A short beat so the selection is visible before moving on.
    setTimeout(() => go(1), 180);
  }

  function addFocus(raw: string) {
    const t = raw.trim().replace(/,$/, "");
    if (!t || focus.length >= 8 || focus.some((f) => f.toLowerCase() === t.toLowerCase())) return;
    setFocus([...focus, t.slice(0, 60)]);
  }
  const toggleFocus = (t: string) => (focus.includes(t) ? setFocus(focus.filter((f) => f !== t)) : addFocus(t));

  async function create() {
    if (!type || busy) return;
    setBusy(true);
    setError(null);
    if (remember) saveDefaults({ language, difficulty, questionCount: count, followUps, timeLimitSec: timeLimit });
    const config: InterviewConfig = {
      role: role.trim(),
      description: description.trim(),
      level,
      type,
      language: effLang,
      questionCount: count,
      followUps,
      difficulty,
      company: company.trim() || undefined,
      focus: focus.length ? focus : undefined,
      timeLimitSec: timeLimit || undefined,
    };
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { questions: Pick<Question, "text" | "hint">[]; source: Source };
      const interview = createInterview(config, data.questions, data.source);
      router.push(`/interview/${interview.id}`);
    } catch (err) {
      console.error(err);
      setError("Savollarni yaratib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.");
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 3) void create();
    else if (validate(step)) go(step + 1);
  }

  const meta = type ? INTERVIEW_TYPES[type] : null;
  const TypeGlyph = type ? TYPE_ICONS[type] : Sparkles;

  return (
    <div ref={topRef} className="scroll-mt-20">
      <PageHeader title="Yangi suhbat" description="To‘rt qisqa qadamda mashq suhbatingizni sozlang." />

      <Card pop className="mb-4 px-4 py-4 sm:px-6">
        <Stepper step={step} maxReached={maxReached} onGo={(s) => (s < step || validate(step)) && go(s)} />
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form onSubmit={onSubmit} className="pop-card rounded-[var(--radius-lg)] bg-paper">
          <div key={step} className="animate-rise p-5 sm:p-7">
            <p className="eyebrow">
              {step + 1}-qadam · {STEPS.length} tadan
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">{STEPS[step].hint}</h2>

            {/* 1 — type */}
            {step === 0 && (
              <div role="radiogroup" aria-label="Suhbat turi" className="mt-5 grid gap-3 sm:grid-cols-2">
                {TYPE_ORDER.map((t) => (
                  <OptionCard
                    key={t}
                    selected={type === t}
                    onClick={() => chooseType(t)}
                    title={INTERVIEW_TYPES[t].label}
                    icon={<TypeIcon type={t} />}
                    body={
                      <>
                        {INTERVIEW_TYPES[t].blurb}
                        <span className="mt-2 block text-xs italic">{TYPE_EXAMPLE[t]}</span>
                      </>
                    }
                    className={t === "custom" ? "sm:col-span-2" : undefined}
                  />
                ))}
              </div>
            )}

            {/* 2 — role & details */}
            {step === 1 && type && meta && (
              <div className="mt-5 space-y-6">
                <Field
                  label={isIelts ? "Maqsadingiz" : "Lavozim nomi"}
                  htmlFor="role"
                  error={touched && roleMissing ? "Davom etish uchun buni to‘ldiring." : null}
                >
                  <input
                    id="role"
                    autoFocus
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder={isIelts ? "Masalan: magistratura uchun 7.0 band" : "Masalan: Frontend dasturchi"}
                    aria-invalid={touched && roleMissing}
                    className={cn(inputClass, "h-11")}
                    maxLength={120}
                    autoComplete="off"
                  />
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {ROLE_SUGGESTIONS[type].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                          role === r ? "border-ink bg-lime text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink",
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </Field>

                {!isIelts && (
                  <Field label="Tajriba darajasi">
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tajriba darajasi">
                      {LEVEL_ORDER.map((l) => (
                        <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                          {LEVELS[l]}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                )}

                {!isIelts && (
                  <Field label="Kompaniya" htmlFor="company" optional hint="Savollar shu kompaniyaga moslashtiriladi.">
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <input
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Masalan: Uzum, EPAM, Payme"
                        className={cn(inputClass, "h-11 pl-9")}
                        maxLength={120}
                        autoComplete="off"
                      />
                    </div>
                  </Field>
                )}

                <Field
                  label={isIelts ? "Mavzular" : "Asosiy mavzular"}
                  optional
                  aside={<span className="text-[11px] font-semibold text-muted tabular">{focus.length}/8</span>}
                  hint="Tanlang yoki o‘zingiz yozib Enter bosing — savollar shu mavzularni qamrab oladi."
                >
                  <div className="flex flex-wrap gap-2">
                    {[...FOCUS_SUGGESTIONS[type], ...focus.filter((f) => !FOCUS_SUGGESTIONS[type].includes(f))].map((t) => (
                      <Chip key={t} active={focus.includes(t)} onClick={() => toggleFocus(t)}>
                        {focus.includes(t) ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5" />}
                        {t}
                      </Chip>
                    ))}
                  </div>
                  <div className="relative mt-2.5">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <input
                      value={focusDraft}
                      onChange={(e) => setFocusDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addFocus(focusDraft);
                          setFocusDraft("");
                        }
                      }}
                      placeholder="Boshqa mavzu qo‘shish…"
                      aria-label="Mavzu qo‘shish"
                      disabled={focus.length >= 8}
                      className={cn(inputClass, "h-10 pl-9 text-sm")}
                      maxLength={60}
                    />
                  </div>
                </Field>

                <Field
                  label={meta.descriptionLabel}
                  htmlFor="desc"
                  optional={type !== "custom"}
                  aside={<span className="text-[11px] font-semibold text-muted tabular">{description.length}/4000</span>}
                  hint={type === "technical" ? "Vakansiya matnini to‘liq qo‘yishingiz mumkin." : undefined}
                >
                  <textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={meta.placeholder}
                    rows={4}
                    maxLength={4000}
                    className={cn(inputClass, "resize-y py-3 leading-relaxed")}
                  />
                </Field>
              </div>
            )}

            {/* 3 — format */}
            {step === 2 && (
              <div className="mt-5 space-y-6">
                <Field label="Suhbat tili">
                  {isIelts ? (
                    <p className="flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-sunken px-4 text-sm font-semibold text-muted">
                      <Languages className="size-4" /> IELTS Speaking har doim ingliz tilida o‘tadi.
                    </p>
                  ) : (
                    <div role="radiogroup" aria-label="Suhbat tili" className="grid gap-3 sm:grid-cols-2">
                      {(Object.keys(LANGUAGES) as InterviewLanguage[]).map((l) => (
                        <OptionCard
                          key={l}
                          selected={language === l}
                          onClick={() => setLanguage(l)}
                          title={LANGUAGES[l].label}
                          body={l === "uz" ? "Savollar o‘zbekcha o‘qiladi, nutqingiz UzbekVoice orqali taniladi." : "Questions are asked and answered in English."}
                        />
                      ))}
                    </div>
                  )}
                </Field>

                <Field label="Suhbatdosh qanchalik qattiq bo‘lsin?">
                  <div role="radiogroup" aria-label="Qiyinlik" className="grid gap-3 sm:grid-cols-3">
                    {DIFFICULTY_ORDER.map((d) => (
                      <OptionCard key={d} selected={difficulty === d} onClick={() => setDifficulty(d)} title={DIFFICULTIES[d].label} body={DIFFICULTIES[d].blurb} />
                    ))}
                  </div>
                </Field>

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Savollar soni" hint={`Taxminan ${minutes} daqiqa`}>
                    <div className="flex h-11 items-center justify-between rounded-[var(--radius-md)] border border-line-strong bg-paper p-1 shadow-[var(--shadow-pop)]">
                      <button
                        type="button"
                        onClick={() => setCount((c) => Math.max(3, c - 1))}
                        disabled={count <= 3}
                        aria-label="Kamaytirish"
                        className="grid size-9 place-items-center rounded-[7px] text-ink-2 hover:bg-sunken disabled:opacity-30"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="text-[15px] font-extrabold tabular" aria-live="polite">
                        {count} ta savol
                      </span>
                      <button
                        type="button"
                        onClick={() => setCount((c) => Math.min(10, c + 1))}
                        disabled={count >= 10}
                        aria-label="Ko‘paytirish"
                        className="grid size-9 place-items-center rounded-[7px] text-ink-2 hover:bg-sunken disabled:opacity-30"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </Field>
                  <Field label="Har bir javob uchun vaqt" hint="Vaqt tugaganda mikrofon o‘zi to‘xtaydi.">
                    <div className="flex flex-wrap gap-2">
                      {TIME_LIMITS.map((t) => (
                        <Chip key={t.value} active={timeLimit === t.value} onClick={() => setTimeLimit(t.value)}>
                          {t.label}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                </div>

                <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-line p-4">
                  <span>
                    <span className="block text-sm font-bold">Qo‘shimcha savollar</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">Javobingizga qarab chuqurroq savol berilishi mumkin.</span>
                  </span>
                  <input type="checkbox" checked={followUps} onChange={(e) => setFollowUps(e.target.checked)} className="peer sr-only" />
                  <span
                    aria-hidden
                    className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-lime peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:after:translate-x-5"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-ink-2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
                  Bu formatni keyingi suhbatlar uchun eslab qolish
                </label>
              </div>
            )}

            {/* 4 — review */}
            {step === 3 && type && (
              <div className="mt-4">
                <div className="divide-y divide-line">
                  <SummaryRow icon={<TypeGlyph className="size-4" />} label="Suhbat turi" value={INTERVIEW_TYPES[type].label} onEdit={() => go(0)} />
                  <SummaryRow
                    icon={<Sparkles className="size-4" />}
                    label={isIelts ? "Maqsad" : "Lavozim"}
                    value={
                      <>
                        {role}
                        {!isIelts && <span className="font-medium text-muted"> · {LEVELS[level]}</span>}
                        {company.trim() && <span className="font-medium text-muted"> · {company.trim()}</span>}
                      </>
                    }
                    onEdit={() => go(1)}
                  />
                  {focus.length > 0 && (
                    <SummaryRow
                      icon={<Tag className="size-4" />}
                      label="Mavzular"
                      value={
                        <span className="flex flex-wrap gap-1.5">
                          {focus.map((f) => (
                            <span key={f} className="rounded-md bg-lime-soft px-2 py-0.5 text-xs font-semibold text-lime-ink">
                              {f}
                            </span>
                          ))}
                        </span>
                      }
                      onEdit={() => go(1)}
                    />
                  )}
                  <SummaryRow icon={<Languages className="size-4" />} label="Til" value={LANGUAGES[effLang].label} onEdit={isIelts ? undefined : () => go(2)} />
                  <SummaryRow icon={<Gauge className="size-4" />} label="Suhbatdosh" value={DIFFICULTIES[difficulty].label} onEdit={() => go(2)} />
                  <SummaryRow
                    icon={<ListOrdered className="size-4" />}
                    label="Savollar"
                    value={
                      <>
                        {count} ta savol{followUps ? " + qo‘shimcha savollar" : ""}
                        <span className="font-medium text-muted"> · ~{minutes} daqiqa</span>
                      </>
                    }
                    onEdit={() => go(2)}
                  />
                  <SummaryRow icon={<Timer className="size-4" />} label="Javob vaqti" value={TIME_LIMITS.find((t) => t.value === timeLimit)?.label ?? "Cheklovsiz"} onEdit={() => go(2)} />
                </div>
                {error && <p className="mt-4 rounded-[var(--radius-md)] border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{error}</p>}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => go(step - 1)} disabled={busy} icon={<ArrowLeft className="size-4" />}>
                Orqaga
              </Button>
            ) : (
              <span className="text-[13px] text-muted">Turni tanlang — keyingi qadamga o‘tasiz.</span>
            )}
            {step === 3 ? (
              <Button type="submit" variant="accent" disabled={busy} icon={busy ? <Spinner /> : <MessageSquarePlus className="size-4" />}>
                {busy ? "Savollar tuzilmoqda…" : "Suhbatni yaratish"}
              </Button>
            ) : (
              <Button type="submit" disabled={step === 0 && !type} iconRight={<ArrowRight className="size-4" />}>
                Davom etish
              </Button>
            )}
          </div>
        </form>

        {/* Live summary */}
        <aside className="space-y-4 lg:sticky lg:top-8">
          <Card pop className="p-5">
            <p className="eyebrow">Sizning suhbatingiz</p>
            {type ? (
              <div className="mt-3 flex items-center gap-3">
                <TypeIcon type={type} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{role.trim() || INTERVIEW_TYPES[type].label}</p>
                  <p className="truncate text-xs text-muted">{[INTERVIEW_TYPES[type].label, !isIelts && LEVELS[level], company.trim()].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Hali tur tanlanmagan.</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {[
                { k: "Til", v: LANGUAGES[effLang].label },
                { k: "Suhbatdosh", v: DIFFICULTIES[difficulty].label },
                { k: "Savollar", v: `${count} ta` },
                { k: "Davomiyligi", v: `~${minutes} daq` },
              ].map((r) => (
                <div key={r.k} className="rounded-[var(--radius-md)] bg-canvas px-3 py-2">
                  <dt className="text-[11px] font-semibold text-muted">{r.k}</dt>
                  <dd className="text-sm font-bold">{r.v}</dd>
                </div>
              ))}
            </dl>
            {focus.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {focus.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 rounded-md bg-lime-soft px-2 py-0.5 text-xs font-semibold text-lime-ink">
                    {f}
                    <button type="button" onClick={() => setFocus(focus.filter((x) => x !== f))} aria-label={`${f} — olib tashlash`} className="hover:text-ink">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>
          <div className="flex gap-3 rounded-[var(--radius-lg)] border border-lime/60 bg-lime-soft p-4">
            <Clock className="mt-0.5 size-4 shrink-0 text-lime-ink" />
            <p className="text-[13px] leading-relaxed text-ink-2">{TIPS[step]}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function NewInterviewPage() {
  return (
    <Suspense>
      <Wizard />
    </Suspense>
  );
}
