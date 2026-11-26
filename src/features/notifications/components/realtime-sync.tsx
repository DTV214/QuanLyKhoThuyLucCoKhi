"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Các trang hiển thị số tồn → cần tự làm mới khi người khác nhập/lấy hàng */
const LIVE_PATHS = ["/tim-hang", "/mat-hang/", "/kho"];

/**
 * Lắng nghe thay đổi bảng tồn kho (Supabase Realtime, theo quyền RLS của người xem).
 * Có thay đổi → chờ 1 giây (gom nhiều thay đổi liền nhau) → làm mới dữ liệu trang.
 * router.refresh() giữ nguyên chữ đang gõ và hộp thoại đang mở.
 */
export function RealtimeSync() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingWhileHidden = false;

    const refresh = () => {
      if (!LIVE_PATHS.some((p) => pathRef.current.startsWith(p))) return;
      if (document.hidden) {
        pendingWhileHidden = true; // tab đang ẩn → làm mới khi quay lại
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 1000);
    };
    const onVisible = () => {
      if (!document.hidden && pendingWhileHidden) {
        pendingWhileHidden = false;
        refresh();
      }
    };

    // Tên kênh riêng cho mỗi lần gắn: tránh trùng kênh cũ chưa kịp gỡ (React dev chạy effect 2 lần)
    const channel = supabase
      .channel(`ton-kho-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, refresh);
    let cancelled = false;
    void (async () => {
      await supabase.realtime.setAuth(); // dùng phiên đăng nhập hiện tại → RLS áp dụng
      if (!cancelled) channel.subscribe();
    })();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
