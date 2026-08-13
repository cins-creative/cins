"use client";

import type { ReactNode } from "react";

import { entityKindMatchesTab } from "@/lib/search/filter-hits";
import type { SearchEntityKind } from "@/lib/search/types";

import { useTimKiemStream } from "./TimKiemStreamContext";

type Props = {
  entityKind: SearchEntityKind;
  children: ReactNode;
};

/**
 * Ẩn/hiện cả boundary (skeleton + kết quả) theo tab đang chọn. Giữ children
 * mounted (chỉ `display:none`) để dữ liệu đã stream vẫn được đăng ký và chuyển
 * tab là tức thì.
 */
export function TimKiemSectionSlot({ entityKind, children }: Props) {
  const { activeKind } = useTimKiemStream();
  const visible =
    activeKind === "all" || entityKindMatchesTab(entityKind, activeKind);

  return (
    <div className="tk-slot" hidden={!visible}>
      {children}
    </div>
  );
}
