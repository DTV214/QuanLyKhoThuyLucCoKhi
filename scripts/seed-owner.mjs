// Tạo tài khoản Ông chủ đầu tiên. Chạy: npm run seed:owner
// Đọc OWNER_EMAIL, OWNER_PASSWORD, OWNER_FULL_NAME từ .env.local
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, OWNER_EMAIL: email,
        OWNER_PASSWORD: password, OWNER_FULL_NAME: fullName } = process.env;

if (!url || !key || !email || !password || !fullName) {
  console.error("Thiếu biến trong .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OWNER_EMAIL, OWNER_PASSWORD, OWNER_FULL_NAME");
  process.exit(1);
}
if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("OWNER_PASSWORD phải ≥ 8 ký tự, có chữ và số");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "owner", full_name: fullName, must_change_password: false },
});
if (error) {
  console.error("Không tạo được:", error.message);
  process.exit(1);
}
console.log(`Đã tạo Ông chủ: ${data.user.email}. Hãy xoá OWNER_PASSWORD khỏi .env.local.`);
