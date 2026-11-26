"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signIn } from "../actions";
import { signInSchema } from "../schemas";

type Errors = Partial<Record<"email" | "password", string>>;

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = signInSchema.safeParse({ ...values, next });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await signIn(parsed.data);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      router.replace(res.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {notice && !formError && (
        <Alert>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {formError && (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{formError}</AlertDescription>
        </Alert>
      )}
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="ten@thanhdanh.vn"
        error={errors.email}
        autoFocus
      />
      <FormField
        label="Mật khẩu"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Nhập mật khẩu"
        error={errors.password}
      />
      <div className="flex justify-end">
        <Link href="/quen-mat-khau" className="text-base font-medium text-primary hover:underline">
          Quên mật khẩu?
        </Link>
      </div>
      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        <LogIn />
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản? Liên hệ ông chủ hoặc quản trị để được cấp.
      </p>
    </form>
  );
}
