import { BarChart3, History, PackagePlus, Search, Users, Warehouse, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/roles";

export type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[] };

/** Tối đa 6 mục — người lớn tuổi dễ nhớ */
export const NAV_ITEMS: NavItem[] = [
  { href: "/tim-hang", label: "Tìm hàng", icon: Search },
  { href: "/nhap-hang", label: "Nhập hàng", icon: PackagePlus },
  { href: "/lich-su", label: "Lịch sử", icon: History },
  { href: "/kho", label: "Kho & Kệ", icon: Warehouse },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3, roles: ["owner", "admin"] },
  { href: "/nguoi-dung", label: "Người dùng", icon: Users, roles: ["owner", "admin"] },
];

export const navFor = (role: Role) => NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
