import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/server/supabase/server";

// Link trong email (đặt lại mật khẩu / lời mời) trỏ về đây kèm ?code=...
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/tim-hang";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/tim-hang";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/dang-nhap?loi=link-het-han`);
}
