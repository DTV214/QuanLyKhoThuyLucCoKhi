import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/features/auth";
import { requireUser } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Đổi mật khẩu lần đầu" };

export default async function FirstPasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  if (!user.mustChangePassword) redirect("/tim-hang");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Chào {user.fullName}!</h2>
        <p className="text-base text-muted-foreground">
          Đây là lần đầu bạn đăng nhập. Vui lòng đổi mật khẩu tạm sang mật khẩu riêng của bạn.
        </p>
      </div>
      <SetPasswordForm submitLabel="Đổi mật khẩu và bắt đầu" />
    </div>
  );
}
