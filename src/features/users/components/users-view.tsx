"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/date";
import { canManageUser, ROLE_LABEL, type Role } from "@/lib/roles";
import { SCROLL_ROW } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import type { UserRow } from "../queries";
import { UserRowActions } from "./user-row-actions";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

type Filter = "all" | "active" | "locked";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "locked", label: "Đã khoá" },
];

function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant={role === "staff" ? "secondary" : "default"} className="text-sm">
      {ROLE_LABEL[role]}
    </Badge>
  );
}

function StatusBadge({ user }: { user: UserRow }) {
  if (user.status === "locked")
    return (
      <Badge variant="destructive" className="text-sm">
        Đã khoá
      </Badge>
    );
  if (user.mustChangePassword)
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-sm text-amber-800">
        Chờ đổi mật khẩu
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-sm text-emerald-800">
      Hoạt động
    </Badge>
  );
}

export function UsersView({ users, actor }: { users: UserRow[]; actor: { id: string; role: Role } }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(() => {
    const t = norm(q.trim());
    return users.filter(
      (u) =>
        (filter === "all" || u.status === filter) &&
        (!t || norm(`${u.fullName} ${u.email} ${u.phone ?? ""}`).includes(t)),
    );
  }, [users, q, filter]);

  const canAct = (u: UserRow) => u.id !== actor.id && canManageUser(actor.role, u.role);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, email, số điện thoại…"
            className="h-12 rounded-xl bg-background pl-12 text-base"
          />
        </div>
        <div className={SCROLL_ROW}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "h-12 shrink-0 rounded-xl border px-4 text-base font-medium whitespace-nowrap transition-colors",
                filter === f.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border bg-background p-10 text-center text-lg text-muted-foreground">
          Không có tài khoản nào phù hợp.
        </p>
      ) : (
        <>
          {/* Máy tính: bảng */}
          <div className="hidden overflow-hidden rounded-2xl border bg-background md:block">
            <Table className="text-base">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-12 pl-5">Họ tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Quyền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="pr-5 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((u) => (
                  <TableRow key={u.id} className={cn(u.status === "locked" && "opacity-60")}>
                    <TableCell className="py-3 pl-5">
                      <div className="font-semibold">
                        {u.fullName}
                        {u.id === actor.id && <span className="ml-2 text-sm font-normal text-muted-foreground">(bạn)</span>}
                      </div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.phone ?? "—"}</TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge user={u} />
                    </TableCell>
                    <TableCell>{formatDate(u.createdAt)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      {canAct(u) ? <UserRowActions user={u} actorRole={actor.role} /> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Điện thoại: thẻ */}
          <ul className="space-y-3 md:hidden">
            {shown.map((u) => (
              <li key={u.id} className={cn("space-y-3 rounded-2xl border bg-background p-4", u.status === "locked" && "opacity-70")}>
                <div>
                  <div className="text-lg font-semibold">
                    {u.fullName}
                    {u.id === actor.id && <span className="ml-2 text-sm font-normal text-muted-foreground">(bạn)</span>}
                  </div>
                  <div className="text-sm break-all text-muted-foreground">{u.email}</div>
                  {u.phone && <div className="text-sm text-muted-foreground">{u.phone}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <RoleBadge role={u.role} />
                  <StatusBadge user={u} />
                </div>
                {canAct(u) && <UserRowActions user={u} actorRole={actor.role} />}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        {shown.length} / {users.length} tài khoản
      </p>
    </div>
  );
}
