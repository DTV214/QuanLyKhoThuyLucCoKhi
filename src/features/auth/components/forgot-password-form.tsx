"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FormField } from "@/components/common/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "../actions";
import { forgotPasswordSchema } from "../schemas";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0]);
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await requestPasswordReset(parsed.data);
      setResult(res.ok ? { ok: true, text: res.message ?? "" } : { ok: false, text: res.error });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {result && (
        <Alert variant={result.ok ? "default" : "destructive"}>
          <AlertDescription className="text-base">{result.text}</AlertDescription>
        </Alert>
      )}
      <FormField label="Email của bạn" name="email" type="email" autoComplete="email" error={error} autoFocus />
      <Button type="submit" size="xl" className="w-full" disabled={pending}>
        <Mail />
        {pending ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}
      </Button>
      <Button asChild variant="ghost" size="lg" className="w-full">
        <Link href="/dang-nhap">
          <ArrowLeft />
          Quay lại đăng nhập
        </Link>
      </Button>
    </form>
  );
}
