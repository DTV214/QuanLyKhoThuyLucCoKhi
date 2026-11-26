import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Client quyền cao nhất (bỏ qua RLS). CHỈ dùng sau khi đã requireRole()
 * cho các việc: tạo tài khoản, khoá tài khoản, đổi role.
 */
export function createAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  return createClient(publicEnv.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
