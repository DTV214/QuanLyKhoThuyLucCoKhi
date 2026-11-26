"use client";

import { Package } from "lucide-react";
import { useState } from "react";
import { cldUrl } from "@/lib/cloudinary-url";
import { cn } from "@/lib/utils";
import type { ProductImage } from "../schemas";

/* eslint-disable @next/next/no-img-element -- ảnh Cloudinary đã tự tối ưu bằng f_auto,q_auto */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border bg-muted text-muted-foreground">
        <Package className="size-20" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <a href={current.url} target="_blank" rel="noreferrer" title="Mở ảnh gốc">
        <img src={cldUrl(current.url, 900)!} alt={name} className="aspect-square w-full rounded-2xl border bg-white object-contain" />
      </a>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.publicId}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              className={cn("size-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white", i === active ? "border-primary" : "border-transparent")}
            >
              <img src={cldUrl(img.url, 160)!} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
