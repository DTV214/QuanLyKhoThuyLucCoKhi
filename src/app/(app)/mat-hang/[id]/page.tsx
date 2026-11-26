import type { Metadata } from "next";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connectionText, dimsText, ProductGallery, ProductStatusButton, tempText, weightText } from "@/features/products";
import { getProduct } from "@/features/products/queries";
import { formatDateTime } from "@/lib/date";
import { formatQty } from "@/lib/format";
import { isManager } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/guard";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).id);
  return { title: p?.name ?? "Mặt hàng" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const p = await getProduct((await params).id);
  if (!p) notFound();
  const canEdit = isManager(user.role);
  const unit = p.unitName.toLowerCase();
  const low = p.minStock > 0 && p.totalQuantity <= p.minStock;

  const rows: [string, React.ReactNode][] = [
    ["Loại hàng", p.categoryName],
    ["Thương hiệu", p.brandName],
    ["Xuất xứ", p.countryName],
    ["Tiêu chuẩn", p.qualityStandard],
    ["Vật liệu", p.materialName],
    ["Đầu nối", connectionText(p.connectionA, p.connectionB)],
    ["Cỡ / quy cách", p.size],
    ["Nhiệt độ làm việc", tempText(p.tempMin, p.tempMax)],
    ["Áp suất tối đa", p.pressureMax !== null ? `${formatQty(p.pressureMax)} bar` : null],
    [
      "Môi chất sử dụng",
      p.media.length ? (
        <span className="flex flex-wrap gap-1.5">
          {p.media.map((m) => (
            <Badge key={m} variant="secondary" className="text-sm">{m}</Badge>
          ))}
        </span>
      ) : null,
    ],
    ...p.specSchema.map((f): [string, React.ReactNode] => {
      const val = p.specs[f.key];
      return [f.unit ? `${f.label} (${f.unit})` : f.label, val === undefined || val === "" ? null : String(val)];
    }),
    ["Kích thước (D × R × C)", dimsText(p.lengthMm, p.widthMm, p.heightMm)],
    ["Khối lượng / 1 " + unit, weightText(p.weightG)],
    ["Mã của hãng", p.partNumber],
    ["Tên gốc", p.originalName],
  ];
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Button asChild variant="ghost" size="lg">
        <Link href="/tim-hang">
          <ArrowLeft /> Về Tìm hàng
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <ProductGallery images={p.images} name={p.name} />

        <div className="min-w-0 space-y-5">
          <div className="space-y-2">
            {!p.isActive && <Badge variant="destructive" className="text-sm">Đã ngừng kinh doanh</Badge>}
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{p.name}</h1>
            <p className="font-mono text-base text-muted-foreground">Mã: {p.sku}</p>
          </div>

          {/* Tồn kho */}
          <Card className={cn(low && "border-amber-300")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-baseline gap-x-3 text-xl">
                Tồn kho:
                <span className={cn("text-3xl", p.totalQuantity === 0 ? "text-destructive" : low ? "text-amber-700" : "text-emerald-700")}>
                  {formatQty(p.totalQuantity)} {unit}
                </span>
                {low && <span className="text-base font-medium text-amber-700">Sắp hết (tối thiểu {formatQty(p.minStock)})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {p.stock.length === 0 ? (
                <p className="text-muted-foreground">Chưa có hàng trong kho. Nhập hàng ở menu “Nhập hàng” (giai đoạn 5).</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {p.stock.map((s) => (
                    <li key={s.location_id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-mono text-lg font-bold text-primary">
                          <MapPin className="size-4" /> {s.code}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {s.warehouse} › {s.zone} › Kệ {s.rack} › Tầng {s.level}
                        </span>
                      </span>
                      <span className="shrink-0 text-lg font-semibold">{formatQty(s.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {canEdit && (
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button asChild size="xl">
                <Link href={`/mat-hang/${p.id}/sua`}>
                  <Pencil /> Sửa mặt hàng
                </Link>
              </Button>
              <ProductStatusButton id={p.id} active={p.isActive} name={p.name} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Thông số kỹ thuật</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              {shown.map(([k, val]) => (
                <div key={k} className="grid grid-cols-[minmax(0,40%)_1fr] gap-3 py-2.5 text-base">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 font-medium break-words">{val}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Mô tả</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base whitespace-pre-line">{p.description || "Chưa có mô tả."}</p>
            {p.note && canEdit && (
              <p className="rounded-xl bg-muted p-3 text-sm">
                <b>Ghi chú nội bộ:</b> {p.note}
              </p>
            )}
            <p className="text-sm text-muted-foreground">Cập nhật lần cuối: {formatDateTime(p.updatedAt)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
