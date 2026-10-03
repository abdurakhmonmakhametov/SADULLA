"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, Languages, Mic, Play, Volume2 } from "lucide-react";
import type { Interview, InterviewLanguage } from "@/lib/types";
import type { MediaStatus } from "@/hooks/useMediaStream";
import { useAudioLevel } from "@/hooks/useMediaStream";
import { useDictationMode } from "@/hooks/useDictation";
import { preloadSpeech, useVoice, type VoiceGender } from "@/hooks/useVoice";
import { DIFFICULTIES, INTERVIEW_TYPES, LANGUAGES, LEVELS } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Segmented } from "../ui/Segmented";
import { Spinner } from "../ui/Spinner";
import { LevelMeter, VideoTile } from "./VideoTile";

function CheckRow({ ok, warn, icon, title, detail }: { ok: boolean; warn?: boolean; icon: React.ReactNode; title: string; detail: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          ok ? "bg-good-soft text-good" : warn ? "bg-warn-soft text-warn" : "bg-sunken text-muted",
        )}
      >
        {ok ? <Check className="size-3.5" strokeWidth={3} /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-[13px] leading-snug text-muted">{detail}</p>
      </div>
    </li>
  );
}

const TEST_PHRASE: Record<InterviewLanguage, string> = {
  uz: "Assalomu alaykum! Men bugun sizning suhbatdoshingiz bo‘laman. Ovozim aniq eshitilyaptimi?",
  en: "Hi, I'll be your interviewer today. Can you hear me clearly?",
};

export function DeviceCheck({
  interview,
  lang,
  gender,
  onGender,
  stream,
  status,
  error,
  onRequest,
  onStart,
}: {
  interview: Interview;
  lang: InterviewLanguage;
  gender: VoiceGender;
  onGender: (g: VoiceGender) => void;
  stream: MediaStream | null;
  status: MediaStatus;
  error: string | null;
  onRequest: () => void;
  onStart: () => void;
}) {
  const level = useAudioLevel(stream);
  const [heardMic, setHeardMic] = useState(false);
  const dictation = useDictationMode(lang);
  const voice = useVoice(lang, gender);
  const granted = status === "granted";
  const resumed = interview.status === "in-progress";
  const current = interview.questions[Math.min(interview.currentIndex, interview.questions.length - 1)];

  if (level > 0.35 && !heardMic) setHeardMic(true);

  // Have the first question's audio ready before "Start" is pressed.
  useEffect(() => {
    preloadSpeech(TEST_PHRASE[lang], lang, gender);
    if (current) preloadSpeech(current.text, lang, gender);
  }, [current, lang, gender]);

  const voiceDetail = {
    server: lang === "uz" ? "Tabiiy o‘zbekcha ovoz (UzbekVoice)." : "Neyron ovoz (Azure).",
    browser: `Brauzer ovozi: ${voice.voiceName ?? ""}`,
    approx: "O‘zbekcha ovoz topilmadi — turkcha ovoz bilan o‘qiladi.",
    none: "Bu brauzerda ovoz yo‘q — savollar ekranda ko‘rsatiladi.",
  }[voice.engine];

  const sttDetail = {
    server: "UzbekVoice — har qanday brauzerda aniq ishlaydi.",
    browser: lang === "uz" ? "Brauzer orqali. O‘zbek nutqi Chrome’da eng yaxshi taniladi." : "Brauzer orqali jonli matn.",
    none: "Mavjud emas — javoblarni yozib kiritasiz.",
  }[dictation];

  return (
    <div>
      <Link href="/interviews" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> Suhbatlarim
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="lime">{INTERVIEW_TYPES[interview.config.type].label}</Badge>
        {interview.config.type !== "ielts" && <Badge>{LEVELS[interview.config.level]}</Badge>}
        <Badge tone="ink">{LANGUAGES[lang].label}</Badge>
        {interview.config.difficulty && <Badge>{DIFFICULTIES[interview.config.difficulty].label} suhbatdosh</Badge>}
        {!!interview.config.timeLimitSec && <Badge>Javob: {interview.config.timeLimitSec / 60} daq</Badge>}
        {interview.config.company && <Badge>{interview.config.company}</Badge>}
        <Badge>{interview.questions.filter((q) => q.kind === "main").length} ta savol</Badge>
      </div>
      <h1 className="mt-3 text-[24px] font-extrabold leading-tight tracking-tight sm:text-[28px]">{interview.config.role}</h1>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <VideoTile stream={stream} className="aspect-video">
            {!granted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#111a2e] p-6 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-white/10 text-white">
                  <Camera className="size-5" />
                </span>
                <div className="max-w-sm">
                  <p className="text-base font-bold text-white">Kamera va mikrofonga ruxsat bering</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/70">Video qurilmangizda qoladi va hech qayerga yuborilmaydi.</p>
                </div>
                <Button variant="secondary" onClick={onRequest} disabled={status === "requesting"} icon={status === "requesting" ? <Spinner /> : <Camera className="size-4" />}>
                  {status === "requesting" ? "Ruxsat kutilmoqda…" : status === "idle" ? "Ruxsat berish" : "Qayta urinish"}
                </Button>
              </div>
            )}
            {granted && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-ink/70 px-3 py-1.5 text-xs font-semibold text-paper backdrop-blur">
                <Mic className="size-3.5" />
                <LevelMeter level={level} />
                {!heardMic && <span>Nimadir deng</span>}
              </div>
            )}
          </VideoTile>
          {error && (
            <p role="alert" className="flex gap-2.5 rounded-[var(--radius-md)] border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="pop-card space-y-4 rounded-[var(--radius-lg)] bg-paper p-5 lg:sticky lg:top-8">
          <div>
            <p className="text-sm font-bold">Suhbatdosh ovozi</p>
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <Segmented
                  label="Ovoz turi"
                  value={gender}
                  onChange={onGender}
                  options={[
                    { value: "female", label: "Ayol" },
                    { value: "male", label: "Erkak" },
                  ]}
                />
              </div>
              <Button
                variant="secondary"
                disabled={!voice.available}
                onClick={() => (voice.speaking ? voice.cancel() : voice.speak(TEST_PHRASE[lang]))}
                icon={voice.speaking ? <Volume2 className="size-4" /> : <Play className="size-4 fill-current" />}
              >
                {voice.speaking ? "To‘xtatish" : "Eshitish"}
              </Button>
            </div>
          </div>

          <ul className="divide-y divide-line border-y border-line">
            <CheckRow ok={granted} icon={<Camera className="size-3.5" />} title="Kamera" detail={granted ? "Tayyor." : "Boshlash uchun ruxsat kerak."} />
            <CheckRow
              ok={granted && heardMic}
              icon={<Mic className="size-3.5" />}
              title="Mikrofon"
              detail={!granted ? "Boshlash uchun ruxsat kerak." : heardMic ? "Ovozingiz eshitilyapti." : "Nimadir deng — ko‘rsatkich harakatlanishi kerak."}
            />
            <CheckRow ok={voice.engine === "server" || voice.engine === "browser"} warn={voice.ready && (voice.engine === "approx" || voice.engine === "none")} icon={<Volume2 className="size-3.5" />} title="Savollarni o‘qish" detail={voice.ready ? voiceDetail : "Tekshirilmoqda…"} />
            <CheckRow ok={dictation !== "none"} warn={dictation === "none"} icon={<Languages className="size-3.5" />} title="Nutqni matnga aylantirish" detail={sttDetail} />
          </ul>

          <Button size="lg" className="w-full" disabled={!granted} onClick={onStart} iconRight={<ArrowRight className="size-4" strokeWidth={2.5} />}>
            {resumed ? "Davom ettirish" : "Suhbatni boshlash"}
          </Button>
          <p className="text-center text-xs font-medium leading-relaxed text-muted">
            Savol o‘qiladi → siz gapirasiz → <b className="text-ink-2">Keyingi</b> tugmasini bosasiz.
          </p>
        </div>
      </div>
    </div>
  );
}
