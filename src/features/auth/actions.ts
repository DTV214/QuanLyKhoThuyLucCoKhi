"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/action-result";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/guard";
import { createAdminSupabase } from "@/server/supabase/admin";
import { createServerSupabase } from "@/server/supabase/server";
import { changePasswordSchema, forgotPasswordSchema, ownProfileSchema, setPasswordSchema, signInSchema } from "./schemas";

const NOT_CONFIGURED = "Hệ thống chưa được cấu hình Supabase (.env.local)";

const RECOVERY_WINDOW_SECONDS = 15 * 60;

/** Phiên hiện tại có được tạo từ link khôi phục mật khẩu trong 15 phút gần đây không (AMR "recovery") */
async function isRecentRecoverySession(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const now = Math.floor(Date.now() / 1000);
  return (data?.currentAuthenticationMethods ?? []).some(
    (m) => typeof m === "object" && m.method === "recovery" && now - m.timestamp < RECOVERY_WINDOW_SECONDS,
  );
}

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

  // Không cần mật khẩu cũ CHỈ KHI: đang đổi mật khẩu lần đầu, hoặc vừa vào từ link khôi phục.
  // Trường hợp khác phải dùng changeOwnPassword (nhập mật khẩu hiện tại).
  if (!user.mustChangePassword && !(await isRecentRecoverySession(supabase))) {
    return fail("Link đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu link mới hoặc đổi mật khẩu trong trang Tài khoản.");
  }

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

/** Người dùng tự đổi mật khẩu (phải nhập đúng mật khẩu hiện tại) */
export async function changeOwnPassword(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await getCurrentUser();
  if (!user) return fail("Phiên đã hết hạn, vui lòng đăng nhập lại");

  const supabase = await createServerSupabase();
  // Xác minh mật khẩu hiện tại bằng cách đăng nhập lại (cùng tài khoản, làm mới phiên)
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (verifyError) {
    return fail("Mật khẩu hiện tại không đúng", { current: ["Mật khẩu hiện tại không đúng"] });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail("Không đổi được mật khẩu, vui lòng thử lại");
  return ok(undefined, "Đã đổi mật khẩu");
}

/** Tự sửa họ tên / số điện thoại của mình (RLS: chỉ hàng của mình; trigger chặn đổi quyền) */
export async function updateOwnProfile(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured) return fail(NOT_CONFIGURED);
  const parsed = ownProfileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const user = await getCurrentUser();
  if (!user) return fail("Phiên đã hết hạn, vui lòng đăng nhập lại");

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) return fail("Không lưu được thông tin");
  revalidatePath("/", "layout");
  return ok(undefined, "Đã lưu thông tin của bạn");
}
