import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm, ProfileForm } from "@/features/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { requireUser } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";

export const metadata: Metadata = { title: "Tài khoản của tôi" };

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).single();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Tài khoản của tôi</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Thông tin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-4 text-base sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Email đăng nhập</dt>
              <dd className="font-semibold break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Quyền</dt>
              <dd className="font-semibold">{ROLE_LABEL[user.role]}</dd>
            </div>
          </dl>
          <ProfileForm fullName={user.fullName} phone={profile?.phone ?? null} />
          <p className="text-sm text-muted-foreground">Email và quyền chỉ ông chủ / quản trị đổi được.</p>
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
