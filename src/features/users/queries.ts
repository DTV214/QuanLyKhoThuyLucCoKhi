import "server-only";

import type { Role } from "@/lib/roles";
import { createServerSupabase } from "@/server/supabase/server";

export type UserRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: "active" | "locked";
  mustChangePassword: boolean;
  createdAt: string;
};

const ROLE_ORDER: Record<Role, number> = { owner: 0, admin: 1, staff: 2 };

/** Danh sách tài khoản (RLS: chỉ owner/admin đọc được toàn bộ) */
export async function listUsers(): Promise<UserRow[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, status, must_change_password, created_at")
    .order("full_name");
  if (error) throw new Error("Không tải được danh sách tài khoản");

  return (data ?? [])
    .map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      phone: p.phone,
      role: p.role as Role,
      status: p.status,
      mustChangePassword: p.must_change_password,
      createdAt: p.created_at,
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.fullName.localeCompare(b.fullName, "vi"));
}
