"use client";

import Image from "next/image";
import { ClipboardPaste, ImagePlus, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { NgheLeadVideo } from "@/components/article/nghe/NgheLeadVideo";
import { TagInput, type TagInputValue } from "@/components/tag/TagInput";
import {
  relatedTagsByLoai,
  replaceRelatedTagsLoai,
  type ContribHeroMeta,
  type ContribRelatedTag,
} from "@/lib/article/dong-gop/contrib-document";
import { relatedFieldsForLoaiBaiViet } from "@/lib/article/dong-gop/related-fields";
import { resolveArticleThumbnailOnlySync } from "@/lib/bai-viet/thumbnail";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";
import { parseLeadVideoUrl } from "@/lib/articles/lead-video-url";
import {
  imageFilesFromClipboard,
  readImageFileFromClipboard,
} from "@/lib/files/clipboard-images";
import { uploadNganhInlineImage } from "@/lib/nganh/upload-inline-image";
import type { PickableTagLoai } from "@/lib/tag/tag-loai";
import { getYoutubeId } from "@/lib/youtube";

export const CONTRIB_TOM_TAT_MAX = 280;
const CONTRIB_RELATED_MAX = 8;

type Props = {
  hero: ContribHeroMeta;
  canEdit: boolean;
  loaiBaiViet: string;
  onChange: (patch: Partial<ContribHeroMeta>) => void;
};

function thumbPreviewUrl(thumbnail: string, localBlob?: string | null): string | null {
  if (localBlob) return localBlob;
  const t = thumbnail.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return resolveArticleThumbnailOnlySync(t);
}

function normalizePastedVideoUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (getYoutubeId(t) || parseLeadVideoUrl(t)) return t;
  return t;
}

function imageIdFromUploadUrl(url: string): string {
  return extractCfImageIdFromDeliveryUrl(url) ?? url;
}

function toTagInputValue(tags: ContribRelatedTag[]): TagInputValue[] {
  return tags.map((t) => ({
    id: t.id,
    tieu_de: t.tieu_de,
    loai_bai_viet: t.loai_bai_viet,
  }));
}

/** Đang gõ trong ô chữ / editor nội dung → không cướp Ctrl+V. */
function isEditablePasteTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function ContributionEditorMeta({
  hero,
  canEdit,
  loaiBaiViet,
  onChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [thumbMsg, setThumbMsg] = useState<string | null>(null);
  const [localThumb, setLocalThumb] = useState<string | null>(null);

  const videoUrl = hero.video_url.trim();
  const videoReady = Boolean(parseLeadVideoUrl(videoUrl));
  const thumbUrl = thumbPreviewUrl(hero.thumbnail, localThumb);
  const tomTatLen = hero.tom_tat.length;
  const relatedTags = hero.related_tags ?? [];
  const relatedFields = relatedFieldsForLoaiBaiViet(loaiBaiViet);

  function patchVideo(next: string) {
    onChange({ video_url: normalizePastedVideoUrl(next) });
  }

  function patchRelatedLoai(
    loai: PickableTagLoai,
    next: { id: string; tieu_de: string; loai_bai_viet: PickableTagLoai }[],
  ) {
    onChange({
      related_tags: replaceRelatedTagsLoai(
        relatedTags,
        loai,
        next.map((t) => ({
          id: t.id,
          tieu_de: t.tieu_de,
          loai_bai_viet: loai,
        })),
      ),
    });
  }

  const onThumbFile = useCallback(
    async (file: File) => {
      setThumbMsg(null);
      const blob = URL.createObjectURL(file);
      setLocalThumb(blob);
      setThumbBusy(true);
      try {
        const result = await uploadNganhInlineImage(file);
        if (!result.ok) {
          setThumbMsg(result.message);
          setLocalThumb(null);
          URL.revokeObjectURL(blob);
          return;
        }
        onChange({ thumbnail: imageIdFromUploadUrl(result.url) });
        URL.revokeObjectURL(blob);
        setLocalThumb(null);
      } finally {
        setThumbBusy(false);
      }
    },
    [onChange],
  );

  // Dán ảnh từ bộ nhớ tạm (Ctrl+V) → ảnh bìa, khi không đang gõ ô chữ / editor.
  useEffect(() => {
    if (!canEdit || thumbBusy) return;

    function onPaste(e: ClipboardEvent) {
      if (isEditablePasteTarget()) return;
      const file = imageFilesFromClipboard(e.clipboardData)[0];
      if (!file) return;
      e.preventDefault();
      void onThumbFile(file);
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [canEdit, thumbBusy, onThumbFile]);

  const openFilePicker = useCallback(() => {
    if (thumbBusy) return;
    fileRef.current?.click();
  }, [thumbBusy]);

  const pasteFromClipboard = useCallback(async () => {
    if (thumbBusy) return;
    setThumbMsg(null);
    const file = await readImageFileFromClipboard();
    if (!file) {
      setThumbMsg("Không có ảnh trong bộ nhớ tạm. Sao chép ảnh rồi bấm lại.");
      return;
    }
    await onThumbFile(file);
  }, [thumbBusy, onThumbFile]);

  if (!canEdit) {
    return (
      <div className="contrib-editor-meta contrib-editor-meta--readonly">
        {thumbUrl ? (
          <div className="contrib-editor-meta__thumb-picker">
            <Image src={thumbUrl} alt="" fill sizes="280px" unoptimized />
          </div>
        ) : null}
        <dl className="contrib-editor-meta__readonly">
          {hero.tieu_de ? (
            <>
              <dt>Tiêu đề</dt>
              <dd>{hero.tieu_de}</dd>
            </>
          ) : null}
          {hero.tom_tat ? (
            <>
              <dt>Mô tả</dt>
              <dd>{hero.tom_tat}</dd>
            </>
          ) : null}
          {relatedFields.map((field) => {
            const tags = relatedTagsByLoai(relatedTags, field.loai);
            if (tags.length === 0) return null;
            return (
              <div key={field.loai} className="contrib-editor-meta__related-ro">
                <dt>{field.label}</dt>
                <dd>
                  <ul className="contrib-related-chips">
                    {tags.map((t) => (
                      <li key={t.id}>{t.tieu_de}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            );
          })}
        </dl>
        {videoReady ? (
          <div className="contrib-editor-meta__video">
            <NgheLeadVideo url={videoUrl} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="contrib-editor-meta">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="contrib-editor-meta__file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onThumbFile(f);
          e.target.value = "";
        }}
      />

      <section className="contrib-editor-meta__block contrib-editor-meta__block--cover">
        <div
          className={`contrib-editor-meta__thumb-picker${thumbUrl ? " has-thumb" : " is-empty"}${thumbBusy ? " is-busy" : ""}`}
          role="group"
          aria-label="Ảnh bìa"
        >
          {thumbUrl ? (
            <Image src={thumbUrl} alt="" fill sizes="360px" unoptimized />
          ) : (
            <span className="contrib-editor-meta__thumb-empty">
              <span className="contrib-editor-meta__thumb-empty-title">
                Thêm ảnh bìa
              </span>
            </span>
          )}
          {thumbBusy ? (
            <span className="contrib-editor-meta__thumb-busy" aria-live="polite">
              <Loader2 size={18} className="contrib-editor-spin" aria-hidden />
              Đang tải…
            </span>
          ) : (
            <div className="contrib-editor-meta__thumb-actions">
              <button
                type="button"
                className="contrib-editor-meta__thumb-act"
                title="Chọn ảnh"
                aria-label="Chọn ảnh từ máy"
                onClick={openFilePicker}
              >
                <ImagePlus size={18} strokeWidth={1.8} aria-hidden />
              </button>
              <button
                type="button"
                className="contrib-editor-meta__thumb-act contrib-editor-meta__thumb-act--paste"
                title="Dán ảnh"
                aria-label="Dán ảnh từ bộ nhớ tạm"
                onClick={() => void pasteFromClipboard()}
              >
                <ClipboardPaste size={18} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          )}
        </div>
        {thumbMsg ? (
          <p className="contrib-editor-meta__thumb-msg" role="status">
            {thumbMsg}
          </p>
        ) : null}
      </section>

      <section className="contrib-editor-meta__block" aria-label="Tên thẻ">
        <div className="contrib-editor-field-stack">
          <label
            className="contrib-editor-field-label"
            htmlFor="contrib-draft-tieu-de"
          >
            Tên thẻ tag
          </label>
          <input
            id="contrib-draft-tieu-de"
            type="text"
            value={hero.tieu_de}
            readOnly
            className="contrib-editor-field contrib-editor-field--title contrib-editor-field--locked"
            placeholder="Game Designer"
            title="Tên thẻ lấy từ bài gốc — không sửa được"
            aria-readonly="true"
          />
        </div>

        <div className="contrib-editor-meta__pair">
          <div className="contrib-editor-field-stack">
            <label
              className="contrib-editor-field-label"
              htmlFor="contrib-draft-tieu-de-viet"
            >
              Tên tiếng Việt
            </label>
            <input
              id="contrib-draft-tieu-de-viet"
              type="text"
              value={hero.tieu_de_viet}
              onChange={(e) => onChange({ tieu_de_viet: e.target.value })}
              className="contrib-editor-field"
              placeholder="Nhà thiết kế game"
            />
          </div>
          <div className="contrib-editor-field-stack">
            <label
              className="contrib-editor-field-label"
              htmlFor="contrib-draft-tieu-de-eng"
            >
              Tên tiếng Anh
            </label>
            <input
              id="contrib-draft-tieu-de-eng"
              type="text"
              value={hero.tieu_de_eng}
              onChange={(e) => onChange({ tieu_de_eng: e.target.value })}
              className="contrib-editor-field"
              placeholder="Tùy chọn"
            />
          </div>
        </div>
      </section>

      <section className="contrib-editor-meta__block" aria-label="Mô tả">
        <div className="contrib-editor-field-stack">
          <div className="contrib-editor-field-head">
            <label
              className="contrib-editor-field-label"
              htmlFor="contrib-draft-tom-tat"
            >
              Mô tả ngắn
            </label>
            <span
              className={`contrib-editor-char-count${
                tomTatLen >= CONTRIB_TOM_TAT_MAX ? " is-limit" : ""
              }`}
            >
              {tomTatLen}/{CONTRIB_TOM_TAT_MAX}
            </span>
          </div>
          <textarea
            id="contrib-draft-tom-tat"
            value={hero.tom_tat}
            maxLength={CONTRIB_TOM_TAT_MAX}
            onChange={(e) => onChange({ tom_tat: e.target.value })}
            className="contrib-editor-field contrib-editor-field--area"
            rows={3}
            placeholder="Tóm tắt vai trò…"
          />
        </div>
      </section>

      <section className="contrib-editor-meta__block" aria-label="Video bìa">
        <div className="contrib-editor-field-stack">
          <label
            className="contrib-editor-field-label"
            htmlFor="contrib-draft-video"
          >
            URL video bìa
          </label>
          <input
            id="contrib-draft-video"
            type="url"
            value={hero.video_url}
            onChange={(e) => patchVideo(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (!pasted.trim()) return;
              e.preventDefault();
              patchVideo(pasted);
            }}
            className="contrib-editor-field"
            placeholder="Dán link YouTube…"
          />
        </div>
        {videoReady ? (
          <div className="contrib-editor-meta__video">
            <NgheLeadVideo url={videoUrl} />
          </div>
        ) : null}
      </section>

      {relatedFields.length > 0 ? (
        <section
          className="contrib-editor-meta__block contrib-editor-related"
          aria-label="Thẻ liên quan"
        >
          <p className="contrib-editor-related__title">Thẻ liên quan</p>
          <div className="contrib-editor-related__list">
            {relatedFields.map((field) => (
              <div key={field.loai} className="contrib-editor-field-stack">
                <label className="contrib-editor-field-label">{field.label}</label>
                <TagInput
                  value={toTagInputValue(
                    relatedTagsByLoai(relatedTags, field.loai),
                  )}
                  onChange={(next) => patchRelatedLoai(field.loai, next)}
                  loaiFilterFixed={field.loai}
                  maxTags={CONTRIB_RELATED_MAX}
                  showLimitHint={false}
                  placeholder={field.placeholder}
                  variant="modal"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
