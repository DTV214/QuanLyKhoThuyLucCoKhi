import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Nhập hàng" };

export default function Page() {
  return (
    <ComingSoon
      title="Nhập hàng"
      phase="Giai đoạn 5"
      items={["Phiếu nhập nhiều dòng, ngày mặc định hôm nay", "Chọn vị trí cất: Kho › Khu › Kệ › Tầng", "Nhà cung cấp, số hoá đơn, ảnh phiếu"]}
    />
  );
}
