import { cn } from "@/lib/utils";

export const COMPANY_NAME = "Kho Công ty Thành Danh VMC";

/** Biểu tượng: con tán lục giác + chữ TD */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-10 shrink-0", className)}>
      {/* Không dùng <linearGradient id>: 2 logo cùng trang (1 cái bị ẩn) sẽ trùng id và mất màu */}
      <path d="M24 2 43 13v22L24 46 5 35V13z" fill="#1E5AA8" />
      <path d="M24 2 43 13v11L5 24V13z" fill="#3B82F6" fillOpacity=".55" />
      <path d="M24 9.5 36.6 16.8v14.4L24 38.5 11.4 31.2V16.8z" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
      <text x="24" y="29.5" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="inherit">
        TD
      </text>
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className={cn("text-xs font-medium uppercase tracking-wider", inverted ? "text-white/70" : "text-muted-foreground")}>
          Kho Công ty
        </div>
        <div className={cn("text-lg font-bold", inverted ? "text-white" : "text-primary")}>Thành Danh VMC</div>
      </div>
    </div>
  );
}
