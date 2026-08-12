"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  hideContributionAction,
  showContributionAction,
} from "@/components/article/contribution/actions";
import {
  canContributorEditDongGop,
  type TrangThaiDongGop,
} from "@/lib/article/dong-gop/types";

type Props = {
  idDongGop: string;
  trangThai: TrangThaiDongGop;
  isHidden: boolean;
  onEdit?: () => void;
};

export function ContributionCardOwnerActions({
  idDongGop,
  trangThai,
  isHidden,
  onEdit,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const canEdit = canContributorEditDongGop(trangThai);

  if (trangThai === "nhap" && !onEdit) return null;

  function toggleVisibility() {
    startTransition(async () => {
      const result = isHidden
        ? await showContributionAction({ idDongGop })
        : await hideContributionAction({ idDongGop });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="contrib-card-owner-actions">
      {canEdit && onEdit ? (
        <button
          type="button"
          className="contrib-card-owner-btn contrib-card-owner-btn--edit"
          onClick={onEdit}
        >
          {trangThai === "duoc_duyet" ? "Sửa và gửi duyệt lại" : "Sửa nội dung"}
        </button>
      ) : null}
      {trangThai !== "nhap" ? (
        <button
          type="button"
          className="contrib-card-owner-btn"
          disabled={pending}
          onClick={toggleVisibility}
        >
          {pending
            ? "Đang xử lý…"
            : isHidden
              ? "Hiện lại bản này"
              : "Ẩn bản khỏi danh sách"}
        </button>
      ) : null}
      {trangThai === "duoc_duyet" ? (
        <p className="contrib-card-owner-hint">
          Sau khi sửa, quản trị viên sẽ duyệt lại trước khi bản lên tab Nội dung.
        </p>
      ) : null}
    </div>
  );
}
