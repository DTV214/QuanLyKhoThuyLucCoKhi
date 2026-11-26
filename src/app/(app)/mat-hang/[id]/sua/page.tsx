import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/features/products";
import { getProduct, getProductFormOptions } from "@/features/products/queries";
import { requireRole } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Sửa mặt hàng" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["owner", "admin"]);
  const { id } = await params;
  const [product, options] = await Promise.all([getProduct(id), getProductFormOptions()]);
  if (!product) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Sửa mặt hàng</h1>
        <p className="text-base text-muted-foreground">{product.name}</p>
      </div>
      <ProductForm product={product} options={options} />
    </div>
  );
}
