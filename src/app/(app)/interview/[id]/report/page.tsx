"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Bot, Check, Clock3, Copy, FileSearch, Gauge, MessageCircleWarning, MessagesSquare, Printer, RotateCcw, ThumbsDown, ThumbsUp, X, type LucideIcon } from "lucide-react";
import { NotFound, PageLoading } from "@/components/PageStates";
import { ListenButton, QuestionReview } from "@/components/report/QuestionReview";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MetricBar, ScoreDial } from "@/components/ui/Score";
import { Spinner } from "@/components/ui/Spinner";
import { useVoice } from "@/hooks/useVoice";
import { DIFFICULTIES, INTERVIEW_TYPES, LANGUAGES, LEVELS, effectiveLanguage } from "@/lib/catalog";
import { formatDate, formatDuration } from "@/lib/format";
import { interviewSpeechStats, paceLabel } from "@/lib/speech";
import { restartInterview, updateInterview, useInterview } from "@/lib/storage";
import type { AnsweredItem, Interview, Report, Source } from "@/lib/types";

const STAGES = ["Javoblaringiz o‘qilmoqda", "Har bir javob baholanmoqda", "Namunaviy javoblar yozilmoqda", "Hisobot tayyorlanmoqda"];

function Generating({ onCancel }: { onCancel: () => void }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <main className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-sunken text-ink-2">
        <FileSearch className="size-5" />
      </span>
      <h1 className="mt-5 text-[22px] font-extrabold leading-tight tracking-tight">Suhbatingiz tahlil qilinmoqda</h1>
      <p className="mt-1.5 text-sm text-muted">Odatda 20–40 soniya davom etadi.</p>
      <ol className="pop-card mt-7 w-full space-y-3.5 rounded-[var(--radius-lg)] bg-paper p-5 text-left">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className={`grid size-6 place-items-center rounded-full ${i < stage ? "bg-good-soft text-good" : i === stage ? "bg-sunken" : "border border-line"}`}>
              {i < stage ? <Check className="size-3.5" strokeWidth={3} /> : i === stage ? <Spinner className="size-3" /> : null}
            </span>
            <span className={i <= stage ? "font-semibold text-ink" : "text-muted"}>{s}</span>
          </li>
        ))}
      </ol>
      <button onClick={onCancel} className="mt-8 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
        Suhbatga qaytish
      </button>
    </main>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: "good" | "bad" }) {
  const good = tone === "good";
  return (
    <Card pop className="p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-8 place-items-center rounded-[var(--radius-sm)] ${good ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
          {good ? <ThumbsUp className="size-4" strokeWidth={2.25} /> : <ThumbsDown className="size-4" strokeWidth={2.25} />}
        </span>
        <h2 className="text-[15px] font-bold">{title}</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((s) => (
          <li key={s} className="flex gap-3 text-sm leading-relaxed text-ink-2">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${good ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>
              {good ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SpeechCard({ interview }: { interview: Interview }) {
  const st = interviewSpeechStats(interview.answers);
  const pace = paceLabel(st.wpm);
  const cells: { icon: LucideIcon; label: string; value: string; note: React.ReactNode }[] = [
    { icon: MessagesSquare, label: "Javob berilgan", value: `${st.answered}/${interview.questions.length}`, note: `${st.words} so‘z jami` },
    { icon: Clock3, label: "Gapirgan vaqt", value: formatDuration(st.seconds), note: "daqiqa : soniya" },
    {
      icon: Gauge,
      label: "O‘rtacha sur’at",
      value: st.wpm ? `${st.wpm}` : "—",
      note: pace ? <span className={pace.tone === "good" ? "text-good" : "text-warn"}>so‘z/daq · {pace.label}</span> : "ma’lumot yetarli emas",
    },
    {
      icon: MessageCircleWarning,
      label: "To‘ldiruvchi so‘zlar",
      value: String(st.fillers),
      note: st.topFillers.length ? st.topFillers.map(([f, n]) => `${f} ×${n}`).join(", ") : "toza nutq",
    },
  ];
  return (
    <Card pop className="mt-4 animate-rise p-5 [animation-delay:40ms] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold">Nutq tahlili</h2>
        <span className="text-xs text-muted">Ideal sur’at: daqiqasiga 110–160 so‘z</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="rounded-[var(--radius-md)] border border-line p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <c.icon className="size-4" /> {c.label}
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight tabular">{c.value}</p>
            <p className="mt-1 truncate text-xs text-muted">{c.note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function summaryText(interview: Interview, report: Report): string {
  const c = interview.config;
  return [
    `${c.role} — ${INTERVIEW_TYPES[c.type].label} suhbati natijasi`,
    `Umumiy ball: ${report.overall}/100 (muloqot ${report.communication}, bilim ${report.technical}, ishonch ${report.confidence}, javob sifati ${report.answerQuality})`,
    "",
    report.summary,
    "",
    "Kuchli tomonlar:",
    ...report.strengths.map((x) => `• ${x}`),
    "",
    "Yaxshilash kerak:",
    ...report.weaknesses.map((x) => `• ${x}`),
    "",
    "Tavsiyalar:",
    ...report.advice.map((x, i) => `${i + 1}. ${x}`),
  ].join("\n");
}

function ReportView({ interview, report }: { interview: Interview; report: Report }) {
  const router = useRouter();
  const { config } = interview;
  const lang = effectiveLanguage(config.type, config.language ?? "uz");
  const voice = useVoice(lang);
  const [playing, setPlaying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const feedbackById = new Map(report.questions.map((q) => [q.questionId, q]));
  const weakest = [...report.questions].sort((a, b) => a.score - b.score)[0];
  const weakestQ = interview.questions.find((q) => q.id === weakest?.questionId);
  const labels: string[] = [];
  let mainNo = 0;
  for (const q of interview.questions) {
    if (q.kind === "main") mainNo++;
    labels.push(String(mainNo));
  }

  return (
    <main>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/interviews" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-4" /> Suhbatlarim
        </Link>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(summaryText(interview, report)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              });
            }}
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          >
            {copied ? "Nusxalandi" : "Nusxalash"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()} icon={<Printer className="size-4" />}>
            Chop etish
          </Button>
          <ButtonLink href={`/coach?from=${interview.id}`} variant="accent" size="sm" icon={<Bot className="size-4" />}>
            Murabbiy bilan muhokama
          </ButtonLink>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/interview/${restartInterview(interview).id}`)} icon={<RotateCcw className="size-4" />}>
            Qayta topshirish
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="lime">{INTERVIEW_TYPES[config.type].label}</Badge>
          {config.type !== "ielts" && <Badge>{LEVELS[config.level]}</Badge>}
          <Badge tone="ink">{LANGUAGES[lang].label}</Badge>
          {config.difficulty && <Badge>{DIFFICULTIES[config.difficulty].label}</Badge>}
          {config.company && <Badge>{config.company}</Badge>}
          <span className="text-xs font-medium text-muted">{formatDate(report.createdAt)}</span>
          {report.source === "demo" && (
            <Badge tone="warn" className="no-print">
              Oflayn baholash
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[28px]">{config.role}</h1>
      </div>

      <Card pop className="mt-6 grid animate-rise gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
        <div className="flex flex-col items-center gap-3">
          <ScoreDial score={report.overall} size={168} />
          <p className="eyebrow">Umumiy ball</p>
        </div>
        <div className="relative">
          <p className="text-[15px] leading-relaxed text-ink">{report.summary}</p>
          <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <MetricBar label="Muloqot" value={report.communication} />
            <MetricBar label={config.type === "ielts" ? "So‘z boyligi va grammatika" : "Texnik bilim"} value={report.technical} />
            <MetricBar label="Ishonch" value={report.confidence} />
            <MetricBar label="Javob sifati" value={report.answerQuality} />
          </div>
        </div>
      </Card>

      <SpeechCard interview={interview} />

      <div className="mt-4 grid animate-rise gap-4 [animation-delay:60ms] md:grid-cols-2">
        <List title="Kuchli tomonlar" items={report.strengths} tone="good" />
        <List title="Zaif tomonlar" items={report.weaknesses} tone="bad" />
      </div>

      <div className="mt-4 grid animate-rise gap-4 [animation-delay:120ms] md:grid-cols-[1fr_1.2fr]">
        <Card pop className="p-5 sm:p-6">
          <h2 className="text-[15px] font-bold">Qanday yaxshilash mumkin</h2>
          <ol className="mt-4 space-y-3.5">
            {report.advice.map((a, i) => (
              <li key={a} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-bold text-ink-2">{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
        </Card>
        {weakest && weakestQ && (
          <div className="pop-card rounded-[var(--radius-lg)] bg-paper p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold">Yaxshiroq javob namunasi</h2>
              <ListenButton voice={voice} text={weakest.betterAnswer} id="weakest" playing={playing} onPlaying={setPlaying} />
            </div>
            <p className="mt-1 text-[13px] text-muted">Eng past ball olgan savolingiz uchun: “{weakestQ.text.replace(/^Part \d · /, "")}”</p>
            <p className="mt-3 rounded-[var(--radius-md)] border-l-[3px] border-lime bg-canvas p-4 text-[15px] leading-relaxed text-ink">{weakest.betterAnswer}</p>
          </div>
        )}
      </div>

      <section className="mt-8 animate-rise [animation-delay:180ms]">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">Har bir savol bo‘yicha</h2>
          <span className="text-xs font-medium text-muted">Javob va izohni ko‘rish uchun savolni bosing</span>
        </div>
        <Card pop className="overflow-hidden">
          <ul className="divide-y divide-line">
            {interview.questions.map((q, i) => (
              <QuestionReview
                key={q.id}
                question={q}
                label={labels[i]}
                answer={interview.answers[q.id]}
                feedback={feedbackById.get(q.id)}
                defaultOpen={i === 0}
                workshopHref={`/workshop?q=${encodeURIComponent(q.text.replace(/^Part \d · /, ""))}&a=${encodeURIComponent(interview.answers[q.id]?.transcript ?? "")}&lang=${lang}&role=${encodeURIComponent(config.role)}`}
                voice={voice}
                playing={playing}
                onPlaying={setPlaying}
              />
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const interview = useInterview(id);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);

  const generate = useCallback(async (iv: Interview) => {
    setError(null);
    const items: AnsweredItem[] = iv.questions.map((q) => ({
      questionId: q.id,
      question: q.text,
      kind: q.kind,
      answer: iv.answers[q.id]?.transcript ?? "",
    }));
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: iv.config, items }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { report: Omit<Report, "source" | "createdAt">; source: Source; notice?: string };
      if (data.notice) setNotice(data.notice);
      updateInterview(iv.id, (i) => ({
        ...i,
        status: "completed",
        report: { ...data.report, source: data.source, createdAt: Date.now() },
      }));
    } catch (err) {
      console.error(err);
      started.current = false;
      setError("Natijani tayyorlab bo‘lmadi. Javoblaringiz saqlangan — birozdan so‘ng qayta urinib ko‘ring.");
    }
  }, []);

  const needsReport = interview && !interview.report;
  useEffect(() => {
    if (!needsReport || !interview || started.current) return;
    started.current = true;
    void generate(interview);
  }, [needsReport, interview, generate]);

  if (interview === undefined) return <PageLoading />;
  if (interview === null) return <NotFound />;

  return (
    <>
      {notice && (
        <div className="no-print mb-4">
          <p className="rounded-[var(--radius-md)] border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm font-medium text-warn">{notice}</p>
        </div>
      )}
      {interview.report ? (
        <ReportView interview={interview} report={interview.report} />
      ) : error ? (
        <main className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
          <AlertTriangle className="size-7 text-bad" />
          <p className="mt-4 text-sm text-ink-2">{error}</p>
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={() => router.push(`/interview/${id}`)}>
              Suhbatga qaytish
            </Button>
            <Button
              onClick={() => {
                started.current = true;
                void generate(interview);
              }}
            >
              Qayta urinish
            </Button>
          </div>
        </main>
      ) : (
        <Generating onCancel={() => router.push(`/interview/${id}`)} />
      )}
    </>
  );
}
