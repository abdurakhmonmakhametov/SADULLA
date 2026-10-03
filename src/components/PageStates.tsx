import { ArrowLeft, SearchX } from "lucide-react";
import { ButtonLink } from "./ui/Button";
import { Spinner } from "./ui/Spinner";

export function PageLoading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-ink" role="status" aria-label="Yuklanmoqda">
      <Spinner className="size-6" />
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-sunken text-muted">
        <SearchX className="size-5" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold">Suhbat topilmadi</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">U o‘chirilgan bo‘lishi yoki boshqa hisobga tegishli bo‘lishi mumkin.</p>
      <ButtonLink href="/" variant="secondary" className="mt-6" icon={<ArrowLeft className="size-4" />}>
        Bosh sahifaga qaytish
      </ButtonLink>
    </div>
  );
}
