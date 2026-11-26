# src/server — tầng Backend (Node.js)

Code ở đây **chỉ chạy trên server**. Mọi file bắt đầu bằng `import "server-only"` (import nhầm từ client sẽ lỗi build).

| File | Dùng để |
|---|---|
| `supabase/server.ts` → `createServerSupabase()` | Gọi DB bằng phiên của người dùng (RLS áp dụng). **Mặc định dùng cái này.** |
| `supabase/admin.ts` → `createAdminSupabase()` | Service role, bỏ qua RLS. Chỉ dùng cho quản lý tài khoản, **sau** `requireRole()`. |
| `auth/guard.ts` | `getCurrentUser()`, `requireUser()`, `requireRole([...])` |

Quy tắc:
- Không đọc `process.env.SUPABASE_SERVICE_ROLE_KEY` / `CLOUDINARY_API_SECRET` ở nơi khác.
- Không thay số lượng tồn bằng `.from("inventory").update(...)` — dùng `.rpc("fn_stock_*")`.
- Lỗi DB → `mapDbError()` (`src/lib/action-result.ts`), không trả `error.message` thô ra client (trừ lỗi tiếng Việt do RPC raise).
