"use client";

import { UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createUser } from "../actions";
import { createUserSchema } from "../schemas";
import { RolePicker } from "./role-picker";
import { TempPasswordCard } from "./temp-password-card";

type Errors = Partial<Record<"fullName" | "email" | "phone" | "role", string>>;
type Created = { fullName: string; email: string; tempPassword: string };

export function CreateUserDialog({ allowAdmin }: { allowAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRole("staff");
    setErrors({});
    setFormError(null);
    setCreated(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = { ...Object.fromEntries(new FormData(e.currentTarget)), role };
    const parsed = createUserSchema.safeParse(values);
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ fullName: f.fullName?.[0], email: f.email?.[0], phone: f.phone?.[0], role: f.role?.[0] });
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await createUser(values);
      if (!res.ok) {
        setFormError(res.error);
        if (res.fieldErrors?.email) setErrors({ email: res.fieldErrors.email[0] });
        return;
      }
      toast.success(`Đã tạo tài khoản cho ${res.data.fullName}`);
      setCreated(res.data);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="xl">
          <UserPlus />
          Thêm tài khoản
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-6 text-base sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{created ? "Đã tạo tài khoản" : "Thêm tài khoản mới"}</DialogTitle>
          {!created && (
            <DialogDescription className="text-base">
              Hệ thống sẽ tạo mật khẩu tạm. Người dùng đổi mật khẩu ở lần đăng nhập đầu.
            </DialogDescription>
          )}
        </DialogHeader>

        {created ? (
          <div className="space-y-3">
            <TempPasswordCard {...created} />
            <Button size="xl" className="w-full" onClick={() => setOpen(false)}>
              Xong
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription className="text-base">{formError}</AlertDescription>
              </Alert>
            )}
            <FormField label="Họ và tên" name="fullName" autoComplete="off" error={errors.fullName} autoFocus />
            <FormField label="Email" name="email" type="email" autoComplete="off" error={errors.email} />
            <FormField
              label="Số điện thoại (không bắt buộc)"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              error={errors.phone}
            />
            <RolePicker value={role} onChange={setRole} allowAdmin={allowAdmin} error={errors.role} />
            <Button type="submit" size="xl" className="w-full" disabled={pending}>
              <UserPlus />
              {pending ? "Đang tạo…" : "Tạo tài khoản"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
