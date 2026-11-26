// Đổi quyền / họ tên một tài khoản đã có (dùng khi tài khoản được tạo thẳng trên Supabase).
// Chạy:  npm run set-role -- <email> <owner|admin|staff> ["Họ và tên"]
// Ví dụ: npm run set-role -- chu@thanhdanh.vn owner "Võ Minh Cương"
import { createClient } from "@supabase/supabase-js";

const [email, role, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ").trim();
const ROLES = ["owner", "admin", "staff"];

if (!email || !ROLES.includes(role)) {
  console.error('Cách dùng: npm run set-role -- <email> <owner|admin|staff> ["Họ và tên"]');
  process.exit(1);
}
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: profile, error } = await supabase
  .from("profiles")
  .select("id, email, full_name, role")
  .ilike("email", email.trim())
  .maybeSingle();
if (error || !profile) {
  console.error(`Không tìm thấy tài khoản có email ${email}. Tài khoản phải đăng nhập được trước.`);
  process.exit(1);
}

if (role === "owner") {
  const { data: owner } = await supabase.from("profiles").select("email").eq("role", "owner").neq("id", profile.id).maybeSingle();
  if (owner) {
    console.error(`Đã có ông chủ khác (${owner.email}). Hệ thống chỉ cho 1 ông chủ — hạ quyền người đó trước.`);
    process.exit(1);
  }
}

const patch = { role, must_change_password: false, status: "active" };
if (fullName) patch.full_name = fullName;
const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", profile.id);
if (upErr) {
  console.error("Không cập nhật được:", upErr.message);
  process.exit(1);
}
await supabase.auth.admin.updateUserById(profile.id, { app_metadata: { role } });

console.log(`Đã đặt ${profile.email}: quyền ${role}${fullName ? `, tên "${fullName}"` : ""}. Tải lại trang web để thấy thay đổi.`);
