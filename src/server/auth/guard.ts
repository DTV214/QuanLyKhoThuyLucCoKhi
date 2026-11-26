import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Role } from "@/lib/roles";
import { createServerSupabase } from "@/server/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
};

/** Người đang đăng nhập (đã kiểm tra với Supabase Auth), hoặc null. Cache trong 1 request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection(); // luôn render theo từng request, không bao giờ cache trang cần đăng nhập
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, status, must_change_password")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: profile.role as Role,
    mustChangePassword: profile.must_change_password,
  };
});

/** Dùng trong page/layout/action: bắt buộc đăng nhập */
export async function requireUser(options: { allowPasswordChange?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (user.mustChangePassword && !options.allowPasswordChange) redirect("/doi-mat-khau-lan-dau");
  return user;
}

/**
 * Dùng trong Server Action: trả về người dùng nếu đủ quyền, ngược lại null
 * (action tự trả fail(...) thay vì redirect).
 */
export async function authorizeAction(roles?: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

/** Bắt buộc có 1 trong các role. Sai role → về trang chủ */
export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/tim-hang?loi=khong-co-quyen");
  return user;
}
