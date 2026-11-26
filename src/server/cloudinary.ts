import "server-only";

import { v2 as cloudinary } from "cloudinary";

const FOLDER = process.env.CLOUDINARY_FOLDER || "kho-thanh-danh";
export const PRODUCT_FOLDER = `${FOLDER}/mat-hang`;
const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

function configured() {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !key || !secret) throw new Error("Thiếu cấu hình Cloudinary trong .env.local");
  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });
  return { cloud, key, secret };
}

/**
 * Chữ ký cho trình duyệt upload thẳng lên Cloudinary (không đi qua server mình).
 * Chỉ ký đúng folder + định dạng cho phép → người dùng không tự đổi nơi lưu được.
 */
export function signProductUpload() {
  const { cloud, key, secret } = configured();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: PRODUCT_FOLDER, timestamp, allowed_formats: ALLOWED_FORMATS };
  const signature = cloudinary.utils.api_sign_request(params, secret);
  return { cloudName: cloud, apiKey: key, signature, ...params };
}

/** Ảnh có thuộc thư mục mặt hàng của mình không (chống xoá ảnh của nơi khác) */
export const isOwnProductImage = (publicId: string) =>
  publicId.startsWith(`${PRODUCT_FOLDER}/`) && !publicId.includes("..");

export async function destroyImages(publicIds: string[]) {
  const ids = publicIds.filter(isOwnProductImage);
  if (ids.length === 0) return;
  configured();
  await Promise.allSettled(ids.map((id) => cloudinary.uploader.destroy(id, { invalidate: true })));
}
