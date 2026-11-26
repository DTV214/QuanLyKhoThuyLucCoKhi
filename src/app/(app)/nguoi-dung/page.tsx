import type { Metadata } from "next";
import { CreateUserDialog, UsersView } from "@/features/users";
import { listUsers } from "@/features/users/queries";
import { requireRole } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Người dùng" };

export default async function UsersPage() {
  const actor = await requireRole(["owner", "admin"]);
  const users = await listUsers();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Người dùng</h1>
          <p className="text-base text-muted-foreground">
            {actor.role === "owner"
              ? "Tạo tài khoản, phân quyền, khoá tài khoản cho Quản trị và Nhân viên."
              : "Tạo và quản lý tài khoản Nhân viên."}
          </p>
        </div>
        <CreateUserDialog allowAdmin={actor.role === "owner"} />
      </div>
      <UsersView users={users} actor={{ id: actor.id, role: actor.role }} />
    </div>
  );
}
