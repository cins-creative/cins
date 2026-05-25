"use client";

import type { Editor } from "@tiptap/react";
import { clsx } from "clsx";
import { useState, type ReactNode } from "react";

import {
  isCurrentBlockHeading,
  isCurrentBlockParagraph,
  setCurrentBlockHeading,
  setCurrentBlockParagraph,
  type TruongHeadingLevel,
} from "@/lib/tiptap/current-block";

function TbBtn({
  pressed,
  disabled,
  onClick,
  title,
  children,
  compact,
}: {
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      data-active={pressed ? "true" : "false"}
      className={clsx(
        "article-draft-tiptap__btn",
        compact && "article-draft-tiptap__btn--compact",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TbIconBtn({
  pressed,
  disabled,
  onClick,
  title,
  children,
  wide,
}: {
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx(
        "article-draft-tiptap__icon-btn",
        wide && "article-draft-tiptap__icon-btn--wide",
      )}
      title={title}
      aria-label={title}
      disabled={disabled}
      data-active={pressed ? "true" : "false"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TbSep() {
  return <span className="article-draft-tiptap__sep" aria-hidden />;
}

export type TruongToolTab = "block" | "insert" | "table";

const TRUONG_TABS: { id: TruongToolTab; label: string }[] = [
  { id: "block", label: "Đoạn" },
  { id: "insert", label: "Chèn" },
  { id: "table", label: "Bảng" },
];

const TRUONG_HEADING_LEVELS = [1, 2, 3, 4, 5] as const;

type ToolbarCore = {
  editor: Editor | null;
  disabledVisual: boolean;
  run: (fn: (ed: Editor) => boolean) => void;
};

function IconBold() {
  return <strong aria-hidden>B</strong>;
}
function IconItalic() {
  return <em aria-hidden>I</em>;
}
function IconUnderline() {
  return (
    <span className="article-draft-tiptap__icon-u" aria-hidden>
      U
    </span>
  );
}
function IconStrike() {
  return (
    <span className="article-draft-tiptap__icon-s" aria-hidden>
      S
    </span>
  );
}
function IconCode() {
  return <span aria-hidden>&lt;&gt;</span>;
}
function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 1 0 7.07 7.07L13 19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconUnlink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 15l6-6M10.5 8.5l-2-2a3 3 0 1 1 4.24 4.24l-1.06 1.06M13.5 15.5l2 2a3 3 0 1 1-4.24-4.24l1.06-1.06"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
      <path d="M21 17l-5-5-4 4-2-2-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconYoutube() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor" />
    </svg>
  );
}
function IconTable() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M3 14h18M9 5v14M15 5v14" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconUndo() {
  return <span aria-hidden>↶</span>;
}
function IconRedo() {
  return <span aria-hidden>↷</span>;
}
function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

type Props = {
  editor: Editor | null;
  disabledVisual: boolean;
  run: (fn: (ed: Editor) => boolean) => void;
  layout: "default" | "truong-inline";
  onOpenHtmlTab: () => void;
  onOpenPreview: () => void;
  /** Tab công cụ (modal trường — dock bảng ở đáy editor). */
  truongToolTab?: TruongToolTab;
  onTruongToolTabChange?: (tab: TruongToolTab) => void;
  /** `bottom`: panel Bảng render ngoài toolbar (sticky dưới vùng soạn). */
  truongTableDock?: "inline" | "bottom";
};

export function ArticleDraftToolbar({
  editor,
  disabledVisual,
  run,
  layout,
  onOpenHtmlTab,
  onOpenPreview,
  truongToolTab,
  onTruongToolTabChange,
  truongTableDock = "inline",
}: Props) {
  if (layout === "truong-inline") {
    return (
      <TruongInlineToolbar
        editor={editor}
        disabledVisual={disabledVisual}
        run={run}
        onOpenPreview={onOpenPreview}
        activeTab={truongToolTab}
        onTabChange={onTruongToolTabChange}
        tableDock={truongTableDock}
      />
    );
  }

  return (
    <DefaultToolbar
      editor={editor}
      disabledVisual={disabledVisual}
      run={run}
      onOpenHtmlTab={onOpenHtmlTab}
      onOpenPreview={onOpenPreview}
    />
  );
}

type TruongInlineToolbarProps = ToolbarCore & {
  onOpenPreview: () => void;
  activeTab?: TruongToolTab;
  onTabChange?: (tab: TruongToolTab) => void;
  tableDock?: "inline" | "bottom";
};

function TruongInlineToolbar({
  editor,
  disabledVisual,
  run,
  onOpenPreview,
  activeTab: controlledTab,
  onTabChange,
  tableDock = "inline",
}: TruongInlineToolbarProps) {
  const [internalTab, setInternalTab] = useState<TruongToolTab>("block");
  const tab = controlledTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;
  const core = { editor, disabledVisual, run };

  return (
    <div className="article-draft-tiptap__toolbar article-draft-tiptap__toolbar--tabbed">
      <div className="article-draft-tiptap__tool-tabs" role="tablist" aria-label="Công cụ soạn thảo">
        {TRUONG_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            data-active={tab === t.id ? "true" : "false"}
            className="article-draft-tiptap__tool-tab"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="article-draft-tiptap__tool-tabs-spacer" aria-hidden />
        <TbIconBtn
          title="Hoàn tác"
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().undo().run())}
        >
          <IconUndo />
        </TbIconBtn>
        <TbIconBtn
          title="Làm lại"
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().redo().run())}
        >
          <IconRedo />
        </TbIconBtn>
        <TbIconBtn title="Xem trước" disabled={false} onClick={onOpenPreview}>
          <IconEye />
        </TbIconBtn>
      </div>

      <div
        className="article-draft-tiptap__tool-panel"
        role="tabpanel"
        aria-label={TRUONG_TABS.find((t) => t.id === tab)?.label}
      >
        {tab === "block" ? <TruongTabDoan {...core} /> : null}
        {tab === "insert" ? <TruongTabInsert {...core} /> : null}
        {tab === "table" && tableDock === "inline" ? <TruongTabTable {...core} /> : null}
      </div>

      <p className="article-draft-tiptap__tool-foot">
        Dán hoặc kéo thả ảnh trực tiếp vào vùng soạn bên dưới
      </p>
    </div>
  );
}

function TruongTabDoan({ editor, disabledVisual, run }: ToolbarCore) {
  return (
    <div className="article-draft-tiptap__tool-row article-draft-tiptap__tool-row--wrap">
      <TbIconBtn
        title="In đậm"
        pressed={editor?.isActive("bold")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleBold().run())}
      >
        <IconBold />
      </TbIconBtn>
      <TbIconBtn
        title="In nghiêng"
        pressed={editor?.isActive("italic")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleItalic().run())}
      >
        <IconItalic />
      </TbIconBtn>
      <TbIconBtn
        title="Gạch chân"
        pressed={editor?.isActive("underline")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleUnderline().run())}
      >
        <IconUnderline />
      </TbIconBtn>
      <TbIconBtn
        title="Gạch ngang chữ"
        pressed={editor?.isActive("strike")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleStrike().run())}
      >
        <IconStrike />
      </TbIconBtn>
      <TbIconBtn
        title="Mã inline"
        pressed={editor?.isActive("code")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleCode().run())}
      >
        <IconCode />
      </TbIconBtn>
      <TbSep />
      {TRUONG_HEADING_LEVELS.map((lvl) => (
        <TbIconBtn
          key={lvl}
          wide
          title={`Tiêu đề H${lvl} — chỉ dòng hiện tại`}
          pressed={editor ? isCurrentBlockHeading(editor, lvl) : false}
          disabled={disabledVisual}
          onClick={() =>
            run((ed) => setCurrentBlockHeading(ed, lvl as TruongHeadingLevel))
          }
        >
          H{lvl}
        </TbIconBtn>
      ))}
      <TbIconBtn
        wide
        title="Body — đoạn văn thường (dòng hiện tại)"
        pressed={editor ? isCurrentBlockParagraph(editor) : false}
        disabled={disabledVisual}
        onClick={() => run((ed) => setCurrentBlockParagraph(ed))}
      >
        Body
      </TbIconBtn>
      <TbSep />
      <TbIconBtn
        title="Danh sách gạch đầu dòng"
        pressed={editor?.isActive("bulletList")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleBulletList().run())}
      >
        •
      </TbIconBtn>
      <TbIconBtn
        title="Danh sách đánh số"
        pressed={editor?.isActive("orderedList")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleOrderedList().run())}
      >
        1.
      </TbIconBtn>
      <TbIconBtn
        title="Trích dẫn"
        pressed={editor?.isActive("blockquote")}
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleBlockquote().run())}
      >
        “
      </TbIconBtn>
      <TbIconBtn
        title="Đường kẻ ngang"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().setHorizontalRule().run())}
      >
        ─
      </TbIconBtn>
    </div>
  );
}

function TruongTabInsert({ editor, disabledVisual, run }: ToolbarCore) {
  return (
    <div className="article-draft-tiptap__tool-row">
      <TbIconBtn
        title="Chèn liên kết"
        disabled={disabledVisual}
        onClick={() => {
          const prev = editor?.getAttributes("link").href as string | undefined;
          const url = window.prompt("Địa chỉ liên kết", prev ?? "https://");
          if (url === null) return;
          const t = url.trim();
          if (t === "") {
            run((ed) => ed.chain().focus().extendMarkRange("link").unsetLink().run());
            return;
          }
          run((ed) =>
            ed.chain().focus().extendMarkRange("link").setLink({ href: t }).run(),
          );
        }}
      >
        <IconLink />
      </TbIconBtn>
      <TbIconBtn
        title="Bỏ liên kết"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().unsetLink().run())}
      >
        <IconUnlink />
      </TbIconBtn>
      <TbSep />
      <TbIconBtn
        title="Chèn ảnh từ URL"
        disabled={disabledVisual}
        onClick={() => {
          const url = window.prompt("URL ảnh", "https://");
          if (!url?.trim()) return;
          run((ed) => ed.chain().focus().setImage({ src: url.trim(), alt: "" }).run());
        }}
      >
        <IconImage />
      </TbIconBtn>
      <TbIconBtn
        title="Nhúng YouTube"
        disabled={disabledVisual}
        onClick={() => {
          const url = window.prompt("URL YouTube", "https://www.youtube.com/watch?v=");
          if (!url?.trim()) return;
          run((ed) => ed.chain().focus().setYoutubeVideo({ src: url.trim() }).run());
        }}
      >
        <IconYoutube />
      </TbIconBtn>
    </div>
  );
}

export function TruongTabTable({ disabledVisual, run }: ToolbarCore) {
  return (
    <div className="article-draft-tiptap__tool-row article-draft-tiptap__tool-row--table">
      <TbIconBtn
        title="Chèn bảng 3×3"
        disabled={disabledVisual}
        onClick={() =>
          run((ed) =>
            ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
          )
        }
      >
        <IconTable />
      </TbIconBtn>
      <TbIconBtn
        title="Xóa bảng"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().deleteTable().run())}
      >
        ×
      </TbIconBtn>
      <TbSep />
      <TbIconBtn
        title="Thêm cột trái"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().addColumnBefore().run())}
      >
        ⊞←
      </TbIconBtn>
      <TbIconBtn
        title="Thêm cột phải"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().addColumnAfter().run())}
      >
        →⊞
      </TbIconBtn>
      <TbIconBtn
        title="Xóa cột"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().deleteColumn().run())}
      >
        ⊟|
      </TbIconBtn>
      <TbSep />
      <TbIconBtn
        title="Thêm hàng trên"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().addRowBefore().run())}
      >
        ⊞↑
      </TbIconBtn>
      <TbIconBtn
        title="Thêm hàng dưới"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().addRowAfter().run())}
      >
        ↓⊞
      </TbIconBtn>
      <TbIconBtn
        title="Xóa hàng"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().deleteRow().run())}
      >
        ⊟─
      </TbIconBtn>
      <TbSep />
      <TbIconBtn
        title="Gộp ô"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().mergeCells().run())}
      >
        ⧉
      </TbIconBtn>
      <TbIconBtn
        title="Tách ô"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().splitCell().run())}
      >
        ⧇
      </TbIconBtn>
      <TbIconBtn
        title="Hàng tiêu đề"
        disabled={disabledVisual}
        onClick={() => run((ed) => ed.chain().focus().toggleHeaderRow().run())}
      >
        TH
      </TbIconBtn>
    </div>
  );
}

function DefaultToolbar({
  editor,
  disabledVisual,
  run,
  onOpenHtmlTab,
  onOpenPreview,
}: Omit<Props, "layout">) {
  return (
    <div className="article-draft-tiptap__toolbar">
      <div className="article-draft-tiptap__toolbar-row">
        <TbBtn
          title="Đậm"
          pressed={editor?.isActive("bold")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleBold().run())}
        >
          <strong>B</strong>
        </TbBtn>
        <TbBtn
          title="Nghiêng"
          pressed={editor?.isActive("italic")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleItalic().run())}
        >
          <em>I</em>
        </TbBtn>
        <TbBtn
          title="Gạch chân"
          pressed={editor?.isActive("underline")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleUnderline().run())}
        >
          <u>U</u>
        </TbBtn>
        <TbBtn
          title="Gạch ngang"
          pressed={editor?.isActive("strike")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleStrike().run())}
        >
          S
        </TbBtn>
        <TbBtn
          title="Code inline"
          pressed={editor?.isActive("code")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleCode().run())}
        >
          &lt;&gt;
        </TbBtn>
        <span className="article-draft-tiptap__sep" aria-hidden />
        {[1, 2, 3].map((lvl) => (
          <TbBtn
            key={lvl}
            title={`Tiêu đề H${lvl}`}
            pressed={editor?.isActive("heading", { level: lvl })}
            disabled={disabledVisual}
            onClick={() =>
              run((ed) =>
                ed.chain().focus().toggleHeading({ level: lvl as 1 | 2 | 3 }).run(),
              )
            }
          >
            H{lvl}
          </TbBtn>
        ))}
        <TbBtn
          title="Đoạn văn"
          pressed={editor?.isActive("paragraph")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().setParagraph().run())}
        >
          ¶
        </TbBtn>
        <span className="article-draft-tiptap__sep" aria-hidden />
        <TbBtn
          title="Danh sách bullet"
          pressed={editor?.isActive("bulletList")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleBulletList().run())}
        >
          •
        </TbBtn>
        <TbBtn
          title="Danh sách số"
          pressed={editor?.isActive("orderedList")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleOrderedList().run())}
        >
          1.
        </TbBtn>
        <TbBtn
          title="Trích dẫn"
          pressed={editor?.isActive("blockquote")}
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleBlockquote().run())}
        >
          “”
        </TbBtn>
        <TbBtn
          title="Đường kẻ ngang"
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().setHorizontalRule().run())}
        >
          ─
        </TbBtn>
      </div>

      <div className="article-draft-tiptap__toolbar-row">
        <span className="article-draft-tiptap__toolbar-label">BẢNG</span>
        <TbBtn
          title="Chèn bảng 3×3"
          compact
          disabled={disabledVisual}
          onClick={() =>
            run((ed) =>
              ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
            )
          }
        >
          +Bảng
        </TbBtn>
        <TbBtn
          title="Thêm cột trước"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().addColumnBefore().run())}
        >
          +←Col
        </TbBtn>
        <TbBtn
          title="Thêm cột sau"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().addColumnAfter().run())}
        >
          Col→+
        </TbBtn>
        <TbBtn
          title="Xóa cột"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().deleteColumn().run())}
        >
          −Col
        </TbBtn>
        <TbBtn
          title="Thêm hàng trên"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().addRowBefore().run())}
        >
          +↑Row
        </TbBtn>
        <TbBtn
          title="Thêm hàng dưới"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().addRowAfter().run())}
        >
          Row↓+
        </TbBtn>
        <TbBtn
          title="Xóa hàng"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().deleteRow().run())}
        >
          −Row
        </TbBtn>
        <TbBtn
          title="Gộp ô"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().mergeCells().run())}
        >
          ⧉
        </TbBtn>
        <TbBtn
          title="Tách ô"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().splitCell().run())}
        >
          ⧇
        </TbBtn>
        <TbBtn
          title="Bật/tắt hàng tiêu đề"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().toggleHeaderRow().run())}
        >
          Hàng TH
        </TbBtn>
        <TbBtn
          title="Xóa bảng"
          compact
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().deleteTable().run())}
        >
          ×Bảng
        </TbBtn>
      </div>

      <div className="article-draft-tiptap__toolbar-row">
        <span className="article-draft-tiptap__toolbar-label">MEDIA</span>
        <TbBtn
          title="Chèn liên kết"
          disabled={disabledVisual}
          onClick={() => {
            const prev = editor?.getAttributes("link").href as string | undefined;
            const url = window.prompt("URL liên kết", prev ?? "https://");
            if (url === null) return;
            const t = url.trim();
            if (t === "") {
              run((ed) => ed.chain().focus().extendMarkRange("link").unsetLink().run());
              return;
            }
            run((ed) => ed.chain().focus().extendMarkRange("link").setLink({ href: t }).run());
          }}
        >
          🔗
        </TbBtn>
        <TbBtn
          title="Bỏ liên kết"
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().unsetLink().run())}
        >
          ⊘
        </TbBtn>
        <TbBtn
          title="Chèn ảnh từ URL"
          disabled={disabledVisual}
          onClick={() => {
            const url = window.prompt("URL ảnh (https://…)", "https://");
            if (!url?.trim()) return;
            run((ed) => ed.chain().focus().setImage({ src: url.trim(), alt: "" }).run());
          }}
        >
          Ảnh
        </TbBtn>
        <TbBtn
          title="YouTube"
          disabled={disabledVisual}
          onClick={() => {
            const url = window.prompt("URL YouTube", "https://www.youtube.com/watch?v=");
            if (!url?.trim()) return;
            run((ed) => ed.chain().focus().setYoutubeVideo({ src: url.trim() }).run());
          }}
        >
          YouTube
        </TbBtn>
        <TbBtn title="Chuyển sang tab HTML" disabled={false} onClick={onOpenHtmlTab}>
          {"{}"} HTML
        </TbBtn>
        <TbBtn title="Xem trước HTML trên trang" disabled={false} onClick={onOpenPreview}>
          Review HTML
        </TbBtn>
        <span className="article-draft-tiptap__sep" aria-hidden />
        <TbBtn
          title="Hoàn tác"
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().undo().run())}
        >
          ↶
        </TbBtn>
        <TbBtn
          title="Làm lại"
          disabled={disabledVisual}
          onClick={() => run((ed) => ed.chain().focus().redo().run())}
        >
          ↷
        </TbBtn>
        <span className="article-draft-tiptap__toolbar-label" style={{ marginLeft: "auto" }}>
          Paste / kéo thả ảnh
        </span>
      </div>
    </div>
  );
}
