"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { InterviewRow } from "@/components/dashboard/InterviewRow";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { INTERVIEW_TYPES, TYPE_ORDER } from "@/lib/catalog";
import type { InterviewType } from "@/lib/types";
import { cn } from "@/lib/cn";
import { retryLoad, useInterviewStore } from "@/lib/storage";

type Filter = "all" | "completed" | "open";
type Sort = "new" | "old" | "best" | "worst";

export default function InterviewsPage() {
  const store = useInterviewStore();
  const list = store.status === "ready" ? store.list : null;
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<InterviewType | "all">("all");
  const [sort, setSort] = useState<Sort>("new");

  const visible = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    const score = (i: (typeof list)[number]) => i.report?.overall ?? -1;
    return list
      .filter((i) => {
        if (filter === "completed" && i.status !== "completed") return false;
        if (filter === "open" && i.status === "completed") return false;
        if (typeFilter !== "all" && i.config.type !== typeFilter) return false;
        return !q || i.config.role.toLowerCase().includes(q) || (i.config.company ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === "old") return a.updatedAt - b.updatedAt;
        if (sort === "best") return score(b) - score(a);
        if (sort === "worst") return (score(a) < 0 ? 999 : score(a)) - (score(b) < 0 ? 999 : score(b));
        return b.updatedAt - a.updatedAt;
      });
  }, [list, filter, query, typeFilter, sort]);

  const open = list?.filter((i) => i.status !== "completed").length ?? 0;

  return (
    <>
      <PageHeader
        title="Suhbatlarim"
        description="Barcha mashq suhbatlaringiz va ularning natijalari."
        actions={
          <ButtonLink href="/new" icon={<Plus className="size-4" />}>
            Yangi suhbat
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Lavozim yoki kompaniya"
            aria-label="Qidirish"
            className={cn(inputClass, "h-10 pl-9 text-sm")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as InterviewType | "all")} aria-label="Suhbat turi" className={cn(inputClass, "h-10 cursor-pointer text-sm sm:w-44")}>
            <option value="all">Barcha turlar</option>
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {INTERVIEW_TYPES[t].label}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Tartiblash" className={cn(inputClass, "h-10 cursor-pointer text-sm sm:w-44")}>
            <option value="new">Eng yangi</option>
            <option value="old">Eng eski</option>
            <option value="best">Eng yuqori ball</option>
            <option value="worst">Eng past ball</option>
          </select>
        </div>
        </div>
        <div className="w-full sm:w-80">
          <Segmented
            label="Saralash"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: `Barchasi${list ? ` (${list.length})` : ""}` },
              { value: "completed", label: "Yakunlangan" },
              { value: "open", label: `Jarayonda${open ? ` (${open})` : ""}` },
            ]}
          />
        </div>
      </div>

      <Card pop className="overflow-hidden">
        {store.status === "error" ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-ink-2">Suhbatlarni yuklab bo‘lmadi.</p>
            <Button variant="secondary" onClick={retryLoad}>
              Qayta urinish
            </Button>
          </div>
        ) : list === null ? (
          <div className="space-y-px">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] animate-pulse bg-sunken/60" />
            ))}
          </div>
        ) : visible.length ? (
          <ul className="divide-y divide-line">
            {visible.map((i) => (
              <InterviewRow key={i.id} interview={i} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="text-sm text-ink-2">{list.length ? "Mos suhbat topilmadi." : "Hali suhbat yo‘q."}</p>
            {list.length ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                  setTypeFilter("all");
                }}
              >
                Filtrni tozalash
              </Button>
            ) : (
              <ButtonLink href="/new" size="sm" icon={<Plus className="size-4" />}>
                Birinchi suhbatni boshlash
              </ButtonLink>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
