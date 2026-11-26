import type { Metadata } from "next";
import { PackagePlus, SearchX } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { GridPattern } from "@/components/magic/grid-pattern";
import { Button } from "@/components/ui/button";
import { ProductCard, SearchFilters } from "@/features/products";
import { getProductFormOptions, searchProducts } from "@/features/products/queries";
import { searchFiltersSchema } from "@/features/products/schemas";
import { isManager } from "@/lib/roles";
import { requireUser } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Tìm hàng" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const filters = searchFiltersSchema.parse(raw);
  const [options, { hits, total, limit }] = await Promise.all([getProductFormOptions(), searchProducts(filters)]);
  const canEdit = isManager(user.role);
  const hasCondition = Object.entries(filters).some(([k, v]) => k !== "so" && v !== undefined);

  const moreParams = new URLSearchParams(Object.entries(raw).filter(([, v]) => v) as [string, string][]);
  moreParams.set("so", String(Math.min(limit + 30, 100)));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="bg-brand-gradient relative overflow-hidden rounded-3xl px-5 py-6 text-white sm:px-8 sm:py-8">
        <GridPattern className="text-white/[0.06]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-white/80">Xin chào, {user.fullName}</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Bạn cần tìm hàng gì?</h1>
          </div>
          {canEdit && (
            <Button asChild size="xl" variant="secondary" className="w-full sm:w-auto">
              <Link href="/mat-hang/moi">
                <PackagePlus /> Thêm mặt hàng
              </Link>
            </Button>
          )}
        </div>
      </section>

      <Suspense>
        <SearchFilters options={options} />
      </Suspense>

      <p className="text-base text-muted-foreground" aria-live="polite">
        {total === 0
          ? hasCondition
            ? "Không tìm thấy mặt hàng phù hợp."
            : "Chưa có mặt hàng nào."
          : `Tìm thấy ${total} mặt hàng${total > hits.length ? `, đang hiện ${hits.length}` : ""}.`}
      </p>

      {hits.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-background p-10 text-center">
          <SearchX className="size-12 text-muted-foreground" />
          <p className="text-lg">
            {hasCondition ? "Thử gõ ít chữ hơn, gõ không dấu, hoặc bỏ bớt bộ lọc." : canEdit ? "Bấm \"Thêm mặt hàng\" để bắt đầu." : "Nhờ quản trị thêm mặt hàng vào hệ thống."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
          {hits.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {total > hits.length && limit < 100 && (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="xl">
            <Link href={`/tim-hang?${moreParams.toString()}`} scroll={false}>
              Xem thêm
            </Link>
          </Button>
        </div>
      )}
      {total > hits.length && limit >= 100 && (
        <p className="text-center text-muted-foreground">Có nhiều kết quả, hãy gõ cụ thể hơn hoặc dùng bộ lọc.</p>
      )}
    </div>
  );
}
