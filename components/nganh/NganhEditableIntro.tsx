"use client";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { KeywordInlineLeadPreview } from "@/components/article/keyword/KeywordInlineLeadPreview";
import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import {
  introHtmlForEditor,
  mergeIntroIntoNoiDung,
} from "@/lib/nganh/noi-dung-sections";

import "@/styles/article-draft-tiptap.css";

type Props = {
  titleVi: string;
  introHtml: string | null;
};

export function NganhEditableIntro({ titleVi, introHtml }: Props) {
  const ctx = useNganhInlineEdit();
  if (!introHtml && !ctx?.isEditing) return null;

  return (
    <>
      <div className="nct-sec-title">
        <div className="nct-sec-num">01</div>
        <div>
          <h2 className="nct-sec-h">Ngành {titleVi} là gì?</h2>
        </div>
      </div>
      {ctx?.isEditing ? (
        <div className="nct-inline-editor-wrap">
          <ArticleDraftContentEditor
            value={introHtmlForEditor(ctx.noi_dung)}
            onChange={(html) =>
              ctx.setNoiDung(mergeIntroIntoNoiDung(html, ctx.noi_dung))
            }
          />
        </div>
      ) : introHtml ? (
        <KeywordInlineLeadPreview
          html={introHtml}
          className="nct-prose body"
        />
      ) : null}
    </>
  );
}
