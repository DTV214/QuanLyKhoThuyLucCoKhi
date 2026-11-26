"use server";

import { redirect } from "next/navigation";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/guard";
import { createAdminSupabase } from "@/server/supabase/admin";
import { createServerSupabase } from "@/server/supabase/server";
import { forgotPasswordSchema, setPasswordSchema, signInSchema } from "./schemas";

const NOT_CONFIGURED = "Hệ thống chưa được cấu hình Supabase (.env.local)";

/** Chỉ cho chuyển hướng nội bộ, chống open-redirect */
function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/tim-hang";
}

export async function signIn(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Không tiết lộ email có tồn tại hay không
  if (error || !data.user) {
    if (error?.status === 429) return fail("Bạn đăng nhập sai quá nhiều lần. Vui lòng đợi vài phút.");
    return fail("Email hoặc mật khẩu không đúng");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    return fail("Tài khoản đã bị khoá. Vui lòng liên hệ quản trị.");
  }

  return ok({
    redirectTo: profile.must_change_password ? "/doi-mat-khau-lan-dau" : safeNext(parsed.data.next),
  });
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/dang-nhap");
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createServerSupabase();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/dat-lai-mat-khau`,
  });
  // Luôn trả về thành công để không lộ email nào có trong hệ thống
  return ok(undefined, "Nếu email có trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.");
}

/** Đặt mật khẩu mới (sau khi bấm link email, hoặc lần đăng nhập đầu) */
export async function setNewPassword(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await getCurrentUser();
  if (!user) return fail("Phiên đã hết hạn. Vui lòng mở lại link trong email hoặc đăng nhập lại.");

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Mật khẩu mới phải khác mật khẩu cũ");
    return fail("Không đổi được mật khẩu, vui lòng thử lại");
  }

  if (user.mustChangePassword) {
    await createAdminSupabase().from("profiles").update({ must_change_password: false }).eq("id", user.id);
  }
  return ok({ redirectTo: "/tim-hang" }, "Đã đổi mật khẩu thành công");
}
