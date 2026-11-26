import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/coming-soon";
import { requireRole } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Người dùng" };

export default async function Page() {
  await requireRole(["owner", "admin"]);
  return (
    <ComingSoon
      title="Quản lý người dùng"
      phase="Giai đoạn 1"
      items={["Tạo tài khoản kèm mật khẩu tạm (bắt buộc đổi lần đầu)", "Gán quyền Quản trị / Nhân viên", "Khoá tài khoản, đặt lại mật khẩu"]}
    />
  );
}
