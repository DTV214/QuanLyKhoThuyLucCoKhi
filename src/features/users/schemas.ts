import { z } from "zod";

const fullName = z
  .string()
  .trim()
  .min(2, "Họ tên tối thiểu 2 ký tự")
  .max(100, "Họ tên tối đa 100 ký tự");

/** SĐT không bắt buộc; nếu nhập thì 8–15 ký tự gồm số, dấu cách, dấu + */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .refine((v) => v === "" || /^[0-9+ ]{8,15}$/.test(v), "Số điện thoại không hợp lệ")
  .optional()
  .transform((v) => (v ? v : null));

/** Role được phép tạo/gán qua giao diện (ông chủ chỉ có 1, không tạo thêm) */
export const ASSIGNABLE_ROLES = ["admin", "staff"] as const;
const assignableRole = z.enum(ASSIGNABLE_ROLES, { error: "Vui lòng chọn quyền" });

export const createUserSchema = z.object({
  fullName,
  email: z.email({ error: "Email không hợp lệ" }).trim().toLowerCase(),
  phone,
  role: assignableRole,
});

export const updateUserInfoSchema = z.object({
  id: z.uuid(),
  fullName,
  phone,
});

export const changeRoleSchema = z.object({ id: z.uuid(), role: assignableRole });
export const userIdSchema = z.object({ id: z.uuid() });
export const setLockedSchema = z.object({ id: z.uuid(), locked: z.boolean() });

export type CreateUserInput = z.input<typeof createUserSchema>;
