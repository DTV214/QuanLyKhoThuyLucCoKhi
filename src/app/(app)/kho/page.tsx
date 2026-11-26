import type { Metadata } from "next";
import { Tags } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WarehouseMap } from "@/features/locations";
import { getWarehouseTree } from "@/features/locations/queries";
import { isManager } from "@/lib/roles";
import { requireUser } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Kho & Kệ" };

export default async function WarehousePage() {
  const user = await requireUser();
  const tree = await getWarehouseTree();
  const canEdit = isManager(user.role);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kho & Kệ</h1>
          <p className="text-base text-muted-foreground">
            Sơ đồ Kho → Khu vực → Kệ → Tầng. Bấm vào một kệ để xem từng tầng và mã vị trí.
          </p>
        </div>
        {canEdit && (
          <Button asChild variant="outline" size="xl">
            <Link href="/danh-muc">
              <Tags /> Danh mục hàng hoá
            </Link>
          </Button>
        )}
      </div>
      <WarehouseMap tree={tree} canEdit={canEdit} />
    </div>
  );
}
