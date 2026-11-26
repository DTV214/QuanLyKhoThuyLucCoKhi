# Kho Công ty Thành Danh VMC

Web app nội bộ quản lý kho linh kiện thủy lực, khí nén, cơ khí — Next.js 15 + Supabase + Cloudinary.

## Bắt đầu
1. Cài Node.js ≥ 20, rồi `npm install`.
2. Tạo project Supabase, chạy SQL trong `supabase/migrations/` theo thứ tự rồi `supabase/seed.sql` (xem `docs/02-DATABASE.md`).
   Trong Supabase → Authentication → Email: **tắt "Allow new users to sign up"**.
3. `copy .env.example .env.local` và điền khoá.
4. `npm run seed:owner` — tạo tài khoản Ông chủ.
5. `npm run dev` → http://localhost:3000

## Tài liệu
- `CLAUDE.md` — quy ước code (cho người và AI)
- `docs/00-TONG-QUAN.md` — nghiệp vụ, thuật ngữ
- `docs/01-KIEN-TRUC.md` — kiến trúc
- `docs/02-DATABASE.md` — bảng, RPC, RLS
- `docs/03-PHAN-QUYEN.md` — phân quyền
- `docs/04-API.md` — Server Actions
- `docs/05-HUONG-DAN-NODEJS.md` — Node.js cho người mới
