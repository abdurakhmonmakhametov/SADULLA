import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { UserProvider } from "@/components/UserProvider";
import { getCurrentUser, toPublic } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <UserProvider user={toPublic(user)}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
