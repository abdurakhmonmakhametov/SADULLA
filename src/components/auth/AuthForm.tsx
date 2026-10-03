"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";
import { Spinner } from "../ui/Spinner";
import { cn } from "@/lib/cn";
import { resetInterviewStore } from "@/lib/storage";

type Mode = "login" | "register";
type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "form", string>>;

function PasswordInput({ id, value, onChange, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        autoComplete={autoComplete}
        className={cn(inputClass, "h-11 pr-12")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

function strength(pw: string): { score: number; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Juda zaif", "Zaif", "O‘rtacha", "Yaxshi", "Kuchli", "Juda kuchli"];
  return { score: s, label: labels[s] };
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (isRegister && name.trim().length < 2) e.name = "Ismingizni kiriting (kamida 2 ta harf).";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "To‘g‘ri email manzil kiriting.";
    if (isRegister ? password.length < 8 : !password) e.password = isRegister ? "Parol kamida 8 ta belgidan iborat bo‘lsin." : "Parolni kiriting.";
    if (isRegister && confirm !== password) e.confirm = "Parollar bir xil emas.";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; field?: string };
      if (!res.ok) {
        const field = data.field && ["name", "email", "password"].includes(data.field) ? (data.field as keyof Errors) : "form";
        setErrors({ [field]: data.error ?? "Nimadir xato ketdi. Qayta urinib ko‘ring." });
        setBusy(false);
        return;
      }
      resetInterviewStore();
      router.replace("/");
    } catch {
      setErrors({ form: "Server bilan bog‘lanib bo‘lmadi. Internetni tekshiring." });
      setBusy(false);
    }
  }

  const pw = strength(password);

  return (
    <div className="animate-rise">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{isRegister ? "Hisob yarating" : "Xush kelibsiz"}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {isRegister
          ? "Suhbatlaringiz, natijalaringiz va o‘sishingiz bir joyda saqlanadi."
          : "Mashqni davom ettirish uchun hisobingizga kiring."}
      </p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        {isRegister && (
          <Field label="Ismingiz" htmlFor="name" error={errors.name}>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} autoComplete="name" placeholder="Masalan: Aziza Karimova" className={cn(inputClass, "h-11")} />
          </Field>
        )}
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} autoComplete="email" placeholder="siz@misol.uz" className={cn(inputClass, "h-11")} />
        </Field>
        <Field label="Parol" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" value={password} onChange={setPassword} invalid={!!errors.password} autoComplete={isRegister ? "new-password" : "current-password"} />
          {isRegister && password && !errors.password && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < pw.score ? (pw.score >= 3 ? "bg-good" : "bg-warn") : "bg-line")} />
                ))}
              </div>
              <span className="w-24 text-right text-xs font-semibold text-muted">{pw.label}</span>
            </div>
          )}
        </Field>
        {isRegister && (
          <Field label="Parolni tasdiqlang" htmlFor="confirm" error={errors.confirm}>
            <PasswordInput id="confirm" value={confirm} onChange={setConfirm} invalid={!!errors.confirm} autoComplete="new-password" />
          </Field>
        )}

        {errors.form && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
            {errors.form}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={busy} icon={busy ? <Spinner /> : undefined} iconRight={busy ? undefined : <ArrowRight className="size-4" strokeWidth={2.5} />}>
          {busy ? (isRegister ? "Hisob yaratilmoqda…" : "Kirilmoqda…") : isRegister ? "Ro‘yxatdan o‘tish" : "Kirish"}
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-ink-2">
        {isRegister ? "Hisobingiz bormi?" : "Hali hisobingiz yo‘qmi?"}{" "}
        <Link href={isRegister ? "/login" : "/register"} className="font-bold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {isRegister ? "Kirish" : "Ro‘yxatdan o‘ting"}
        </Link>
      </p>
    </div>
  );
}
