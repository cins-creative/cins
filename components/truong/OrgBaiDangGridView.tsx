"use client";

import { Play } from "lucide-react";

import { orgBaiDangPostsToGridItems } from "@/lib/truong/bai-dang-grid";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  posts: TruongBaiDang[];
  /** Mở bài đăng → chuyển về timeline và cuộn tới bài tương ứng. */
  onOpenPost: (postId: string) => void;
};

export function OrgBaiDangGridView({ posts, onOpenPost }: Props) {
  const items = orgBaiDangPostsToGridItems(posts);

  if (items.length === 0) {
    return (
      <p className="tdh-placeholder">Không có bài đăng thuộc nhóm lọc này.</p>
    );
  }

  return (
    <div className="org-baidang-grid" role="list" aria-label="Lưới bài đăng">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="listitem"
          className={`org-baidang-grid-cell${it.thumbSrc ? " has-thumb" : " is-text"}`}
          onClick={() => onOpenPost(it.id)}
          aria-label={`Mở bài đăng: ${it.title}`}
        >
          {it.thumbSrc ? (
            <span className="obg-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumbSrc} alt="" loading="lazy" decoding="async" />
              {it.isVideo ? (
                <span className="obg-play" aria-hidden>
                  <Play size={18} strokeWidth={2.4} />
                </span>
              ) : null}
            </span>
          ) : null}
          <span className="obg-body">
            <span className="obg-loai">{it.loaiLabel}</span>
            <strong className="obg-title">{it.title}</strong>
            {it.excerpt ? <span className="obg-excerpt">{it.excerpt}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
