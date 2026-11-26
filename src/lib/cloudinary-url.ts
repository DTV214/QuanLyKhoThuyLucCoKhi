/**
 * Thêm phép biến đổi Cloudinary vào URL ảnh: tự chọn định dạng/chất lượng, thu nhỏ theo chiều rộng.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/a.jpg → .../upload/f_auto,q_auto,c_limit,w_400/v123/a.jpg
 */
export function cldUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
