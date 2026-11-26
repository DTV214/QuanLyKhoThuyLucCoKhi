import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/coming-soon";
import { requireRole } from "@/server/auth/guard";

export const metadata: Metadata = { title: "Báo cáo" };

export default async function Page() {
  await requireRole(["owner", "admin"]);
  return (
    <ComingSoon
      title="Báo cáo"
      phase="Giai đoạn 7"
      items={["Tổng mặt hàng, hàng sắp hết, nhập/xuất hôm nay", "Biểu đồ 30 ngày, top hàng xuất nhiều", "Xuất Excel tồn kho"]}
    />
  );
}
