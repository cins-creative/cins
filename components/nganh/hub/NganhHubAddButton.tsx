"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createNganhFromHub } from "@/app/nganh/actions";
import { useNganhHubEdit } from "@/components/nganh/hub/NganhHubEditContext";

type Props = {
  nhomId: string | null;
  sectionTitle: string;
};

export function NganhHubAddButton({ nhomId, sectionTitle }: Props) {
  const hub = useNganhHubEdit();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titleVi, setTitleVi] = useState("");
  const [maNganh, setMaNganh] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hub?.isEditing) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    const res = await createNganhFromHub({
      tieu_de_viet: titleVi,
      ma_nganh: maNganh || undefined,
      nhomId,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    hub.showToast(`Đã tạo ngành «${titleVi.trim()}».`);
    setOpen(false);
    setTitleVi("");
    setMaNganh("");
    router.refresh();
    router.push(`/nganh-hoc/${res.slug}`);
  };

  const Wrap = "div" as const;
  const Panel = "div" as const;
  const Actions = "div" as const;

  return (
    <Wrap className="hn-hub-add-wrap">
      <button
        type="button"
        className="hn-hub-add-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        + Thêm ngành
        {sectionTitle ? ` · ${sectionTitle}` : ""}
      </button>
      {open ? (
        <Panel className="hn-hub-add-panel" role="dialog" aria-label="Thêm ngành mới">
          <label className="hn-hub-add-field">
            <span>Tên ngành (tiếng Việt)</span>
            <input
              value={titleVi}
              onChange={(e) => setTitleVi(e.target.value)}
              placeholder="Ví dụ: Thiết kế đồ họa"
              autoFocus
            />
          </label>
          <label className="hn-hub-add-field">
            <span>Mã ngành (tùy chọn)</span>
            <input
              value={maNganh}
              onChange={(e) => setMaNganh(e.target.value)}
              placeholder="7210104"
            />
          </label>
          {error ? (
            <p className="hn-hub-add-err" role="alert">
              {error}
            </p>
          ) : null}
          <Actions className="hn-hub-add-actions">
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-admin"
              disabled={busy || !titleVi.trim()}
              onClick={() => void submit()}
            >
              {busy ? "Đang tạo…" : "Tạo & mở trang ngành"}
            </button>
            <button
              type="button"
              className="tdh-mode-btn tdh-mode-btn-viewer"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
          </Actions>
          <p className="hn-hub-add-note">
            Ngành mới xuất bản ngay trên hub. Sau khi tạo bạn có thể sửa đầy đủ trên{" "}
            <Link href="/nganh-hoc">trang chi tiết</Link>.
          </p>
        </Panel>
      ) : null}
    </Wrap>
  );
}
