import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");
  return <AuthShell>{children}</AuthShell>;
}
