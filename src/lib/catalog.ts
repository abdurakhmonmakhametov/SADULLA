import type { Difficulty, ExperienceLevel, InterviewLanguage, InterviewType } from "./types";

export const APP_NAME = "Suhbatdosh";

export const INTERVIEW_TYPES: Record<
  InterviewType,
  { label: string; blurb: string; descriptionLabel: string; placeholder: string }
> = {
  technical: {
    label: "Texnik",
    blurb: "Texnologiyalar, tizim dizayni va muammolarni yechish.",
    descriptionLabel: "Vakansiya tavsifi yoki texnologiyalar",
    placeholder: "Masalan: React, TypeScript, Next.js, REST API, PostgreSQL, Vitest bilan test yozish",
  },
  behavioral: {
    label: "Xulq-atvor",
    blurb: "Hayotiy vaziyatlar haqida — STAR usulida javob.",
    descriptionLabel: "Asosiy vazifalar",
    placeholder: "Masalan: kichik jamoani boshqarish, mijozlar bilan ishlash, qisqa muddatda natija berish",
  },
  hr: {
    label: "HR suhbat",
    blurb: "Motivatsiya, maosh, jamoa madaniyati va maqsadlar.",
    descriptionLabel: "Kompaniya yoki lavozim haqida",
    placeholder: "Masalan: Toshkentdagi fintech startap, 40 kishilik jamoa, gibrid format",
  },
  ielts: {
    label: "IELTS Speaking",
    blurb: "1–3-qismlar, ravonlik va so‘z boyligi bo‘yicha baho.",
    descriptionLabel: "Mashq qilmoqchi bo‘lgan mavzular",
    placeholder: "Masalan: technology, hometown, travel, environment",
  },
  custom: {
    label: "Erkin format",
    blurb: "Sizdan nima so‘ralishini o‘zingiz yozing.",
    descriptionLabel: "Suhbat nimaga qaratilsin?",
    placeholder: "Masalan: oziq-ovqat yetkazib berish ilovasini o‘stirish bo‘yicha product manager keys-suhbati",
  },
};

export const LEVELS: Record<ExperienceLevel, string> = {
  intern: "Stajyor",
  junior: "Junior",
  mid: "Middle",
  senior: "Senior",
  lead: "Team Lead",
};

export const LANGUAGES: Record<InterviewLanguage, { label: string; short: string; speech: string }> = {
  uz: { label: "O‘zbekcha", short: "UZ", speech: "uz-UZ" },
  en: { label: "English", short: "EN", speech: "en-US" },
};

export const DIFFICULTIES: Record<Difficulty, { label: string; blurb: string }> = {
  easy: { label: "Do‘stona", blurb: "Yumshoq savollar, iliq ohang — birinchi mashq uchun." },
  normal: { label: "Odatiy", blurb: "Haqiqiy suhbatdagidek muvozanatli savollar." },
  hard: { label: "Qattiq", blurb: "Chuqur, aniqlikni talab qiladigan va bosimli savollar." },
};
export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "normal", "hard"];

/** Per-answer speaking limit options, in seconds (0 = no limit). */
export const TIME_LIMITS: { value: number; label: string }[] = [
  { value: 0, label: "Cheklovsiz" },
  { value: 60, label: "1 daqiqa" },
  { value: 120, label: "2 daqiqa" },
  { value: 180, label: "3 daqiqa" },
];

/** Quick picks shown in the wizard, per interview type. */
export const ROLE_SUGGESTIONS: Record<InterviewType, string[]> = {
  technical: ["Frontend dasturchi", "Backend dasturchi", "Mobil dasturchi", "DevOps muhandis", "Ma’lumotlar tahlilchisi", "QA muhandis"],
  behavioral: ["Loyiha menejeri", "Team Lead", "Sotuv menejeri", "Mijozlar bilan ishlash mutaxassisi", "Product menejer"],
  hr: ["Marketing menejeri", "Buxgalter", "HR mutaxassis", "Ofis menejeri", "Sotuv menejeri", "UX dizayner"],
  ielts: ["Band 6.5 — bakalavr", "Band 7.0 — magistratura", "Band 7.5+ — grant", "Band 6.0 — ish uchun"],
  custom: ["Product menejer — keys-suhbat", "Startap asoschisi — investor bilan suhbat", "Talaba — grant suhbati"],
};

export const FOCUS_SUGGESTIONS: Record<InterviewType, string[]> = {
  technical: ["React", "TypeScript", "Node.js", "SQL", "Tizim dizayni", "Algoritmlar", "Testlash", "Git"],
  behavioral: ["Jamoada ishlash", "Nizolar", "Liderlik", "Muvaffaqiyatsizlik", "Vaqtni boshqarish", "Ta’sir o‘tkazish"],
  hr: ["Motivatsiya", "Maosh kutilmalari", "Kuchli tomonlar", "Kelajak rejalar", "Kompaniya madaniyati"],
  ielts: ["Technology", "Hometown", "Travel", "Education", "Environment", "Work", "Health"],
  custom: ["Keys tahlili", "Taqdimot", "Muzokaralar", "Strategiya"],
};

export const TYPE_ORDER: InterviewType[] = ["technical", "behavioral", "hr", "ielts", "custom"];
export const LEVEL_ORDER: ExperienceLevel[] = ["intern", "junior", "mid", "senior", "lead"];

/** IELTS is always run in English. */
export const effectiveLanguage = (type: InterviewType, lang: InterviewLanguage): InterviewLanguage =>
  type === "ielts" ? "en" : lang;
