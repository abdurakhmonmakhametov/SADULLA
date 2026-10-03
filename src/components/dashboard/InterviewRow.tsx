"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, RotateCcw, Trash2 } from "lucide-react";
import type { Interview } from "@/lib/types";
import { INTERVIEW_TYPES, LANGUAGES, LEVELS, effectiveLanguage } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { deleteInterview, restartInterview } from "@/lib/storage";
import { TypeIcon } from "../TypeIcon";
import { Badge } from "../ui/Badge";
import { Button, ButtonLink } from "../ui/Button";
import { ScorePill } from "../ui/Score";
import { Dialog } from "../ui/Dialog";

function primaryAction(i: Interview) {
  if (i.status === "completed") return { href: `/interview/${i.id}/report`, label: "Natija" };
  if (i.status === "in-progress") return { href: `/interview/${i.id}`, label: "Davom etish" };
  return { href: `/interview/${i.id}`, label: "Boshlash" };
}

export function InterviewRow({ interview: i }: { interview: Interview }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const action = primaryAction(i);
  const answered = Object.values(i.answers).filter((a) => a.transcript.trim()).length;
  const mains = i.questions.filter((q) => q.kind === "main").length;
  const lang = LANGUAGES[effectiveLanguage(i.config.type, i.config.language ?? "uz")];

  return (
    <li className="group relative flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <TypeIcon type={i.config.type} />
        <div className="min-w-0">
          <Link href={action.href} className="block truncate text-[15px] font-semibold text-ink after:absolute after:inset-0 sm:after:content-none">
            {i.config.role}
          </Link>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {[INTERVIEW_TYPES[i.config.type].label, i.config.type !== "ielts" && LEVELS[i.config.level], i.config.company, lang.short, `${mains} savol`, formatDate(i.updatedAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
        <div className="mr-auto sm:mr-2 sm:w-28 sm:text-right">
          {i.status === "completed" && i.report ? (
            <ScorePill score={i.report.overall} />
          ) : i.status === "in-progress" ? (
            <Badge tone="warn" dot>
              {answered}/{i.questions.length} javob
            </Badge>
          ) : (
            <Badge>Boshlanmagan</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Shu savollar bilan qayta topshirish"
          aria-label={`${i.config.role} — qayta topshirish`}
          onClick={() => router.push(`/interview/${restartInterview(i).id}`)}
        >
          <RotateCcw className="size-4" strokeWidth={2} />
        </Button>
        <Button variant="ghost" size="icon" title="O‘chirish" aria-label={`${i.config.role} — o‘chirish`} onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" strokeWidth={2} />
        </Button>
        <ButtonLink href={action.href} variant="secondary" size="sm" iconRight={<ArrowRight className="size-3.5" strokeWidth={2.5} />} className="w-32">
          {action.label}
        </ButtonLink>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Suhbat o‘chirilsinmi?"
        description={`“${i.config.role}” suhbati, javoblaringiz va natijalar butunlay o‘chiriladi. Buni qaytarib bo‘lmaydi.`}
      >
        <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
          Bekor qilish
        </Button>
        <Button variant="danger" onClick={() => deleteInterview(i.id)}>
          O‘chirish
        </Button>
      </Dialog>
    </li>
  );
}
