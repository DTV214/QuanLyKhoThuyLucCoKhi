import { NextResponse } from "next/server";
import { MANAGER_ROLES } from "@/lib/roles";
import { authorizeAction } from "@/server/auth/guard";
import { signProductUpload } from "@/server/cloudinary";

// POST /api/upload/signature → chữ ký upload ảnh mặt hàng (chỉ ông chủ / quản trị)
export async function POST() {
  const user = await authorizeAction(MANAGER_ROLES);
  if (!user) return NextResponse.json({ error: "Bạn không có quyền tải ảnh" }, { status: 403 });
  try {
    return NextResponse.json(signProductUpload(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[upload.signature]", e);
    return NextResponse.json({ error: "Chưa cấu hình Cloudinary" }, { status: 500 });
  }
}
