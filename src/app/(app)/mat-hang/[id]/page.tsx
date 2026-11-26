import type { Metadata } from "next";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockPanel } from "@/features/inventory";
import { getLocationOptions } from "@/features/inventory/queries";
import { connectionText, dimsText, ProductGallery, ProductStatusButton, tempText, weightText } from "@/features/products";
import { getProduct } from "@/features/products/queries";
import { formatDateTime } from "@/lib/date";
import { formatQty } from "@/lib/format";
import { isManager } from "@/lib/roles";
import { requireUser } from "@/server/auth/guard";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProduct((await params).id);
  return { title: p?.name ?? "Mặt hàng" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const [p, locations] = await Promise.all([getProduct((await params).id), getLocationOptions()]);
  if (!p) notFound();
  const canEdit = isManager(user.role);
  const unit = p.unitName.toLowerCase();

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
    ...p.extraSpecs.map((e): [string, React.ReactNode] => [e.label, e.value]),
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

          <StockPanel
            product={{ id: p.id, name: p.name, sku: p.sku, unitName: p.unitName, allowDecimal: p.allowDecimal }}
            stock={p.stock}
            minStock={p.minStock}
            locations={locations}
            canAdjust={canEdit}
            active={p.isActive}
          />

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
