"use client";

import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertTriangle, Bell, CheckCheck, ClipboardCheck, PackageMinus, PackagePlus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { markNotificationsRead } from "../actions";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  payload: { product_id?: string; document_id?: string } | null;
  read_at: string | null;
  created_at: string;
};

const ICON: Record<string, typeof Bell> = {
  stock_out: PackageMinus,
  stock_in: PackagePlus,
  low_stock: AlertTriangle,
  adjust: ClipboardCheck,
  account: UserRound,
};

/** Chuông thông báo (ông chủ, quản trị): ai lấy / nhập hàng, hàng sắp hết, kiểm kê. Cập nhật tức thì. */
export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    const { data } = await getBrowserSupabase()
      .from("notifications")
      .select("id, type, title, body, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notification[]);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    void load();
    const channel = supabase
      .channel(`thong-bao-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
          (msg: RealtimePostgresInsertPayload<Notification>) => {
            const n = msg.new;
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 30));
            const show = n.type === "low_stock" ? toast.warning : toast.info;
            show(n.title, { description: n.body ?? undefined, duration: 6000 });
          },
        );
    let cancelled = false;
    void (async () => {
      await supabase.realtime.setAuth();
      if (!cancelled) channel.subscribe();
    })();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await markNotificationsRead("all");
  }

  async function openItem(n: Notification) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      void markNotificationsRead([n.id]);
    }
    if (n.payload?.product_id) {
      setOpen(false);
      router.push(`/mat-hang/${n.payload.product_id}`);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-lg" className="relative size-11" aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-lg font-semibold">Thông báo</p>
          {unread > 0 && (
            <Button variant="ghost" size="lg" onClick={markAll}>
              <CheckCheck /> Đã đọc hết
            </Button>
          )}
        </div>
        <ul className="max-h-[60dvh] overflow-y-auto">
          {items.length === 0 && <li className="p-8 text-center text-base text-muted-foreground">Chưa có thông báo nào.</li>}
          {items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={cn("flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-muted", !n.read_at && "bg-accent/60")}
                >
                  <Icon className={cn("mt-0.5 size-5 shrink-0", n.type === "low_stock" ? "text-amber-600" : "text-primary")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-base leading-snug", !n.read_at && "font-semibold")}>{n.title}</span>
                    {n.body && <span className="block text-sm text-muted-foreground">{n.body}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                    </span>
                  </span>
                  {!n.read_at && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" aria-label="chưa đọc" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
