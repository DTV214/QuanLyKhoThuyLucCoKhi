import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quên mật khẩu</h2>
        <p className="text-base text-muted-foreground">
          Nhập email của bạn, hệ thống sẽ gửi link để đặt mật khẩu mới.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
