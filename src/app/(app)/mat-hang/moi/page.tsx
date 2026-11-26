import type { Metadata } from "next";
import { ProductForm } from "@/features/products";
import { getProductFormOptions } from "@/features/products/queries";
import { requireRole } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Thêm mặt hàng" };

export default async function NewProductPage() {
  await requireRole(["owner", "admin"]);
  const options = await getProductFormOptions();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Thêm mặt hàng</h1>
        <p className="text-base text-muted-foreground">
          Chỉ cần điền mục 1 là lưu được. Các mục còn lại điền càng đủ thì tìm kiếm và lọc càng chính xác.
        </p>
      </div>
      <ProductForm product={null} options={options} />
    </div>
  );
}
