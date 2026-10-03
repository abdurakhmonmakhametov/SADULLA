"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Award, Bot, CheckCircle2, ChevronRight, Clock3, Flame, Library, Mic, PenLine, Play, Plus, Target, type LucideIcon } from "lucide-react";
import { TabletCharacter, WavingCharacter } from "@/components/ui/Characters";
import { PageHeader } from "@/components/shell/AppShell";
import { useUser } from "@/components/UserProvider";
import { InterviewRow } from "@/components/dashboard/InterviewRow";
import { ScoreTrend } from "@/components/dashboard/ScoreTrend";
import { TYPE_ICONS, TYPE_TINT } from "@/components/TypeIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { INTERVIEW_TYPES, TYPE_ORDER } from "@/lib/catalog";
import { formatDuration, greeting } from "@/lib/format";
import { retryLoad, useInterviewStore } from "@/lib/storage";
import type { Interview } from "@/lib/types";
import { cn } from "@/lib/cn";

const noop = () => () => {};
function useGreeting() {
  return useSyncExternalStore(
    noop,
    () => greeting(),
    () => "Salom",
  );
}

function StatCard({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <Card pop className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <span className="grid size-8 place-items-center rounded-[var(--radius-sm)] bg-sunken text-ink-2">
          <Icon className="size-4" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-3 text-[28px] font-extrabold leading-none tracking-tight tabular">{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </Card>
  );
}

function Stats({ list }: { list: Interview[] }) {
  const done = list.filter((i) => i.report);
  const scores = done.map((i) => i.report!.overall);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const best = scores.length ? Math.max(...scores) : null;
  const seconds = list.reduce((t, i) => t + Object.values(i.answers).reduce((s, a) => s + a.durationSec, 0), 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard icon={CheckCircle2} label="Yakunlangan" value={String(done.length)} note={`${list.length - done.length} ta jarayonda`} />
      <StatCard icon={Target} label="O‘rtacha ball" value={avg === null ? "—" : String(avg)} note="100 balldan" />
      <StatCard icon={Award} label="Eng yuqori ball" value={best === null ? "—" : String(best)} note="shaxsiy rekord" />
      <StatCard icon={Clock3} label="Gapirgan vaqt" value={formatDuration(seconds)} note="daqiqa : soniya" />
    </div>
  );
}

function ResumeBanner({ interview }: { interview: Interview }) {
  const answered = Object.values(interview.answers).filter((a) => a.transcript.trim()).length;
  const pct = Math.round((answered / Math.max(1, interview.questions.length)) * 100);
  return (
    <Card pop className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-warn-soft text-warn">
        <Play className="size-4 fill-current" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Tugallanmagan suhbat: {interview.config.role}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 max-w-60 flex-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-lime" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold text-muted tabular">
            {answered}/{interview.questions.length} javob
          </span>
        </div>
      </div>
      <ButtonLink href={`/interview/${interview.id}`} variant="accent" iconRight={<ArrowRight className="size-4" />}>
        Davom ettirish
      </ButtonLink>
    </Card>
  );
}

const TOOLS = [
  { href: "/coach", icon: Bot, title: "AI murabbiy", body: "Savol bering — maslahat, misol va tayyorgarlik rejasi." },
  { href: "/workshop", icon: PenLine, title: "Javob ustaxonasi", body: "Bitta javobni ball, tavsiya va yaxshilangan variant bilan sayqallang." },
  { href: "/questions", icon: Library, title: "Savollar banki", body: "Eng ko‘p beriladigan savollar — o‘zlashtirganlaringizni belgilang." },
];

function Tools() {
  return (
    <div className="grid gap-3 pt-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
      {TOOLS.map((t, i) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "group pop-card relative flex items-start gap-3 rounded-[var(--radius-lg)] bg-paper p-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-ink",
            i === 0 && "pl-[112px] sm:col-span-2 xl:col-span-1",
          )}
        >
          {i === 0 && (
            <TabletCharacter className="pointer-events-none absolute bottom-0 left-1 h-[116px] w-[108px] origin-bottom transition-transform duration-300 group-hover:-rotate-3" />
          )}
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-lime text-ink">
            <t.icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">{t.title}</span>
            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{t.body}</span>
          </span>
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      ))}
    </div>
  );
}

const DAY_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function Activity({ list }: { list: Interview[] }) {
  const active = new Set(list.map((i) => dayKey(new Date(i.updatedAt))));
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - k));
    const count = list.filter((i) => dayKey(new Date(i.updatedAt)) === dayKey(d)).length;
    return { d, count, on: count > 0, isToday: k === 6 };
  });
  // Consecutive active days ending today (or yesterday, if today is still open).
  let streak = 0;
  const cursor = new Date(today);
  if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const weekCount = days.reduce((t, d) => t + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <Card pop className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">Haftalik faollik</h2>
          <p className="mt-0.5 text-[13px] text-muted">So‘nggi 7 kunda {weekCount} ta mashq</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-lime px-2 py-1 text-xs font-bold text-ink">
          <Flame className="size-3.5" /> {streak} kun
        </span>
      </div>
      <div className="mt-6 flex flex-1 items-end gap-2">
        {days.map(({ d, count, on, isToday }) => (
          <div key={dayKey(d)} className="flex flex-1 flex-col items-center gap-2" title={`${d.toLocaleDateString("uz")}: ${count} ta`}>
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className={cn("w-full max-w-8 rounded-[6px] transition-all", on ? "bg-lime" : "bg-sunken", isToday && "ring-2 ring-ink ring-offset-2")}
                style={{ height: on ? `${30 + (count / max) * 70}%` : "14%" }}
              />
            </div>
            <span className={cn("text-[11px] font-semibold", isToday ? "text-ink" : "text-muted")}>{DAY_SHORT[d.getDay()]}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-muted">
        {streak >= 2 ? `Ajoyib! ${streak} kundan beri har kuni mashq qilyapsiz.` : "Har kuni bitta qisqa suhbat — eng tez o‘sish yo‘li."}
      </p>
    </Card>
  );
}

function QuickStart() {
  return (
    <Card pop className="p-5">
      <h2 className="text-[15px] font-bold">Tezkor boshlash</h2>
      <p className="mt-0.5 text-[13px] text-muted">Suhbat turini tanlang</p>
      <div className="mt-4 space-y-1">
        {TYPE_ORDER.map((t) => {
          const Icon = TYPE_ICONS[t];
          return (
            <Link
              key={t}
              href={`/new?type=${t}`}
              className="group -mx-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 transition-colors hover:bg-canvas"
            >
              <span className={cn("grid size-8 place-items-center rounded-[var(--radius-sm)]", TYPE_TINT[t])}>
                <Icon className="size-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{INTERVIEW_TYPES[t].label}</span>
                <span className="block truncate text-xs text-muted">{INTERVIEW_TYPES[t].blurb}</span>
              </span>
              <ArrowRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

const STEPS = [
  { title: "Suhbatni sozlang", body: "Lavozim, tajriba va tilni tanlang — savollar siz uchun tuziladi." },
  { title: "Ovoz chiqarib javob bering", body: "Savollar o‘qib beriladi, nutqingiz avtomatik matnga aylanadi." },
  { title: "Batafsil natija oling", body: "Ball, kuchli va zaif tomonlar hamda har savolga namunaviy javob." },
];

function GettingStarted() {
  return (
    <Card pop className="p-6 sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md">
          <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-lime-soft text-lime-ink">
            <Mic className="size-5" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold tracking-tight">Birinchi suhbatingizni boshlang</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">10 daqiqalik mashq — va qayerda kuchli, qayerda o‘sish kerakligini aniq bilib olasiz.</p>
          <ButtonLink href="/new" className="mt-5" icon={<Plus className="size-4" />}>
            Yangi suhbat
          </ButtonLink>
        </div>
        <ol className="grid gap-4 md:w-[380px]">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-xs font-bold text-ink-2">{i + 1}</span>
              <span>
                <span className="block text-sm font-bold">{s.title}</span>
                <span className="block text-[13px] leading-relaxed text-muted">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const store = useInterviewStore();
  const user = useUser();
  const hello = useGreeting();
  const list = store.status === "ready" ? store.list : null;
  const open = list?.find((i) => i.status === "in-progress");
  const recent = list?.slice(0, 5) ?? [];

  return (
    <>
      <div className="relative">
        {/* Peeks out from behind the cards: clipped at the cards' top edge (the header's mb-6 collapses below this box). */}
        <div className="pointer-events-none absolute -bottom-6 right-48 hidden h-[120px] w-[180px] overflow-hidden xl:block">
          <WavingCharacter className="absolute -bottom-1.5 left-0 h-[122px] w-[180px]" />
        </div>
        <PageHeader
          title={`${hello}, ${user.name.split(" ")[0]}`}
          description="Bugungi mashqingizni boshlang yoki natijalaringizni ko‘rib chiqing."
          actions={
            <ButtonLink href="/new" icon={<Plus className="size-4" />}>
              Yangi suhbat
            </ButtonLink>
          }
        />
      </div>

      <div className="relative z-10">
        {store.status === "error" ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-ink-2">Suhbatlarni yuklab bo‘lmadi.</p>
            <Button variant="secondary" onClick={retryLoad}>
              Qayta urinish
            </Button>
          </Card>
        ) : list === null ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-sunken" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="space-y-4">
            <GettingStarted />
            <Tools />
            <QuickStart />
          </div>
        ) : (
          <div className="space-y-4">
            {open && <ResumeBanner interview={open} />}
            <Stats list={list} />
            <Tools />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <Card pop className="p-5">
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-bold">Natijalar dinamikasi</h2>
                    <p className="mt-0.5 text-[13px] text-muted">Oxirgi suhbatlardagi umumiy ball</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <span className="size-2.5 rounded-sm bg-lime" /> oxirgisi
                  </span>
                </div>
                <ScoreTrend list={list} />
              </Card>
              <Activity list={list} />
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <Card pop className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <h2 className="text-[15px] font-bold">So‘nggi suhbatlar</h2>
                  <Link href="/interviews" className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
                    Barchasi <ArrowRight className="size-3.5" />
                  </Link>
                </div>
                <ul className="divide-y divide-line">
                  {recent.map((i) => (
                    <InterviewRow key={i.id} interview={i} />
                  ))}
                </ul>
              </Card>
              <QuickStart />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
