import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { requireUser } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Tài khoản của tôi" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Tài khoản của tôi</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Thông tin</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-base sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">Họ tên</dt>
              <dd className="font-semibold">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-semibold break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Quyền</dt>
              <dd className="font-semibold">{ROLE_LABEL[user.role]}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">Cần sửa họ tên hoặc số điện thoại? Nhờ quản trị cập nhật.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Đổi mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
