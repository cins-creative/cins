"use client";

import { useRef, type ReactNode } from "react";

import { useLotManHinhTracker } from "@/lib/social/track-su-kien";

type Props = {
  idSanPham: string;
  enabled: boolean;
  children: ReactNode;
  className?: string;
};

/** Bọc thumb kiosk — ghi `lot_man_hinh` khi lọt màn. */
export function ShopKioskTrackThumb({
  idSanPham,
  enabled,
  children,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useLotManHinhTracker(ref, idSanPham, enabled);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
