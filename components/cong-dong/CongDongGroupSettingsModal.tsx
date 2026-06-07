"use client";

import { Loader2, Settings2, X } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { CongDongCategoryPicker } from "@/components/cong-dong/CongDongCategoryPicker";
import type { CongDongCategory } from "@/lib/cong-dong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  categories: CongDongCategory[];
  onSaved: (next: CongDongCategory[]) => void;
};

export function CongDongGroupSettingsModal({
  open,
  onClose,
  orgId,
  categories,
  onSaved,
}: Props) {
  const titleId = useId();
  const [draft, setDraft] = useState(categories);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDraft(categories);
    setErr(null);
  }, [open, categories]);

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

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/categories`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: draft.map((c) => c.id) }),
      });
      const json = (await res.json().catch(() => null)) as {
        categories?: CongDongCategory[];
        error?: string;
      } | null;
      if (!res.ok || !json?.categories) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      onSaved(json.categories);
    });
  }

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
            <h2 id={titleId}>Cài đặt nhóm</h2>
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

        <form className="cd-v4-group-settings-body" onSubmit={onSave}>
          <section className="cd-v4-group-settings-section">
            <h3>Chủ đề nghề &amp; ngành</h3>
            <p className="cd-v4-group-settings-hint">
              Gắn tối đa 4 bài nghề hoặc ngành học để người đọc tìm thấy nhóm
              qua các trang đó.
            </p>
            <CongDongCategoryPicker
              value={draft}
              onChange={setDraft}
              hint=""
            />
          </section>

          {err ? (
            <p className="cd-v4-group-settings-err" role="alert">
              {err}
            </p>
          ) : null}

          <footer className="cd-v4-group-settings-foot">
            <button
              type="button"
              className="cd-v4-btn cd-v4-btn--ghost"
              onClick={onClose}
              disabled={pending}
            >
              Huỷ
            </button>
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
      </div>
    </div>,
    document.body,
  );
}
