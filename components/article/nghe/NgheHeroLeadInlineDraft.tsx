"use client";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
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

type Props = {
  leadVideoUrl?: string | null;
  heroThumbnailUrl?: string | null;
};

/** Hero + khối lead nghề — khi mở draft: form tại chỗ + Tiptap trong `.nghe-lead-panel`. */
export function NgheHeroLeadInlineDraft({
  leadVideoUrl,
  heroThumbnailUrl,
}: Props) {
  const d = useNgheArticleDraftOptional();
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
        <div className="l1-hero" data-nghe-draft-open={d.open ? "true" : undefined}>
          <div
            className="nghe-hero-draft-toolbar"
            data-nghe-draft-toolbar={d.open ? "stack" : undefined}
          >
            {d.open ? (
              <>
                <button
                  type="button"
                  className="nghe-hero-draft-btn nghe-hero-draft-btn--primary"
                  disabled={d.saving || !d.persistEnabled}
                  onClick={() => void d.save()}
                  aria-label="Lưu vào Supabase"
                >
                  {d.saving ? "Đang lưu…" : "Lưu"}
                </button>
                <button
                  type="button"
                  className="nghe-hero-draft-btn nghe-hero-draft-btn--danger"
                  disabled={d.saving}
                  onClick={d.discardDraft}
                  aria-label="Hủy thay đổi và khôi phục bản trên server"
                >
                  Hủy
                </button>
              </>
            ) : null}
            <NgheHeroDraftEditButton />
          </div>
          {d.open ? (
            <h1 className="h-disp nghe-hero-title">
              <input
                type="text"
                value={d.tieu_de}
                onChange={(e) => d.setTieuDe(e.target.value)}
                className="nghe-draft-field nghe-draft-field--title"
                aria-label="Tiêu đề chính (H1)"
                placeholder="Tiêu đề chính"
              />
              <br />
              <em className="tieu_de_viet" data-hero-line="subtitle">
                <input
                  type="text"
                  value={d.tieu_de_viet}
                  onChange={(e) => d.setTieuDeViet(e.target.value)}
                  className="nghe-draft-field nghe-draft-field--subtitle"
                  aria-label="Dòng phụ tiếng Việt (tieu_de_viet)"
                  placeholder="Dòng phụ (VI)"
                />
              </em>
              <span className="nghe-draft-field-eng-wrap">
                <input
                  type="text"
                  value={d.tieu_de_eng}
                  onChange={(e) => d.setTieuDeEng(e.target.value)}
                  className="nghe-draft-field nghe-draft-field--eng"
                  aria-label="Dòng phụ tiếng Anh (tieu_de_eng)"
                  placeholder="Dòng phụ (EN, tùy chọn)"
                />
              </span>
            </h1>
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
                <textarea
                  value={d.tom_tat}
                  onChange={(e) => d.setTomTat(e.target.value)}
                  className="h-summary nghe-draft-field nghe-draft-field--summary"
                  rows={3}
                  aria-label="Tóm tắt (tom_tat)"
                  placeholder="Tóm tắt…"
                />
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
          <ArticleDraftContentEditor
            variant="nghe-lead-inline"
            value={d.noi_dung}
            onChange={d.setNoiDung}
          />
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
    </>
  );
}
