import "server-only";

import { randomInt } from "node:crypto";

// Bỏ các ký tự dễ nhầm khi đọc cho người khác nghe: l, o, i / 0, 1
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

const pick = (alphabet: string, n: number) =>
  Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join("");

/**
 * Mật khẩu tạm dễ đọc, vd "TDkmqp4827" (10 ký tự, có chữ + số, ~37 bit).
 * Người dùng BẮT BUỘC đổi ở lần đăng nhập đầu.
 */
export function generateTempPassword(): string {
  return `TD${pick(LETTERS, 4)}${pick(DIGITS, 4)}`;
}
