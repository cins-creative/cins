"use client";

import Link from "next/link";
import { Heart, Pin } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { CongDongFilterAdmin } from "@/components/cong-dong/CongDongFilterAdmin";
import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import { congDongImageUrl } from "@/lib/cong-dong/images";
import type {
  CongDongComment,
  CongDongFilter,
  CongDongPageData,
  CongDongPost,
} from "@/lib/cong-dong/types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { getCoverUrl } from "@/lib/articles/cover";
import { labelTinhThanh } from "@/lib/truong/contact";

type Props = {
  initial: CongDongPageData;
};

function buildPostsUrl(
  orgId: string,
  opts?: { cursor?: string | null; filterSlugs?: string[] },
) {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set("cursor", opts.cursor);
  for (const slug of opts?.filterSlugs ?? []) {
    params.append("filter", slug);
  }
  const qs = params.toString();
  return `/api/cong-dong/${orgId}/posts${qs ? `?${qs}` : ""}`;
}

export function CongDongPageClient({ initial }: Props) {
  const { requireAuth } = useAuthGate();
  const [org] = useState(initial.org);
  const [isThanhVien, setIsThanhVien] = useState(initial.isThanhVien);
  const [filters, setFilters] = useState(initial.filters);
  const [activeFilterSlugs, setActiveFilterSlugs] = useState<string[]>([]);
  const [posts, setPosts] = useState(initial.initialPosts);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [joinPending, startJoin] = useTransition();
  const [loadPending, startLoadMore] = useTransition();
  const [filterPending, startFilter] = useTransition();

  const coverUrl = getCoverUrl(org.coverId);
  const avatarUrl = getAvatarUrl(org.avatarId);
  const location = labelTinhThanh(org.tinhThanh);

  const toggleJoin = () => {
    requireAuth(() => {
      startJoin(async () => {
        const method = isThanhVien ? "DELETE" : "POST";
        const res = await fetch(`/api/cong-dong/${org.id}/tham-gia`, { method });
        if (!res.ok) return;
        setIsThanhVien(!isThanhVien);
      });
    });
  };

  const loadMore = () => {
    if (!nextCursor) return;
    startLoadMore(async () => {
      const res = await fetch(
        buildPostsUrl(org.id, {
          cursor: nextCursor,
          filterSlugs: activeFilterSlugs,
        }),
      );
      const json = (await res.json().catch(() => null)) as {
        posts?: CongDongPost[];
        nextCursor?: string | null;
      } | null;
      if (!res.ok || !json?.posts) return;
      setPosts((prev) => [...prev, ...json.posts!]);
      setNextCursor(json.nextCursor ?? null);
    });
  };

  const applyFeedFilter = (slugs: string[]) => {
    setActiveFilterSlugs(slugs);
    startFilter(async () => {
      const res = await fetch(buildPostsUrl(org.id, { filterSlugs: slugs }));
      const json = (await res.json().catch(() => null)) as {
        posts?: CongDongPost[];
        nextCursor?: string | null;
      } | null;
      if (!res.ok || !json?.posts) return;
      setPosts(json.posts);
      setNextCursor(json.nextCursor ?? null);
    });
  };

  const onPostCreated = useCallback(
    (post: CongDongPost) => {
      const matchesFilter =
        activeFilterSlugs.length === 0 ||
        post.filters.some((f) => activeFilterSlugs.includes(f.slug));
      if (!matchesFilter) return;
      setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    },
    [activeFilterSlugs],
  );

  return (
    <div className="cd-page">
      <header className="cd-header">
        <div className="cd-cover">
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={coverUrl} alt="" />
          ) : null}
        </div>
        <div className="cd-header-body">
          <div className="cd-avatar" aria-hidden>
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" />
            ) : (
              org.ten.charAt(0).toUpperCase()
            )}
          </div>
          <div className="cd-meta">
            <h1>{org.ten}</h1>
            {org.moTa ? <p>{org.moTa}</p> : null}
            <div className="cd-stats">
              {org.soThanhVien} thành viên
              {location ? ` · ${location}` : ""}
            </div>
          </div>
          <button
            type="button"
            className={`cd-join-btn${isThanhVien ? " is-member" : ""}`}
            onClick={toggleJoin}
            disabled={joinPending}
          >
            {isThanhVien ? "Đã tham gia" : "Tham gia"}
          </button>
        </div>
      </header>

      {filters.length > 0 ? (
        <div
          className={`cd-filter-bar${filterPending ? " is-loading" : ""}`}
          role="toolbar"
          aria-label="Lọc bài đăng theo nhãn"
        >
          <button
            type="button"
            className={`cd-filter-chip cd-filter-chip--all${activeFilterSlugs.length === 0 ? " is-active" : ""}`}
            onClick={() => applyFeedFilter([])}
          >
            Tất cả
          </button>
          {filters.map((filter) => {
            const active = activeFilterSlugs.includes(filter.slug);
            return (
              <CongDongFilterChip
                key={filter.id}
                filter={filter}
                active={active}
                onClick={() => {
                  if (active) {
                    applyFeedFilter([]);
                    return;
                  }
                  applyFeedFilter([filter.slug]);
                }}
              />
            );
          })}
        </div>
      ) : null}

      {initial.isAdmin ? (
        <CongDongFilterAdmin
          orgId={org.id}
          filters={filters}
          onChange={setFilters}
        />
      ) : null}

      {isThanhVien ? (
        <CongDongCompose
          orgId={org.id}
          filters={filters}
          onCreated={onPostCreated}
        />
      ) : null}

      <div className="cd-feed">
        {posts.length === 0 ? (
          <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
            {activeFilterSlugs.length > 0
              ? "Chưa có bài đăng với nhãn này."
              : "Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ!"}
          </p>
        ) : (
          posts.map((post) => (
            <CongDongPostCard
              key={post.id}
              orgId={org.id}
              post={post}
              canInteract={isThanhVien}
            />
          ))
        )}
      </div>

      {nextCursor ? (
        <button
          type="button"
          className="cd-join-btn"
          style={{ margin: "16px auto", display: "block" }}
          onClick={loadMore}
          disabled={loadPending}
        >
          {loadPending ? "Đang tải…" : "Xem thêm"}
        </button>
      ) : null}
    </div>
  );
}

function CongDongCompose({
  orgId,
  filters,
  onCreated,
}: {
  orgId: string;
  filters: CongDongFilter[];
  onCreated: (post: CongDongPost) => void;
}) {
  const [text, setText] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleFilter = (filterId: string) => {
    setSelectedFilterIds((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, 4);
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/post-image/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        setErr(json?.error ?? "Upload ảnh thất bại.");
        continue;
      }
      setMediaIds((prev) => [...prev, json.imageId!]);
      if (json.url) setPreviewUrls((prev) => [...prev, json.url!]);
    }
    e.target.value = "";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noi_dung: text,
          media_ids: mediaIds,
          filter_ids: selectedFilterIds,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        post?: CongDongPost;
        error?: string;
      } | null;
      if (!res.ok || !json?.post) {
        setErr(json?.error ?? "Không đăng được bài.");
        return;
      }
      setText("");
      setMediaIds([]);
      setPreviewUrls([]);
      setSelectedFilterIds([]);
      onCreated(json.post);
    });
  }

  return (
    <form className="cd-compose" onSubmit={onSubmit}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Chia sẻ điều gì đó với cộng đồng…"
        maxLength={8000}
        required
      />
      {previewUrls.length > 0 ? (
        <div className="cd-media-preview">
          {previewUrls.map((url) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={url} src={url} alt="" />
          ))}
        </div>
      ) : null}
      {filters.length > 0 ? (
        <div className="cd-compose-filters" role="group" aria-label="Chọn nhãn">
          <span className="cd-compose-filters-label">Nhãn (tuỳ chọn)</span>
          <div className="cd-compose-filters-chips">
            {filters.map((filter) => (
              <CongDongFilterChip
                key={filter.id}
                filter={filter}
                active={selectedFilterIds.includes(filter.id)}
                onClick={() => toggleFilter(filter.id)}
                size="sm"
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="cd-compose-actions">
        <label style={{ fontSize: 13, cursor: "pointer" }}>
          Đính kèm ảnh
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={onPickImages}
          />
        </label>
        <button type="submit" disabled={pending || !text.trim()}>
          {pending ? "Đang đăng…" : "Đăng bài"}
        </button>
      </div>
      {err ? <div className="cd-compose-err">{err}</div> : null}
    </form>
  );
}

function CongDongPostCard({
  orgId,
  post,
  canInteract,
}: {
  orgId: string;
  post: CongDongPost;
  canInteract: boolean;
}) {
  const { requireAuth } = useAuthGate();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<CongDongComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [pending, startTransition] = useTransition();

  const avatarUrl = getAvatarUrl(post.author.avatarId);

  const toggleLike = () => {
    requireAuth(() => {
      const next = !liked;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: SOCIAL_LOAI_DOI_TUONG.THAO_LUAN,
            id_doi_tuong: post.id,
            active: next,
          }),
        });
        const json = (await res.json().catch(() => null)) as { count?: number } | null;
        if (res.ok && typeof json?.count === "number") setLikeCount(json.count);
      });
    });
  };

  const openComments = () => {
    setCommentsOpen(true);
    if (comments.length > 0) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/cong-dong/${orgId}/posts/${post.id}/comments`,
      );
      const json = (await res.json().catch(() => null)) as {
        comments?: CongDongComment[];
      } | null;
      if (res.ok && json?.comments) setComments(json.comments);
    });
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInteract) return;
    requireAuth(() => {
      const text = commentText.trim();
      if (!text) return;
      startTransition(async () => {
        const res = await fetch(
          `/api/cong-dong/${orgId}/posts/${post.id}/comments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noi_dung: text }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          comment?: CongDongComment;
          error?: string;
        } | null;
        if (!res.ok || !json?.comment) return;
        setComments((prev) => [...prev, json.comment!]);
        setCommentCount((c) => c + 1);
        setCommentText("");
      });
    });
  };

  return (
    <article className={`cd-post${post.ghim ? " is-pinned" : ""}`}>
      <div className="cd-post-head">
        <Link href={`/${post.author.slug}`} className="cd-post-avatar" prefetch={false}>
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" />
          ) : (
            post.author.tenHienThi.charAt(0).toUpperCase()
          )}
        </Link>
        <div>
          <div className="cd-post-author">
            <Link href={`/${post.author.slug}`} prefetch={false}>
              <strong>{post.author.tenHienThi}</strong>
            </Link>
          </div>
          <div className="cd-post-badges">
            {post.author.ngheLabel ? (
              <span className="cd-badge">{post.author.ngheLabel}</span>
            ) : null}
            {post.author.verifiedCount > 0 ? (
              <span className="cd-badge is-verified">
                Verified · {post.author.verifiedCount}
              </span>
            ) : null}
            {post.ghim ? (
              <span className="cd-badge">
                <Pin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                Ghim
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {post.tieuDe ? (
        <h3 style={{ margin: "12px 0 0", fontSize: 17 }}>{post.tieuDe}</h3>
      ) : null}
      {post.filters.length > 0 ? (
        <div className="cd-post-filters">
          {post.filters.map((filter) => (
            <CongDongFilterChip key={filter.id} filter={filter} size="sm" />
          ))}
        </div>
      ) : null}
      <div className="cd-post-body">{post.noiDung}</div>

      {post.media.length > 0 ? (
        <div className="cd-post-media">
          {post.media.map((m) => {
            const src = congDongImageUrl(m.cloudflareId);
            if (!src) return null;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={m.id} src={src} alt="" loading="lazy" />
            );
          })}
        </div>
      ) : null}

      <div className="cd-post-actions">
        <button
          type="button"
          className={`cd-like-btn${liked ? " is-liked" : ""}`}
          onClick={toggleLike}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          {likeCount > 0 ? likeCount : "Thích"}
        </button>
        <button type="button" className="cd-like-btn" onClick={openComments}>
          {commentCount > 0 ? `${commentCount} bình luận` : "Bình luận"}
        </button>
      </div>

      {commentsOpen ? (
        <div className="cd-comments">
          {comments.map((c) => {
            const cAvatar = getAvatarUrl(c.author.avatarId);
            return (
              <div key={c.id} className="cd-comment">
                <div className="cd-post-avatar" style={{ width: 32, height: 32 }}>
                  {cAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={cAvatar} alt="" />
                  ) : (
                    c.author.tenHienThi.charAt(0)
                  )}
                </div>
                <div className="cd-comment-bubble">
                  <strong>{c.author.tenHienThi}</strong>
                  {c.noiDung}
                </div>
              </div>
            );
          })}
          {canInteract ? (
            <form className="cd-comment-form" onSubmit={submitComment}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Viết bình luận…"
                maxLength={2000}
              />
              <button type="submit" disabled={pending}>
                Gửi
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
