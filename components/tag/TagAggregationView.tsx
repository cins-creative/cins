import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";

import { TagAggSortSelect } from "@/components/tag/TagAggSortSelect";
import type { LoaiBaiViet } from "@/lib/articles/types";
import { getAvatarUrl, getNameInitials } from "@/lib/journey/profile";
import {
  fetchTagTaggedUsers,
  fetchTagTaggedWorks,
  tagWorkCoverSrc,
} from "@/lib/tag/aggregation-queries";
import type { TagAggSort } from "@/lib/tag/aggregation-types";
import "./tag-input.css";

type ArticleHeader = {
  id: string;
  slug: string;
  tieu_de: string;
  tom_tat?: string | null;
  da_verify?: boolean | null;
  loai_bai_viet: LoaiBaiViet;
};

type Props = {
  article: ArticleHeader;
  sort: TagAggSort;
};

function loaiLabel(loai: LoaiBaiViet): string {
  if (loai === "phan_mem") return "Phần mềm";
  return "Khái niệm";
}

export async function TagAggregationView({ article, sort }: Props) {
  const [users, works] = await Promise.all([
    fetchTagTaggedUsers(article.id),
    fetchTagTaggedWorks(article.id, sort),
  ]);

  const summary = article.tom_tat?.trim() || null;
  const verified = article.da_verify === true;

  return (
    <article className="tag-agg-page">
      <header className="tag-agg-header">
        <div className="tag-agg-title-row">
          <h1 className="tag-agg-title">{article.tieu_de}</h1>
          <span className="tag-agg-loai">{loaiLabel(article.loai_bai_viet)}</span>
          {verified ? (
            <span className="tag-agg-verified">
              <BadgeCheck size={16} strokeWidth={2.2} aria-hidden />
              Verified
            </span>
          ) : null}
        </div>
        {summary ? <p className="tag-agg-summary">{summary}</p> : null}
      </header>

      <section className="tag-agg-section" aria-labelledby="tag-agg-users-heading">
        <div className="tag-agg-section-head">
          <h2 id="tag-agg-users-heading" className="tag-agg-section-title">
            Người dùng ({users.length})
          </h2>
        </div>
        {users.length === 0 ? (
          <p className="tag-agg-empty">Chưa có ai gắn tag này.</p>
        ) : (
          <div className="tag-agg-users">
            {users.map((u) => {
              const avatarUrl = getAvatarUrl(u.avatarId);
              return (
                <Link
                  key={u.id}
                  href={`/${encodeURIComponent(u.slug)}`}
                  className="tag-agg-user-card"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={52}
                      height={52}
                      className="tag-agg-user-avatar"
                      unoptimized
                    />
                  ) : (
                    <span
                      className="tag-agg-user-avatar tag-agg-user-avatar-fallback"
                      aria-hidden
                    >
                      {getNameInitials(u.tenHienThi, u.slug)}
                    </span>
                  )}
                  <span className="tag-agg-user-name">{u.tenHienThi}</span>
                  {u.ngheChinh ? (
                    <span className="tag-agg-user-nghe">{u.ngheChinh}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="tag-agg-section" aria-labelledby="tag-agg-works-heading">
        <div className="tag-agg-section-head">
          <h2 id="tag-agg-works-heading" className="tag-agg-section-title">
            Tác phẩm ({works.length})
          </h2>
          <Suspense fallback={null}>
            <TagAggSortSelect current={sort} />
          </Suspense>
        </div>
        {works.length === 0 ? (
          <p className="tag-agg-empty">Chưa có tác phẩm nào gắn tag này.</p>
        ) : (
          <div className="tag-agg-grid">
            {works.map((w) => {
              const postSlug = w.slug?.trim();
              const hasPostHref =
                Boolean(w.ownerSlug?.trim()) &&
                Boolean(postSlug) &&
                postSlug !== w.id;
              const href = hasPostHref
                ? `/${encodeURIComponent(w.ownerSlug)}/p/${encodeURIComponent(postSlug!)}`
                : w.ownerSlug?.trim()
                  ? `/${encodeURIComponent(w.ownerSlug)}/journey`
                  : "#";
              const cover = w.previewSrc ?? tagWorkCoverSrc(w.coverId);
              return (
                <Link key={w.id} href={href} className="tag-agg-work">
                  <div
                    className={
                      "tag-agg-work-thumb" + (cover ? "" : " is-empty")
                    }
                    style={{ aspectRatio: `${w.width} / ${w.height}` }}
                  >
                    {cover ? (
                      <Image
                        src={cover}
                        alt=""
                        width={w.width * 100}
                        height={w.height * 100}
                        sizes="(max-width: 900px) 50vw, 220px"
                        loading="lazy"
                        unoptimized
                      />
                    ) : (
                      <span className="tag-agg-work-thumb-label" aria-hidden>
                        Bài viết
                      </span>
                    )}
                  </div>
                  <div className="tag-agg-work-meta">
                    <p className="tag-agg-work-title">
                      {w.tieuDe?.trim() || "Không tiêu đề"}
                    </p>
                    <p className="tag-agg-work-author">
                      {w.ownerName ? w.ownerName : w.ownerSlug ? `@${w.ownerSlug}` : "—"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </article>
  );
}
