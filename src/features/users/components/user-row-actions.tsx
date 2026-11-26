"use client";

import { KeyRound, Lock, LockOpen, MoreHorizontal, Pencil, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { DIALOG_MOBILE_FULL, STICKY_ACTIONS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { changeUserRole, resetUserPassword, setUserLocked, updateUserInfo } from "../actions";
import type { UserRow } from "../queries";
import { RolePicker } from "./role-picker";
import { TempPasswordCard } from "./temp-password-card";

type Mode = null | "edit" | "role" | "lock" | "reset";
type Temp = { fullName: string; email: string; tempPassword: string };

export function UserRowActions({ user, actorRole }: { user: UserRow; actorRole: Role }) {
  const [mode, setMode] = useState<Mode>(null);
  const [temp, setTemp] = useState<Temp | null>(null);
  const [role, setRole] = useState<"admin" | "staff">(user.role === "admin" ? "admin" : "staff");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, startTransition] = useTransition();
  const locked = user.status === "locked";
  const close = () => {
    setMode(null);
    setErrors({});
  };

  function run<T>(fn: () => Promise<{ ok: true; data: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }>, after?: (data: T) => void) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        if (res.fieldErrors) setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v[0]])));
        toast.error(res.error);
        return;
      }
      if (res.message) toast.success(res.message);
      close();
      after?.(res.data);
    });
  }

  function onEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    run(() => updateUserInfo({ id: user.id, ...fd }));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" className="max-md:w-full" aria-label={`Thao tác với ${user.fullName}`}>
            <MoreHorizontal />
            Thao tác
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 [&_[role=menuitem]]:h-11 [&_[role=menuitem]]:text-base">
          <DropdownMenuItem onSelect={() => setMode("edit")}>
            <Pencil /> Sửa thông tin
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMode("reset")}>
            <KeyRound /> Đặt lại mật khẩu
          </DropdownMenuItem>
          {actorRole === "owner" && (
            <DropdownMenuItem onSelect={() => setMode("role")}>
              <ShieldCheck /> Đổi quyền
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant={locked ? "default" : "destructive"} onSelect={() => setMode("lock")}>
            {locked ? <LockOpen /> : <Lock />} {locked ? "Mở khoá tài khoản" : "Khoá tài khoản"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sửa thông tin */}
      <Dialog open={mode === "edit"} onOpenChange={(o) => !o && close()}>
        <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Sửa thông tin</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEdit} noValidate className="space-y-5">
            <FormField label="Email (không đổi được)" value={user.email} disabled readOnly />
            <FormField label="Họ và tên" name="fullName" defaultValue={user.fullName} error={errors.fullName} />
            <FormField label="Số điện thoại" name="phone" type="tel" defaultValue={user.phone ?? ""} error={errors.phone} />
            <div className={STICKY_ACTIONS}>
              <Button type="submit" size="xl" className="w-full" disabled={pending}>
                {pending ? "Đang lưu…" : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Đổi quyền (chỉ ông chủ) */}
      <Dialog open={mode === "role"} onOpenChange={(o) => !o && close()}>
        <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-xl", DIALOG_MOBILE_FULL)}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Đổi quyền: {user.fullName}</DialogTitle>
          </DialogHeader>
          <RolePicker value={role} onChange={setRole} allowAdmin />
          <Button size="xl" disabled={pending} onClick={() => run(() => changeUserRole({ id: user.id, role }))}>
            {pending ? "Đang lưu…" : `Đặt quyền ${ROLE_LABEL[role]}`}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Xác nhận khoá / mở khoá */}
      <AlertDialog open={mode === "lock"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent className="p-6 sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {locked ? "Mở khoá" : "Khoá"} tài khoản {user.fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {locked
                ? "Người này sẽ đăng nhập và làm việc lại được bình thường."
                : "Người này sẽ bị đăng xuất và không thể đăng nhập nữa. Lịch sử lấy/nhập hàng của họ vẫn được giữ nguyên."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="xl">Huỷ</AlertDialogCancel>
            <Button
              size="xl"
              variant={locked ? "default" : "destructive"}
              disabled={pending}
              onClick={() => run(() => setUserLocked({ id: user.id, locked: !locked }))}
            >
              {locked ? <LockOpen /> : <Lock />}
              {pending ? "Đang xử lý…" : locked ? "Mở khoá" : "Khoá tài khoản"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Xác nhận đặt lại mật khẩu */}
      <AlertDialog open={mode === "reset"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent className="p-6 sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Đặt lại mật khẩu cho {user.fullName}?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Mật khẩu cũ sẽ không dùng được nữa. Hệ thống tạo mật khẩu tạm mới và người dùng phải đổi khi đăng nhập.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="xl">Huỷ</AlertDialogCancel>
            <Button size="xl" disabled={pending} onClick={() => run(() => resetUserPassword({ id: user.id }), setTemp)}>
              <KeyRound />
              {pending ? "Đang xử lý…" : "Đặt lại mật khẩu"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hiện mật khẩu tạm mới */}
      <Dialog open={temp !== null} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent className={cn("max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-lg", DIALOG_MOBILE_FULL)}>
          <DialogHeader>
            <DialogTitle className="text-2xl">Mật khẩu tạm mới</DialogTitle>
          </DialogHeader>
          {temp && <TempPasswordCard {...temp} />}
          <Button size="xl" onClick={() => setTemp(null)}>
            Xong
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
