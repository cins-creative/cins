"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContributionEditor } from "@/components/article/contribution/ContributionEditor";
import type { ViewerContributionEditorState } from "@/lib/article/dong-gop/public-list";

type Props = {
  isLoggedIn: boolean;
  loginNext: string;
  idBaiViet: string;
  articleTitle: string;
  loaiBaiViet: string;
  contributionCount: number;
  viewerHasDraft: boolean;
  viewerEditor: ViewerContributionEditorState | null;
};

function ctaLabel(
  viewerEditor: ViewerContributionEditorState | null,
  viewerHasDraft: boolean,
): string {
  if (!viewerEditor) return "Viết bản của bạn";
  if (!viewerEditor.canEdit) {
    if (viewerEditor.trangThai === "duoc_duyet") return "Xem bản đã duyệt";
    return "Xem bản của bạn";
  }
  if (viewerEditor.trangThai === "cho_duyet") return "Sửa bản đang chờ duyệt";
  return viewerHasDraft ? "Tiếp tục bản của bạn" : "Viết bản của bạn";
}

export function ContributionTabActions({
  isLoggedIn,
  loginNext,
  idBaiViet,
  articleTitle,
  loaiBaiViet,
  contributionCount,
  viewerHasDraft,
  viewerEditor,
}: Props) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(loginNext)}`;

  function handleOpenEditor() {
    if (!isLoggedIn || !viewerEditor) return;
    setEditorOpen(true);
  }

  function handleCloseEditor() {
    setEditorOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="contrib-tab-actions">
        {isLoggedIn ? (
          <button
            type="button"
            className="contrib-tab-cta"
            onClick={handleOpenEditor}
            title={
              viewerEditor?.trangThai === "duoc_duyet"
                ? "Bản đã được duyệt — không thể sửa"
                : viewerEditor?.trangThai === "cho_duyet"
                  ? "Có thể sửa nội dung; trạng thái vẫn chờ duyệt"
                  : undefined
            }
          >
            {ctaLabel(viewerEditor, viewerHasDraft)}
          </button>
        ) : (
          <Link href={loginHref} className="contrib-tab-cta">
            Đăng nhập để đóng góp
          </Link>
        )}
      </div>

      {viewerEditor && isLoggedIn ? (
        <ContributionEditor
          open={editorOpen}
          onClose={handleCloseEditor}
          idBaiViet={idBaiViet}
          idDongGop={viewerEditor.id}
          initialNoiDung={viewerEditor.initialNoiDung}
          initialHero={viewerEditor.initialHero}
          articleTitle={articleTitle}
          loaiBaiViet={loaiBaiViet}
          contributionCount={contributionCount}
          trangThai={viewerEditor.trangThai}
          ghiChuDuyet={viewerEditor.ghiChuDuyet}
          canEdit={viewerEditor.canEdit}
          canSubmit={viewerEditor.canSubmit}
        />
      ) : null}
    </>
  );
}
