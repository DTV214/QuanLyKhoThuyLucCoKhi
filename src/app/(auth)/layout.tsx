import { Boxes, Search, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { GridPattern } from "@/components/magic/grid-pattern";

const HIGHLIGHTS = [
  { icon: Search, text: "Tìm hàng theo tên, mã, cỡ, mã kệ — gõ không dấu vẫn ra" },
  { icon: Boxes, text: "Biết ngay hàng ở Kho nào, Kệ nào, Tầng mấy" },
  { icon: ShieldCheck, text: "Số lượng tự trừ khi lấy hàng, cập nhật tức thì" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[1.1fr_1fr]">
      {/* Banner gradient xanh chìm */}
      <aside className="bg-brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <GridPattern className="text-white/[0.07] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_75%)]" />
        <Logo inverted className="relative" />
        <div className="relative max-w-lg space-y-8">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Quản lý kho linh kiện thủy lực, khí nén & cơ khí
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-lg text-white/90">
                <span className="mt-0.5 rounded-lg bg-white/15 p-2 ring-1 ring-white/20">
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">Kho 1 – Trong nhà · Kho 2 – Kho lớn</p>
      </aside>

      <main className="bg-brand-soft flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
