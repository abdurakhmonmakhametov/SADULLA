import { Logo } from "../ui/Logo";
import { AuthShowcase } from "./AuthShowcase";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-paper p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
      <div className="relative flex flex-col px-3 py-4 sm:px-8 sm:py-6 lg:px-12">
        <Logo href="/login" />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-muted lg:text-left">© {new Date().getFullYear()} Suhbatdosh</p>
      </div>
      <AuthShowcase />
    </div>
  );
}
