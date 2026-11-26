"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { navFor } from "./nav-items";

/** Menu dọc (máy tính) */
export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {navFor(role).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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

/** Thanh menu dưới cùng (điện thoại) — 4 mục chính */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 backdrop-blur lg:hidden">
      {navFor(role)
        .slice(0, 4)
        .map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-6" />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
