"use client";

import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { KeywordInlineProse } from "@/components/article/keyword/KeywordInlineProse";
import { useSoftwareInlineEdit } from "@/components/article/software/inline/SoftwareInlineEditContext";

import "@/styles/article-draft-tiptap.css";

type Props = {
  /** HTML lead đã gắn keyword (xử lý trên server). */
  linkedLeadHtml: string | null;
};

export function SoftwareEditableLead({ linkedLeadHtml }: Props) {
  const ctx = useSoftwareInlineEdit();

  if (ctx?.isEditing) {
    return (
      <div className="nghe-lead-panel sw-lead-panel--editing" data-rich-lead-slot="true">
        <div className="nct-inline-editor-wrap">
          <ArticleDraftContentEditor
            value={ctx.noi_dung}
            onChange={ctx.setNoiDung}
          />
        </div>
      </div>
    );
  }

  if (linkedLeadHtml) {
    return (
      <div className="nghe-lead-panel" data-rich-lead-slot="true">
        <div className="article-content-html">
          <KeywordInlineProse
            html={linkedLeadHtml}
            className="nghe-lead-rich article-rich-content article-content-html"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="nghe-lead-panel" data-rich-lead-slot="true">
      <p className="nghe-side-empty">Nội dung phần mềm đang được cập nhật.</p>
    </div>
  );
}
