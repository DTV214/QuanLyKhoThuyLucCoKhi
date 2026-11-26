export const ROLES = ["owner", "admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Ông chủ",
  admin: "Quản trị",
  staff: "Nhân viên",
};

export const MANAGER_ROLES: Role[] = ["owner", "admin"];

export const isManager = (role: Role | null | undefined) => role === "owner" || role === "admin";

/** owner quản lý được mọi người; admin chỉ quản lý được staff */
export const canManageUser = (actor: Role, target: Role) =>
  actor === "owner" ? target !== "owner" : actor === "admin" && target === "staff";
