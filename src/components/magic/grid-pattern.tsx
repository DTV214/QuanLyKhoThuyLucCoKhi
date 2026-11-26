"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Lưới chìm có vài ô sáng nhấp nháy (lấy ý tưởng Grid Pattern của Magic UI).
 * Chỉ dùng trang trí nền banner — không chặn thao tác (pointer-events-none).
 */
const CELLS: Array<[number, number]> = [
  [2, 3], [5, 1], [7, 6], [10, 2], [12, 8], [3, 9], [9, 11], [14, 4], [6, 13], [16, 10],
];

export function GridPattern({ className, size = 44 }: { className?: string; size?: number }) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <svg aria-hidden="true" className={cn("pointer-events-none absolute inset-0 size-full", className)}>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <path d={`M${size} 0H0V${size}`} fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {CELLS.map(([x, y], i) => (
        <motion.rect
          key={i}
          x={x * size + 1}
          y={y * size + 1}
          width={size - 1}
          height={size - 1}
          fill="currentColor"
          initial={{ opacity: 0 }}
          animate={reduce ? { opacity: 0.25 } : { opacity: [0, 0.6, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.7, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
