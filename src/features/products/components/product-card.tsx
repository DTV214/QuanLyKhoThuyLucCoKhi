import { MapPin, Package, Thermometer } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cldUrl } from "@/lib/cloudinary-url";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import { connectionText, tempText } from "../format";
import type { ProductHit } from "../queries";

/** Thẻ mặt hàng trong kết quả tìm kiếm: ảnh, tên, thông số chính, tồn kho + vị trí */
export function ProductCard({ p }: { p: ProductHit }) {
  const low = p.min_stock > 0 && p.total_quantity <= p.min_stock;
  const conn = connectionText(p.connection_a, p.connection_b);
  const temp = tempText(p.temp_min, p.temp_max);
  const top = p.locations.slice(0, 2);

  return (
    <Link
      href={`/mat-hang/${p.id}`}
      className="group flex min-w-0 gap-3 rounded-2xl border bg-background p-3 transition-all hover:border-primary hover:shadow-md sm:gap-4 sm:p-4"
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-xl border bg-white sm:size-28">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cldUrl(p.image_url, 240)!} alt="" loading="lazy" className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Package className="size-10" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold break-words group-hover:text-primary">{p.name}</h3>
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-mono">{p.sku}</span>
          {p.brand_name && ` · ${p.brand_name}`}
          {p.country_name && ` · ${p.country_name}`}
        </p>
        <div className="flex flex-wrap gap-1.5 [&>*]:max-w-full [&>*]:truncate">
          <Badge variant="secondary">{p.category_name}</Badge>
          {p.material_name && <Badge variant="secondary">{p.material_name}</Badge>}
          {conn && <Badge variant="outline">{conn}</Badge>}
          {temp && (
            <Badge variant="outline" className="gap-1">
              <Thermometer className="size-3" /> {temp}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          <span className={cn("text-base font-bold", p.total_quantity === 0 ? "text-destructive" : low ? "text-amber-700" : "text-emerald-700")}>
            {p.total_quantity === 0 ? "Hết hàng" : `Còn ${formatQty(p.total_quantity)} ${p.unit_name.toLowerCase()}`}
            {low && p.total_quantity > 0 && " · sắp hết"}
          </span>
          {top.map((l) => (
            <span key={l.location_id} className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              <span className="font-mono font-medium text-foreground">{l.code}</span> ({formatQty(l.quantity)})
            </span>
          ))}
          {p.locations.length > 2 && <span className="text-sm text-muted-foreground">+{p.locations.length - 2} vị trí</span>}
        </div>
      </div>
    </Link>
  );
}
