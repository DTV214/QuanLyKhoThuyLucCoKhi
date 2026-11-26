import type { Metadata } from "next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoginForm } from "@/features/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Đăng nhập" };

const NOTICES: Record<string, string> = {
  "link-het-han": "Link trong email đã hết hạn hoặc đã dùng. Vui lòng yêu cầu lại.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; loi?: string }>;
}) {
  const { next, loi } = await searchParams;
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Đăng nhập</h2>
        <p className="text-base text-muted-foreground">Dùng email và mật khẩu công ty đã cấp cho bạn.</p>
      </div>
      {!isSupabaseConfigured && (
        <Alert>
          <AlertTitle>Chưa kết nối cơ sở dữ liệu</AlertTitle>
          <AlertDescription>
            Sao chép <code>.env.example</code> thành <code>.env.local</code> và điền khoá Supabase (xem
            docs/02-DATABASE.md).
          </AlertDescription>
        </Alert>
      )}
      <LoginForm next={next} notice={loi ? NOTICES[loi] : undefined} />
    </div>
  );
}
