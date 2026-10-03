"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, History, LayoutDashboard, Library, LogOut, Menu, PenLine, Plus, Settings, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { flushSaves, resetInterviewStore, useInterviews } from "@/lib/storage";
import { useStatus } from "@/hooks/useVoice";
import { useUser } from "../UserProvider";
import { Logo } from "../ui/Logo";

type NavItem = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Asosiy",
    items: [
      { href: "/", label: "Bosh sahifa", icon: LayoutDashboard, match: (p) => p === "/" },
      { href: "/new", label: "Yangi suhbat", icon: Plus, match: (p) => p === "/new" },
      { href: "/interviews", label: "Suhbatlarim", icon: History, match: (p) => p.startsWith("/interviews") || p.startsWith("/interview/") },
    ],
  },
  {
    title: "Tayyorgarlik",
    items: [
      { href: "/coach", label: "AI murabbiy", icon: Bot, match: (p) => p.startsWith("/coach") },
      { href: "/workshop", label: "Javob ustaxonasi", icon: PenLine, match: (p) => p.startsWith("/workshop") },
      { href: "/questions", label: "Savollar banki", icon: Library, match: (p) => p.startsWith("/questions") },
    ],
  },
  {
    title: "Hisob",
    items: [{ href: "/settings", label: "Sozlamalar", icon: Settings, match: (p) => p.startsWith("/settings") }],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const list = useInterviews();
  const open = list?.filter((i) => i.status !== "completed").length ?? 0;
  return (
    <nav className="space-y-5">
      {NAV.map((group) => (
        <div key={group.title}>
          <p className="eyebrow mb-1.5 px-3">{group.title}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.match(path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-semibold transition-colors",
                    active ? "bg-lime-soft text-ink" : "text-muted hover:bg-sunken/70 hover:text-ink",
                  )}
                >
                  {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-lime" />}
                  <item.icon className={cn("size-[18px]", active ? "text-lime-ink" : "text-muted group-hover:text-ink")} strokeWidth={2} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/interviews" && open > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-md bg-lime px-1 text-[11px] font-bold text-ink">{open}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ServiceStatus() {
  const status = useStatus();
  if (!status) return null;
  const rows = [
    { label: status.aiProvider ? `AI · ${status.aiProvider}` : "AI (oflayn)", on: status.ai },
    { label: "O‘zbekcha ovoz", on: status.tts.includes("uz") },
    { label: "Nutqni aniqlash", on: status.stt.includes("uz") },
  ];
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas p-3">
      <p className="eyebrow">Xizmatlar</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between text-xs font-medium text-ink-2">
            {r.label}
            <span className={cn("size-2 rounded-full", r.on ? "bg-good" : "bg-line-strong")} title={r.on ? "Faol" : "O‘chiq"} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserCard() {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    flushSaves();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    resetInterviewStore();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] p-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-lime">{initials(user.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{user.name}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
      </div>
      <button
        onClick={() => void logout()}
        disabled={busy}
        title="Chiqish"
        aria-label="Hisobdan chiqish"
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-bad-soft hover:text-bad disabled:opacity-50"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="px-1">
        <Logo />
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto space-y-3">
        <ServiceStatus />
        <div className="border-t border-line pt-3">
          <UserCard />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="min-h-dvh bg-canvas lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-paper lg:block">
        <SidebarBody />
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          onClick={() => setDrawer(true)}
          aria-label="Menyuni ochish"
          aria-expanded={drawer}
          className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-line text-ink"
        >
          <Menu className="size-[18px]" />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
          <div className="absolute inset-0 animate-fade bg-ink/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade border-r border-line bg-paper">
            <button
              onClick={() => setDrawer(false)}
              aria-label="Menyuni yopish"
              className="absolute right-3 top-4 grid size-8 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
            >
              <X className="size-4" />
            </button>
            <SidebarBody onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8">{children}</div>
    </div>
  );
}

/** Standard page heading used across the dashboard. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
