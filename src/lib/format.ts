const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Bugun, ${hhmm(d)}`;
  if (new Date(today.getTime() - 86_400_000).toDateString() === d.toDateString()) return `Kecha, ${hhmm(d)}`;
  const base = `${d.getDate()}-${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function scoreTone(score: number): "good" | "warn" | "bad" {
  return score >= 70 ? "good" : score >= 50 ? "warn" : "bad";
}

export function scoreLabel(score: number): string {
  if (score >= 85) return "A’lo";
  if (score >= 70) return "Kuchli";
  if (score >= 50) return "O‘rtacha";
  if (score >= 25) return "Mashq kerak";
  return "Baholanmadi";
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** "Aziz Karimov" → "AK" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Xayrli tun";
  if (h < 12) return "Xayrli tong";
  if (h < 18) return "Xayrli kun";
  return "Xayrli kech";
}
