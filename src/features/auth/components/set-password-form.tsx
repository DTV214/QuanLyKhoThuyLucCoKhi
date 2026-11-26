"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { setNewPassword } from "../actions";
import { setPasswordSchema } from "../schemas";

type Errors = Partial<Record<"password" | "confirm", string>>;

export function SetPasswordForm({ submitLabel = "Lưu mật khẩu mới" }: { submitLabel?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = setPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ password: f.password?.[0], confirm: f.confirm?.[0] });
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await setNewPassword(parsed.data);
      if (!res.ok) return setFormError(res.error);
      toast.success(res.message);
      router.replace(res.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{formError}</AlertDescription>
        </Alert>
      )}
      <FormField
        label="Mật khẩu mới"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự, có cả chữ và số"
        error={errors.password}
        autoFocus
      />
      <FormField
        label="Nhập lại mật khẩu mới"
        name="confirm"
        type="password"
        autoComplete="new-password"
        error={errors.confirm}
      />
      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        <KeyRound />
        {pending ? "Đang lưu…" : submitLabel}
      </Button>
    </form>
  );
}
