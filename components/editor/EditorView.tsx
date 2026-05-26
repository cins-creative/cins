"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  Globe,
  ImagePlus,
  Lock,
  Pencil,
  Star,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

import { publishPost } from "@/app/[slug]/p/new/actions";
import { updatePost } from "@/app/[slug]/p/[postSlug]/sua/actions";
import type {
  Block as ServerBlock,
  BlockType as ServerBlockType,
  LoaiMoc,
  Visibility as ServerVisibility,
} from "@/lib/editor/types";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ CINs Editor — port từ mockup `cins-editor.html`, theo brief     ║
   ║ `docs/cins-editor brief`. Block editor kiểu Notion: chèn bằng   ║
   ║ nút `+` giữa các block (KHÔNG slash menu).                       ║
   ║                                                                  ║
   ║ Nút "Đăng" → server action `publishPost` (xem `actions.ts`):    ║
   ║   1. Validate session + slug ownership                           ║
   ║   2. Serialize blocks (local shape → canonical `{id,loai,        ║
   ║      thu_tu,config}`)                                            ║
   ║   3. Generate unique slug + render HTML (sanitize)               ║
   ║   4. Insert cot_moc + tac_pham + link                            ║
   ║   5. revalidatePath(/${slug}/journey) → client redirect          ║
   ╚══════════════════════════════════════════════════════════════════╝ */

/* ─── Block model ────────────────────────────────────────────────── */

type BlockType =
  | "h2"
  | "h3"
  | "body"
  | "quote"
  | "imgs"
  | "embed"
  | "palette"
  | "divider"
  | "spacer";

type ImgLayout = "full" | "boxed" | "duo" | "trio" | "grid4" | "mosaic";

type Block = {
  id: string;
  t: BlockType;
  /* Text blocks */
  text?: string;
  /* Image block */
  layout?: ImgLayout;
  imgs?: string[]; // mảng "seed" cho picsum (placeholder cho Cloudflare media_id)
  rounded?: boolean;
  cap?: string;
  /* Embed block */
  embedUrl?: string;
  /* Palette block */
  colors?: string[];
  /* Spacer */
  size?: "s" | "m" | "l";
};

type Visibility = "feature" | "public" | "theo_nhom" | "chi_minh";

const SEED_BASE = "https://picsum.photos/seed/";
const ph = (s: string, w = 900, h = 600) => `${SEED_BASE}${s}/${w}/${h}`;

const BLOCK_TYPES: Array<{
  t: BlockType;
  ico: string;
  name: string;
  desc: string;
}> = [
  { t: "h2", ico: "H₂", name: "Tiêu đề lớn", desc: "Heading section" },
  { t: "h3", ico: "H₃", name: "Tiêu đề nhỏ", desc: "Sub-heading" },
  { t: "body", ico: "¶", name: "Đoạn văn", desc: "Văn bản thường" },
  { t: "quote", ico: "❝", name: "Trích dẫn", desc: "Pull-quote nổi bật" },
  { t: "imgs", ico: "▥", name: "Ảnh / Album", desc: "Đổi được layout" },
  { t: "embed", ico: "▶", name: "Nhúng", desc: "YouTube · Figma · Behance" },
  { t: "palette", ico: "◐", name: "Bảng màu", desc: "Rút từ ảnh" },
  { t: "divider", ico: "—", name: "Ngăn cách", desc: "Divider" },
  { t: "spacer", ico: "↕", name: "Khoảng trống", desc: "Thêm khoảng cách" },
];

const IMG_LAYOUTS: Array<{
  k: ImgLayout;
  ico: string;
  n: number;
  name: string;
}> = [
  { k: "full", ico: "▭", n: 1, name: "Tràn viền" },
  { k: "boxed", ico: "▢", n: 1, name: "Trong khung" },
  { k: "duo", ico: "▌▌", n: 2, name: "Đôi" },
  { k: "trio", ico: "▦", n: 3, name: "Ba" },
  { k: "grid4", ico: "▦", n: 4, name: "Lưới 4" },
];

const VIS_OPTIONS: Array<{
  k: Visibility;
  Icon: LucideIcon;
  label: string;
  desc: string;
}> = [
  {
    k: "feature",
    Icon: Star,
    label: "Nổi bật",
    desc: "Công khai & ghim lên đầu Journey của bạn",
  },
  {
    k: "public",
    Icon: Globe,
    label: "Công khai",
    desc: "Hiện trên Gallery, ai cũng xem được",
  },
  {
    k: "theo_nhom",
    Icon: Users,
    label: "Theo nhóm",
    desc: "Chỉ nhóm bối cảnh được chọn",
  },
  {
    k: "chi_minh",
    Icon: Lock,
    label: "Chỉ mình tôi",
    desc: "Riêng tư, không ai khác thấy",
  },
];

const LIBRARY_SEEDS = [
  "lib-1",
  "lib-2",
  "lib-3",
  "lib-4",
  "lib-5",
  "lib-6",
  "lib-7",
  "lib-8",
  "festival-1",
  "festival-2",
  "festival-3",
  "festival-4",
];

const DEMO_PALETTE = ["#1B2733", "#3A5468", "#8AA6B8", "#D6C9A8", "#E8E2D4"];

/* ─── ID gen — stable cross-render (avoid Math.random in render). ─── */
let idCounter = 0;
function newId() {
  idCounter += 1;
  return `b-${Date.now().toString(36)}-${idCounter}`;
}

/* ─── EditorView ─────────────────────────────────────────────────── */

/**
 * Snapshot bài viết hiện tại (mode="edit"). EditorView seed state từ đây.
 * `blocks` ở dạng server canonical (`Block` schema từ `lib/editor/types`) —
 * EditorView tự convert sang local Block shape ở init state.
 */
export type EditorInitial = {
  tacPhamId: string;
  cotMocId: string;
  tieuDe: string;
  moTa: string | null;
  coverSeed: string | null;
  tags: string[];
  visibility: ServerVisibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  blocks: ServerBlock[];
};

type Props = {
  ownerSlug: string;
  ownerName: string;
  /** "edit" cần `initial`. Default "create". */
  mode?: "create" | "edit";
  initial?: EditorInitial;
};

export function EditorView({
  ownerSlug,
  ownerName,
  mode = "create",
  initial,
}: Props) {
  const isEdit = mode === "edit" && !!initial;

  const [coverSeed, setCoverSeed] = useState<string | null>(
    initial?.coverSeed ?? null,
  );
  const [title, setTitle] = useState(initial?.tieuDe ?? "");
  const [sub, setSub] = useState(initial?.moTa ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initial?.blocks ? fromServerBlocks(initial.blocks) : [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAddIdx, setOpenAddIdx] = useState<number | null>(null);

  const [vis, setVis] = useState<Visibility>(initial?.visibility ?? "public");
  const [visOpen, setVisOpen] = useState(false);

  const [imgPickerTarget, setImgPickerTarget] = useState<{
    blockId: string;
    slot: number;
  } | null>(null);
  /* Riêng cho cover: state độc lập (không trộn vào `imgPickerTarget` để
     tránh nhầm với image-block picker). */
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const visRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  /* Đóng dropdown khi click ra ngoài. */
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (visRef.current && !visRef.current.contains(e.target as Node)) {
        setVisOpen(false);
      }
      const root = editorRef.current;
      if (root && !root.contains(e.target as Node)) {
        setOpenAddIdx(null);
      } else if (root) {
        /* click trong editor nhưng ngoài add-zone */
        const t = e.target as HTMLElement;
        if (!t.closest(".add-zone")) setOpenAddIdx(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /* Đóng toast tự động. */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const addBlock = useCallback(
    (type: BlockType, idx: number) => {
      const b: Block = { id: newId(), t: type };
      if (type === "imgs") {
        b.layout = "full";
        b.imgs = [`new-${b.id}`];
        b.cap = "";
        b.rounded = false;
      }
      if (type === "spacer") b.size = "m";
      if (type === "palette") b.colors = DEMO_PALETTE.slice();
      if (["h2", "h3", "body", "quote"].includes(type)) b.text = "";
      setBlocks((prev) => {
        const next = prev.slice();
        next.splice(idx, 0, b);
        return next;
      });
      setOpenAddIdx(null);
      setSelectedId(b.id);
    },
    [],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<Block>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      );
    },
    [],
  );

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(i, 1);
      next.splice(j, 0, moved);
      return next;
    });
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const openImgPicker = useCallback((blockId: string, slot: number) => {
    setImgPickerTarget({ blockId, slot });
  }, []);

  const onPickImage = useCallback(
    (seed: string) => {
      if (!imgPickerTarget) return;
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== imgPickerTarget.blockId) return b;
          const imgs = (b.imgs || []).slice();
          imgs[imgPickerTarget.slot] = seed;
          return { ...b, imgs };
        }),
      );
      setImgPickerTarget(null);
    },
    [imgPickerTarget],
  );

  const setLayout = useCallback(
    (id: string, layout: ImgLayout) => {
      if (layout === "mosaic") {
        setToast(
          "Lưới tùy chỉnh (mosaic) sẽ mở trong lượt cập nhật tới.",
        );
        return;
      }
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          const need = IMG_LAYOUTS.find((l) => l.k === layout)?.n || 1;
          const imgs = (b.imgs || []).slice();
          while (imgs.length < need) {
            imgs.push(`extra-${b.id}-${imgs.length}`);
          }
          return { ...b, layout, imgs };
        }),
      );
    },
    [],
  );

  const toggleRound = useCallback(
    (id: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, rounded: !b.rounded } : b)),
      );
    },
    [],
  );

  const handlePublish = useCallback(() => {
    if (isPending) return;
    if (!title.trim()) {
      setToast("Cần nhập tiêu đề trước khi đăng.");
      return;
    }
    if (blocks.length === 0) {
      setToast("Bài viết chưa có nội dung. Thêm ít nhất một block.");
      return;
    }

    const serverBlocks: ServerBlock[] = toServerBlocks(blocks);

    startTransition(async () => {
      const result = isEdit && initial
        ? await updatePost({
            ownerSlug,
            tacPhamId: initial.tacPhamId,
            cotMocId: initial.cotMocId,
            tieuDe: title.trim(),
            moTa: sub.trim(),
            coverSeed,
            tags,
            visibility: vis,
            loaiMoc: initial.loaiMoc,
            thoiDiem: initial.thoiDiem,
            blocks: serverBlocks,
          })
        : await publishPost({
            ownerSlug,
            tieuDe: title.trim(),
            moTa: sub.trim(),
            coverSeed,
            tags,
            visibility: vis,
            loaiMoc: DEFAULT_LOAI_MOC,
            thoiDiem: isoToday(),
            blocks: serverBlocks,
          });

      if (!result.ok) {
        setToast(result.error || "Không lưu được bài viết.");
        return;
      }

      setSavedFlash(true);
      setToast(
        isEdit
          ? "✓ Đã lưu thay đổi. Đang quay về Journey…"
          : "✓ Đã đăng bài. Đang quay về Journey…",
      );
      /* Cho user thấy success flash 1.2s rồi nhảy về Journey. */
      setTimeout(() => {
        router.push(`/${ownerSlug}/journey`);
      }, 1200);
    });
  }, [
    isEdit,
    initial,
    isPending,
    title,
    sub,
    coverSeed,
    tags,
    vis,
    blocks,
    ownerSlug,
    router,
  ]);

  const visCurrent = useMemo(
    () => VIS_OPTIONS.find((o) => o.k === vis) || VIS_OPTIONS[0],
    [vis],
  );

  return (
    <div className="cins-editor-page" ref={editorRef}>
      {/* TOPBAR */}
      <header className="ed-topbar">
        <div className="ed-topbar-inner">
          <Link href={`/${ownerSlug}/journey`} className="ed-brand" title="Về Journey">
            <span className="ed-brand-mark">CI</span>
            <span className="ed-title">Trình tạo bài viết</span>
          </Link>
          <span className="ed-status">
            <span className="ico" aria-hidden>
              ✓
            </span>{" "}
            Bản nháp tự lưu trong phiên này
          </span>
          <span className="ed-spacer" />

          <div
            className={`vis-select${visOpen ? " open" : ""}`}
            ref={visRef}
          >
            <button
              type="button"
              className="vis-btn"
              onClick={(e) => {
                e.stopPropagation();
                setVisOpen((v) => !v);
              }}
            >
              <span className="ico" aria-hidden>
                <visCurrent.Icon size={14} strokeWidth={1.7} />
              </span>
              <span>{visCurrent.label}</span>
              <span className="caret" aria-hidden>
                ▾
              </span>
            </button>
            <div className="vis-menu" role="menu">
              {VIS_OPTIONS.map((o) => (
                <button
                  key={o.k}
                  type="button"
                  className={`vis-opt${o.k === vis ? " active" : ""}`}
                  onClick={() => {
                    setVis(o.k);
                    setVisOpen(false);
                  }}
                >
                  <span className="ico" aria-hidden>
                    <o.Icon size={14} strokeWidth={1.7} />
                  </span>
                  <span>
                    <b>{o.label}</b>
                    <em>{o.desc}</em>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="ed-btn primary"
            onClick={handlePublish}
            disabled={isPending || savedFlash}
            aria-busy={isPending}
          >
            {savedFlash ? (
              <>
                <span aria-hidden>✓</span> Đã đăng
              </>
            ) : isPending ? (
              <>
                <span aria-hidden>…</span> Đang đăng
              </>
            ) : (
              <>
                <span aria-hidden>↗</span> Đăng
              </>
            )}
          </button>
        </div>
      </header>

      {/* CANVAS */}
      <main className="editor-canvas" aria-label={`Soạn bài cho ${ownerName}`}>
        <CoverArea
          seed={coverSeed}
          onPick={() => setCoverPickerOpen(true)}
          onRemove={() => setCoverSeed(null)}
        />

        <AutosizeTextarea
          className="title-in"
          placeholder="Tiêu đề bài viết…"
          value={title}
          onChange={setTitle}
          maxRows={4}
        />
        <AutosizeTextarea
          className="sub-in"
          placeholder="Mô tả ngắn (tuỳ chọn)…"
          value={sub}
          onChange={setSub}
          maxRows={3}
        />

        <TagChips tags={tags} onAddPlaceholder={() => setTags(["dự-án", ...tags.filter((t) => t !== "dự-án")])} />

        <div className="blocks">
          <AddZone
            idx={0}
            open={openAddIdx === 0}
            onToggle={(open) => setOpenAddIdx(open ? 0 : null)}
            onPick={(type) => addBlock(type, 0)}
            hint={
              blocks.length === 0
                ? "Bắt đầu — chọn loại block"
                : undefined
            }
            starter={blocks.length === 0}
          />
          {blocks.map((b, i) => (
            <div key={b.id}>
              <BlockRow
                block={b}
                selected={selectedId === b.id}
                onSelect={() => setSelectedId(b.id)}
                onChangeText={(text) => updateBlock(b.id, { text })}
                onChangeSize={(size) => updateBlock(b.id, { size })}
                onChangeLayout={(layout) => setLayout(b.id, layout)}
                onToggleRound={() => toggleRound(b.id)}
                onPickImage={(slot) => openImgPicker(b.id, slot)}
                onChangeCap={(cap) => updateBlock(b.id, { cap })}
                onChangeEmbedUrl={(u) => updateBlock(b.id, { embedUrl: u })}
                onUp={() => moveBlock(b.id, -1)}
                onDown={() => moveBlock(b.id, 1)}
                onDelete={() => deleteBlock(b.id)}
              />
              <AddZone
                idx={i + 1}
                open={openAddIdx === i + 1}
                onToggle={(open) => setOpenAddIdx(open ? i + 1 : null)}
                onPick={(type) => addBlock(type, i + 1)}
              />
            </div>
          ))}
        </div>

        <div className="hint-foot">
          Bấm nút <b>+</b> ở khe giữa các block để chèn nội dung mới.
        </div>
      </main>

      {imgPickerTarget ? (
        <ImagePickerModal
          onClose={() => setImgPickerTarget(null)}
          onPick={onPickImage}
        />
      ) : null}

      {coverPickerOpen ? (
        <ImagePickerModal
          onClose={() => setCoverPickerOpen(false)}
          onPick={(seed) => {
            setCoverSeed(seed);
            setCoverPickerOpen(false);
          }}
        />
      ) : null}

      {toast ? <div className="ed-toast">{toast}</div> : null}
    </div>
  );
}

/* ─── Cover ──────────────────────────────────────────────────────── */

function CoverArea({
  seed,
  onPick,
  onRemove,
}: {
  seed: string | null;
  onPick: () => void;
  onRemove: () => void;
}) {
  if (seed) {
    return (
      <div className="cover-add has">
        <img src={ph(seed, 1600, 640)} alt="Ảnh bìa" />
        <div className="cover-actions">
          <button
            type="button"
            className="cover-act"
            onClick={onPick}
            aria-label="Đổi ảnh bìa"
          >
            <Pencil size={13} strokeWidth={1.8} aria-hidden />
            <span>Đổi ảnh bìa</span>
          </button>
          <button
            type="button"
            className="cover-act cover-act-del"
            onClick={onRemove}
            aria-label="Xoá ảnh bìa"
          >
            <Trash2 size={13} strokeWidth={1.8} aria-hidden />
            <span>Xoá</span>
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="cover-add"
      onClick={onPick}
      aria-label="Thêm ảnh bìa"
    >
      <span className="ico" aria-hidden>
        <ImagePlus size={22} strokeWidth={1.7} />
      </span>
      <span>Thêm ảnh bìa</span>
    </button>
  );
}

/* ─── Tag chips (stub v1: hard-coded + 1 placeholder add). ───────── */

function TagChips({
  tags,
  onAddPlaceholder,
}: {
  tags: string[];
  onAddPlaceholder: () => void;
}) {
  return (
    <div className="meta-chips">
      <span className="meta-chip">▦ Dự án</span>
      {tags.map((t) => (
        <span key={t} className="meta-chip">
          # {t}
        </span>
      ))}
      <button
        type="button"
        className="meta-chip add"
        onClick={onAddPlaceholder}
      >
        + Thêm tag
      </button>
    </div>
  );
}

/* ─── AddZone + Picker ───────────────────────────────────────────── */

function AddZone({
  open,
  onToggle,
  onPick,
  hint,
  starter,
}: {
  idx: number;
  open: boolean;
  onToggle: (next: boolean) => void;
  onPick: (t: BlockType) => void;
  /** Nhãn chữ hiện cạnh `+`. Truyền khi editor rỗng để hướng user. */
  hint?: string;
  /** Khi `true` → AddZone hiển thị to + xanh nổi bật (state khởi đầu). */
  starter?: boolean;
}) {
  return (
    <div
      className={`add-zone${open ? " open" : ""}${starter ? " starter" : ""}`}
    >
      <button
        type="button"
        className="add-btn"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(!open);
        }}
        aria-label={hint || "Chèn block"}
        title={hint || "Chèn block"}
      >
        +
      </button>
      {hint && !open ? <span className="add-hint">{hint}</span> : null}
      {open ? (
        <div
          className="picker"
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <div className="picker-lbl">Chèn block</div>
          <div className="picker-grid">
            {BLOCK_TYPES.map((b) => (
              <button
                key={b.t}
                type="button"
                className="pick"
                onClick={() => onPick(b.t)}
              >
                <span className="pic-ic" aria-hidden>
                  {b.ico}
                </span>
                <span>
                  <span className="pic-t">{b.name}</span>
                  <br />
                  <span className="pic-d">{b.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Block dispatch ─────────────────────────────────────────────── */

type BlockRowProps = {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onChangeText: (s: string) => void;
  onChangeSize: (s: "s" | "m" | "l") => void;
  onChangeLayout: (l: ImgLayout) => void;
  onToggleRound: () => void;
  onPickImage: (slot: number) => void;
  onChangeCap: (c: string) => void;
  onChangeEmbedUrl: (u: string) => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
};

function BlockRow(p: BlockRowProps) {
  const { block: b, selected, onSelect } = p;
  return (
    <div
      className={`block${selected ? " selected" : ""}`}
      data-block-type={b.t}
      onClick={onSelect}
    >
      <div className="block-side">
        <button
          type="button"
          className="side-btn"
          onClick={(e) => {
            e.stopPropagation();
            p.onUp();
          }}
          title="Lên"
          aria-label="Di chuyển lên"
        >
          ▲
        </button>
        <button
          type="button"
          className="side-btn"
          onClick={(e) => {
            e.stopPropagation();
            p.onDown();
          }}
          title="Xuống"
          aria-label="Di chuyển xuống"
        >
          ▼
        </button>
        <button
          type="button"
          className="side-btn del"
          onClick={(e) => {
            e.stopPropagation();
            p.onDelete();
          }}
          title="Xoá block"
          aria-label="Xoá"
        >
          ✕
        </button>
      </div>
      <div className="block-inner">
        <BlockInner {...p} />
      </div>
    </div>
  );
}

function BlockInner(p: BlockRowProps) {
  const { block: b } = p;
  if (b.t === "h2" || b.t === "h3" || b.t === "body") {
    const cls =
      b.t === "h2" ? "b-text h2" : b.t === "h3" ? "b-text h3" : "b-text";
    const placeholder =
      b.t === "h2"
        ? "Tiêu đề lớn…"
        : b.t === "h3"
          ? "Tiêu đề nhỏ…"
          : "Viết gì đó…";
    return (
      <AutosizeTextarea
        className={cls}
        placeholder={placeholder}
        value={b.text || ""}
        onChange={p.onChangeText}
      />
    );
  }

  if (b.t === "quote") {
    return (
      <div className="b-quote">
        <AutosizeTextarea
          placeholder="Trích dẫn nổi bật…"
          value={b.text || ""}
          onChange={p.onChangeText}
        />
      </div>
    );
  }

  if (b.t === "divider") {
    return (
      <div className="b-divider">
        <span />
      </div>
    );
  }

  if (b.t === "spacer") {
    const size = b.size || "m";
    return (
      <div className={`b-spacer ${size}`}>
        <div className="sp-line" />
        <div className="sp-ctrl">
          {(["s", "m", "l"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={size === s ? "active" : ""}
              onClick={(e) => {
                e.stopPropagation();
                p.onChangeSize(s);
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (b.t === "palette") {
    const colors = b.colors || DEMO_PALETTE;
    return (
      <div className="b-palette">
        {colors.map((c, i) => (
          <div key={`${c}-${i}`} className="sw" style={{ background: c }}>
            <span>{c}</span>
          </div>
        ))}
      </div>
    );
  }

  if (b.t === "embed") {
    return (
      <div className="b-embed">
        <div className="em-ic" aria-hidden>
          ▶
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="url"
            placeholder="Dán link YouTube / Figma / Behance…"
            value={b.embedUrl || ""}
            onChange={(e) => p.onChangeEmbedUrl(e.target.value)}
          />
          <div className="em-hint">Tự động nhúng khi dán link hợp lệ.</div>
        </div>
      </div>
    );
  }

  if (b.t === "imgs") {
    return <ImageBlock block={b} p={p} />;
  }

  return null;
}

/* ─── Image block ────────────────────────────────────────────────── */

function ImageBlock({ block, p }: { block: Block; p: BlockRowProps }) {
  const layout = (block.layout || "full") as ImgLayout;
  const cur = IMG_LAYOUTS.find((l) => l.k === layout) || IMG_LAYOUTS[0];
  const need = cur.n;
  const imgs = (block.imgs || []).slice(0, need);

  return (
    <div className="b-imgs">
      <div className="lay-bar">
        {IMG_LAYOUTS.map((l) => (
          <button
            key={l.k}
            type="button"
            className={`lay-btn${l.k === layout ? " active" : ""}`}
            title={l.name}
            onClick={(e) => {
              e.stopPropagation();
              p.onChangeLayout(l.k);
            }}
          >
            {l.ico}
          </button>
        ))}
        <span className="lay-sep" />
        <button
          type="button"
          className={`lay-btn round-toggle${block.rounded ? " active" : ""}`}
          title={block.rounded ? "Bỏ bo góc" : "Bo góc"}
          onClick={(e) => {
            e.stopPropagation();
            p.onToggleRound();
          }}
        >
          ◖
        </button>
      </div>

      <div className={`imgwrap ${layout}${block.rounded ? " rounded" : ""}`}>
        {imgs.map((seed, i) => (
          <div key={`${seed}-${i}`} className="ph">
            <img src={ph(seed, 900, 900)} alt="" />
            <button
              type="button"
              className="ph-change"
              onClick={(e) => {
                e.stopPropagation();
                p.onPickImage(i);
              }}
            >
              ▦ Đổi ảnh
            </button>
          </div>
        ))}
      </div>

      <div className="img-cap">
        <input
          type="text"
          placeholder="Thêm chú thích…"
          value={block.cap || ""}
          onChange={(e) => p.onChangeCap(e.target.value)}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            textAlign: "center",
            fontFamily: "inherit",
            fontSize: 12,
            color: "var(--ink-muted)",
            fontStyle: "italic",
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Image picker modal ─────────────────────────────────────────── */

function ImagePickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (seed: string) => void;
}) {
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="img-picker"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ip-sheet">
        <div className="ip-head">
          <strong>Chọn ảnh</strong>
          <button
            type="button"
            className="ip-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="ip-upload">
          <span aria-hidden style={{ fontSize: 26 }}>
            ⇪
          </span>
          <div>Kéo thả ảnh vào đây, hoặc bấm để tải lên</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Upload sẽ wire qua Cloudflare Images ở lượt sau.
          </div>
        </div>
        <div className="ip-lbl">Thư viện demo</div>
        <div className="ip-grid">
          {LIBRARY_SEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className="ip-item"
              onClick={() => onPick(s)}
            >
              <img src={ph(s, 200, 200)} alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Autosize textarea ──────────────────────────────────────────── */

function AutosizeTextarea({
  className,
  value,
  onChange,
  placeholder,
  maxRows,
}: {
  className?: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const onChangeRaw = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (maxRows && e.key === "Enter") {
        const ta = e.currentTarget;
        const lh = parseFloat(window.getComputedStyle(ta).lineHeight) || 20;
        const lines = ta.value.split("\n").length;
        if (lines >= maxRows) e.preventDefault();
      }
    },
    [maxRows],
  );

  return (
    <textarea
      ref={ref}
      className={className}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={onChangeRaw}
      onKeyDown={onKeyDown}
    />
  );
}

/* Misc helpers re-exported as `ReactNode` for clarity (no-op). */
export type EditorChildren = ReactNode;

/* ─── Serialize local Block → server Block (canonical schema) ────── */

const DEFAULT_LOAI_MOC: LoaiMoc = "ca_nhan";

const LOCAL_TO_SERVER_TYPE: Record<BlockType, ServerBlockType> = {
  h2: "h2",
  h3: "h3",
  body: "body",
  quote: "quote",
  imgs: "imgs",
  embed: "embed",
  palette: "palette",
  divider: "divider",
  spacer: "spacer",
};

/**
 * Invert `toServerBlocks` — dùng khi seed editor từ post đã lưu (`mode="edit"`).
 *
 * Server blocks (`{id, loai, thu_tu, config}`) → local Block. Config được
 * defensive parse (cast lỏng + fallback) vì DB jsonb có thể chứa shape cũ.
 */
function fromServerBlocks(blocks: ServerBlock[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.thu_tu - b.thu_tu);
  return sorted.map((sb) => {
    const t = SERVER_TO_LOCAL_TYPE[sb.loai];
    const cfg = (sb.config || {}) as Record<string, unknown>;
    const local: Block = { id: sb.id, t };

    if (t === "h2" || t === "h3" || t === "body" || t === "quote") {
      local.text = typeof cfg.html === "string" ? cfg.html : "";
    } else if (t === "imgs") {
      local.layout =
        typeof cfg.layout === "string"
          ? (cfg.layout as ImgLayout)
          : "full";
      local.rounded = !!cfg.rounded;
      local.cap = typeof cfg.cap === "string" ? cfg.cap : "";
      local.imgs = Array.isArray(cfg.imgs)
        ? (cfg.imgs as unknown[]).map(String)
        : [];
    } else if (t === "embed") {
      local.embedUrl = typeof cfg.url === "string" ? cfg.url : "";
    } else if (t === "palette") {
      local.colors = Array.isArray(cfg.colors)
        ? (cfg.colors as unknown[]).map(String)
        : DEMO_PALETTE.slice();
    } else if (t === "spacer") {
      local.size =
        cfg.size === "s" || cfg.size === "m" || cfg.size === "l"
          ? cfg.size
          : "m";
    }
    return local;
  });
}

const SERVER_TO_LOCAL_TYPE: Record<ServerBlockType, BlockType> = {
  h2: "h2",
  h3: "h3",
  body: "body",
  quote: "quote",
  imgs: "imgs",
  embed: "embed",
  palette: "palette",
  divider: "divider",
  spacer: "spacer",
};

function toServerBlocks(blocks: Block[]): ServerBlock[] {
  return blocks.map((b, i) => {
    const loai = LOCAL_TO_SERVER_TYPE[b.t];
    let config: Record<string, unknown> = {};
    if (b.t === "h2" || b.t === "h3" || b.t === "body" || b.t === "quote") {
      /* Plain text — server sẽ escape khi render HTML. */
      config = { html: (b.text || "").slice(0, 8000) };
    } else if (b.t === "imgs") {
      config = {
        layout: b.layout || "full",
        rounded: !!b.rounded,
        cap: (b.cap || "").slice(0, 280),
        imgs: (b.imgs || []).slice(0, 24),
      };
    } else if (b.t === "embed") {
      config = { url: (b.embedUrl || "").trim().slice(0, 2048) };
    } else if (b.t === "palette") {
      config = { colors: (b.colors || []).slice(0, 8) };
    } else if (b.t === "spacer") {
      config = { size: b.size || "m" };
    } else if (b.t === "divider") {
      config = {};
    }
    return { id: b.id, loai, thu_tu: i, config };
  });
}

function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
