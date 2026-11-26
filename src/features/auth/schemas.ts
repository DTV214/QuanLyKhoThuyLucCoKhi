import { z } from "zod";

const email = z.email({ error: "Email không hợp lệ" }).trim().toLowerCase();

/** Mật khẩu mới: ≥ 8 ký tự, có chữ và số */
export const newPasswordField = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất 1 chữ cái")
  .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 chữ số");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const setPasswordSchema = z
  .object({
    password: newPasswordField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Hai mật khẩu không khớp" });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    password: newPasswordField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Hai mật khẩu không khớp" })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "Mật khẩu mới phải khác mật khẩu cũ" });

export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
