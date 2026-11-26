import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Đặt mật khẩu mới</h2>
        <p className="text-base text-muted-foreground">Chọn mật khẩu mới cho tài khoản của bạn.</p>
      </div>
      <SetPasswordForm />
    </div>
  );
}
