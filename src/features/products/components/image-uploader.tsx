"use client";

import { ArrowLeft, ArrowRight, Camera, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cldUrl } from "@/lib/cloudinary-url";
import { cn } from "@/lib/utils";
import { MAX_IMAGES } from "../constants";
import type { ProductImage } from "../schemas";

const MAX_SIDE = 1600; // ảnh điện thoại 4000px → thu còn 1600px trước khi tải (nhanh hơn nhiều trên 4G)
const MAX_BYTES = 15 * 1024 * 1024;

/** Thu nhỏ ảnh trong trình duyệt → JPEG ~85% */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const webSafe = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  // Ảnh nhỏ, đúng định dạng → giữ nguyên; còn lại (kể cả HEIC của iPhone) → chuyển JPEG
  if (scale === 1 && webSafe && file.size < 1.5 * 1024 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}

async function uploadOne(file: File): Promise<ProductImage> {
  const sigRes = await fetch("/api/upload/signature", { method: "POST" });
  const sig = await sigRes.json();
  if (!sigRes.ok) throw new Error(sig.error ?? "Không lấy được quyền tải ảnh");

  const body = new FormData();
  body.append("file", await downscale(file));
  body.append("api_key", sig.apiKey);
  body.append("timestamp", String(sig.timestamp));
  body.append("signature", sig.signature);
  body.append("folder", sig.folder);
  body.append("allowed_formats", sig.allowed_formats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Tải ảnh thất bại");
  return { url: json.secure_url as string, publicId: json.public_id as string };
}

/** Tải nhiều ảnh, ảnh đầu tiên là ảnh chính; đổi thứ tự, xoá */
export function ImageUploader({
  value,
  onChange,
  onUploaded,
}: {
  value: ProductImage[];
  onChange: (v: ProductImage[]) => void;
  /** báo lên để biết ảnh nào mới tải (dọn dẹp khi huỷ) */
  onUploaded?: (publicId: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const remaining = MAX_IMAGES - value.length;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, remaining);
    if (files.length > remaining) toast.warning(`Chỉ thêm được ${remaining} ảnh nữa (tối đa ${MAX_IMAGES})`);
    let current = value;
    setUploading(list.length);
    for (const f of list) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: không phải ảnh`);
      } else if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: ảnh quá lớn (tối đa 15MB)`);
      } else {
        try {
          const img = await uploadOne(f);
          current = [...current, img];
          onChange(current);
          onUploaded?.(img.publicId);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Tải ảnh thất bại");
        }
      }
      setUploading((n) => n - 1);
    }
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((img, i) => (
          <figure key={img.publicId} className={cn("overflow-hidden rounded-xl border bg-muted", i === 0 && "ring-3 ring-primary")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cldUrl(img.url, 400)!} alt={`Ảnh ${i + 1}`} className="aspect-square w-full object-contain" />
            <figcaption className="flex items-center justify-between gap-1 border-t bg-background p-1">
              {i === 0 ? (
                <span className="flex items-center gap-1 px-1 text-sm font-semibold text-primary">
                  <Star className="size-4 fill-current" /> Ảnh chính
                </span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange([img, ...value.filter((_, j) => j !== i)])}>
                  <Star /> Đặt chính
                </Button>
              )}
              <span className="flex">
                <Button type="button" variant="ghost" size="icon-lg" aria-label="Lên trước" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowLeft />
                </Button>
                <Button type="button" variant="ghost" size="icon-lg" aria-label="Ra sau" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                  <ArrowRight />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Bỏ ảnh"
                  className="text-destructive"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </span>
            </figcaption>
          </figure>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ))}
      </div>

      {remaining > 0 && (
        <div className="grid gap-2 sm:flex">
          <Button type="button" variant="outline" size="xl" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
            <ImagePlus /> Chọn ảnh từ máy
          </Button>
          <Button type="button" variant="outline" size="xl" className="sm:hidden" onClick={() => cameraRef.current?.click()} disabled={uploading > 0}>
            <Camera /> Chụp ảnh
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Tối đa {MAX_IMAGES} ảnh (JPG, PNG, WEBP). Ảnh có viền xanh là ảnh chính hiện ở danh sách. Ảnh lớn sẽ tự thu nhỏ trước khi tải.
      </p>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
