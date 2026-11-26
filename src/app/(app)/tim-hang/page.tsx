import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ComingSoon } from "@/components/common/coming-soon";
import { GridPattern } from "@/components/magic/grid-pattern";
import { requireUser } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Tìm hàng" };

export default async function SearchPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="bg-brand-gradient relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10">
        <GridPattern className="text-white/[0.06]" />
        <div className="relative space-y-5">
          <div>
            <p className="text-white/80">Xin chào, {user.fullName}</p>
            <h1 className="text-3xl font-bold">Bạn cần tìm hàng gì?</h1>
          </div>
          <div className="flex h-14 items-center gap-3 rounded-2xl bg-white px-5 text-lg text-muted-foreground shadow-lg">
            <Search className="size-6 text-primary" />
            Ví dụ: hạt bắp 316 1/4, con tán parker, K1-A-03…
          </div>
        </div>
      </section>
      <ComingSoon
        title="Kết quả tìm kiếm"
        phase="Giai đoạn 4"
        items={[
          "Tìm không dấu, gõ sai nhẹ vẫn ra (đã có sẵn hàm fn_search_products trong database)",
          "Lọc theo Kho 1 / Kho 2, loại hàng, hãng, vật liệu, sắp hết",
          "Thẻ hàng hiển thị vị trí Kho › Khu › Kệ › Tầng và số lượng",
          "Nút \"Lấy hàng\" mở hộp xác nhận số lượng",
        ]}
      />
    </div>
  );
}
