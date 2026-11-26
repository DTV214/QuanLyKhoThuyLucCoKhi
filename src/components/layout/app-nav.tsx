"use client";

import { LogOut, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/features/auth";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { isNavActive, navFor } from "./nav-items";

/** Menu dọc (máy tính) */
export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {navFor(role).map((item) => {
        const { href, label, icon: Icon } = item;
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-12 items-center gap-3 rounded-xl px-4 text-base font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const MAIN_COUNT = 4;

/**
 * Thanh menu dưới cùng (điện thoại, máy tính bảng): 4 mục chính + nút "Thêm"
 * mở bảng chứa các mục còn lại, Tài khoản và Đăng xuất.
 */
export function BottomNav({ role, fullName }: { role: Role; fullName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navFor(role);
  const main = items.slice(0, MAIN_COUNT);
  const more = items.slice(MAIN_COUNT);
  const moreActive = more.some((i) => isNavActive(i, pathname)) || pathname.startsWith("/tai-khoan");

  const tab = "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium";

  return (
    <>
      <nav
        aria-label="Menu chính"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {main.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(tab, active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="size-6" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={cn(tab, moreActive ? "text-primary" : "text-muted-foreground")}
        >
          <Menu className="size-6" />
          Thêm
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] text-base">
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="text-xl">{fullName}</SheetTitle>
            <SheetDescription>{ROLE_LABEL[role]}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4">
            {more.map((item) => {
              const { href, label, icon: Icon } = item;
              const active = isNavActive(item, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-14 items-center gap-3 rounded-xl border px-4 font-medium",
                    active ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <Icon className="size-5" /> {label}
                </Link>
              );
            })}
            <Link
              href="/tai-khoan"
              onClick={() => setOpen(false)}
              className="flex h-14 items-center gap-3 rounded-xl border px-4 font-medium hover:bg-muted"
            >
              <UserRound className="size-5" /> Tài khoản của tôi
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex h-14 w-full items-center gap-3 rounded-xl border px-4 font-medium text-destructive hover:bg-destructive/5"
              >
                <LogOut className="size-5" /> Đăng xuất
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
