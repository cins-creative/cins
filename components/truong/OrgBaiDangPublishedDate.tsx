"use client";

import { formatBaiDangDate } from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
};

/** Ngày đăng chỉ hiển thị — không cho sửa (kể cả admin / curator). */
export function OrgBaiDangPublishedDate({ post }: Props) {
  const dateLabel = formatBaiDangDate(post.tao_luc);
  return dateLabel ? <small>{dateLabel}</small> : null;
}
