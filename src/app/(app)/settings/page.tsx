"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Download, Play, RotateCcw, Square } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { AiSettings } from "@/components/settings/AiSettings";
import { useUser } from "@/components/UserProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { useStatus, useVoice, type VoiceGender } from "@/hooks/useVoice";
import { DIFFICULTIES, DIFFICULTY_ORDER, LANGUAGES, TIME_LIMITS } from "@/lib/catalog";
import { initials } from "@/lib/format";
import { FACTORY_DEFAULTS, readDefaults, readGender, saveDefaults, saveGender, type WizardDefaults } from "@/lib/prefs";
import { useInterviews } from "@/lib/storage";
import type { Difficulty, InterviewLanguage } from "@/lib/types";

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card pop className="grid gap-5 p-5 sm:p-6 md:grid-cols-[240px_1fr] md:gap-8">
      <div>
        <h2 className="text-[15px] font-bold">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[150px_1fr] sm:items-center">
      <p className="text-[13px] font-semibold text-ink-2">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const user = useUser();
  const status = useStatus();
  const list = useInterviews();
  const [gender, setGender] = useState<VoiceGender>("female");
  const [defaults, setDefaults] = useState<WizardDefaults>(FACTORY_DEFAULTS);
  const [saved, setSaved] = useState(false);
  const voice = useVoice("uz", gender);

  useEffect(() => {
    // Per-browser preferences; read after mount to keep SSR markup stable.
    /* eslint-disable react-hooks/set-state-in-effect */
    setGender(readGender());
    setDefaults(readDefaults());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function update(patch: Partial<WizardDefaults>) {
    const next = { ...defaults, ...patch };
    setDefaults(next);
    saveDefaults(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user: { name: user.name, email: user.email }, interviews: list ?? [] }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suhbatdosh-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const services = [
    { name: "AI savollar va baholash", detail: status?.aiProvider ?? "Ulanmagan — oflayn rejim", on: status?.ai },
    { name: "O‘zbekcha ovoz", detail: "UzbekVoice / Azure", on: status?.tts.includes("uz") },
    { name: "O‘zbekcha nutqni aniqlash", detail: "UzbekVoice", on: status?.stt.includes("uz") },
  ];

  return (
    <>
      <PageHeader title="Sozlamalar" description="Hisobingiz, suhbat parametrlari va ma’lumotlaringiz." />
      <div className="space-y-4">
        <Section title="Hisob" description="Kirish uchun ishlatiladigan ma’lumotlar.">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-full bg-ink text-sm font-bold text-lime">{initials(user.name)}</span>
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
          </div>
        </Section>

        <div id="ai">
          <Section title="Sun’iy intellekt (AI)" description="Savollar, baholash, murabbiy va javob ustaxonasi qaysi AI orqali ishlashini tanlang. Bepul yoki pullik istalgan provayder tokenini ulashingiz mumkin.">
            <AiSettings />
          </Section>
        </div>

        <Section title="Suhbatdosh ovozi" description="Savollarni kim o‘qib berishini tanlang. Tanlov shu brauzerda saqlanadi.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-64">
              <Segmented
                label="Ovoz turi"
                value={gender}
                onChange={(g) => {
                  setGender(g);
                  saveGender(g);
                }}
                options={[
                  { value: "female", label: "Ayol" },
                  { value: "male", label: "Erkak" },
                ]}
              />
            </div>
            <Button
              variant="secondary"
              disabled={!voice.available}
              onClick={() => (voice.speaking ? voice.cancel() : voice.speak("Assalomu alaykum! Men sizning suhbatdoshingizman."))}
              icon={voice.speaking ? <Square className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
            >
              {voice.speaking ? "To‘xtatish" : "Eshitib ko‘rish"}
            </Button>
          </div>
        </Section>

        <Section title="Yangi suhbat uchun standartlar" description="Yangi suhbat yaratilganda shu qiymatlar oldindan tanlangan bo‘ladi.">
          <div className="space-y-4">
            <Row label="Til">
              <div className="sm:w-72">
                <Segmented
                  label="Til"
                  value={defaults.language}
                  onChange={(v: InterviewLanguage) => update({ language: v })}
                  options={(Object.keys(LANGUAGES) as InterviewLanguage[]).map((l) => ({ value: l, label: LANGUAGES[l].label }))}
                />
              </div>
            </Row>
            <Row label="Suhbatdosh">
              <div className="sm:w-96">
                <Segmented
                  label="Qiyinlik"
                  value={defaults.difficulty}
                  onChange={(v: Difficulty) => update({ difficulty: v })}
                  options={DIFFICULTY_ORDER.map((d) => ({ value: d, label: DIFFICULTIES[d].label }))}
                />
              </div>
            </Row>
            <Row label="Savollar soni">
              <div className="sm:w-96">
                <Segmented
                  label="Savollar soni"
                  value={String(defaults.questionCount)}
                  onChange={(v) => update({ questionCount: Number(v) })}
                  options={["4", "6", "8", "10"].map((n) => ({ value: n, label: n }))}
                />
              </div>
            </Row>
            <Row label="Javob vaqti">
              <div className="sm:w-96">
                <Segmented
                  label="Javob vaqti"
                  value={String(defaults.timeLimitSec)}
                  onChange={(v) => update({ timeLimitSec: Number(v) })}
                  options={TIME_LIMITS.map((t) => ({ value: String(t.value), label: t.value ? `${t.value / 60} daq` : "Yo‘q" }))}
                />
              </div>
            </Row>
            <Row label="Qo‘shimcha savollar">
              <label className="inline-flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={defaults.followUps} onChange={(e) => update({ followUps: e.target.checked })} className="peer sr-only" />
                <span
                  aria-hidden
                  className="relative h-6 w-11 shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-lime peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:after:translate-x-5"
                />
                <span className="text-sm text-ink-2">{defaults.followUps ? "Yoqilgan" : "O‘chirilgan"}</span>
              </label>
            </Row>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-good transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>
                <Check className="size-3.5" /> Saqlandi
              </span>
              <Button variant="ghost" size="sm" onClick={() => update(FACTORY_DEFAULTS)} icon={<RotateCcw className="size-3.5" />}>
                Asl holatga qaytarish
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Ma’lumotlar" description="Barcha suhbatlaringiz, javoblaringiz va natijalaringizni yuklab oling.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">{list ? `${list.length} ta suhbat saqlangan.` : "Yuklanmoqda…"}</p>
            <Button variant="secondary" onClick={exportData} disabled={!list} icon={<Download className="size-4" />}>
              JSON yuklab olish
            </Button>
          </div>
        </Section>

        <Section title="Xizmatlar holati" description="Server integratsiyalari. Kalitlar .env faylida sozlanadi.">
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {services.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted">{s.detail}</p>
                </div>
                {s.on === undefined ? (
                  <Badge>…</Badge>
                ) : s.on ? (
                  <Badge tone="good" dot>
                    Faol
                  </Badge>
                ) : (
                  <Badge dot>O‘chiq</Badge>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
