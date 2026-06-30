"use client";

import { useBaiDangActions } from "@/components/truong/inline/TruongBaiDangEdit";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { isElevatedRole } from "@/lib/auth/system-role-labels";
import {
  baiDangDateInputValue,
  formatBaiDangDate,
} from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  post: TruongBaiDang;
};

export function OrgBaiDangPublishedDate({ post }: Props) {
  const actions = useBaiDangActions();
  const ctx = useTruongInlineEdit();
  const dateLabel = formatBaiDangDate(post.tao_luc);

  // Chỉ curator / admin CINs mới được sửa ngày đăng — owner (thanh_vien) chỉ xem.
  const canEditDate = Boolean(actions) && isElevatedRole(ctx?.systemRole);

  if (!canEditDate) {
    return dateLabel ? <small>{dateLabel}</small> : null;
  }

  return (
    <input
      type="date"
      className="org-baidang-date-edit"
      value={baiDangDateInputValue(post.tao_luc)}
      onChange={(e) => void actions?.updateTaoLuc(post.id, e.target.value)}
      aria-label="Ngày đăng"
    />
  );
}
