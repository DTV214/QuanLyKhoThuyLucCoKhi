import { LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth";
import { ROLE_LABEL } from "@/lib/roles";
import type { CurrentUser } from "@/server/auth/guard";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export function UserMenu({ user }: { user: CurrentUser }) {
  return (
    <div className="flex items-center gap-3">
      <Link href="/tai-khoan" aria-label="Tài khoản của tôi">
        <Avatar className="size-10">
          <AvatarFallback className="bg-accent font-semibold text-accent-foreground">{initials(user.fullName)}</AvatarFallback>
        </Avatar>
      </Link>
      <Link href="/tai-khoan" className="hidden rounded-lg px-2 py-1 leading-tight hover:bg-muted sm:block" title="Tài khoản của tôi">
        <div className="font-semibold">{user.fullName}</div>
        <Badge variant="secondary" className="mt-0.5">
          {ROLE_LABEL[user.role]}
        </Badge>
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="lg">
          <LogOut />
          <span className="hidden sm:inline">Đăng xuất</span>
        </Button>
      </form>
    </div>
  );
}
