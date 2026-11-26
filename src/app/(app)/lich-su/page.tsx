import type { Metadata } from "next";
import { History } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { HistoryFilters, HistoryList } from "@/features/history";
import { DEFAULT_DAYS, listMovements, listPeople, shiftDate } from "@/features/history/queries";
import { historyFiltersSchema } from "@/features/history/schemas";
import { todayISO } from "@/lib/date";
import { isManager } from "@/lib/roles";
import { requireUser } from "@/server/auth/guard";
import { createServerSupabase } from "@/server/supabase/server";

export const metadata: Metadata = { title: "Lịch sử" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const f = historyFiltersSchema.parse(raw);
  const manager = isManager(user.role);
  const today = todayISO();

  const supabase = await createServerSupabase();
  const [{ rows, hasMore, limit }, people, product] = await Promise.all([
    listMovements(f, today),
    manager ? listPeople() : Promise.resolve(null),
    f.sp ? supabase.from("products").select("name").eq("id", f.sp).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ]);

  const more = new URLSearchParams(Object.entries(raw).filter(([, v]) => v) as [string, string][]);
  more.set("so", String(Math.min(limit + 50, 500)));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Lịch sử nhập / lấy hàng</h1>
        <p className="text-base text-muted-foreground">
          {manager
            ? "Mọi thao tác của mọi người. Ghi nhầm thì bấm “Huỷ” để đưa số tồn về như trước (lịch sử cũ vẫn giữ)."
            : "Các thao tác bạn đã làm. Ghi nhầm thì báo quản trị để huỷ."}{" "}
          Mặc định hiện {DEFAULT_DAYS} ngày gần nhất.
        </p>
      </div>

      <Suspense>
        <HistoryFilters defaultFrom={shiftDate(today, -DEFAULT_DAYS)} defaultTo={today} people={people} productName={product?.name ?? null} />
      </Suspense>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-background p-10 text-center">
          <History className="size-12 text-muted-foreground" />
          <p className="text-lg">Không có thao tác nào trong khoảng này.</p>
        </div>
      ) : (
        <HistoryList rows={rows} canReverse={manager} />
      )}

      {hasMore && limit < 500 && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="xl">
            <Link href={`/lich-su?${more.toString()}`} scroll={false}>Xem thêm</Link>
          </Button>
        </div>
      )}
      {hasMore && limit >= 500 && <p className="text-center text-muted-foreground">Còn nhiều hơn 500 dòng — thu hẹp khoảng ngày hoặc lọc thêm.</p>}
    </div>
  );
}
