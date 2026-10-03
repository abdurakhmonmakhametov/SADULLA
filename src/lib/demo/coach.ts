/**
 * Built-in coaching playbook used when no AI provider is connected.
 * Matches the question against common interview topics.
 */

const TOPICS: { match: RegExp; answer: string }[] = [
  {
    match: /star|vaziyat|situation|xulq|behavio/i,
    answer: `**STAR usuli** — xulq-atvor savollariga eng ishonchli javob tuzilmasi:

- **S — Vaziyat:** qayerda, qachon, qanday kontekst (1–2 gap).
- **T — Vazifa:** sizning aniq mas’uliyatingiz nima edi.
- **A — Harakat:** *siz* nima qildingiz — “biz” emas, “men” deb gapiring. Bu eng uzun qism bo‘lsin.
- **R — Natija:** raqam bilan: “muddatni 2 haftaga qisqartirdik”, “mijozlar shikoyati 30% kamaydi”.

Maslahat: oldindan 5–6 ta hikoya tayyorlang (muvaffaqiyat, xato, nizo, liderlik, bosim ostida ishlash) — ular ko‘p savolga mos keladi.`,
  },
  {
    match: /o.zim haqimda|o.zingiz haqingizda|about yourself|tanishtir|introduce/i,
    answer: `**“O‘zingiz haqingizda gapirib bering”** — 60–90 soniyalik “hozir → o‘tmish → kelajak” formulasi:

- **Hozir:** hozirgi rolingiz va eng kuchli tomoningiz (bitta raqamli yutuq bilan).
- **O‘tmish:** shu lavozimga olib kelgan 1–2 muhim tajriba.
- **Kelajak:** nega aynan shu kompaniya va lavozim — ularning ishiga bog‘lang.

Qilmang: tug‘ilgan joydan boshlab tarjimai hol aytish, rezyumeni so‘zma-so‘z o‘qish.`,
  },
  {
    match: /maosh|oylik|salary|pul|compensation|kutilma/i,
    answer: `**Maosh haqida gaplashish:**

- Oldindan bozorni o‘rganing (hh.uz, LinkedIn, tanishlar) va **oraliq** belgilang.
- Birinchi raqamni aytishga shoshilmang: “Lavozim mas’uliyatlarini to‘liq tushunib olsam, aniq raqam aytaman. Siz bu lavozimga qanday byudjet rejalashtirgansiz?”
- So‘rashsa, oraliqni ayting va pastki chegarani o‘zingiz rozi bo‘ladigan darajadan biroz yuqori qo‘ying.
- Faqat oylik emas: bonus, masofaviy ish, o‘qish uchun byudjet, sug‘urta ham muhokama qilinadi.`,
  },
  {
    match: /zaif|kamchilik|weakness|salbiy/i,
    answer: `**“Zaif tomoningiz nima?”**

- Haqiqiy, lekin lavozim uchun halokatli bo‘lmagan kamchilikni tanlang.
- Uni yengish uchun **nima qilayotganingizni** ayting — bu javobning asosiy qismi.
- Misol: “Avvallari vazifalarni boshqalarga topshirishga qiynalardim. Endi har hafta jamoa bilan vazifalarni taqsimlaymiz, natijada men muhim ishlarga ko‘proq vaqt ajrataman.”

Qilmang: “Men perfeksionistman” kabi yashirin maqtov — suhbatdoshlar buni darhol sezadi.`,
  },
  {
    match: /savol(lar)? ber|questions? (to )?ask|oxirida|yakunida/i,
    answer: `**Suhbat oxirida beriladigan yaxshi savollar:**

- “Bu lavozimda birinchi 3 oyda muvaffaqiyat qanday ko‘rinadi?”
- “Jamoa hozir qanday eng katta muammo ustida ishlayapti?”
- “Bu lavozimdagi oldingi xodim qayerga o‘sdi?”
- “Keyingi bosqichlar qanday bo‘ladi?”

“Savolim yo‘q” demang — bu qiziqish yo‘qligi kabi qabul qilinadi.`,
  },
  {
    match: /hayajon|qo.rq|stress|asabiy|nervous|anxi/i,
    answer: `**Hayajonni boshqarish:**

- Suhbatdan oldin 3–4 marta ovoz chiqarib mashq qiling — Suhbatdoshdagi mashqlar aynan shu uchun.
- Javobdan oldin 2 soniya pauza qilish normal: “Yaxshi savol, bir o‘ylab olay.”
- Sekinroq gapiring: daqiqasiga 110–160 so‘z ideal.
- Nafas: 4 soniya nafas oling, 4 soniya ushlang, 6 soniya chiqaring.`,
  },
  {
    match: /ielts|band|speaking|part [123]/i,
    answer: `**IELTS Speaking maslahatlari:**

- **Part 1:** 2–3 gaplik javob + sabab yoki misol. Juda qisqa “Yes, I do” yetarli emas.
- **Part 2:** 1 daqiqalik tayyorgarlikda kalit so‘zlarni yozing; har bir bandni qamrab, 2 daqiqa gapiring.
- **Part 3:** fikr bildiring, sabab keltiring, qarama-qarshi tomonni ham tilga oling.
- Band uchun: ravonlik, so‘z boyligi (idiomalar o‘rinli bo‘lsa), grammatik xilma-xillik va talaffuz baholanadi.`,
  },
  {
    match: /rezyume|cv|resume|portfolio/i,
    answer: `**Rezyume bo‘yicha qisqa maslahat:**

- 1 sahifa (tajriba 10 yildan kam bo‘lsa).
- Har bir ish joyida 3–4 ta natija: “nima qildim → qanday natija (raqam)”.
- Vakansiyadagi kalit so‘zlarni rezyumega moslang.
- Havola: GitHub / portfolio / LinkedIn.`,
  },
];

export function offlineCoach(question: string): string {
  const hit = TOPICS.find((t) => t.match.test(question));
  if (hit) return hit.answer;
  return `Hozir oflayn rejimdaman, shuning uchun faqat tayyor mavzular bo‘yicha yordam bera olaman:

- STAR usuli va xulq-atvor savollari
- “O‘zingiz haqingizda gapirib bering”
- Zaif tomonlar, maosh haqida gaplashish
- Suhbat oxirida beriladigan savollar
- Hayajonni boshqarish, IELTS Speaking, rezyume

Istalgan savolga to‘liq javob olish uchun **Sozlamalar → Sun’iy intellekt** bo‘limida bepul AI kalitini ulang (masalan, Google Gemini yoki Groq).`;
}
