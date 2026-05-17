"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useState } from "react";

import type { NgheArticleDraftContextValue } from "@/components/article/nghe/NgheArticleDraftContext";
import "@/styles/nghe-inline-draft.css";

import styles from "./NgheCornerDraftPanel.module.css";

const STATUS_OPTIONS = [
  { value: "published", label: "Đã xuất bản" },
  { value: "cho_review", label: "Chờ duyệt" },
  { value: "dang_viet", label: "Đang viết" },
  { value: "archived", label: "Lưu trữ" },
  { value: "merged", label: "Đã gộp" },
] as const;

type Props = {
  draft: NgheArticleDraftContextValue;
};

/** Panel góc “Lưu bài nghề” — portal + CSS Module để tránh global reset nuốt padding/viền. */
export function NgheCornerDraftPanel({ draft }: Props) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!portalTarget) return null;

  return createPortal(
    <div
      className={styles.shell}
      data-inline-draft-bar="true"
      data-inline-draft-bar-variant="nghe-corner"
    >
      <aside
        className={styles.panel}
        role="region"
        aria-label="Lưu bản nháp bài nghề"
      >
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.titleBlock}>
              <p className={styles.kicker}>Lưu bài nghề</p>
              <p className={styles.hint}>
                Sửa trên trang · tab <strong>HTML</strong> trong lead để giữ markup CMS.
              </p>
            </div>
            <button type="button" className={styles.btnGhost} onClick={draft.closePanel}>
              Thu gọn
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {draft.saveMsg ? (
            <p
              className={draft.saveMsg.type === "ok" ? styles.msgOk : styles.msgErr}
              role={draft.saveMsg.type === "err" ? "alert" : "status"}
            >
              {draft.saveMsg.text}
            </p>
          ) : null}

          {!draft.persistEnabled ? (
            <p className={styles.msgWarn}>
              Thiếu <code className={styles.code}>SUPABASE_SERVICE_ROLE_KEY</code> — thêm vào{" "}
              <code className={styles.code}>.env.local</code>, restart dev.
            </p>
          ) : null}

          <div className={styles.fieldBlock}>
            <label className={styles.label} htmlFor="nghe-corner-meta-json">
              Meta <span className={styles.labelMuted}>(JSON)</span>
            </label>
            <textarea
              id="nghe-corner-meta-json"
              className={styles.textarea}
              value={draft.metaJson}
              onChange={(e) => draft.setMetaJson(e.target.value)}
              spellCheck={false}
              rows={4}
            />
          </div>

          <div className={styles.fieldBlockOnWhite}>
            <label className={styles.label} htmlFor="nghe-corner-trang-thai">
              Trạng thái
            </label>
            <select
              id="nghe-corner-trang-thai"
              className={styles.select}
              value={draft.trang_thai}
              onChange={(e) => draft.setTrangThai(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.btnMuted}
            disabled={draft.saving}
            onClick={draft.discardDraft}
          >
            Hủy
          </button>
        </footer>
      </aside>
    </div>,
    portalTarget,
  );
}
