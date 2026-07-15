"use client";

import { Loader2, Settings2, X } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { CongDongTopicPicker } from "@/components/cong-dong/CongDongTopicPicker";
import type {
  CongDongCategory,
  CongDongLinhVuc,
} from "@/lib/cong-dong/types";

type PanelProps = {
  active: boolean;
  orgId: string;
  categories: CongDongCategory[];
  linhVucs: CongDongLinhVuc[];
  onSaved: (next: {
    categories: CongDongCategory[];
    linhVucs: CongDongLinhVuc[];
  }) => void;
  /** Khi nhúng trong bảng quản lý — ẩn nút Huỷ (đóng bằng modal cha). */
  embedded?: boolean;
  onCancel?: () => void;
};

export function CongDongGroupSettingsPanel({
  active,
  orgId,
  categories,
  linhVucs,
  onSaved,
  embedded = false,
  onCancel,
}: PanelProps) {
  const [draftCategories, setDraftCategories] = useState(categories);
  const [draftLinhVucs, setDraftLinhVucs] = useState(linhVucs);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!active) return;
    setDraftCategories(
      categories.filter((c) => c.loaiBaiViet === "nganh_dao_tao"),
    );
    setDraftLinhVucs(linhVucs);
    setErr(null);
  }, [active, categories, linhVucs]);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const [catRes, lvRes] = await Promise.all([
        fetch(`/api/cong-dong/${orgId}/categories`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleIds: draftCategories.map((c) => c.id),
          }),
        }),
        fetch(`/api/cong-dong/${orgId}/linh-vuc`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linhVucIds: draftLinhVucs.map((v) => v.id),
          }),
        }),
      ]);

      const catJson = (await catRes.json().catch(() => null)) as {
        categories?: CongDongCategory[];
        error?: string;
      } | null;
      const lvJson = (await lvRes.json().catch(() => null)) as {
        linhVucs?: CongDongLinhVuc[];
        error?: string;
      } | null;

      if (!catRes.ok || !catJson?.categories) {
        setErr(catJson?.error ?? "Không lưu được ngành.");
        return;
      }
      if (!lvRes.ok || !lvJson?.linhVucs) {
        setErr(lvJson?.error ?? "Không lưu được lĩnh vực.");
        return;
      }

      onSaved({
        categories: catJson.categories,
        linhVucs: lvJson.linhVucs,
      });
    });
  }

  return (
    <form className="cd-v4-group-settings-body cd-manage-topics-form" onSubmit={onSave}>
      <section className="cd-v4-group-settings-section">
        {embedded ? null : (
          <p className="cd-v4-group-settings-hint">
            Gắn lĩnh vực hoạt động (tối đa 3) và ngành đào tạo (tối đa 3).
          </p>
        )}
        <CongDongTopicPicker
          linhVucs={draftLinhVucs}
          onLinhVucsChange={setDraftLinhVucs}
          nganhs={draftCategories}
          onNganhsChange={setDraftCategories}
          hint={
            embedded
              ? "Chọn tối đa 3 lĩnh vực và 3 ngành. Đã chọn hiện ở thanh trên."
              : ""
          }
        />
      </section>

      {err ? (
        <p className="cd-v4-group-settings-err" role="alert">
          {err}
        </p>
      ) : null}

      <footer className="cd-v4-group-settings-foot">
        {!embedded && onCancel ? (
          <button
            type="button"
            className="cd-v4-btn cd-v4-btn--ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Huỷ
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className="cd-v4-btn cd-v4-btn--primary"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2
                size={15}
                className="cd-category-picker-spin"
                aria-hidden
              />
              Đang lưu…
            </>
          ) : (
            "Lưu"
          )}
        </button>
      </footer>
    </form>
  );
}

type ModalProps = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  categories: CongDongCategory[];
  linhVucs: CongDongLinhVuc[];
  onSaved: (next: {
    categories: CongDongCategory[];
    linhVucs: CongDongLinhVuc[];
  }) => void;
};

export function CongDongGroupSettingsModal({
  open,
  onClose,
  orgId,
  categories,
  linhVucs,
  onSaved,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cd-v4-group-settings-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="cd-v4-group-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cd-v4-group-settings-head">
          <div className="cd-v4-group-settings-head-copy">
            <Settings2 size={18} strokeWidth={2} aria-hidden />
            <h2 id={titleId}>Lĩnh vực &amp; ngành</h2>
          </div>
          <button
            type="button"
            className="cd-v4-group-settings-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <CongDongGroupSettingsPanel
          active={open}
          orgId={orgId}
          categories={categories}
          linhVucs={linhVucs}
          onSaved={onSaved}
          onCancel={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}
