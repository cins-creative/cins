import clsx from "clsx";

import {
  LOAI_BADGE_CLASS,
  LOAI_LABELS,
} from "@/lib/articles/labels";
import type { LoaiBaiViet } from "@/lib/articles/types";

const ALLOWED_LOAI: LoaiBaiViet[] = [
  "linh_vuc",
  "nghe",
  "keyword",
  "phan_mem",
  "mon_hoc",
  "blog",
  "event",
  "nganh_dao_tao",
];

function normalizeLoai(raw: string): LoaiBaiViet {
  return ALLOWED_LOAI.includes(raw as LoaiBaiViet)
    ? (raw as LoaiBaiViet)
    : "blog";
}

export function ArticleLoaiBadge({
  loai,
  className,
}: {
  loai: LoaiBaiViet | string;
  className?: string;
}) {
  const l = normalizeLoai(String(loai));
  const label = LOAI_LABELS[l] ?? String(loai);
  const tone = LOAI_BADGE_CLASS[l] ?? "bg-zinc-100 text-zinc-700";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
