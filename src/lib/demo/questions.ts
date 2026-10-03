import type { InterviewConfig, InterviewLanguage } from "../types";
import { effectiveLanguage } from "../catalog";

type Q = { text: string; hint: string };
type Bank = (c: InterviewConfig, lang: InterviewLanguage) => Q[];

/** Pulls likely technology / topic keywords out of a free-text description. */
export function extractKeywords(description: string, max = 6): string[] {
  const stop = new Set(
    "and or with the a an of for to in on using use experience years strong knowledge good e.g eg etc plus nice have va bilan masalan uchun yoki tajriba yaxshi bilish".split(
      " ",
    ),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of description.split(/[,;/\n|•·]+|\s+-\s+/)) {
    const k = raw.trim().replace(/^[-*\d.)\s]+/, "").replace(/[.:]+$/, "").replace(/^masalan\s*:?\s*/i, "");
    if (!k || k.length > 28 || stop.has(k.toLowerCase())) continue;
    const cleaned = k
      .split(/\s+/)
      .filter((w) => !stop.has(w.toLowerCase()))
      .join(" ");
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}

const technical: Bank = (c, lang) => {
  const kw = extractKeywords(c.description);
  const senior = c.level === "senior" || c.level === "lead";
  if (lang === "uz") {
    const [a = "asosiy dasturlash tilingiz", b = "ishlatadigan freymvorkingiz", d = "eng ko‘p ishlatadigan vositalaringiz"] = kw;
    return [
      { text: `Boshlanishiga, ${c.role} sifatida ishlagan so‘nggi loyihangiz haqida gapirib bering. Unda sizning vazifangiz nima edi va nimadan eng ko‘p faxrlanasiz?`, hint: "Loyiha ko‘lami, shaxsiy hissangiz va o‘lchanadigan natija." },
      { text: `${a} bo‘yicha asosiy tushunchalarni boshqa vositalardan kelgan yangi hamkasbingizga qanday tushuntirgan bo‘lardingiz?`, hint: "Aniq tushuncha, asosiy g‘oyalar va kichik misol." },
      { text: "Uzoq qidirgan murakkab xatoyingiz haqida gapirib bering. Uni qanday topdingiz va qayta takrorlanmasligi uchun nima qildingiz?", hint: "Tizimli qidiruv qadamlari, asl sabab va oldini olish choralari." },
      { text: `${b} bilan ishlaganda qanday unumdorlik muammolariga duch kelgansiz va ularni qanday topib, tuzatasiz?`, hint: "Avval o‘lchash, aniq muammolar va yechimlarning afzallik-kamchiliklari." },
      { text: `${d} bilan funksiya yozayotganda nimani va qaysi darajada test qilishni qanday hal qilasiz?`, hint: "Test piramidasi, xavfga asoslangan tanlov, qo‘llab-quvvatlanadigan testlar." },
      senior
        ? { text: "Tasavvur qiling, asosiy servisga yuklama uch oyda o‘n barobar oshadi. Tizimni va jamoani bunga qanday tayyorlaysiz?", hint: "Talablar, komponentlar, kengaytirish va jamoa jarayonlari." }
        : { text: "Oddiy havola qisqartiruvchi servisni loyihalashingiz kerak bo‘lsa, qaysi qismlardan boshlaysiz va nimalarni saqlaysiz?", hint: "Avval talablar, keyin komponentlar, ma’lumotlar modeli va kengaytirish." },
      { text: "Bir kod bazasida bir nechta odam ishlaganda kodni o‘qishga oson va xavfsiz o‘zgartiriladigan holda qanday saqlaysiz?", hint: "Code review, kelishuvlar, tiplar, kichik PR va hujjatlar." },
      { text: "Siz rozi bo‘lmagan texnik qaror haqida gapirib bering. Bu vaziyatda o‘zingizni qanday tutdingiz?", hint: "Hurmat bilan e’tiroz, fikr emas dalil, qarordan keyin unga sodiq qolish." },
      { text: `${kw[3] ?? a} yoki umuman sohada siz uchun muhim bo‘lgan so‘nggi o‘zgarish qaysi va nega?`, hint: "Haqiqiy qiziqish, sababini tushunish va amaliy ta’sir." },
      { text: `Va nihoyat, ${c.role} lavozimidagi dastlabki olti oyda nimani o‘rganish yoki yaxshilashni xohlaysiz?`, hint: "O‘zini anglash va lavozimga bog‘langan real maqsadlar." },
    ];
  }
  const [a = "your main language", b = "your framework of choice", d = "the tools you use most"] = kw;
  return [
    { text: `To start, walk me through a recent project where you worked as a ${c.role}. What was your part, and what are you most proud of?`, hint: "Loyiha ko‘lami, shaxsiy hissangiz va o‘lchanadigan natija." },
    { text: `How would you explain the core ideas of ${a} to a new teammate who has only used other tools?`, hint: "Aniq tushuncha, asosiy g‘oyalar va kichik misol." },
    { text: "Tell me about a hard bug you hunted down. How did you narrow it down, and what did you change so it would not happen again?", hint: "Tizimli qidiruv qadamlari, asl sabab va oldini olish." },
    { text: `When you work with ${b}, what are the most common performance problems you have seen, and how do you find and fix them?`, hint: "Avval o‘lchash, aniq muammolar, yechimlarning afzallik-kamchiliklari." },
    { text: `How do you decide what to test, and at which level, for a feature you are building with ${d}?`, hint: "Test piramidasi va xavfga asoslangan tanlov." },
    senior
      ? { text: "Imagine traffic to a key service grows ten times in three months. How would you prepare the system and the team?", hint: "Talablar, komponentlar, kengaytirish va jamoa." }
      : { text: "If you had to design a simple URL shortener, which parts would you build first, and what would you store?", hint: "Talablar, komponentlar, ma’lumotlar modeli." },
    { text: "How do you keep code readable and safe to change when several people work on the same codebase?", hint: "Code review, kelishuvlar, tiplar, kichik PR." },
    { text: "Describe a technical decision you disagreed with. How did you handle it?", hint: "Hurmat bilan e’tiroz va dalillar." },
    { text: `What is a recent change in ${kw[3] ?? a} or the wider ecosystem that you find important, and why?`, hint: "Qiziqish va amaliy ta’sir." },
    { text: `Finally, what would you want to learn or improve in your first six months in this ${c.role} role?`, hint: "Real va lavozimga mos maqsadlar." },
  ];
};

const behavioral: Bank = (c, lang) =>
  lang === "uz"
    ? [
        { text: `O‘zingiz haqingizda qisqacha gapirib bering. Nega aynan ${c.role} lavozimiga topshirdingiz?`, hint: "Ikki daqiqalik aniq hikoya, oxirida nega aynan shu lavozim." },
        { text: "Muhim ishni juda qisqa muddatda topshirishingizga to‘g‘ri kelgan vaziyat haqida gapirib bering. Nima qildingiz?", hint: "STAR: vaziyat, vazifa, harakatlaringiz va o‘lchanadigan natija." },
        { text: "Hamkasbingiz yoki rahbaringiz bilan kelishmovchilik bo‘lgan holatni tasvirlab bering. Uni qanday hal qildingiz?", hint: "Hamdardlik, ochiq suhbat va munosabatlar uchun natija." },
        { text: "Xato qilgan yoki muvaffaqiyatsizlikka uchragan paytingiz haqida gapirib bering. Undan nima o‘rgandingiz?", hint: "Boshqalarni ayblamasdan mas’uliyatni olish va aniq xulosa." },
        { text: "Hech kim shug‘ullanmayotgan muammoni o‘z zimmangizga olgan holatga misol keltiring.", hint: "Tashabbus, boshqalarni qanday jalb qilganingiz va ta’siri." },
        { text: "Rahbarlik vakolatingiz bo‘lmasa ham, kimningdir fikrini o‘zgartirishingiz kerak bo‘lgan vaziyatni tasvirlab bering.", hint: "Uning maqsadlarini tushunish, dalillar va murosa." },
        { text: "Bir vaqtning o‘zida juda ko‘p ustuvor vazifa bo‘lgan paytni eslang. Qaysi birini qoldirishni qanday hal qildingiz?", hint: "Aniq mezon va manfaatdor tomonlar bilan muloqot." },
        { text: "Qachon qattiq tanqid eshitgansiz va undan keyin nima qildingiz?", hint: "Ochiqlik, xulq-atvordagi aniq o‘zgarish." },
        { text: "Jamoadoshingizning o‘sishiga yoki muvaffaqiyatiga yordam bergan holatingiz haqida gapirib bering.", hint: "Murabbiylik yondashuvi va ko‘rinadigan natija." },
        { text: `Karyerangizdagi qaysi yutuq sizning ${c.role} sifatida qanday ishlashingizni eng yaxshi ko‘rsatadi?`, hint: "Eng mos yutuqni tanlang va uni lavozimga bog‘lang." },
      ]
    : [
        { text: `Tell me a little about yourself and what led you to apply for a ${c.role} position.`, hint: "Ikki daqiqalik aniq hikoya." },
        { text: "Tell me about a time you had to deliver something important under a tight deadline. What did you do?", hint: "STAR: vaziyat, vazifa, harakat, natija." },
        { text: "Describe a conflict with a colleague or stakeholder. How did you resolve it?", hint: "Hamdardlik va ochiq suhbat." },
        { text: "Tell me about a time you failed or made a significant mistake. What did you learn?", hint: "Mas’uliyat va aniq xulosa." },
        { text: "Give me an example of when you took ownership of a problem nobody else was handling.", hint: "Tashabbus va ta’sir." },
        { text: "Describe a situation where you had to change someone's mind without having authority over them.", hint: "Dalillar va murosa." },
        { text: "Tell me about a time you had too many priorities at once. How did you decide what to drop?", hint: "Aniq mezon va muloqot." },
        { text: "When did you receive tough feedback, and what did you do with it?", hint: "Ochiqlik va aniq o‘zgarish." },
        { text: "Tell me about a time you helped a teammate grow or succeed.", hint: "Murabbiylik va natija." },
        { text: `Which achievement from your career best shows how you would perform as a ${c.role}?`, hint: "Eng mos yutuqni lavozimga bog‘lang." },
      ];

const hr: Bank = (c, lang) =>
  lang === "uz"
    ? [
        { text: "O‘zingizni va tajribangizni qisqacha tanishtirib bera olasizmi?", hint: "Qisqa, lavozimga oid va hozir nimani izlayotganingiz bilan yakunlang." },
        { text: `Nega aynan shu ${c.role} lavozimi va bizning kompaniyamiz sizni qiziqtirdi?`, hint: "Umumiy maqtov emas, kompaniyaga bog‘liq aniq sabablar." },
        { text: "Hozirgi yoki oldingi ish joyingizdan nega ketmoqchisiz yoki nega ketgansiz?", hint: "Shikoyat emas, o‘sishga qaratilgan ijobiy talqin." },
        { text: "Qanday ish muhitida eng yaxshi natija ko‘rsatasiz?", hint: "Kompaniya madaniyatiga mos, samimiy afzalliklar." },
        { text: "Bu lavozim uchun qancha maosh kutyapsiz?", hint: "O‘rganilgan oraliq, moslashuvchanlik va umumiy paket." },
        { text: "Uch-besh yildan keyin o‘zingizni qayerda ko‘rasiz?", hint: "Shu kompaniyada o‘sish bilan mos keladigan ambitsiya." },
        { text: "Oldingi rahbaringiz sizning eng kuchli tomoningiz va eng ko‘p yaxshilash kerak bo‘lgan tomoningiz haqida nima deydi?", hint: "Dalilli kuchli tomon va reja bilan haqiqiy zaif tomon." },
        { text: "Ishdagi stress va bosimni qanday yengasiz?", hint: "Aniq odatlar va qisqa misol." },
        { text: "Bir vaqtda ikkita taklif olsangiz, qaysi birini qanday tanlaysiz?", hint: "Qaror mezonlaringiz va qadriyatlaringiz." },
        { text: "Lavozim yoki jamoa haqida bizga savollaringiz bormi?", hint: "O‘ylangan savollar haqiqiy qiziqishni ko‘rsatadi." },
      ]
    : [
        { text: "Can you briefly introduce yourself and your background?", hint: "Qisqa va lavozimga oid." },
        { text: `Why are you interested in this ${c.role} role, and in our company in particular?`, hint: "Kompaniyaga bog‘liq aniq sabablar." },
        { text: "Why are you leaving, or why did you leave, your current or last position?", hint: "Ijobiy talqin, o‘sishga e’tibor." },
        { text: "What kind of work environment helps you do your best work?", hint: "Samimiy va madaniyatga mos." },
        { text: "What are your salary expectations for this role?", hint: "O‘rganilgan oraliq va moslashuvchanlik." },
        { text: "Where do you see yourself in three to five years?", hint: "Kompaniyada o‘sish bilan mos ambitsiya." },
        { text: "What would your previous manager say is your greatest strength and your biggest area to improve?", hint: "Dalilli kuchli va haqiqiy zaif tomon." },
        { text: "How do you handle stress or pressure at work?", hint: "Aniq odatlar va misol." },
        { text: "If you received two offers at the same time, how would you decide?", hint: "Qaror mezonlari." },
        { text: "Do you have any questions for us about the role or the team?", hint: "O‘ylangan savollar." },
      ];

const ielts: Bank = (c) => {
  const topic = extractKeywords(c.description, 1)[0]?.toLowerCase() ?? "technology";
  return [
    { text: "Part 1 · Let's talk about where you live. Do you live in a house or an apartment, and what do you like about it?", hint: "Bir so‘z bilan emas — sabab va tafsilot qo‘shib javob bering." },
    { text: "Part 1 · How do you usually spend your weekends?", hint: "Turli zamonlar va takrorlanish iboralaridan foydalaning." },
    { text: `Part 1 · How important is ${topic} in your daily life?`, hint: "To‘g‘ridan-to‘g‘ri javob bering, keyin misol qo‘shing." },
    { text: "Part 1 · Do you prefer reading books or watching films? Why?", hint: "Bog‘lovchi so‘zlar bilan ikkalasini solishtiring." },
    { text: `Part 2 · Describe a memorable experience you had related to ${topic}. You should say what happened, when and where it was, who you were with, and explain why it was memorable.`, hint: "1–2 daqiqa gapiring, bandlarni tartib bilan yoriting." },
    { text: `Part 3 · How has ${topic} changed in your country over the last twenty years?`, hint: "Umumiy fikr, misol va oqibat." },
    { text: `Part 3 · Do older and younger people in your country feel differently about ${topic}? Why?`, hint: "Ikki tomonni muvozanat bilan ko‘rib chiqing." },
    { text: `Part 3 · What problems related to ${topic} might society face in the future?`, hint: "Kelasi zamon shakllari va aniq xulosa." },
    { text: `Part 3 · Should governments do more to influence ${topic}? Why or why not?`, hint: "Fikr bildiring, asoslang, qarshi fikrni ham ko‘ring." },
    { text: `Part 3 · Should schools teach young people more about ${topic}?`, hint: "Misollar bilan mavhum mulohaza." },
  ];
};

const custom: Bank = (c, lang) => {
  const focus = c.description.trim() || c.role;
  const short = focus.length > 80 ? `${focus.slice(0, 77).trim()}…` : focus;
  return lang === "uz"
    ? [
        { text: `Boshlaymiz. Tajribangiz va uning ${c.role} bilan qanday bog‘liqligi haqida gapirib bering.`, hint: "Ikki daqiqadan oshmagan, mavzuga oid tajriba." },
        { text: `Siz “${short}” mavzusiga e’tibor qaratmoqchisiz. Sizningcha, bunda eng qiyin qism nima?`, hint: "Asosiy muammoni tushunganingizni ko‘rsating." },
        { text: "Bunga noldan boshlab, birinchi haftada qanday yondashardingiz?", hint: "Tuzilma: aniqlashtirish, rejalash, bajarish, o‘lchash." },
        { text: "Bu yerda muhim qaror qabul qilishdan oldin qanday ma’lumotlar kerak bo‘ladi?", hint: "Ma’lumotlar, manfaatdor tomonlar, cheklovlar." },
        { text: "Sizni shunday vazifaga tayyorlagan oldingi tajribangiz haqida gapirib bering.", hint: "STAR usuli va aniq natija." },
        { text: "Eng katta xavflar nimada va ularni qanday kamaytirasiz?", hint: "Ustuvorlik bo‘yicha xavflar va aniq choralar." },
        { text: "Muvaffaqiyatga erishganingizni qanday bilasiz? Qaysi ko‘rsatkichlarni kuzatasiz?", hint: "Aniq va o‘lchanadigan natijalar." },
        { text: "Agar birinchi rejangiz aniq muvaffaqiyatsiz bo‘lsa, keyin nima qilasiz?", hint: "Moslashuvchanlik va o‘rganish sikli." },
        { text: "Kimlar bilan ishlashingiz kerak bo‘ladi va ularni qanday qilib bir yo‘nalishda ushlab turasiz?", hint: "Muloqot ritmi va mas’uliyat taqsimoti." },
        { text: "Tajribangizning biz hali gaplashmagan, lekin bu yerda muhim bo‘lgan jihati bormi?", hint: "Eng kuchli fikringiz bilan yakunlang." },
      ]
    : [
        { text: `Let's begin. Tell me about your background and how it relates to ${c.role}.`, hint: "Mavzuga oid qisqa tajriba." },
        { text: `You said you want to focus on: ${short}. What do you think is the hardest part of that?`, hint: "Asosiy muammoni ko‘rsating." },
        { text: "Walk me through how you would approach this from scratch in your first week.", hint: "Aniqlashtirish, rejalash, bajarish, o‘lchash." },
        { text: "What information would you need before making any important decision here?", hint: "Ma’lumotlar va cheklovlar." },
        { text: "Tell me about a past experience that prepared you for this kind of challenge.", hint: "STAR va natija." },
        { text: "What are the biggest risks, and how would you reduce them?", hint: "Xavflar va choralar." },
        { text: "How would you know you had succeeded? Which metrics would you track?", hint: "O‘lchanadigan natijalar." },
        { text: "If your first plan clearly failed, what would you do next?", hint: "Moslashuvchanlik." },
        { text: "Who would you need to work with, and how would you keep them aligned?", hint: "Muloqot va mas’uliyat." },
        { text: "Is there anything about your experience we have not covered that matters here?", hint: "Kuchli yakun." },
      ];
};

const pick = <T,>(arr: T[], n: number) => arr.slice(0, Math.max(0, n));

export function demoQuestions(config: InterviewConfig): Q[] {
  // Focus topics steer the offline bank the same way the free-text details do.
  const c = { ...config, description: [config.description, ...(config.focus ?? [])].filter(Boolean).join(", ") };
  const lang = effectiveLanguage(c.type, c.language);
  const bank = { technical, behavioral, hr, ielts, custom }[c.type](c, lang);
  if (c.type === "ielts") {
    // Keep the Part 1 → 2 → 3 arc whatever the count.
    const n = c.questionCount;
    const p1n = Math.max(2, Math.min(4, n - 1 - Math.ceil((n - 1) / 2)));
    return [...pick(bank.slice(0, 4), p1n), bank[4], ...pick(bank.slice(5), n - 1 - p1n)];
  }
  return pick(bank, c.questionCount);
}
