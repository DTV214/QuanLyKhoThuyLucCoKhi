import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { COMPANY_NAME } from "@/components/layout/logo";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: COMPANY_NAME, template: `%s · ${COMPANY_NAME}` },
  description: "Hệ thống quản lý kho linh kiện thủy lực, khí nén, cơ khí",
  robots: { index: false, follow: false }, // web nội bộ, không cho Google lập chỉ mục
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "text-base" }} />
      </body>
    </html>
  );
}
