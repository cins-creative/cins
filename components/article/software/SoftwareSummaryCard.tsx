"use client";

import Image from "next/image";

import { SoftwareMetaSection } from "@/components/article/software/SoftwareMetaSection";
import { SoftwareThumbnailField } from "@/components/article/software/inline/SoftwareThumbnailField";
import { SwInlineField } from "@/components/article/software/inline/SwInlineField";
import { useSoftwareInlineEdit } from "@/components/article/software/inline/SoftwareInlineEditContext";
import { resolveSoftwareEditingImageUrl } from "@/lib/articles/software-editing-image";
import { relGradient, relInitials } from "@/lib/articles/rel-visual";
import type { ArticleBaiViet } from "@/lib/articles/types";

type Props = {
  article: ArticleBaiViet;
  iconUrl?: string | null;
};

export function SoftwareSummaryCard({ article, iconUrl }: Props) {
  const ctx = useSoftwareInlineEdit();

  const title = ctx?.isEditing
    ? ctx.tieu_de.trim() || article.tieu_de
    : article.tieu_de.trim();
  const summary = ctx?.isEditing
    ? ctx.tom_tat.trim() || null
    : article.tom_tat?.trim() || null;

  const grad = relGradient(article.slug);
  const ini = relInitials(title);
  const iconDisplay = ctx?.isEditing
    ? resolveSoftwareEditingImageUrl(
        ctx.thumbnail,
        ctx.thumbnail_preview_url,
        article.thumbnail,
        iconUrl,
      )
    : iconUrl;
  return (
    <section
      className={`nghe-hero-panel sw-summary-panel${ctx?.isEditing ? " sw-summary-panel--editing" : ""}`}
      aria-label="Tổng quan phần mềm"
    >
      <div className="sw-spec-card">
        <header className="sw-spec-head">
          <div className="sw-spec-head__logo">
            {iconDisplay ? (
              <div className="sw-spec-head-icon sw-spec-head-icon--img">
                <Image
                  src={iconDisplay}
                  alt=""
                  width={80}
                  height={80}
                  className="sw-spec-head-icon__img"
                  unoptimized
                />
              </div>
            ) : (
              <span
                className="sw-spec-head-icon"
                style={{ background: grad }}
                aria-hidden
              >
                {ini}
              </span>
            )}
          </div>
          <div className="sw-spec-head__main">
            <div className="sw-spec-head__title-row">
              <span className="sw-spec-kicker">Phần mềm</span>
            </div>
            {ctx?.isEditing ? (
              <SwInlineField label="Tên phần mềm">
                <input
                  className="nct-inline-input nct-inline-input--title"
                  value={ctx.tieu_de}
                  onChange={(e) => ctx.setTieuDe(e.target.value)}
                />
              </SwInlineField>
            ) : (
              <h2 className="sw-spec-title">{title}</h2>
            )}
          </div>
        </header>

        {!ctx?.isEditing && summary ? (
          <p className="sw-spec-lead">{summary}</p>
        ) : null}

        {ctx?.isEditing ? (
          <div className="sw-spec-body sw-spec-body--editing">
            <SwInlineField label="Mô tả ngắn">
              <textarea
                className="nct-inline-input nct-inline-input--desc"
                rows={2}
                value={ctx.tom_tat}
                onChange={(e) => ctx.setTomTat(e.target.value)}
              />
            </SwInlineField>
            <SoftwareThumbnailField fallbackIconUrl={iconUrl} />
          </div>
        ) : null}

        <SoftwareMetaSection article={article} />

        {!ctx?.isEditing ? (
          <p className="sw-spec-footnote">
            Giá và gói dịch vụ có thể thay đổi theo nhà phát hành.
          </p>
        ) : null}
      </div>
    </section>
  );
}
