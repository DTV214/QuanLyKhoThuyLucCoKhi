import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CatalogView } from "@/features/catalog";
import { getCatalog } from "@/features/catalog/queries";
import { requireRole } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Danh mục hàng hoá" };

export default async function CatalogPage() {
  const user = await requireRole(["owner", "admin"]);
  const catalog = await getCatalog();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button asChild variant="ghost" size="lg">
        <Link href="/kho">
          <ArrowLeft /> Về Kho & Kệ
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Danh mục hàng hoá</h1>
        <p className="text-base text-muted-foreground">
          Loại hàng, thương hiệu, vật liệu, xuất xứ, đơn vị tính, nhà cung cấp — dùng để chọn khi thêm mặt hàng.
          {user.role !== "owner" && " Chỉ ông chủ được xoá."}
        </p>
      </div>
      <CatalogView catalog={catalog} canDelete={user.role === "owner"} />
    </div>
  );
}
