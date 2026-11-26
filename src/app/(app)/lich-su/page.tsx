import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Lịch sử" };

export default function Page() {
  return (
    <ComingSoon
      title="Lịch sử nhập / xuất"
      phase="Giai đoạn 7"
      items={["Ai lấy / nhập gì, lúc nào, ở đâu", "Lọc theo ngày, mặt hàng, người", "Quản trị huỷ thao tác sai bằng phiếu đảo"]}
    />
  );
}
