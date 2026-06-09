"use client";

import { useEffect, useState } from "react";

import { NgheHeroMascot } from "@/components/article/nghe/NgheHeroMascot";
import { useNgheArticleDraftOptional } from "@/components/article/nghe/NgheArticleDraftContext";
import { NgheHeroDraftEditButton } from "@/components/article/nghe/NgheHeroDraftEditButton";
import { NgheLeadContentEditorModal } from "@/components/article/nghe/NgheLeadContentEditorModal";
import { KeywordInlineLeadPreview } from "@/components/article/keyword/KeywordInlineLeadPreview";
import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import {
  NGHE_LEAD_BODY_HTML,
  NGHE_LEAD_HTML,
} from "@/components/article/nghe/static/nghe-static-data";
import { imagedeliveryPreferPublicInHtml } from "@/lib/cloudflare/imagedelivery-prefer-public";
import "@/styles/nghe-inline-draft.css";

const NGHE_HERO_TITLE_FALLBACK = "3D Modeller";

type Props = {
  leadVideoUrl?: string | null;
  heroThumbnailUrl?: string | null;
};

/** Hero inline + lead preview; soạn `noi_dung` trong popup (portal). */
export function NgheHeroLeadInlineDraft({
  leadVideoUrl,
  heroThumbnailUrl,
}: Props) {
  const d = useNgheArticleDraftOptional();
  const [contentModalOpen, setContentModalOpen] = useState(false);

  useEffect(() => {
    if (!d?.open) setContentModalOpen(false);
  }, [d?.open]);

  if (!d) return null;

  const leadVid = (leadVideoUrl ?? "").trim();
  const displayTitle = (d.tieu_de ?? "").trim() || NGHE_HERO_TITLE_FALLBACK;
  const displayEmLine = (d.tieu_de_viet ?? "").trim() || (d.tieu_de_eng ?? "").trim();
  const displaySummary = (d.tom_tat ?? "").trim();
  const leadTrim = (d.leadPreview ?? "").trim();

  return (
    <>
      <div
        className="nghe-hero-panel"
        id="nghe-sec-intro"
        data-rich-hero-slot="true"
      >
        <div
          className="l1-hero"
          data-nghe-draft-open={d.open ? "true" : undefined}
        >
          {d.canEdit && !d.open ? (
            <div className="nghe-hero-draft-fab">
              <NgheHeroDraftEditButton />
            </div>
          ) : null}

          {d.canEdit && d.open ? (
            <header className="nghe-hero-draft-bar" aria-label="Công cụ sửa hero">
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
                  onClick={() => setContentModalOpen(true)}
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
            </header>
          ) : null}

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
            <h1 className="h-disp nghe-hero-title">
              {displayTitle}
              {displayEmLine ? (
                <>
                  <br />
                  <em className="tieu_de_viet" data-hero-line="subtitle">
                    {displayEmLine}
                  </em>
                </>
              ) : null}
            </h1>
          )}

          <div className="nghe-hero-row">
            <div className="nghe-hero-copy">
              <span className="kicker k-nghe">Nghề nghiệp · Ngành Game · Phim</span>
              {d.open ? (
                <>
                  <label className="nghe-hero-draft-label" htmlFor="nghe-draft-tom-tat">
                    Tóm tắt
                  </label>
                  <textarea
                    id="nghe-draft-tom-tat"
                    value={d.tom_tat}
                    onChange={(e) => d.setTomTat(e.target.value)}
                    className="h-summary nghe-draft-field nghe-draft-field--summary"
                    rows={3}
                    placeholder="Tóm tắt ngắn (tom_tat)…"
                  />
                </>
              ) : displaySummary ? (
                <p className="h-summary">{displaySummary}</p>
              ) : null}
            </div>
            <NgheHeroMascot
              thumbnailUrl={heroThumbnailUrl}
              title={displayTitle}
            />
          </div>
        </div>
      </div>

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
                onClick={() => setContentModalOpen(true)}
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

      <NgheLeadContentEditorModal
        open={contentModalOpen}
        onClose={() => setContentModalOpen(false)}
        value={d.noi_dung}
        onChange={d.setNoiDung}
        articleTitle={displayTitle}
      />
    </>
  );
}
