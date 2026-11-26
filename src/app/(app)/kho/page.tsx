import type { Metadata } from "next";
import { ComingSoon } from "@/components/common/coming-soon";

export const metadata: Metadata = { title: "Kho & Kệ" };

export default function Page() {
  return (
    <ComingSoon
      title="Kho & Kệ"
      phase="Giai đoạn 2"
      items={["Kho 1 – Trong nhà, Kho 2 – Kho lớn", "Thêm khu vực, kệ, số tầng; mã vị trí tự sinh (K1-A-03-T2)", "Xem kệ đang chứa những hàng gì"]}
    />
  );
}
