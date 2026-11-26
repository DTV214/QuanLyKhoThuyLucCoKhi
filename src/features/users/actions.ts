"use server";

import { revalidatePath } from "next/cache";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { canManageUser, MANAGER_ROLES, type Role } from "@/lib/roles";
import { authorizeAction, type CurrentUser } from "@/server/auth/guard";
import { generateTempPassword } from "@/server/auth/temp-password";
import { createAdminSupabase } from "@/server/supabase/admin";
import {
  changeRoleSchema,
  createUserSchema,
  setLockedSchema,
  updateUserInfoSchema,
  userIdSchema,
} from "./schemas";

const NO_PERMISSION = "Bạn không có quyền thực hiện thao tác này";
const PATH = "/nguoi-dung";
const BAN_FOREVER = "876000h"; // ~100 năm

type TempCredential = { email: string; fullName: string; tempPassword: string };

/** Tải người bị tác động và kiểm tra actor có được quản lý họ không */
async function loadManageableTarget(actor: CurrentUser, targetId: string) {
  if (targetId === actor.id) return { ok: false, error: "Không thể tự thao tác trên tài khoản của chính mình tại đây" } as const;
  const admin = createAdminSupabase();
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, full_name, role, status")
    .eq("id", targetId)
    .single();
  if (!target) return { ok: false, error: "Không tìm thấy tài khoản" } as const;
  if (!canManageUser(actor.role, target.role as Role)) return { ok: false, error: NO_PERMISSION } as const;
  return { ok: true, admin, target } as const;
}

// ---------------------------------------------------------------------------

export async function createUser(input: unknown): Promise<ActionResult<TempCredential>> {
  const actor = await authorizeAction(MANAGER_ROLES);
  if (!actor) return fail(NO_PERMISSION);

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const { fullName, email, phone, role } = parsed.data;

  if (!canManageUser(actor.role, role)) return fail("Chỉ ông chủ mới được tạo tài khoản Quản trị");

  const tempPassword = generateTempPassword();
  const admin = createAdminSupabase();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // tài khoản do công ty cấp → coi như đã xác thực
    // app_metadata chỉ server ghi được → trigger tg_handle_new_user đọc để tạo profiles
    app_metadata: {
      role,
      full_name: fullName,
      phone: phone ?? "",
      must_change_password: true,
      created_by: actor.id,
    },
  });

  if (error) {
    if (error.code === "email_exists" || /already/i.test(error.message)) {
      return fail("Email này đã có tài khoản", { email: ["Email này đã có tài khoản"] });
    }
    console.error("[users.createUser]", error.message);
    return fail("Không tạo được tài khoản, vui lòng thử lại");
  }

  revalidatePath(PATH);
  return ok({ email, fullName, tempPassword }, "Đã tạo tài khoản");
}

export async function updateUserInfo(input: unknown): Promise<ActionResult> {
  const actor = await authorizeAction(MANAGER_ROLES);
  if (!actor) return fail(NO_PERMISSION);
  const parsed = updateUserInfoSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const res = await loadManageableTarget(actor, parsed.data.id);
  if (!res.ok) return fail(res.error);

  const { error } = await res.admin
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", parsed.data.id);
  if (error) return fail("Không lưu được thông tin");

  revalidatePath(PATH);
  return ok(undefined, "Đã lưu thông tin");
}

export async function setUserLocked(input: unknown): Promise<ActionResult> {
  const actor = await authorizeAction(MANAGER_ROLES);
  if (!actor) return fail(NO_PERMISSION);
  const parsed = setLockedSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const res = await loadManageableTarget(actor, parsed.data.id);
  if (!res.ok) return fail(res.error);
  const { admin, target } = res;
  const locked = parsed.data.locked;

  // 1) Database: status = locked → RLS + RPC chặn ngay lập tức, kể cả phiên đang mở
  const { error } = await admin
    .from("profiles")
    .update({ status: locked ? "locked" : "active" })
    .eq("id", target.id);
  if (error) return fail("Không cập nhật được trạng thái");

  // 2) Supabase Auth: cấm đăng nhập / làm mới phiên
  const { error: banError } = await admin.auth.admin.updateUserById(target.id, {
    ban_duration: locked ? BAN_FOREVER : "none",
  });
  if (banError) console.error("[users.setUserLocked] ban", banError.message);

  revalidatePath(PATH);
  return ok(undefined, locked ? `Đã khoá tài khoản ${target.full_name}` : `Đã mở khoá ${target.full_name}`);
}

export async function resetUserPassword(input: unknown): Promise<ActionResult<TempCredential>> {
  const actor = await authorizeAction(MANAGER_ROLES);
  if (!actor) return fail(NO_PERMISSION);
  const parsed = userIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const res = await loadManageableTarget(actor, parsed.data.id);
  if (!res.ok) return fail(res.error);
  const { admin, target } = res;

  const tempPassword = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(target.id, { password: tempPassword });
  if (error) return fail("Không đặt lại được mật khẩu");

  await admin.from("profiles").update({ must_change_password: true }).eq("id", target.id);

  revalidatePath(PATH);
  return ok({ email: target.email, fullName: target.full_name, tempPassword }, "Đã đặt lại mật khẩu");
}

export async function changeUserRole(input: unknown): Promise<ActionResult> {
  // Chỉ ông chủ được nâng / hạ quyền Quản trị
  const actor = await authorizeAction(["owner"]);
  if (!actor) return fail("Chỉ ông chủ mới được đổi quyền");
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const res = await loadManageableTarget(actor, parsed.data.id);
  if (!res.ok) return fail(res.error);
  const { admin, target } = res;
  if (target.role === parsed.data.role) return ok(undefined, "Quyền không thay đổi");

  const { error } = await admin.from("profiles").update({ role: parsed.data.role }).eq("id", target.id);
  if (error) return fail("Không đổi được quyền");
  await admin.auth.admin.updateUserById(target.id, { app_metadata: { role: parsed.data.role } });

  revalidatePath(PATH);
  return ok(undefined, `Đã đổi quyền của ${target.full_name}`);
}
