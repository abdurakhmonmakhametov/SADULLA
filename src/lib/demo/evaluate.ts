import type { AnsweredItem, InterviewConfig, InterviewLanguage } from "../types";
import type { GeneratedReport } from "../schemas";
import { effectiveLanguage } from "../catalog";
import { extractKeywords } from "./questions";
import { FILLERS } from "../speech";

/**
 * Offline heuristics used when no AI key is configured. They read real
 * signals from the transcript (length, filler words, hedging, structure,
 * keyword overlap) in both Uzbek and English. All feedback text is Uzbek.
 */

const HEDGES =
  /(?:^|[\s,.;!?])(i think|maybe|probably|i guess|not sure|i don't know|perhaps|might|menimcha|balki|ehtimol|bilmadim|shekilli|chamasi|aniq bilmayman|bo‘lsa kerak|deb o‘ylayman)(?=$|[\s,.;!?])/gi;
const STAR =
  /(situation|task|result|outcome|so that|as a result|which led|we achieved|i decided|my role|vaziyat|vazifam|natijada|natija|men qaror|mening rolim|erishdik|shuning uchun|oqibatda)/gi;
const NUMBERS = /\d+([.,]\d+)?\s?(%|foiz|percent|x|marta|times|users|foydalanuvchi|ms|soniya|seconds|soat|hours|kun|days|hafta|weeks|oy|months|kishi|people)?/gi;
const LINKERS =
  /(?:^|[\s,.;!?])(because|however|therefore|for example|for instance|first|second|finally|on the other hand|although|while|chunki|lekin|ammo|biroq|masalan|birinchidan|ikkinchidan|nihoyat|shuning uchun|boshqa tomondan|garchi|holbuki)(?=$|[\s,.;!?])/gi;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

interface Signals {
  wc: number;
  fillerRate: number;
  hedgeRate: number;
  star: number;
  numbers: number;
  linkers: number;
  keywordHits: number;
}

function signals(answer: string, keywords: string[]): Signals {
  const wc = words(answer);
  const lower = answer.toLowerCase();
  return {
    wc,
    fillerRate: wc ? count(answer, FILLERS) / wc : 0,
    hedgeRate: wc ? count(answer, HEDGES) / wc : 0,
    star: count(answer, STAR),
    numbers: count(answer, NUMBERS),
    linkers: count(answer, LINKERS),
    keywordHits: keywords.filter((k) => lower.includes(k.toLowerCase())).length,
  };
}

function lengthScore(wc: number) {
  if (wc === 0) return 0;
  if (wc < 15) return 20;
  if (wc < 40) return 45;
  if (wc < 80) return 65;
  if (wc <= 260) return 80;
  return 70; // rambling
}

function scoreAnswer(s: Signals, type: InterviewConfig["type"]) {
  if (s.wc === 0) return { communication: 0, technical: 0, confidence: 0, quality: 0 };
  const base = lengthScore(s.wc);
  const communication = base + s.linkers * 3 - s.fillerRate * 220;
  const technical =
    type === "technical"
      ? base - 10 + s.keywordHits * 8 + s.numbers * 3
      : type === "ielts"
        ? base - 5 + s.linkers * 4
        : base + s.star * 4 + s.numbers * 3 - 5;
  const confidence = base + 10 - s.hedgeRate * 300 - s.fillerRate * 150;
  const quality = base + s.star * 3 + s.numbers * 4 + s.linkers * 2 - (s.wc > 300 ? 10 : 0);
  return { communication: clamp(communication), technical: clamp(technical), confidence: clamp(confidence), quality: clamp(quality) };
}

function answerFeedback(s: Signals, type: InterviewConfig["type"]): string {
  if (s.wc === 0)
    return "Bu savolga javob yozib olinmadi, shuning uchun baholab bo‘lmaydi. Qisqa bo‘lsa ham samimiy urinish savolni o‘tkazib yuborishdan yaxshiroq.";
  const notes: string[] = [];
  if (s.wc < 40) notes.push(`Taxminan ${s.wc} so‘zli javob chuqurlikni ko‘rsatish uchun juda qisqa — 60–150 so‘zga intiling.`);
  else if (s.wc > 260) notes.push("Javob cho‘zilib ketdi: asosiy fikrdan boshlang va ortiqcha kirishni qisqartiring.");
  else notes.push("Og‘zaki javob uchun hajm juda mos.");
  if (s.fillerRate > 0.04) notes.push("“Ee”, “anu”, “xullas” kabi to‘ldiruvchi so‘zlar ko‘p uchradi va nutqni zaiflashtirdi.");
  if (s.hedgeRate > 0.03) notes.push("“Menimcha”, “balki” kabi iboralar ishonchsizlik taassurotini beradi — fikringizni to‘g‘ridan-to‘g‘ri ayting.");
  if (type === "behavioral" && s.star < 2) notes.push("STAR tuzilmasidan foydalaning: vaziyat, vazifa, sizning harakatingiz va aniq natija.");
  if (s.numbers === 0 && type !== "ielts") notes.push("Ta’sirni aniq ko‘rsatish uchun raqam yoki o‘lchanadigan natija qo‘shing.");
  if (s.linkers >= 3) notes.push("Bog‘lovchi so‘zlardan yaxshi foydalandingiz — tinglovchiga fikringizni kuzatish oson.");
  return notes.slice(0, 4).join(" ");
}

function betterAnswer(question: string, config: InterviewConfig, lang: InterviewLanguage): string {
  const q = question.replace(/^Part \d · /, "");
  if (config.type === "ielts") {
    return `Well, that's an interesting question. Personally, I'd say ${q.toLowerCase().startsWith("do") ? "yes, for the most part," : "it depends on the situation, but"} I've noticed it a lot in my own life. For instance, last year I… [a specific example]. On top of that, the main reason is that… [reason]. That said, not everyone would agree — some people feel… [contrast]. So overall, I'd say… [clear conclusion].`;
  }
  const behavioralQ = config.type === "behavioral" || /tell me about a time|describe a (time|situation)|give me an example|vaziyat|holat|misol keltiring|gapirib bering/i.test(q);
  if (lang === "uz") {
    return behavioralQ
      ? `Oldingi ishimda ${config.role} sifatida [vaziyat: bir gapda kontekst]. Mening vazifam [vazifa] edi. Avval [1-harakat], keyin [2-harakat] qildim — eng muhim qaror [nega] edi. Natijada [o‘lchanadigan natija, masalan “reliz vaqtini 30 foizga qisqartirdik”]. Bundan [xulosa]ni o‘rgandim va o‘shandan beri [qanday qo‘llayotganingiz].`
      : `Qisqa javobim — [bir gapda to‘g‘ridan-to‘g‘ri javob]. Sababi [asosiy mulohaza]. Masalan, ${config.role} sifatida [loyiha] ustida ishlaganimda [aniq harakat] qildim va bu [o‘lchanadigan natija]ga olib keldi. Yodda tutish kerak bo‘lgan cheklov — [cheklov], shuning uchun amalda [qanday muvozanat saqlaysiz]. Vaqt bo‘lsa, [keyingi qadam]ni ham qilardim.`;
  }
  return behavioralQ
    ? `In my last role as a ${config.role}, [situation: one sentence of context]. My responsibility was [task]. I started by [action 1], then [action 2] — the key decision was [why]. As a result, [measurable result, e.g. “we cut release time by 30%”]. What I took from it is [lesson], and I've applied that since by [follow-through].`
    : `My short answer is [direct answer in one sentence]. The reason is [core reasoning]. For example, when I was working on [project] as a ${config.role}, I [specific action] and it led to [measurable result]. The trade-off to keep in mind is [limitation], so in practice I [how you balance it]. If I had more time, I'd also [next step].`;
}

export function demoReport(config: InterviewConfig, items: AnsweredItem[]): GeneratedReport {
  const lang = effectiveLanguage(config.type, config.language);
  const keywords = extractKeywords(config.description, 10);
  const per = items.map((it) => {
    const s = signals(it.answer, keywords);
    const sc = scoreAnswer(s, config.type);
    return { it, s, sc, score: clamp((sc.communication + sc.technical + sc.confidence + sc.quality) / 4) };
  });

  const avg = (f: (p: (typeof per)[number]) => number) => clamp(per.reduce((t, p) => t + f(p), 0) / Math.max(1, per.length));
  const communication = avg((p) => p.sc.communication);
  const technical = avg((p) => p.sc.technical);
  const confidence = avg((p) => p.sc.confidence);
  const answerQuality = avg((p) => p.sc.quality);
  const overall = clamp(communication * 0.25 + technical * 0.3 + confidence * 0.2 + answerQuality * 0.25);

  const answered = per.filter((p) => p.s.wc > 0);
  const totalWords = answered.reduce((t, p) => t + p.s.wc, 0);
  const avgWords = answered.length ? Math.round(totalWords / answered.length) : 0;
  const fillerRate = totalWords ? per.reduce((t, p) => t + p.s.fillerRate * p.s.wc, 0) / totalWords : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const advice: string[] = [];

  if (answered.length === items.length) strengths.push("Hech bir savolni o‘tkazib yubormadingiz — bu xotirjamlikni ko‘rsatadi.");
  else weaknesses.push(`${items.length - answered.length} ta savol javobsiz qoldi.`);
  if (avgWords >= 60 && avgWords <= 220) strengths.push(`Javoblaringiz o‘rtacha ${avgWords} so‘zdan iborat — og‘zaki javob uchun yaxshi hajm.`);
  else if (avgWords > 0 && avgWords < 60) weaknesses.push(`Javoblaringiz o‘rtacha atigi ${avgWords} so‘z — bu yuzaki taassurot qoldiradi.`);
  if (fillerRate < 0.02 && totalWords > 0) strengths.push("To‘ldiruvchi so‘zlar kam bo‘ldi, nutqingiz toza eshitildi.");
  else if (fillerRate > 0.04) weaknesses.push("To‘ldiruvchi so‘zlar tez-tez uchradi va asosiy fikrlaringizni xiralashtirdi.");
  if (per.some((p) => p.s.numbers > 0)) strengths.push("Ba’zi fikrlaringizni raqamlar yoki aniq natijalar bilan asosladingiz.");
  else weaknesses.push("O‘lchanadigan natijalar yoki aniq tafsilotlar deyarli aytilmadi.");
  if (config.type === "technical" && keywords.length && per.some((p) => p.s.keywordHits > 0))
    strengths.push("Javoblaringizni lavozim uchun ko‘rsatilgan texnologiyalar bilan bog‘ladingiz.");
  if (per.some((p) => p.s.hedgeRate > 0.03)) weaknesses.push("“Menimcha”, “balki” kabi iboralar ishonchingizni pasaytirdi.");

  advice.push("Har bir javobni bitta aniq gap bilan boshlang, keyin uni dalillar bilan qo‘llab-quvvatlang.");
  if (config.type === "behavioral" || config.type === "hr")
    advice.push("Ko‘p savollarga moslashtirish mumkin bo‘lgan beshta STAR hikoyasini oldindan tayyorlang.");
  if (config.type === "technical") advice.push("Vakansiyadagi har bir texnologiya bo‘yicha u bilan hal qilgan bitta real muammoingizni tayyorlab qo‘ying.");
  if (config.type === "ielts") advice.push("Part 1 javoblarini 2–3 gapgacha kengaytiring va Part 2 kartochkalarida to‘liq 2 daqiqa gapirishni mashq qiling.");
  advice.push("O‘zingizni yozib oling, qayta tinglang va to‘ldiruvchi so‘zlarni qisqa pauza bilan almashtiring.");
  advice.push("Shu suhbatni qayta topshiring va eng zaif savolingizda natijani oshirishga harakat qiling.");

  if (!strengths.length) strengths.push("Suhbatni oxirigacha yakunladingiz — mashqning eng qiyin qismi boshlashdir.");
  if (!weaknesses.length) weaknesses.push("Kichik yutuqlarga e’tibor bering: aniqroq kirish va har javobda yana bitta raqam.");

  const band = (5 + (overall / 100) * 3.5).toFixed(1).replace(/\.(?:[1-4])$/, ".0").replace(/\.(?:[6-9])$/, ".5");
  const verdict =
    overall >= 75 ? "kuchli natija" : overall >= 55 ? "yaxshi poydevor, lekin o‘sish uchun aniq imkoniyat bor" : "boshlang‘ich daraja — ko‘proq mashq kerak";
  const best = (
    [
      ["muloqot", communication],
      [config.type === "ielts" ? "so‘z boyligi va grammatika" : "bilim", technical],
      ["ishonch", confidence],
      ["javob sifati", answerQuality],
    ] as const
  ).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  return {
    overall,
    communication,
    technical,
    confidence,
    answerQuality,
    summary:
      config.type === "ielts"
        ? `Bu ${verdict}, taxminan ${band} bandga to‘g‘ri keladi. Javoblaringizni kengaytirish va bog‘lovchi iboralarni boyitishga e’tibor qarating.`
        : `${config.role} suhbati uchun bu ${verdict}. Eng kuchli tomoningiz — ${best}; eng katta o‘sish aniqroq va tuzilmali misollardan keladi.`,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    advice: advice.slice(0, 5),
    questions: per.map((p) => ({
      questionId: p.it.questionId,
      score: p.score,
      feedback: answerFeedback(p.s, config.type),
      betterAnswer: betterAnswer(p.it.question, config, lang),
    })),
  };
}

export function demoFollowUp(config: InterviewConfig, question: string, answer: string): string | null {
  const lang = effectiveLanguage(config.type, config.language);
  const wc = words(answer);
  if (wc === 0 || (config.type === "ielts" && /^Part 2/.test(question))) return null;
  const uz = lang === "uz";
  if (wc < 25) return uz ? "Buni biroz kengaytirib bera olasizmi? Aniq bir misol bilan tushuntiring." : "Could you expand on that a little? Walk me through a specific example.";
  const s = signals(answer, extractKeywords(config.description, 10));
  if (s.numbers === 0 && config.type !== "ielts")
    return uz ? "Buning o‘lchanadigan natijasi qanday bo‘ldi? Aytib bera oladigan raqamlar bormi?" : "What was the measurable result of that? Any numbers you can share?";
  if (config.type === "behavioral" && s.star < 2)
    return uz ? "Bu vaziyatda aynan sizning rolingiz nima edi va oxiri qanday tugadi?" : "What exactly was your own role in that, and how did it turn out in the end?";
  if (config.type === "technical" && wc > 60)
    return uz ? "Bu yerda qanday muqobil yechimlarni ko‘rib chiqdingiz va bugun ham xuddi shunday tanlov qilarmidingiz?" : "What trade-offs did you consider there, and would you make the same choice today?";
  return null;
}
