"use client";

import { Lock, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, type KeyboardEvent } from "react";

import { isInlineBaiTapThumbnail } from "@/lib/to-chuc/bai-tap-thumbnail";
import type { BaiTapKhoaData } from "@/lib/to-chuc/khoa-hoc-types";
import { LOAI_BAI_GIAO_TRINH_LABEL } from "@/lib/to-chuc/khoa-hoc-types";
import { getYoutubeId } from "@/lib/youtube";

function BaiTapYoutubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.8 15.5v-7l6.3 3.5-6.3 3.5Z" />
    </svg>
  );
}

type Props = {
  item: BaiTapKhoaData;
  index: number;
  canManage?: boolean;
  onEdit?: (item: BaiTapKhoaData) => void;
  onDelete?: (item: BaiTapKhoaData) => void;
  deleting?: boolean;
};

/** Card bài tập — dùng chung trang khóa (manage) và tab Giáo trình. */
export function BaiTapKhoaCard({
  item,
  index,
  canManage = false,
  onEdit,
  onDelete,
  deleting = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const youtubeId = item.videoYoutubeUrl
    ? getYoutubeId(item.videoYoutubeUrl)
    : null;
  const hasVideo = Boolean(youtubeId);

  function toggleExpand() {
    if (!hasVideo) return;
    setExpanded((v) => !v);
  }

  function onMainKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!hasVideo) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand();
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting || !onDelete) return;
    const ok = window.confirm(
      `Xóa bài «${item.tenBaiTap}»?\n\nBài tập sẽ bị xóa vĩnh viễn khỏi khóa.`,
    );
    if (!ok) return;
    onDelete(item);
  }

  return (
    <article
      className={[
        "cso-khd-bt-card",
        hasVideo ? "cso-khd-bt-card--expandable" : "",
        canManage ? "cso-khd-bt-card--manage" : "",
        expanded ? "is-open" : "",
        deleting ? "is-deleting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="cso-khd-bt-card-main"
        role={hasVideo ? "button" : undefined}
        tabIndex={hasVideo ? 0 : undefined}
        aria-expanded={hasVideo ? expanded : undefined}
        aria-label={
          hasVideo
            ? item.visible
              ? `${expanded ? "Thu gọn" : "Xem"} bài tập: ${item.tenBaiTap}`
              : `${expanded ? "Thu gọn" : "Xem"} bài tập (cần đăng ký): ${item.tenBaiTap}`
            : undefined
        }
        onClick={hasVideo ? toggleExpand : undefined}
        onKeyDown={onMainKeyDown}
      >
        <div
          className={`cso-khd-bt-card-thumb c${(index % 3) + 1}${item.thumbnailUrl ? " has-img" : ""}`}
        >
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt=""
              fill
              className="cso-khd-bt-card-thumb-img"
              sizes="80px"
              unoptimized={isInlineBaiTapThumbnail(item.thumbnailUrl)}
            />
          ) : null}
        </div>
        <div className="cso-khd-bt-card-body">
          <div className="cso-khd-bt-card-title-row">
            <h3 className="cso-khd-bt-card-title">
              <span className="cso-khd-bt-card-order">Bài {index + 1}</span>
              {item.thuocTinh ? (
                <span className="cso-khd-bt-card-loai">
                  {LOAI_BAI_GIAO_TRINH_LABEL[item.thuocTinh]}
                </span>
              ) : null}
              <span className="cso-khd-bt-card-title-text">{item.tenBaiTap}</span>
            </h3>
            {canManage || (hasVideo && item.visible) ? (
              <div className="cso-khd-bt-card-title-actions">
                {canManage ? (
                  <>
                    <button
                      type="button"
                      className="cso-khd-bt-card-edit-bt"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(item);
                      }}
                      aria-label={`Sửa bài tập: ${item.tenBaiTap}`}
                      title="Sửa bài tập"
                      disabled={deleting}
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    {onDelete ? (
                      <button
                        type="button"
                        className="cso-khd-bt-card-edit-bt cso-khd-bt-card-del-bt"
                        onClick={handleDelete}
                        aria-label={`Xóa bài tập: ${item.tenBaiTap}`}
                        title="Xóa bài tập"
                        disabled={deleting}
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    ) : null}
                  </>
                ) : null}
                {hasVideo && item.visible ? (
                  <span
                    className={[
                      "cso-khd-bt-card-view-bt",
                      expanded ? "is-open" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden
                  >
                    <BaiTapYoutubeIcon />
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {item.moTa ? (
            <p className="cso-khd-bt-card-desc">{item.moTa}</p>
          ) : null}
          {item.yeuCau ? (
            <p className="cso-khd-bt-card-yeu-cau">
              <strong>Yêu cầu:</strong> {item.yeuCau}
            </p>
          ) : null}
        </div>
      </div>
      {expanded && hasVideo ? (
        <div className="cso-khd-bt-card-expand">
          {item.visible ? (
            <div className="cso-khd-bt-card-vid">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                title={`Video: ${item.tenBaiTap}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="cso-khd-bt-card-lock" role="status">
              <Lock size={18} aria-hidden />
              <p>Vui lòng đăng ký khóa học để xem đầy đủ</p>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
