"use client";

import Image from "next/image";

import { NgheHeroMascot } from "@/components/article/nghe/NgheHeroMascot";
import { useNgheArticleDraftOptional } from "@/components/article/nghe/NgheArticleDraftContext";
import { NgheHeroDraftEditButton } from "@/components/article/nghe/NgheHeroDraftEditButton";
import { KeywordInlineLeadPreview } from "@/components/article/keyword/KeywordInlineLeadPreview";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import {
  NGHE_LEAD_BODY_HTML,
  NGHE_LEAD_HTML,
} from "@/components/article/nghe/static/nghe-static-data";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import "@/styles/nghe-inline-draft.css";

const NGHE_HERO_TITLE_FALLBACK = "3D Modeller";

type SharedProps = {
  leadVideoUrl?: string | null;
  heroThumbnailUrl?: string | null;
};

function kickerLabel(): string {
  return "Nghề nghiệp · Ngành Game · Phim";
}

/** Hero draft — header cố định (`entity-light-header`). */
export function NgheHeroInlineDraft({ heroThumbnailUrl }: SharedProps) {
  const d = useNgheArticleDraftOptional();
  if (!d) return null;

  const displayTitle = (d.tieu_de ?? "").trim() || NGHE_HERO_TITLE_FALLBACK;
  const displayEmLine = (d.tieu_de_viet ?? "").trim() || (d.tieu_de_eng ?? "").trim();
  const displaySummary = (d.tom_tat ?? "").trim();
  const thumb = heroThumbnailUrl?.trim() || null;

  return (
    <header
      className="ent-hero ent-hero--draft"
      id="nghe-sec-intro"
      data-rich-hero-slot="true"
      data-nghe-draft-open={d.open ? "true" : undefined}
    >
      {d.canEdit && !d.open ? (
        <div className="ent-hero-tools">
          <NgheHeroDraftEditButton />
        </div>
      ) : null}

      {d.canEdit && d.open ? (
        <div className="nghe-hero-draft-bar" role="region" aria-label="Công cụ sửa hero">
          <div className="nghe-hero-draft-bar__lead">
            <span className="nghe-hero-draft-bar__badge">Sửa hero</span>
            <label className="nghe-hero-draft-bar__uuid">
              <span className="nghe-hero-draft-bar__uuid-label">UUID</span>
              <input
                type="text"
                readOnly
                value={d.article.id}
                className="nghe-hero-draft-bar__uuid-input"
                aria-label="UUID bài viết"
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
          </div>
          <div className="nghe-hero-draft-bar__actions">
            <button
              type="button"
              className="nghe-hero-draft-btn nghe-hero-draft-btn--ghost"
              disabled={d.saving}
              onClick={d.openContentEditor}
            >
              Soạn thảo nội dung
            </button>
            <button
              type="button"
              className="nghe-hero-draft-btn nghe-hero-draft-btn--danger"
              disabled={d.saving}
              onClick={d.discardDraft}
            >
              Hủy
            </button>
            <button
              type="button"
              className="nghe-hero-draft-btn nghe-hero-draft-btn--primary"
              disabled={d.saving || !d.persistEnabled}
              onClick={() => void d.save()}
            >
              {d.saving ? "Đang lưu…" : "Lưu"}
            </button>
            <NgheHeroDraftEditButton />
          </div>
        </div>
      ) : null}

      <div className="ent-hero-inner">
        <div className="ent-hero-main">
          <span className="ent-badge is-nghe">{kickerLabel()}</span>

          {d.open ? (
              <div className="nghe-hero-draft-form">
                <div className="nghe-hero-draft-form__title">
                  <label className="nghe-hero-draft-label" htmlFor="nghe-draft-tieu-de">
                    Tiêu đề chính
                  </label>
                  <input
                    id="nghe-draft-tieu-de"
                    type="text"
                    value={d.tieu_de}
                    onChange={(e) => d.setTieuDe(e.target.value)}
                    className="nghe-draft-field nghe-draft-field--title"
                    placeholder="Tiêu đề chính (H1)"
                  />
                  <label
                    className="nghe-hero-draft-label"
                    htmlFor="nghe-draft-tieu-de-viet"
                  >
                    Tiêu đề phụ (VI)
                  </label>
                  <input
                    id="nghe-draft-tieu-de-viet"
                    type="text"
                    value={d.tieu_de_viet}
                    onChange={(e) => d.setTieuDeViet(e.target.value)}
                    className="nghe-draft-field nghe-draft-field--subtitle"
                    placeholder="Dòng phụ tiếng Việt"
                  />
                  <label
                    className="nghe-hero-draft-label"
                    htmlFor="nghe-draft-tieu-de-eng"
                  >
                    Tiêu đề phụ (EN)
                  </label>
                  <input
                    id="nghe-draft-tieu-de-eng"
                    type="text"
                    value={d.tieu_de_eng}
                    onChange={(e) => d.setTieuDeEng(e.target.value)}
                    className="nghe-draft-field nghe-draft-field--eng"
                    placeholder="Dòng phụ tiếng Anh (tùy chọn)"
                  />
                </div>
              </div>
            ) : (
              <div className="ent-title-row">
                <h1 className="ent-title">{displayTitle}</h1>
              </div>
            )}

            {!d.open && displayEmLine ? (
              <p className="ent-subtitle">
                <em>{displayEmLine}</em>
              </p>
            ) : null}

            {d.open ? (
              <>
                <label className="nghe-hero-draft-label" htmlFor="nghe-draft-tom-tat">
                  Tóm tắt
                </label>
                <textarea
                  id="nghe-draft-tom-tat"
                  value={d.tom_tat}
                  onChange={(e) => d.setTomTat(e.target.value)}
                  className="nghe-draft-field nghe-draft-field--summary"
                  rows={3}
                  placeholder="Tóm tắt ngắn (tom_tat)…"
                />
              </>
            ) : displaySummary ? (
              <p className="ent-summary">{displaySummary}</p>
            ) : null}
          </div>

          {thumb ? (
            <div className="ent-hero-thumb">
              <Image
                src={thumb}
                alt=""
                fill
                sizes="(max-width: 720px) 100vw, 288px"
                unoptimized
              />
            </div>
          ) : (
            <div className="ent-hero-thumb is-placeholder">
              <NgheHeroMascot thumbnailUrl={null} title={displayTitle} />
            </div>
          )}
        </div>
    </header>
  );
}

/** Lead draft — tab «Nội dung». */
export function NgheLeadInlineDraft({ leadVideoUrl }: SharedProps) {
  const d = useNgheArticleDraftOptional();
  if (!d) return null;

  const leadVid = (leadVideoUrl ?? "").trim();
  const leadTrim = (d.leadPreview ?? "").trim();

  return (
    <div className="nghe-lead-panel" data-rich-lead-slot="true">
      {leadVid ? <NgheLeadVideo url={leadVid} /> : null}
      {d.open ? (
        <div className="nghe-lead-draft-shell">
          {leadTrim ? (
            <div className="article-content-html">
              <KeywordInlineLeadPreview
                html={d.leadPreview ?? ""}
                className="nghe-lead-rich article-rich-content article-content-html"
              />
            </div>
          ) : (
            <div
              className="nghe-lead-rich article-rich-content article-content-html"
              dangerouslySetInnerHTML={{
                __html: imagedeliveryPreferPublicInHtml(
                  leadVid ? NGHE_LEAD_BODY_HTML : NGHE_LEAD_HTML,
                ),
              }}
            />
          )}
          <div className="nghe-lead-draft-shell__cta">
            <button
              type="button"
              className="nghe-hero-draft-btn nghe-hero-draft-btn--primary"
              onClick={d.openContentEditor}
            >
              Soạn thảo nội dung
            </button>
            <p className="nghe-lead-draft-shell__cta-hint">
              Mở trình soạn thảo trực quan — không cần chỉnh HTML thủ công.
            </p>
          </div>
        </div>
      ) : leadTrim ? (
        <div className="article-content-html">
          <KeywordInlineLeadPreview
            html={d.leadPreview ?? ""}
            className="nghe-lead-rich article-rich-content article-content-html"
          />
        </div>
      ) : (
        <div
          className="nghe-lead-rich article-rich-content article-content-html"
          dangerouslySetInnerHTML={{
            __html: imagedeliveryPreferPublicInHtml(
              leadVid ? NGHE_LEAD_BODY_HTML : NGHE_LEAD_HTML,
            ),
          }}
        />
      )}
    </div>
  );
}

/** @deprecated Dùng `NgheHeroInlineDraft` + `NgheLeadInlineDraft` riêng. */
export function NgheHeroLeadInlineDraft(props: SharedProps) {
  return (
    <>
      <NgheHeroInlineDraft {...props} />
      <NgheLeadInlineDraft {...props} />
    </>
  );
}
