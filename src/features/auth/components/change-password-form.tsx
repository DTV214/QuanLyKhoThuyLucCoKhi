"use client";

import { KeyRound } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { changeOwnPassword } from "../actions";
import { changePasswordSchema } from "../schemas";

type Errors = Partial<Record<"current" | "password" | "confirm", string>>;

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ current: f.current?.[0], password: f.password?.[0], confirm: f.confirm?.[0] });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await changeOwnPassword(parsed.data);
      if (!res.ok) {
        setErrors({ current: res.fieldErrors?.current?.[0] });
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField label="Mật khẩu hiện tại" name="current" type="password" autoComplete="current-password" error={errors.current} />
      <FormField
        label="Mật khẩu mới"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự, có cả chữ và số"
        error={errors.password}
      />
      <FormField label="Nhập lại mật khẩu mới" name="confirm" type="password" autoComplete="new-password" error={errors.confirm} />
      <Button type="submit" size="xl" disabled={pending}>
        <KeyRound />
        {pending ? "Đang lưu…" : "Đổi mật khẩu"}
      </Button>
    </form>
  );
}
