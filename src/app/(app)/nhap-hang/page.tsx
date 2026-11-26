import type { Metadata } from "next";
import { ReceiptForm } from "@/features/inventory";
import { quickSearchProducts } from "@/features/inventory/actions";
import { getLocationOptions, getSuppliers } from "@/features/inventory/queries";
import { getProduct } from "@/features/products/queries";
import { requireUser } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Nhập hàng" };

export default async function ReceivePage({ searchParams }: { searchParams: Promise<{ sp?: string }> }) {
  await requireUser();
  const { sp } = await searchParams;
  const [locations, suppliers, product] = await Promise.all([
    getLocationOptions(),
    getSuppliers(),
    sp ? getProduct(sp) : Promise.resolve(null),
  ]);

  // Mở từ trang mặt hàng ("Nhập thêm hàng này") → điền sẵn dòng đầu
  let initialProduct = null;
  if (product?.isActive) {
    const found = await quickSearchProducts(product.sku);
    initialProduct = found.find((p) => p.id === product.id) ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Nhập hàng</h1>
        <p className="text-base text-muted-foreground">
          Mỗi dòng: chọn mặt hàng → chọn vị trí cất → nhập số lượng. Bấm “Kiểm tra & nhập kho” để xem lại trước khi lưu.
        </p>
      </div>
      {locations.length === 0 ? (
        <p className="rounded-2xl border bg-background p-8 text-center text-lg">
          Chưa có kệ nào để cất hàng. Quản trị cần tạo kho, khu, kệ ở mục Kho & Kệ trước.
        </p>
      ) : (
        <ReceiptForm locations={locations} suppliers={suppliers} initialProduct={initialProduct} />
      )}
    </div>
  );
}
