"use server";

import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { authorizeAction } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";

const markSchema = z.union([z.literal("all"), z.array(z.number().int().positive()).min(1).max(100)]);

/** Đánh dấu đã đọc: danh sách id, hoặc "all" (RLS: chỉ thông báo của chính mình) */
export async function markNotificationsRead(input: unknown): Promise<ActionResult> {
  const user = await authorizeAction();
  if (!user) return fail("Phiên đăng nhập đã hết");
  const parsed = markSchema.safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ");

  const supabase = await createServerSupabase();
  let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null);
  if (parsed.data !== "all") q = q.in("id", parsed.data);
  const { error } = await q;
  if (error) return fail("Không cập nhật được thông báo");
  return ok(undefined);
}
