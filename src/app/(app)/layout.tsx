import { BottomNav, SideNav } from "@/components/layout/app-nav";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser } from "@/server/auth/guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh bg-muted/40 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r bg-sidebar p-5 lg:flex">
        <Logo />
        <SideNav role={user.role} />
        <p className="mt-auto text-xs text-muted-foreground">Kho 1 – Trong nhà · Kho 2 – Kho lớn</p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <Logo className="lg:hidden [&_svg]:size-9" />
          <div className="hidden lg:block" />
          <UserMenu user={user} />
        </header>
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <BottomNav role={user.role} />
    </div>
  );
}
