"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  hideContributionAction,
  showContributionAction,
} from "@/components/article/contribution/actions";
import type { TrangThaiDongGop } from "@/lib/article/dong-gop/types";

type Props = {
  idDongGop: string;
  trangThai: TrangThaiDongGop;
  isHidden: boolean;
};

export function ContributionCardOwnerActions({
  idDongGop,
  trangThai,
  isHidden,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (trangThai === "nhap") return null;

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
    </div>
  );
}
