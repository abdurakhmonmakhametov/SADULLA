import type { InterviewLanguage, InterviewType } from "./types";

export interface BankQuestion {
  id: string;
  q: string;
  tip: string;
}

export interface BankCategory {
  id: string;
  label: string;
  blurb: string;
  lang: InterviewLanguage;
  /** Interview type to use when starting a full interview from this category. */
  type: InterviewType;
  questions: BankQuestion[];
}

export const QUESTION_BANK: BankCategory[] = [
  {
    id: "general",
    label: "Umumiy savollar",
    blurb: "Deyarli har bir suhbatda so‘raladi.",
    lang: "uz",
    type: "hr",
    questions: [
      { id: "g1", q: "O‘zingiz haqingizda gapirib bering.", tip: "Hozir → o‘tmish → kelajak: 60–90 soniya, oxirida nega aynan shu lavozim." },
      { id: "g2", q: "Nega aynan bizning kompaniyamizni tanladingiz?", tip: "Kompaniyaning mahsuloti, qadriyatlari yoki yangiliklariga aniq bog‘lang." },
      { id: "g3", q: "Kuchli tomonlaringiz qaysilar?", tip: "2 ta kuchli tomon + har biriga qisqa, raqamli misol." },
      { id: "g4", q: "Zaif tomoningiz nima?", tip: "Haqiqiy kamchilik va uni yengish uchun hozir nima qilayotganingiz." },
      { id: "g5", q: "5 yildan keyin o‘zingizni qayerda ko‘rasiz?", tip: "Lavozim bilan bog‘liq o‘sish rejasi; ambitsiya, lekin real." },
      { id: "g6", q: "Nega oldingi ish joyingizdan ketyapsiz?", tip: "Ijobiy ohang: o‘sish, yangi imkoniyat. Oldingi ish beruvchini yomonlamang." },
      { id: "g7", q: "Nega sizni ishga olishimiz kerak?", tip: "Vakansiya talablari + sizning 2–3 ta mos yutug‘ingiz." },
      { id: "g8", q: "Eng katta yutug‘ingiz nima?", tip: "STAR bilan, natijani raqamda ko‘rsating." },
    ],
  },
  {
    id: "behavioral",
    label: "Xulq-atvor (STAR)",
    blurb: "“Bir vaziyatni aytib bering…” turidagi savollar.",
    lang: "uz",
    type: "behavioral",
    questions: [
      { id: "b1", q: "Jamoadoshingiz bilan kelishmovchilik bo‘lgan vaziyatni aytib bering.", tip: "Nizo emas, uni qanday hal qilganingiz va munosabat qanday saqlanganiga urg‘u bering." },
      { id: "b2", q: "Muvaffaqiyatsizlikka uchragan holatingiz va undan nima o‘rganganingizni aytib bering.", tip: "Mas’uliyatni o‘z zimmangizga oling, xulosa va keyingi safar nima o‘zgarganini ayting." },
      { id: "b3", q: "Qisqa muddatda katta hajmdagi ishni bajarishga to‘g‘ri kelgan vaziyatni tasvirlab bering.", tip: "Ustuvorliklarni qanday belgilaganingiz va natija." },
      { id: "b4", q: "Tashabbus ko‘rsatib, o‘zingizga topshirilmagan muammoni hal qilgan holatingiz bormi?", tip: "Muammoni qanday payqadingiz, kimni jalb qildingiz, qanday natija." },
      { id: "b5", q: "Qiyin mijoz yoki rahbar bilan ishlagan vaziyatni aytib bering.", tip: "Xotirjamlik, tinglash, kelishuvga erishish qadamlari." },
      { id: "b6", q: "Jamoani yoki loyihani boshqargan holatingiz haqida gapiring.", tip: "Maqsad, rollarni taqsimlash, to‘siqlar va yakuniy natija." },
      { id: "b7", q: "Fikringizni o‘zgartirishga to‘g‘ri kelgan vaziyat bo‘lganmi?", tip: "Yangi ma’lumotga ochiqlik va qaror qabul qilish jarayoni." },
    ],
  },
  {
    id: "hr",
    label: "HR va maosh",
    blurb: "Motivatsiya, kutilmalar va ish sharoitlari.",
    lang: "uz",
    type: "hr",
    questions: [
      { id: "h1", q: "Maosh bo‘yicha kutilmalaringiz qanday?", tip: "Bozorni o‘rganib, oraliq ayting; umumiy paketni ham muhokama qiling." },
      { id: "h2", q: "Qachon ishga chiqa olasiz?", tip: "Aniq sana va hozirgi ishdagi majburiyatlaringizni hurmat qilishingizni ko‘rsating." },
      { id: "h3", q: "Bosim ostida qanday ishlaysiz?", tip: "Aniq misol + stressni boshqarish usulingiz." },
      { id: "h4", q: "Qanday ish muhitida eng samarali ishlaysiz?", tip: "Kompaniya madaniyatiga mos, lekin samimiy javob." },
      { id: "h5", q: "Boshqa kompaniyalarda ham suhbatdan o‘tyapsizmi?", tip: "Halol, qisqa; shu kompaniyaga qiziqishingiz ustunligini ta’kidlang." },
      { id: "h6", q: "Masofaviy ishlash haqida qanday fikrdasiz?", tip: "Moslashuvchanlik va o‘zingizni qanday tashkil qilishingiz." },
    ],
  },
  {
    id: "frontend",
    label: "Texnik — Frontend",
    blurb: "JavaScript, React, brauzer va samaradorlik.",
    lang: "uz",
    type: "technical",
    questions: [
      { id: "f1", q: "JavaScript’da “closure” nima va undan qayerda foydalanasiz?", tip: "Ta’rif + amaliy misol (masalan, debounce yoki private o‘zgaruvchi)." },
      { id: "f2", q: "React’da “state” va “props” farqini tushuntiring.", tip: "Kim egalik qiladi, qanday o‘zgaradi, qachon qayta render bo‘ladi." },
      { id: "f3", q: "useEffect qachon ishlaydi va qanday xatolarga yo‘l qo‘yiladi?", tip: "Bog‘liqliklar massivi, tozalash funksiyasi, cheksiz sikl." },
      { id: "f4", q: "Sahifa sekin yuklansa, uni qanday tezlashtirasiz?", tip: "O‘lchash (Lighthouse) → rasm, bundle, kesh, lazy loading." },
      { id: "f5", q: "REST va GraphQL o‘rtasidagi farq nima?", tip: "So‘rovlar soni, ortiqcha ma’lumot, kesh va murakkablik bo‘yicha taqqoslang." },
      { id: "f6", q: "Saytni turli ekranlarga moslashtirishda qanday yondashasiz?", tip: "Mobile-first, flex/grid, breakpointlar, test qilish." },
      { id: "f7", q: "Brauzerda event loop qanday ishlaydi?", tip: "Call stack, microtask va macrotask navbatlari, misol bilan." },
    ],
  },
  {
    id: "backend",
    label: "Texnik — Backend",
    blurb: "API, ma’lumotlar bazasi va tizim dizayni.",
    lang: "uz",
    type: "technical",
    questions: [
      { id: "k1", q: "SQL va NoSQL ma’lumotlar bazalari qachon ishlatiladi?", tip: "Ma’lumot tuzilmasi, tranzaksiyalar, masshtablash bo‘yicha misollar." },
      { id: "k2", q: "Indeks nima va u qachon zarar keltirishi mumkin?", tip: "O‘qishni tezlashtiradi, yozishni sekinlashtiradi, xotira." },
      { id: "k3", q: "API’ni qanday xavfsiz qilasiz?", tip: "Autentifikatsiya, avtorizatsiya, rate limit, validatsiya, HTTPS." },
      { id: "k4", q: "Ko‘p foydalanuvchi bir vaqtda kirganda tizimni qanday masshtablaysiz?", tip: "Kesh, navbatlar, gorizontal masshtablash, ma’lumotlar bazasi replikasi." },
      { id: "k5", q: "Tranzaksiya va ACID tamoyillarini tushuntiring.", tip: "Har bir harf + bank o‘tkazmasi misoli." },
      { id: "k6", q: "URL qisqartiruvchi xizmatni qanday loyihalaysiz?", tip: "Talablar → API → ID generatsiya → saqlash → kesh → masshtab." },
    ],
  },
  {
    id: "ielts",
    label: "IELTS Speaking",
    blurb: "Part 1, 2 va 3 uchun namunaviy savollar.",
    lang: "en",
    type: "ielts",
    questions: [
      { id: "i1", q: "Do you work or are you a student?", tip: "Part 1: 2–3 gap, sabab yoki tafsilot qo‘shing." },
      { id: "i2", q: "What do you like most about your hometown?", tip: "Part 1: aniq misol va shaxsiy fikr." },
      { id: "i3", q: "How often do you use social media?", tip: "Part 1: chastota iboralari (once in a while, on a daily basis)." },
      { id: "i4", q: "Describe a book you recently read. You should say what it was, why you read it, what it was about and explain how you felt about it.", tip: "Part 2: barcha bandlarni qamrang, 2 daqiqa gapiring." },
      { id: "i5", q: "Describe a person who has influenced you. You should say who they are, how you know them, what they did and explain why they influenced you.", tip: "Part 2: hikoya + his-tuyg‘ular, o‘tgan zamonlar xilma-xilligi." },
      { id: "i6", q: "Do you think technology makes people less social?", tip: "Part 3: fikr + sabab + qarama-qarshi nuqtai nazar." },
      { id: "i7", q: "How has education changed in your country in recent years?", tip: "Part 3: taqqoslash va kelajak haqida taxmin." },
    ],
  },
  {
    id: "ask",
    label: "Ish beruvchiga savollar",
    blurb: "Suhbat oxirida siz beradigan savollar.",
    lang: "uz",
    type: "hr",
    questions: [
      { id: "a1", q: "Bu lavozimda birinchi 3 oyda muvaffaqiyat qanday ko‘rinadi?", tip: "Kutilmalarni aniqlaydi va jiddiyligingizni ko‘rsatadi." },
      { id: "a2", q: "Jamoa hozir qanday eng katta muammo ustida ishlayapti?", tip: "Javobga qarab o‘zingiz qanday yordam bera olishingizni ayting." },
      { id: "a3", q: "Bu lavozimda o‘sish yo‘li qanday?", tip: "Uzoq muddatli qiziqishingizni bildiradi." },
      { id: "a4", q: "Keyingi bosqichlar qanday bo‘ladi?", tip: "Har doim oxirida so‘rang." },
    ],
  },
];

export const BANK_TOTAL = QUESTION_BANK.reduce((n, c) => n + c.questions.length, 0);

const DONE_KEY = "suhbatdosh.bank.done";

export function readDone(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveDone(ids: string[]) {
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
