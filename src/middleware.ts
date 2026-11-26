import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

// Trang không cần đăng nhập
const PUBLIC_PATHS = ["/dang-nhap", "/quen-mat-khau", "/dat-lai-mat-khau", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Chưa cấu hình Supabase: chỉ cho xem trang đăng nhập (sẽ hiện hướng dẫn cấu hình)
  if (!isSupabaseConfigured) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/dang-nhap", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Làm mới phiên đăng nhập (bắt buộc gọi getUser để xác thực token với Supabase)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = new URL("/dang-nhap", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/dang-nhap") {
    return NextResponse.redirect(new URL("/tim-hang", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
