import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/server/auth/guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
