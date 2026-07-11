"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageCircleHeart, Sparkles } from "lucide-react";

import {
  loadOwnContributionEditorAction,
  type OwnContributionEditorPayload,
} from "@/components/article/contribution/actions";
import { ContributionEditor } from "@/components/article/contribution/ContributionEditor";
import type { DongGopFeedbackBannerItem } from "@/lib/article/dong-gop/notify-feedback";

type Props = {
  items: ReadonlyArray<DongGopFeedbackBannerItem>;
};

function articleHref(entityHref: string): string {
  const q = entityHref.indexOf("?");
  return q >= 0 ? entityHref.slice(0, q) : entityHref;
}

export function JourneyDongGopFeedbackBanner({ items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<OwnContributionEditorPayload | null>(
    null,
  );
  const [editorOpen, setEditorOpen] = useState(false);

  if (items.length === 0) return null;

  function openEditor(item: DongGopFeedbackBannerItem) {
    setError(null);
    setLoadingId(item.idDongGop);
    startTransition(async () => {
      const res = await loadOwnContributionEditorAction({
        idDongGop: item.idDongGop,
      });
      setLoadingId(null);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setEditor(res.editor);
      setEditorOpen(true);
    });
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditor(null);
    router.refresh();
  }

  return (
    <>
      <div
        className="j-coauthor-pending-stack"
        role="region"
        aria-label="Phản hồi đóng góp"
      >
        {items.map((item) => {
          const isReject = item.action === "tu_choi";
          const isLoading = pending && loadingId === item.idDongGop;
          return (
            <article
              key={item.idDongGop}
              className={`j-coauthor-pending j-dong-gop-feedback${isReject ? " is-reject" : ""}`}
            >
              <div className="j-dong-gop-feedback-inner">
                <p className="j-dong-gop-feedback-kicker">
                  {isReject ? (
                    <MessageCircleHeart size={15} strokeWidth={2} aria-hidden />
                  ) : (
                    <Sparkles size={15} strokeWidth={2} aria-hidden />
                  )}
                  Phản hồi đóng góp
                </p>

                <h3 className="j-dong-gop-feedback-title">
                  {isReject
                    ? "Quản trị viên chưa duyệt bản này — bạn vẫn có thể chỉnh và gửi lại"
                    : "Quản trị viên đã đọc bản của bạn và gửi vài góp ý"}
                </h3>

                <p className="j-dong-gop-feedback-topic">
                  Chủ đề{" "}
                  <Link
                    href={articleHref(item.entityHref)}
                    className="j-dong-gop-feedback-topic-link"
                  >
                    {item.entityTitle || "bài viết"}
                  </Link>
                </p>

                {item.ghiChu ? (
                  <blockquote className="j-dong-gop-feedback-quote">
                    <span className="j-dong-gop-feedback-quote-label">
                      Góp ý từ quản trị viên
                    </span>
                    <span className="j-dong-gop-feedback-quote-text">
                      {item.ghiChu}
                    </span>
                  </blockquote>
                ) : (
                  <p className="j-dong-gop-feedback-hint">
                    {isReject
                      ? "Mở bản đóng góp để xem chi tiết và quyết định bước tiếp theo."
                      : "Mở bản đóng góp để xem chỗ cần làm rõ hơn, rồi gửi lại khi bạn sẵn sàng."}
                  </p>
                )}

                {error && loadingId === null ? (
                  <p className="j-dong-gop-feedback-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <div className="j-coauthor-pending-actions j-dong-gop-feedback-actions">
                  <button
                    type="button"
                    className="j-coauthor-pending-btn is-view"
                    disabled={isLoading}
                    onClick={() => openEditor(item)}
                  >
                    {isLoading ? "Đang mở…" : "Xem góp ý và chỉnh sửa"}
                  </button>
                  <Link
                    href={articleHref(item.entityHref)}
                    className="j-coauthor-pending-btn is-decline"
                  >
                    Xem bài viết
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {editor ? (
        <ContributionEditor
          open={editorOpen}
          onClose={closeEditor}
          idBaiViet={editor.idBaiViet}
          idDongGop={editor.idDongGop}
          initialNoiDung={editor.initialNoiDung}
          initialHero={editor.initialHero}
          articleTitle={editor.articleTitle}
          loaiBaiViet={editor.loaiBaiViet}
          contributionCount={editor.contributionCount}
          trangThai={editor.trangThai}
          ghiChuDuyet={editor.ghiChuDuyet}
          canEdit={editor.canEdit}
          canSubmit={editor.canSubmit}
        />
      ) : null}
    </>
  );
}
