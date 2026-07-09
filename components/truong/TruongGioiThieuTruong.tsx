"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { GioiThieuRichBody } from "@/components/truong/GioiThieuRichBody";
import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { hasTruongGioiThieuContent } from "@/lib/truong/gioi-thieu";
import type { TruongListItem } from "@/lib/truong/types";

type Props = {
  school?: Pick<TruongListItem, "ten" | "gioi_thieu_truong" | "org_loai">;
  onOpenAbout?: () => void;
};

export function TruongGioiThieuTruong({
  school: schoolProp,
  onOpenAbout,
}: Props) {
  const ctx = useTruongInlineEdit();
  const pathname = usePathname();
  const school = ctx?.school ?? schoolProp;
  const [open, setOpen] = useState(false);
  if (!school) return null;

  const html = school.gioi_thieu_truong;
  const hasContent = hasTruongGioiThieuContent(html);
  /** Chỉ hiện nút sửa khi đang bật chế độ chỉnh sửa — không hiện cho người xem. */
  const showEditorActions = Boolean(ctx?.isEditing);
  const isCoSo =
    school.org_loai === "co_so_dao_tao" ||
    pathname.startsWith("/co-so");
  const isStudio = pathname.startsWith("/studio");
  const buttonLabel = isCoSo
    ? "Giới thiệu cơ sở"
    : isStudio
      ? hasContent
        ? "Xem giới thiệu"
        : "Thêm giới thiệu"
      : hasContent
        ? "Lịch sử trường"
        : "Thêm giới thiệu trường";

  if (!hasContent && !showEditorActions) return null;

  function openEditor() {
    setOpen(false);
    if (onOpenAbout) {
      onOpenAbout();
      return;
    }
    ctx?.openSchoolAboutEditor();
  }

  return (
    <>
      <button
        type="button"
        className="tdh-gioi-thieu-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {buttonLabel}
      </button>
      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        className="tdh-inline-modal--wide tdh-gioi-thieu-modal"
        labelledBy="tdh-gioi-thieu-title"
        showClose={false}
      >
        <header className="tdh-gioi-thieu-modal-head">
          <h2 id="tdh-gioi-thieu-title" className="tdh-gioi-thieu-modal-title">
            Giới thiệu {school.ten}
          </h2>
          <div className="tdh-gioi-thieu-modal-actions">
            {showEditorActions ? (
              <button
                type="button"
                className="tdh-inline-btn primary"
                onClick={openEditor}
              >
                Sửa giới thiệu
              </button>
            ) : null}
            <button
              type="button"
              className="tdh-inline-btn ghost tdh-gioi-thieu-close"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
          </div>
        </header>
        {hasContent ? (
          <GioiThieuRichBody html={html!} />
        ) : (
          <div className="tdh-gioi-thieu-empty-wrap">
            <p className="tdh-gioi-thieu-empty">
              Chưa có nội dung giới thiệu.
              {showEditorActions
                ? " Bấm Sửa giới thiệu để thêm nội dung rich text (giống bài đăng)."
                : ""}
            </p>
            {showEditorActions ? (
              <button
                type="button"
                className="tdh-inline-btn primary tdh-gioi-thieu-empty-cta"
                onClick={openEditor}
              >
                Sửa giới thiệu
              </button>
            ) : null}
          </div>
        )}
      </TruongInlineModal>
    </>
  );
}
