"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { adminUpdateArticleStatus } from "@/app/admin/actions";

const STATUS_OPTIONS = [
  "published",
  "cho_review",
  "dang_viet",
  "archived",
  "merged",
] as const;

type Props = {
  articleId: string;
  slug: string;
  loaiBaiViet: string;
  status: string;
};

export function AdminArticleStatusSelect({
  articleId,
  slug,
  loaiBaiViet,
  status,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(status);

  useEffect(() => {
    setValue(status);
  }, [status]);

  const onChange = async (next: string) => {
    if (next === value || busy) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await adminUpdateArticleStatus(articleId, slug, loaiBaiViet, next);
    setBusy(false);
    if (!res.ok) {
      setValue(prev);
      return;
    }
    router.refresh();
  };

  return (
    <select
      className={`admin-status-select admin-status-select--${value}${busy ? " admin-status-select--busy" : ""}`}
      value={value}
      disabled={busy}
      aria-label="Trạng thái bài viết"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => void onChange(e.target.value)}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
