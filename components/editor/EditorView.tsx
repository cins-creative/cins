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
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Columns2,
  Columns3,
  Globe,
  ImagePlus,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Lock,
  Maximize2,
  Move,
  Pencil,
  Plus,
  RectangleHorizontal,
  Save,
  SquareRoundCorner,
  Star,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  IMG_LAYOUTS,
  imgLayoutPreviewSlots,
  type ImgLayout,
  type MosaicCell,
} from "@/lib/editor/image-layout";
import { CongDongFeedFilterDropdown } from "@/components/cong-dong/CongDongFeedFilterDropdown";
import { CoAuthorSection } from "@/components/editor/CoAuthorSection";
import { updatePost } from "@/app/[slug]/p/[postSlug]/edit/actions";
import { publishPost } from "@/app/[slug]/p/new/actions";
import {
  getCfAccountHash,
  rememberCfAccountHashFromDeliveryUrl,
} from "@/lib/cloudflare/account-hash";
import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import type { CoAuthorDraft } from "@/lib/social/types";
import {
  loadAllArticlesForTagPicker,
  searchArticlesForTag,
} from "@/lib/editor/search-articles-action";
import type {
  Block as ServerBlock,
  BlockType as ServerBlockType,
  LoaiMoc,
  Visibility as ServerVisibility,
} from "@/lib/editor/types";
import {
  deriveMediaPostTitle,
  detectMediaPostKind,
  extractBodyCaption,
  mediaPostHasContent,
} from "@/lib/journey/post-media";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";

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
  /* Mosaic-only: số cột grid (2/3/4) + cells với col/row span tuỳ chỉnh. */
  cols?: number;
  cells?: MosaicCell[];
  gap?: number;
  pad?: number;
  /* Embed block */
  embedUrl?: string;
  /* Palette block */
  colors?: string[];
  /* Spacer */
  size?: "s" | "m" | "l";
  /* Divider: phần trăm chiều rộng canvas (5–100). Mặc định 8 (~70px). */
  dividerLen?: number;
  /* Divider: độ dày line (thin/med/thick → 2/3/6 px). Mặc định "med". */
  dividerThick?: "thin" | "med" | "thick";
};

type Visibility = "feature" | "public" | "theo_nhom" | "chi_minh";

const SEED_BASE = "https://picsum.photos/seed/";
const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Build URL từ seed.
 * - Seed UUID (Cloudflare imageId) → `imagedelivery.net/{hash}/{id}/public`.
 *   Account hash đọc qua `getCfAccountHash` (env public hoặc sessionStorage).
 * - Seed khác (`m-`, `extra-`, demo): rơi về `picsum.photos/seed/{seed}`.
 */
const ph = (s: string, w = 900, h = 600) => {
  const trimmed = (s || "").trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (CF_UUID_RE.test(trimmed)) {
    const hash = getCfAccountHash();
    if (hash) {
      return `https://imagedelivery.net/${hash}/${trimmed}/public`;
    }
  }
  return `${SEED_BASE}${trimmed}/${w}/${h}`;
};

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
  /** Danh sách `article_bai_viet` đã tag (xem `article_gan_tac_pham`). */
  tags: ArticleTagRef[];
  visibility: ServerVisibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  blocks: ServerBlock[];
  ownerVaiTro?: string;
  coAuthors?: CoAuthorDraft[];
};

type Props = {
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  /** "edit" cần `initial`. Default "create". */
  mode?: "create" | "edit";
  initial?: EditorInitial;
  /** Slug bài viết khi `mode === "edit"` — dùng cho nút "Huỷ" → trang post. */
  postSlug?: string;
  /** Overlay trên Journey — không full-page navigate. */
  presentation?: "page" | "overlay";
  /** Trang cộng đồng — ẩn visibility, hiện chọn loại bài (mặc định công khai). */
  congDongCompose?: CongDongComposeConfig;
  onClose?: () => void;
  onPublished?: () => void;
};

export function EditorView({
  ownerId,
  ownerSlug,
  ownerName,
  mode = "create",
  initial,
  postSlug,
  presentation = "page",
  congDongCompose,
  onClose,
  onPublished,
}: Props) {
  const isOverlay = presentation === "overlay";
  const isEdit = mode === "edit" && !!initial;
  /* Huỷ → journey (không link `/p/slug` — intercept modal sẽ mở popup thay vì thoát edit). */
  const cancelHref = `/${ownerSlug}`;

  const [coverSeed, setCoverSeed] = useState<string | null>(
    initial?.coverSeed ?? null,
  );
  const [title, setTitle] = useState(initial?.tieuDe ?? "");
  const [sub, setSub] = useState(initial?.moTa ?? "");
  const [tags, setTags] = useState<ArticleTagRef[]>(initial?.tags ?? []);
  const [ownerVaiTro, setOwnerVaiTro] = useState(initial?.ownerVaiTro ?? "");
  const [coAuthors, setCoAuthors] = useState<CoAuthorDraft[]>(
    initial?.coAuthors ?? [],
  );
  const [blocks, setBlocks] = useState<Block[]>(() =>
    initial?.blocks ? fromServerBlocks(initial.blocks) : [],
  );

  const mediaKind = useMemo(
    () => detectMediaPostKind(toServerBlocks(blocks)),
    [blocks],
  );
  const isMediaCompose = mediaKind !== null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAddIdx, setOpenAddIdx] = useState<number | null>(null);

  const [vis, setVis] = useState<Visibility>(initial?.visibility ?? "public");
  const [visOpen, setVisOpen] = useState(false);
  const sortedCongDongFilters = useMemo(
    () =>
      [...(congDongCompose?.filters ?? [])].sort(
        (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
      ),
    [congDongCompose?.filters],
  );
  const [composeFilterSlugs, setComposeFilterSlugs] = useState<string[]>(() => {
    const first = sortedCongDongFilters[0]?.slug;
    return first ? [first] : [];
  });
  const publishVisibility: Visibility = congDongCompose ? "public" : vis;
  const [coAuthorOpen, setCoAuthorOpen] = useState(false);

  const [imgPickerTarget, setImgPickerTarget] = useState<{
    blockId: string;
    slot: number;
    /** True khi đang chọn ảnh cho 1 ô mosaic (ghi vào `cells[slot].seed`). */
    mosaic?: boolean;
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

  /* ╔══ Undo stack (Ctrl/Cmd+Z) ══════════════════════════════════════
   * Lưu snapshot `blocks` TRƯỚC mỗi thao tác cấu trúc (add/delete/move/
   * setLayout/mosaic/onPickImage). KHÔNG snapshot cho updateBlock (text
   * edits, divider slider, embed url) — focus trong textarea/input vẫn
   * cho phép browser-native Ctrl+Z hoạt động.
   *
   * `blocksRef` mirror state qua useEffect — `pushHistory()` đọc giá trị
   * mới nhất mà không cần truyền vào dep tree, tránh re-create callback. */
  const HISTORY_LIMIT = 50;
  const historyRef = useRef<Block[][]>([]);
  const blocksRef = useRef<Block[]>([]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const pushHistory = useCallback(() => {
    /* Deep clone — block.config nested object share reference với updateBlock
       (spread shallow). Không clone → snapshot bị mutate khi user edit tiếp. */
    historyRef.current.push(
      JSON.parse(JSON.stringify(blocksRef.current)) as Block[],
    );
    if (historyRef.current.length > HISTORY_LIMIT) {
      historyRef.current.shift();
    }
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) {
      setToast("Không còn thao tác để hoàn tác.");
      return;
    }
    setBlocks(prev);
    setSelectedId(null);
    setToast("Đã hoàn tác.");
  }, []);

  /* Keyboard: Ctrl/Cmd+Z khi focus KHÔNG nằm trong text input. Trong input
     thì để browser xử lý undo text bản thân nó. */
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      if (e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toUpperCase();
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      undo();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [undo]);

  /* Đóng dropdown khi click ra ngoài. */
  useEffect(() => {
    function onDocClick(e: globalThis.MouseEvent) {
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
      pushHistory();
      setBlocks((prev) => {
        const next = prev.slice();
        next.splice(idx, 0, b);
        return next;
      });
      setOpenAddIdx(null);
      setSelectedId(b.id);
    },
    [pushHistory],
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
      pushHistory();
      const next = prev.slice();
      const [moved] = next.splice(i, 1);
      next.splice(j, 0, moved);
      return next;
    });
  }, [pushHistory]);

  const deleteBlock = useCallback(
    (id: string) => {
      pushHistory();
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [pushHistory],
  );

  const openImgPicker = useCallback((blockId: string, slot: number) => {
    setImgPickerTarget({ blockId, slot });
  }, []);

  const onPickImage = useCallback(
    (seed: string) => {
      if (!imgPickerTarget) return;
      const { blockId, slot, mosaic } = imgPickerTarget;
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          if (mosaic && b.cells) {
            const cells = b.cells.map((c, i) =>
              i === slot ? { ...c, seed } : c,
            );
            return { ...b, cells };
          }
          const imgs = (b.imgs || []).slice();
          imgs[slot] = seed;
          return { ...b, imgs };
        }),
      );
      setImgPickerTarget(null);
    },
    [imgPickerTarget, pushHistory],
  );

  const replaceImageSeed = useCallback((from: string, to: string) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.t !== "imgs") return b;
        const imgs = b.imgs?.map((seed) => (seed === from ? to : seed));
        const cells = b.cells?.map((cell) =>
          cell.seed === from ? { ...cell, seed: to } : cell,
        );
        return { ...b, imgs, cells };
      }),
    );
    setCoverSeed((current) => (current === from ? to : current));
  }, []);

  const setLayout = useCallback(
    (id: string, layout: ImgLayout) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          if (layout === "mosaic") {
            // Init cells lần đầu: lấy `imgs` hiện có (hoặc 3 ô seed mới),
            // cell đầu c=2/r=2 (ảnh lớn), còn lại c=1/r=1.
            const seeds =
              b.cells?.length
                ? b.cells.map((c) => c.seed)
                : (b.imgs && b.imgs.length
                    ? b.imgs.slice()
                    : [
                        `m-${b.id}-0`,
                        `m-${b.id}-1`,
                        `m-${b.id}-2`,
                      ]);
            const cells: MosaicCell[] =
              b.cells && b.cells.length
                ? b.cells
                : seeds.map((s, i) => ({
                    seed: s,
                    c: i === 0 ? 2 : 1,
                    r: i === 0 ? 2 : 1,
                  }));
            return {
              ...b,
              layout,
              cols: b.cols || 3,
              cells,
            };
          }
          const meta = IMG_LAYOUTS.find((l) => l.k === layout);
          const need = imgLayoutPreviewSlots(layout, (b.imgs || []).length);
          const imgs = (b.imgs || []).slice();
          if (!meta?.dynamic) {
            while (imgs.length < need) {
              imgs.push(`extra-${b.id}-${imgs.length}`);
            }
          }
          return { ...b, layout, imgs };
        }),
      );
    },
    [pushHistory],
  );

  /* ─── Mosaic helpers ───────────────────────────────────────────── */

  const setMosaicCols = useCallback(
    (id: string, cols: number) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === id && b.t === "imgs" ? { ...b, cols } : b,
        ),
      );
    },
    [pushHistory],
  );

  const mosaicPreset = useCallback(
    (id: string, preset: "big-left" | "strip") => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs" || !b.cells) return b;
          if (preset === "big-left") {
            const cols = 3;
            const cells = b.cells.map((c, i) =>
              i === 0
                ? { ...c, c: 2, r: 2 }
                : { ...c, c: 1, r: 1 },
            );
            return { ...b, cols, cells };
          }
          // "strip": tất cả ô = 1x1
          const cells = b.cells.map((c) => ({ ...c, c: 1, r: 1 }));
          return { ...b, cells };
        }),
      );
    },
    [pushHistory],
  );

  const mosaicAddCell = useCallback(
    (id: string) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs" || !b.cells) return b;
          const cells = b.cells.concat([
            { seed: `m-${b.id}-${Date.now()}`, c: 1, r: 1 },
          ]);
          return { ...b, cells };
        }),
      );
    },
    [pushHistory],
  );

  const mosaicSetTextCell = useCallback(
    (id: string, slot: number) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs" || !b.cells) return b;
          const cells = b.cells.map((c, i) =>
            i === slot
              ? {
                  ...c,
                  kind: "text" as const,
                  text: c.text || "Typography",
                  align: c.align || "center",
                  font: c.font || "serif",
                  size: c.size || "md",
                }
              : c,
          );
          return { ...b, cells };
        }),
      );
    },
    [pushHistory],
  );

  const mosaicUpdateTextCell = useCallback(
    (
      id: string,
      slot: number,
      patch: Pick<MosaicCell, "text" | "align" | "font" | "size">,
    ) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs" || !b.cells) return b;
          const cells = b.cells.map((c, i) =>
            i === slot ? { ...c, kind: "text" as const, ...patch } : c,
          );
          return { ...b, cells };
        }),
      );
    },
    [],
  );

  const mosaicDeleteCell = useCallback(
    (id: string, slot: number) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs" || !b.cells) return b;
          const cells = b.cells.filter((_, i) => i !== slot);
          return { ...b, cells };
        }),
      );
    },
    [pushHistory],
  );

  const mosaicResizeCell = useCallback(
    (id: string, slot: number, axis: "c" | "r", value: number) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs" || !b.cells) return b;
          const max = axis === "c" ? Math.max(1, b.cols || 3) : 4;
          const next = Math.max(1, Math.min(max, value));
          const cells = b.cells.map((c, i) =>
            i === slot ? { ...c, [axis]: next } : c,
          );
          return { ...b, cells };
        }),
      );
    },
    [],
  );

  const setMosaicSpacing = useCallback(
    (id: string, key: "gap" | "pad", value: number) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          const max = key === "gap" ? 32 : 48;
          const next = Math.max(0, Math.min(max, Math.round(value)));
          return { ...b, [key]: next };
        }),
      );
    },
    [],
  );

  const mosaicPickImage = useCallback(
    (id: string, slot: number) => {
      // Re-dùng image picker hiện có: target slot trong block mosaic.
      setImgPickerTarget({ blockId: id, slot, mosaic: true });
    },
    [],
  );

  const toggleRound = useCallback(
    (id: string) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, rounded: !b.rounded } : b)),
      );
    },
    [pushHistory],
  );

  const handlePublish = useCallback(() => {
    if (isPending) return;

    const serverBlocks: ServerBlock[] = toServerBlocks(blocks);
    const kind = detectMediaPostKind(serverBlocks);

    if (kind) {
      if (!mediaPostHasContent(serverBlocks, kind)) {
        setToast(
          kind === "photo"
            ? "Cần ít nhất một ảnh."
            : "Cần link video hợp lệ.",
        );
        return;
      }
    } else {
      if (!title.trim()) {
        setToast("Cần nhập tiêu đề trước khi đăng.");
        return;
      }
      if (blocks.length === 0) {
        setToast("Bài viết chưa có nội dung. Thêm ít nhất một block.");
        return;
      }
    }

    if (congDongCompose && composeFilterSlugs.length === 0) {
      setToast("Chọn loại bài đăng trước khi đăng.");
      return;
    }

    const caption = extractBodyCaption(serverBlocks);
    const tieuDeFinal = kind
      ? deriveMediaPostTitle(caption, kind)
      : title.trim();
    const moTaFinal = kind ? caption.trim().slice(0, 280) : sub.trim();
    const coverFinal = kind ? null : coverSeed;

    startTransition(async () => {
      const result = isEdit && initial
        ? await updatePost({
            ownerSlug,
            tacPhamId: initial.tacPhamId,
            cotMocId: initial.cotMocId,
            tieuDe: tieuDeFinal,
            moTa: moTaFinal,
            coverSeed: coverFinal,
            tags,
            visibility: publishVisibility,
            loaiMoc: initial.loaiMoc,
            thoiDiem: initial.thoiDiem,
            blocks: serverBlocks,
            ownerVaiTro,
            coAuthors,
          })
        : await publishPost({
            ownerSlug,
            tieuDe: tieuDeFinal,
            moTa: moTaFinal,
            coverSeed: coverFinal,
            tags,
            visibility: publishVisibility,
            loaiMoc: DEFAULT_LOAI_MOC,
            thoiDiem: isoToday(),
            blocks: serverBlocks,
            ownerVaiTro,
            coAuthors,
          });

      if (!result.ok) {
        setToast(result.error || "Không lưu được bài viết.");
        return;
      }

      setSavedFlash(true);
      setToast(
        isEdit
          ? "✓ Đã lưu thay đổi."
          : "✓ Đã đăng bài.",
      );
      if (isOverlay && onPublished) {
        setTimeout(() => onPublished(), 900);
      } else {
        setTimeout(() => {
          router.push(`/${ownerSlug}`);
        }, 1200);
      }
    });
  }, [
    isEdit,
    initial,
    isPending,
    title,
    sub,
    coverSeed,
    tags,
    ownerVaiTro,
    coAuthors,
    vis,
    publishVisibility,
    congDongCompose,
    composeFilterSlugs,
    blocks,
    ownerSlug,
    router,
    isOverlay,
    onPublished,
  ]);

  const visCurrent = useMemo(
    () => VIS_OPTIONS.find((o) => o.k === vis) || VIS_OPTIONS[0],
    [vis],
  );

  return (
    <div
      className={`cins-editor-page${isOverlay ? " is-overlay" : ""}`}
      ref={editorRef}
    >
      {/* TOPBAR */}
      <header className="ed-topbar">
        <div className="ed-topbar-inner">
          {isOverlay ? (
            <span className="ed-title">
              {isEdit ? "Chỉnh sửa bài viết" : "Trình tạo bài viết"}
            </span>
          ) : (
            <Link href={`/${ownerSlug}`} className="ed-brand" title="Về Journey">
              <span className="ed-brand-mark">CI</span>
              <span className="ed-title">Trình tạo bài viết</span>
            </Link>
          )}
          <span className="ed-status">
            <span className="ico" aria-hidden>
              ✓
            </span>{" "}
            Bản nháp tự lưu trong phiên này
          </span>
          <span className="ed-spacer" />

          {congDongCompose ? (
            <CongDongFeedFilterDropdown
              filters={sortedCongDongFilters}
              activeFilterSlugs={composeFilterSlugs}
              onChange={setComposeFilterSlugs}
              variant="compose"
              className="cd-v4-filter-dd--editor"
              menuZIndex={9200}
            />
          ) : (
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
          )}

          {isOverlay && onClose ? (
            <button type="button" className="ed-btn ghost" onClick={onClose}>
              Huỷ
            </button>
          ) : (
            <Link href={cancelHref} className="ed-btn ghost" prefetch={false}>
              Huỷ
            </Link>
          )}
          <button
            type="button"
            className="ed-btn primary"
            onClick={handlePublish}
            disabled={isPending || savedFlash}
            aria-busy={isPending}
          >
            {savedFlash ? (
              <>
                <Check size={14} strokeWidth={2.2} aria-hidden /> Đã lưu
              </>
            ) : isPending ? (
              <>
                <Loader2
                  size={14}
                  strokeWidth={2}
                  className="ed-spin"
                  aria-hidden
                />{" "}
                Đang lưu
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={2} aria-hidden /> Lưu
              </>
            )}
          </button>
        </div>
      </header>

      {/* CANVAS */}
      <main
        className={`editor-canvas${isMediaCompose ? " editor-canvas--media" : ""}`}
        aria-label={`Soạn bài cho ${ownerName}`}
      >
        {!isMediaCompose ? (
          <>
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
          </>
        ) : null}

        <ArticleTagPicker
          tags={tags}
          onAdd={(t) =>
            setTags((prev) =>
              prev.some((p) => p.id === t.id) ? prev : [...prev, t],
            )
          }
          onRemove={(id) =>
            setTags((prev) => prev.filter((t) => t.id !== id))
          }
          extraAction={
            <button
              type="button"
              className={`meta-chip add meta-chip-coauthor${coAuthorOpen ? " open" : ""}`}
              onClick={() => setCoAuthorOpen(true)}
            >
              <Users size={13} strokeWidth={2} aria-hidden />
              Thêm cộng sự
              {coAuthors.length > 0 ? (
                <span className="meta-chip-count">{coAuthors.length}</span>
              ) : null}
            </button>
          }
        />

        <div className="blocks">
          <AddZone
            idx={0}
            open={openAddIdx === 0}
            onToggle={(open) => setOpenAddIdx(open ? 0 : null)}
            onPick={(type) => addBlock(type, 0)}
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
                onChangeDividerLen={(dividerLen) =>
                  updateBlock(b.id, { dividerLen })
                }
                onChangeDividerThick={(dividerThick) =>
                  updateBlock(b.id, { dividerThick })
                }
                onUp={() => moveBlock(b.id, -1)}
                onDown={() => moveBlock(b.id, 1)}
                onDelete={() => deleteBlock(b.id)}
                onMosaicCols={(cols) => setMosaicCols(b.id, cols)}
                onMosaicPreset={(p) => mosaicPreset(b.id, p)}
                onMosaicAddCell={() => mosaicAddCell(b.id)}
                onMosaicDeleteCell={(slot) => mosaicDeleteCell(b.id, slot)}
                onMosaicResizeCell={(slot, axis, value) =>
                  mosaicResizeCell(b.id, slot, axis, value)
                }
                onMosaicSpacing={(key, value) =>
                  setMosaicSpacing(b.id, key, value)
                }
                onMosaicSetTextCell={(slot) => mosaicSetTextCell(b.id, slot)}
                onMosaicUpdateTextCell={(slot, patch) =>
                  mosaicUpdateTextCell(b.id, slot, patch)
                }
                onMosaicPickImage={(slot) => mosaicPickImage(b.id, slot)}
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

      {coAuthorOpen ? (
        <div
          className="ed-coauthor-modal-backdrop"
          role="presentation"
          onClick={() => setCoAuthorOpen(false)}
        >
          <div
            className="ed-coauthor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ed-coauthor-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ed-coauthor-modal-close"
              aria-label="Đóng cộng sự"
              onClick={() => setCoAuthorOpen(false)}
            >
              <X size={16} aria-hidden />
            </button>
            <CoAuthorSection
              ownerId={ownerId}
              collaborators={coAuthors}
              ownerVaiTro={ownerVaiTro}
              onCollaboratorsChange={setCoAuthors}
              onOwnerVaiTroChange={setOwnerVaiTro}
            />
            <div className="ed-coauthor-modal-actions">
              <span>Cộng sự sẽ được lưu cùng bài viết.</span>
              <button
                type="button"
                className="ed-coauthor-save"
                onClick={() => setCoAuthorOpen(false)}
              >
                Lưu cộng sự
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {imgPickerTarget ? (
        <ImagePickerModal
          onClose={() => setImgPickerTarget(null)}
          onPick={onPickImage}
          onUploadResolved={replaceImageSeed}
        />
      ) : null}

      {coverPickerOpen ? (
        <ImagePickerModal
          onClose={() => setCoverPickerOpen(false)}
          onPick={(seed) => {
            setCoverSeed(seed);
            setCoverPickerOpen(false);
          }}
          onUploadResolved={replaceImageSeed}
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

/* ─── Article tag picker ────────────────────────────────────────────
 * Tag = một `article_bai_viet`. User mở dropdown → search → chọn → tag
 * persist xuống `article_gan_tac_pham` lúc Đăng/Cập nhật. Bài viết được
 * tag sẽ thấy post này trong gallery (xem `TacPhamSection`).
 *
 * Performance model — "instant" feel:
 *   1. Lần đầu mở picker: gọi `loadAllArticlesForTagPicker()` (cap 2000
 *      rows ≈ 80KB gzipped) → cache vào sessionStorage với TTL 10 phút.
 *   2. Mở lần tiếp theo trong session: đọc thẳng cache → 0ms latency.
 *   3. Gõ tìm kiếm: filter in-memory bằng substring + diacritic-fold
 *      (gõ "nghe" hay "nghề" đều match). Không gọi server.
 *   4. Render lazy: hiển thị 50 dòng đầu; scroll gần đáy → +50 nữa,
 *      tránh lag khi list 2000 items.
 *   5. Fallback: nếu bulk action lỗi (auth/network), rớt về
 *      `searchArticlesForTag` (server-side debounce) như cũ.
 */
const loaiLabel = articleTagLabel;
const loaiClass = articleTagLoaiClass;

/* Phẳng dấu tiếng Việt → ASCII lowercase. Dùng cho substring search ổn
   định với cả input không dấu lẫn có dấu, đảo dấu (đ/Đ). */
function normalizeVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

const TAG_CACHE_KEY = "cins:tagpicker:all:v1";
const TAG_CACHE_TTL_MS = 10 * 60 * 1000; /* 10 phút */
const TAG_PAGE_SIZE = 50;

type TagCacheEntry = { ts: number; rows: ArticleTagRef[] };

function readTagCache(): TagCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TAG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TagCacheEntry;
    if (
      !parsed ||
      typeof parsed.ts !== "number" ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }
    if (Date.now() - parsed.ts > TAG_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeTagCache(rows: ArticleTagRef[]) {
  if (typeof window === "undefined") return;
  try {
    const entry: TagCacheEntry = { ts: Date.now(), rows };
    window.sessionStorage.setItem(TAG_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* sessionStorage quota / disabled — ignore, picker vẫn chạy được. */
  }
}

/* Index hoá `tieu_de` thành key normalized để substring search nhanh —
   tránh re-normalize 2000 row mỗi keystroke. Trả về cùng shape items
   nhưng kèm cột `_n` để filter. */
type IndexedTag = ArticleTagRef & { _n: string };

function indexAll(rows: ReadonlyArray<ArticleTagRef>): IndexedTag[] {
  return rows.map((r) => ({ ...r, _n: normalizeVi(r.tieu_de) }));
}

function ArticleTagPicker({
  tags,
  onAdd,
  onRemove,
  extraAction,
}: {
  tags: ArticleTagRef[];
  onAdd: (t: ArticleTagRef) => void;
  onRemove: (id: string) => void;
  extraAction?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allIndexed, setAllIndexed] = useState<IndexedTag[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(TAG_PAGE_SIZE);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  /* Bulk load khi mở picker LẦN ĐẦU trong session.
     Flow:
     1. Đọc cache sessionStorage → nếu fresh, set ngay (0ms).
     2. Background: fetch server để cập nhật cache (silent revalidate).
     3. Cache miss + chưa có data → show loading, đợi fetch.
     4. Bulk action lỗi → fallback `searchArticlesForTag("")` lấy top 12. */
  useEffect(() => {
    if (!open) return;
    if (allIndexed) return;

    let cancelled = false;
    const cached = readTagCache();
    if (cached) {
      queueMicrotask(() => {
        if (!cancelled) setAllIndexed(indexAll(cached.rows));
      });
    } else {
      queueMicrotask(() => {
        if (!cancelled) setLoading(true);
      });
    }

    (async () => {
      try {
        const data = await loadAllArticlesForTagPicker();
        if (cancelled) return;
        if (data.length > 0) {
          writeTagCache(data);
          setAllIndexed(indexAll(data));
        } else if (!cached) {
          /* Bulk rỗng + chưa có cache → fallback search top 12 (chỉ chạy
             khi không có gì để hiện, tránh hiện list trống vô lý). */
          const fb = await searchArticlesForTag("");
          if (!cancelled) setAllIndexed(indexAll(fb));
        }
      } catch {
        if (!cancelled && !cached) {
          const fb = await searchArticlesForTag("").catch(
            () => [] as ArticleTagRef[],
          );
          if (!cancelled) setAllIndexed(indexAll(fb));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, allIndexed]);

  /* Đóng khi click ngoài / Esc — gắn ở document để không miss khi click
     trên overlay khác. */
  useEffect(() => {
    if (!open) return;
    function onDoc(ev: globalThis.MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    }
    function onKey(ev: globalThis.KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Auto-focus input khi mở dropdown — UX gõ ngay được. */
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /* Reset visible window khi query thay đổi — kết quả mới nên hiện 50 đầu
     thay vì giữ offset của lần search trước. */
  useEffect(() => {
    queueMicrotask(() => setVisibleCount(TAG_PAGE_SIZE));
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query]);

  const selectedIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);

  /* Filter client-side. Empty query → toàn bộ list (ordered cap_nhat_luc
     desc từ server). Có query → substring match trên `_n` đã normalize. */
  const filtered = useMemo<IndexedTag[]>(() => {
    if (!allIndexed) return [];
    const q = normalizeVi(query.trim());
    if (!q) return allIndexed;
    return allIndexed.filter((t) => t._n.includes(q));
  }, [allIndexed, query]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visible.length < filtered.length;

  /* Infinite scroll — khi user cuộn gần đáy (< 80px), load thêm trang. */
  const onListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore) return;
      const t = e.currentTarget;
      if (t.scrollHeight - (t.scrollTop + t.clientHeight) < 80) {
        setVisibleCount((c) => c + TAG_PAGE_SIZE);
      }
    },
    [hasMore],
  );

  return (
    <div className="meta-chips" ref={wrapRef}>
      {tags.map((t) => {
        const cls = loaiClass(t.loai_bai_viet);
        return (
          <span key={t.id} className={`meta-chip meta-chip-tag ${cls}`}>
            <span className="meta-chip-loai" aria-hidden>
              {loaiLabel(t.loai_bai_viet)}
            </span>
            <span className="meta-chip-name">{t.tieu_de}</span>
            <button
              type="button"
              className="meta-chip-x"
              aria-label={`Bỏ tag ${t.tieu_de}`}
              onClick={() => onRemove(t.id)}
            >
              ×
            </button>
          </span>
        );
      })}

      <button
        type="button"
        className={`meta-chip add${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        + Thêm tag
      </button>
      {extraAction}

      {open ? (
        <div className="tag-picker" role="dialog" aria-label="Chọn bài viết để tag">
          <div className="tag-picker-head">
            <input
              ref={inputRef}
              type="text"
              className="tag-picker-input"
              placeholder="Tìm bài viết theo tên…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {allIndexed ? (
              <div className="tag-picker-count">
                {filtered.length} bài
                {filtered.length !== allIndexed.length
                  ? ` / ${allIndexed.length}`
                  : ""}
              </div>
            ) : null}
          </div>
          <div
            className="tag-picker-list"
            role="listbox"
            ref={listRef}
            onScroll={onListScroll}
          >
            {loading && !allIndexed ? (
              <div className="tag-picker-empty">Đang tải danh sách…</div>
            ) : filtered.length === 0 ? (
              <div className="tag-picker-empty">
                {query.trim()
                  ? "Không có bài viết khớp."
                  : "Chưa có bài viết nào."}
              </div>
            ) : (
              <>
                {visible.map((r) => {
                  const picked = selectedIds.has(r.id);
                  const cls = loaiClass(r.loai_bai_viet);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`tag-picker-item${picked ? " picked" : ""}`}
                      role="option"
                      aria-selected={picked}
                      disabled={picked}
                      onClick={() => {
                        onAdd(r);
                        setQuery("");
                      }}
                    >
                      <span className={`tag-picker-loai ${cls}`}>
                        {loaiLabel(r.loai_bai_viet)}
                      </span>
                      <span className="tag-picker-name">{r.tieu_de}</span>
                      {picked ? (
                        <span className="tag-picker-check" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {hasMore ? (
                  <div className="tag-picker-more" aria-hidden>
                    Cuộn để xem thêm…
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}


/* ─── AddZone + Picker ───────────────────────────────────────────── */

function AddZone({
  open,
  onToggle,
  onPick,
  starter,
}: {
  idx: number;
  open: boolean;
  onToggle: (next: boolean) => void;
  onPick: (t: BlockType) => void;
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
        aria-label="Chèn block"
        title="Chèn block"
      >
        +
      </button>
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
                aria-label={b.desc ? `${b.name} — ${b.desc}` : b.name}
                onClick={() => onPick(b.t)}
              >
                <span className="pic-ic" aria-hidden>
                  {b.ico}
                </span>
                <span className="pic-t">{b.name}</span>
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
  onChangeDividerLen: (len: number) => void;
  onChangeDividerThick: (thick: "thin" | "med" | "thick") => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  /* Mosaic actions */
  onMosaicCols: (cols: number) => void;
  onMosaicPreset: (preset: "big-left" | "strip") => void;
  onMosaicAddCell: () => void;
  onMosaicDeleteCell: (slot: number) => void;
  onMosaicResizeCell: (slot: number, axis: "c" | "r", value: number) => void;
  onMosaicSpacing: (key: "gap" | "pad", value: number) => void;
  onMosaicSetTextCell: (slot: number) => void;
  onMosaicUpdateTextCell: (
    slot: number,
    patch: Pick<MosaicCell, "text" | "align" | "font" | "size">,
  ) => void;
  onMosaicPickImage: (slot: number) => void;
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
    const len = Math.max(5, Math.min(100, b.dividerLen ?? 8));
    const thick: "thin" | "med" | "thick" =
      b.dividerThick === "thin" || b.dividerThick === "thick"
        ? b.dividerThick
        : "med";
    return (
      <div className={`b-divider thick-${thick}`}>
        <span style={{ width: `${len}%` }} />
        {/* Khi block đang chọn — hiện 3 nút độ dày + slider độ dài đường
            chia (% chiều rộng canvas). */}
        {p.selected ? (
          <div
            className="divider-ctrl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="divider-thick-pick" role="group" aria-label="Độ dày">
              {(
                [
                  { v: "thin", lbl: "Mảnh" },
                  { v: "med", lbl: "Vừa" },
                  { v: "thick", lbl: "Đậm" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  className={`divider-thick-btn t-${opt.v}${
                    thick === opt.v ? " active" : ""
                  }`}
                  title={opt.lbl}
                  aria-label={opt.lbl}
                  aria-pressed={thick === opt.v}
                  onClick={(e) => {
                    e.stopPropagation();
                    p.onChangeDividerThick(opt.v);
                  }}
                >
                  <i aria-hidden />
                </button>
              ))}
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={len}
              onChange={(e) =>
                p.onChangeDividerLen(Number(e.target.value) || 8)
              }
              aria-label="Độ dài đường chia"
            />
            <span className="divider-ctrl-val">{len}%</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (b.t === "spacer") {
    /* Bài cũ có size="s" vẫn render đúng (PostRenderer/sanitize tolerate),
       nhưng editor chỉ cho chọn M/L để đỡ rối. Block mặc định "m". */
    const rawSize = b.size || "m";
    const size = rawSize === "s" ? "m" : rawSize;
    return (
      <div className={`b-spacer ${size}`}>
        <div className="sp-line" />
        <div className="sp-ctrl">
          {(["m", "l"] as const).map((s) => (
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

  if (layout === "mosaic") {
    return <MosaicBlock block={block} p={p} />;
  }

  const need = imgLayoutPreviewSlots(layout, (block.imgs || []).length);
  const imgs = (block.imgs || []).slice(0, need);

  return (
    <div className="b-imgs">
      <LayBar block={block} p={p} layout={layout} />

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
              <ImagePlus size={14} strokeWidth={1.8} aria-hidden /> Đổi ảnh
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Toolbar nhỏ nổi trên block ảnh — chọn layout + bo góc. Tách ra để dùng
 * chung cho layout thường (lay-bar trên grid) và mosaic-view (lay-bar
 * trên grid ở chế độ xem).
 */
function LayBar({
  block,
  p,
  layout,
}: {
  block: Block;
  p: BlockRowProps;
  layout: ImgLayout;
}) {
  return (
    <div className="lay-bar">
      {IMG_LAYOUTS.map((l) => {
        const Icon = l.Ico;
        return (
          <button
            key={l.k}
            type="button"
            className={`lay-btn${l.k === layout ? " active" : ""}`}
            title={l.name}
            aria-label={l.name}
            onClick={(e) => {
              e.stopPropagation();
              p.onChangeLayout(l.k);
            }}
          >
            <Icon size={16} strokeWidth={1.8} aria-hidden />
          </button>
        );
      })}
      <span className="lay-sep" />
      <button
        type="button"
        className={`lay-btn round-toggle${block.rounded ? " active" : ""}`}
        title={block.rounded ? "Bỏ bo góc" : "Bo góc"}
        aria-label={block.rounded ? "Bỏ bo góc" : "Bo góc"}
        aria-pressed={block.rounded ? "true" : "false"}
        onClick={(e) => {
          e.stopPropagation();
          p.onToggleRound();
        }}
      >
        <SquareRoundCorner size={16} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}

/* ─── Mosaic block ───────────────────────────────────────────────── */

/**
 * Block ảnh layout "Lưới tùy chỉnh".
 *
 * Có 2 chế độ:
 *  - View mode (mặc định): hiển thị grid sạch + nút "Chỉnh lưới" góc phải.
 *  - Edit mode: hiện `ctrl-bar` (chọn số cột, preset, bo góc, Lưu) + cell
 *    có nút xoá + handle resize phải/dưới. Kéo handle thay đổi col/row
 *    span của cell. Có thêm 1 ô "Thêm ảnh" cuối grid.
 *
 * State `editing` là local UI (không persist).
 */
function MosaicBlock({ block, p }: { block: Block; p: BlockRowProps }) {
  const [editing, setEditing] = useState(false);
  const cols = block.cols || 3;
  const cells = useMemo(() => block.cells ?? [], [block.cells]);
  const gap = block.gap ?? 0;
  const pad = block.pad ?? 0;
  const mosaicRef = useRef<HTMLDivElement | null>(null);

  /* Pointer drag-resize: tăng/giảm col span (handle phải) hoặc row span
     (handle dưới). Drag state local — listeners gắn lên chính handle để
     setPointerCapture đảm bảo nhận tiếp move/up dù pointer rời khỏi ô. */
  const dragRef = useRef<{
    slot: number;
    axis: "c" | "r";
    startX: number;
    startY: number;
    startC: number;
    startR: number;
    colW: number;
  } | null>(null);

  const onHandlePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      slot: number,
      axis: "c" | "r",
    ) => {
      if (!editing) return;
      e.stopPropagation();
      e.preventDefault();
      const cell = cells[slot];
      if (!cell || !mosaicRef.current) return;
      const rect = mosaicRef.current.getBoundingClientRect();
      const colW = rect.width / cols;
      dragRef.current = {
        slot,
        axis,
        startX: e.clientX,
        startY: e.clientY,
        startC: cell.c,
        startR: cell.r,
        colW,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [editing, cells, cols],
  );

  const onHandlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.axis === "c") {
        const delta = Math.round((e.clientX - d.startX) / d.colW);
        p.onMosaicResizeCell(d.slot, "c", d.startC + delta);
      } else {
        // Row tựa ~96px (grid-auto-rows).
        const delta = Math.round((e.clientY - d.startY) / 96);
        p.onMosaicResizeCell(d.slot, "r", d.startR + delta);
      }
    },
    [p],
  );

  const onHandlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragRef.current) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
      dragRef.current = null;
    },
    [],
  );

  return (
    <div className={`b-imgs mosaic-mode${editing ? " editing" : ""}`}>
      {editing ? (
        <div className="ctrl-bar" onClick={(e) => e.stopPropagation()}>
          <div className="cb-group">
            {IMG_LAYOUTS.map((l) => {
              const Icon = l.Ico;
              return (
                <button
                  key={l.k}
                  type="button"
                  className={`lay-btn${l.k === "mosaic" ? " active" : ""}`}
                  title={l.name}
                  aria-label={l.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    p.onChangeLayout(l.k);
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} aria-hidden />
                </button>
              );
            })}
          </div>
          <span className="cb-sep" />
          <div className="cb-group mos-cols" role="group" aria-label="Số cột">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={`cbtn${cols === n ? " active" : ""}`}
                title={`${n} cột`}
                onClick={(e) => {
                  e.stopPropagation();
                  p.onMosaicCols(n);
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="cb-sep" />
          <button
            type="button"
            className="cb-pill icon-only"
            title="1 lớn + 2 nhỏ"
            onClick={(e) => {
              e.stopPropagation();
              p.onMosaicPreset("big-left");
            }}
          >
            <LayoutDashboard size={13} strokeWidth={1.8} aria-hidden />
          </button>
          <button
            type="button"
            className="cb-pill icon-only"
            title="Đều"
            onClick={(e) => {
              e.stopPropagation();
              p.onMosaicPreset("strip");
            }}
          >
            <LayoutGrid size={13} strokeWidth={1.8} aria-hidden />
          </button>
          <span className="cb-sep" />
          <div className="cb-range-group" aria-label="Khoảng cách mosaic">
            <label className="cb-range">
              <span>Gap</span>
              <input
                type="range"
                min={0}
                max={32}
                step={2}
                value={gap}
                onChange={(e) => p.onMosaicSpacing("gap", Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
              />
              <output>{gap}px</output>
            </label>
            <label className="cb-range">
              <span>Pad</span>
              <input
                type="range"
                min={0}
                max={48}
                step={4}
                value={pad}
                onChange={(e) => p.onMosaicSpacing("pad", Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
              />
              <output>{pad}px</output>
            </label>
          </div>
          <span className="cb-sep" />
          <button
            type="button"
            className={`cb-pill icon-only round-pill${
              block.rounded ? " active" : ""
            }`}
            title={block.rounded ? "Bỏ bo góc" : "Bo góc"}
            aria-pressed={block.rounded ? "true" : "false"}
            onClick={(e) => {
              e.stopPropagation();
              p.onToggleRound();
            }}
          >
            <SquareRoundCorner size={13} strokeWidth={1.8} aria-hidden />
          </button>
          <span className="cb-spacer" />
          <span className="cb-actions">
            <button
              type="button"
              className="cb-save"
              title="Lưu lưới"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
              }}
            >
              <Check size={14} strokeWidth={2} aria-hidden /> Lưu
            </button>
          </span>
        </div>
      ) : (
        <>
          <LayBar block={block} p={p} layout="mosaic" />
          <button
            type="button"
            className="mos-edit"
            title="Chỉnh lưới"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            <Pencil size={14} strokeWidth={1.8} aria-hidden /> Chỉnh lưới
          </button>
        </>
      )}

      <div
        ref={mosaicRef}
        className={`mosaic${block.rounded ? " rounded" : ""}${
          editing ? " editing" : ""
        }`}
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap,
          padding: pad,
        }}
      >
        {cells.map((cell, i) => {
          const isText = cell.kind === "text";
          const empty =
            !isText && (!cell.seed || /^m-|^extra-/.test(cell.seed));
          return (
            <div
              key={`${cell.seed}-${i}`}
              className={`mz${empty ? " empty" : ""}${isText ? " text-cell" : ""}`}
              style={{
                gridColumn: `span ${cell.c}`,
                gridRow: `span ${cell.r}`,
              }}
            >
              {empty ? (
                <div className="mz-fill">
                  <button
                    type="button"
                    className="mz-fill-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onMosaicPickImage(i);
                    }}
                  >
                    <ImagePlus size={20} strokeWidth={1.8} aria-hidden />
                    <span>Thêm ảnh</span>
                  </button>
                  <button
                    type="button"
                    className="mz-fill-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onMosaicSetTextCell(i);
                    }}
                  >
                    <RectangleHorizontal size={20} strokeWidth={1.8} aria-hidden />
                    <span>Thêm chữ</span>
                  </button>
                </div>
              ) : isText ? (
                <div
                  className={`mz-text mz-align-${cell.align || "center"} mz-font-${
                    cell.font || "serif"
                  } mz-size-${cell.size || "md"}`}
                >
                  {editing ? (
                    <div
                      className="mz-text-tools"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="mz-tool-group">
                        {[
                          ["serif", "Serif"],
                          ["sans", "Sans"],
                        ].map(([font, label]) => (
                          <button
                            key={font}
                            type="button"
                            className={(cell.font || "serif") === font ? "active" : ""}
                            aria-label={`Font ${label}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              p.onMosaicUpdateTextCell(i, {
                                font: font as MosaicCell["font"],
                              });
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </span>
                      <span className="mz-tool-sep" />
                      <span className="mz-tool-group">
                        {[
                          ["sm", "S"],
                          ["md", "M"],
                          ["lg", "L"],
                        ].map(([size, label]) => (
                          <button
                            key={size}
                            type="button"
                            className={(cell.size || "md") === size ? "active" : ""}
                            aria-label={`Cỡ chữ ${label}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              p.onMosaicUpdateTextCell(i, {
                                size: size as MosaicCell["size"],
                              });
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </span>
                      <span className="mz-tool-sep" />
                      {(
                        [
                          ["left", AlignLeft],
                          ["center", AlignCenter],
                          ["right", AlignRight],
                        ] as const
                      ).map(([align, Icon]) => {
                        const AIcon = Icon;
                        return (
                          <button
                            key={align}
                            type="button"
                            className={cell.align === align ? "active" : ""}
                            aria-label={`Căn ${align}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              p.onMosaicUpdateTextCell(i, {
                                align: align as MosaicCell["align"],
                              });
                            }}
                          >
                            <AIcon size={13} strokeWidth={1.9} aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {editing ? (
                    <textarea
                      value={cell.text || ""}
                      placeholder="Nhập chữ..."
                      onChange={(e) =>
                        p.onMosaicUpdateTextCell(i, { text: e.target.value })
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <p>{cell.text}</p>
                  )}
                </div>
              ) : (
                <>
                  <img
                    loading="lazy"
                    src={ph(cell.seed, 900, 900)}
                    alt=""
                  />
                  <button
                    type="button"
                    className="ph-change"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onMosaicPickImage(i);
                    }}
                  >
                    <ImagePlus size={13} strokeWidth={1.8} aria-hidden /> Đổi
                  </button>
                </>
              )}
              {editing ? (
                <>
                  <button
                    type="button"
                    className="mz-del"
                    title="Xoá ô"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onMosaicDeleteCell(i);
                    }}
                  >
                    <X size={13} strokeWidth={2} aria-hidden />
                  </button>
                  <div
                    className="hdl r"
                    onPointerDown={(e) =>
                      onHandlePointerDown(e, i, "c")
                    }
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                    onPointerCancel={onHandlePointerUp}
                  />
                  <div
                    className="hdl b"
                    onPointerDown={(e) =>
                      onHandlePointerDown(e, i, "r")
                    }
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                    onPointerCancel={onHandlePointerUp}
                  />
                </>
              ) : null}
            </div>
          );
        })}
        {editing ? (
          <button
            type="button"
            className="mz-add"
            title="Thêm ảnh"
            onClick={(e) => {
              e.stopPropagation();
              p.onMosaicAddCell();
            }}
          >
            <Plus size={24} strokeWidth={1.8} aria-hidden />
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mos-hint">
          <Move size={14} strokeWidth={1.8} aria-hidden />
          Kéo cạnh phải / dưới của mỗi ảnh để chỉnh to nhỏ. Ảnh tự dồn lấp
          chỗ trống.
        </div>
      ) : null}
    </div>
  );
}

/* ─── Image picker modal ─────────────────────────────────────────── */

function ImagePickerModal({
  onClose,
  onPick,
  onUploadResolved,
}: {
  onClose: () => void;
  onPick: (seed: string) => void;
  onUploadResolved?: (from: string, to: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  /* Đóng modal khi nhấn Escape. */
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Insert preview local ngay bằng `blob:` URL, upload Cloudflare chạy nền.
     Khi có `imageId` thật, parent sẽ replace seed tạm để publish dùng CF. */
  const uploadFile = useCallback(
    async (file: File) => {
      if (!file || !file.type?.startsWith("image/")) {
        setUploadError("Vui lòng chọn file ảnh hợp lệ.");
        return;
      }
      setUploadError(null);
      const localSeed = URL.createObjectURL(file);
      onPick(localSeed);
      onClose();
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/post-image/upload", {
          method: "POST",
          body: form,
        });
        const json = (await res.json().catch(() => null)) as {
          imageId?: string;
          url?: string;
          error?: string;
        } | null;
        if (!res.ok || !json?.imageId) {
          setUploadError(json?.error || "Upload thất bại.");
          return;
        }
        if (json.url) {
          // Lưu CF account hash vào sessionStorage để `ph()` resolve URL
          // ngay cả khi env `NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH` không có.
          rememberCfAccountHashFromDeliveryUrl(json.url);
        }
        onUploadResolved?.(localSeed, json.imageId);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Upload thất bại.",
        );
      } finally {
        URL.revokeObjectURL(localSeed);
      }
    },
    [onClose, onPick, onUploadResolved],
  );

  /* Paste ảnh từ clipboard khi modal đang mở. */
  useEffect(() => {
    function onPaste(e: globalThis.ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            return;
          }
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [uploadFile]);

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) uploadFile(f);
      // Reset value để có thể chọn lại cùng 1 file.
      e.target.value = "";
    },
    [uploadFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) uploadFile(f);
    },
    [uploadFile],
  );

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
        <div
          className={`ip-upload${dragOver ? " is-drag" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
          }}
          onDrop={onDrop}
        >
          <ImagePlus size={26} strokeWidth={1.8} aria-hidden />
          <div>
            <b>Bấm để chọn</b>, kéo thả ảnh, hoặc dán (Ctrl+V) từ clipboard.
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Ảnh sẽ hiện ngay bằng cache cục bộ, rồi tự đồng bộ Cloudflare.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
        </div>
        {uploadError ? (
          <div className="ip-error" role="alert">
            {uploadError}
          </div>
        ) : null}
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
      if (local.layout === "mosaic") {
        local.cols =
          typeof cfg.cols === "number" && cfg.cols >= 2 && cfg.cols <= 4
            ? cfg.cols
            : 3;
        local.gap =
          typeof cfg.gap === "number" && cfg.gap >= 0 && cfg.gap <= 32
            ? cfg.gap
            : 0;
        local.pad =
          typeof cfg.pad === "number" && cfg.pad >= 0 && cfg.pad <= 48
            ? cfg.pad
            : 0;
        local.cells = Array.isArray(cfg.cells)
          ? (cfg.cells as unknown[])
              .map((raw) => {
                const c = raw as Partial<MosaicCell> | null;
                if (!c || typeof c.seed !== "string") return null;
                return {
                  seed: c.seed,
                  c:
                    typeof c.c === "number" && c.c >= 1 && c.c <= 4
                      ? c.c
                      : 1,
                  r:
                    typeof c.r === "number" && c.r >= 1 && c.r <= 4
                      ? c.r
                      : 1,
                  kind: c.kind === "text" ? "text" : "image",
                  text: typeof c.text === "string" ? c.text : "",
                  align:
                    c.align === "left" || c.align === "right" || c.align === "center"
                      ? c.align
                      : "center",
                  font:
                    c.font === "sans" || c.font === "serif"
                      ? c.font
                      : "serif",
                  size:
                    c.size === "sm" || c.size === "lg" || c.size === "md"
                      ? c.size
                      : "md",
                } as MosaicCell;
              })
              .filter((c): c is MosaicCell => c !== null)
          : [];
      }
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
    } else if (t === "divider") {
      local.dividerLen =
        typeof cfg.len === "number" && cfg.len >= 5 && cfg.len <= 100
          ? cfg.len
          : 8;
      local.dividerThick =
        cfg.thick === "thin" || cfg.thick === "thick" || cfg.thick === "med"
          ? cfg.thick
          : "med";
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
      const baseImgs = (b.imgs || [])
        .filter((seed) => !seed.startsWith("blob:") && !seed.startsWith("data:"))
        .slice(0, 24);
      if (b.layout === "mosaic") {
        const cells = (b.cells || []).slice(0, 24).map((c) => ({
          seed:
            c.seed.startsWith("blob:") || c.seed.startsWith("data:")
              ? `m-${b.id}-${c.seed.slice(-8)}`
              : c.seed.slice(0, 256),
          c: Math.max(1, Math.min(4, c.c)),
          r: Math.max(1, Math.min(4, c.r)),
          kind: c.kind === "text" ? "text" : "image",
          text: c.kind === "text" ? (c.text || "").slice(0, 280) : "",
          align:
            c.align === "left" || c.align === "right" || c.align === "center"
              ? c.align
              : "center",
          font: c.font === "sans" || c.font === "serif" ? c.font : "serif",
          size: c.size === "sm" || c.size === "lg" || c.size === "md" ? c.size : "md",
        }));
        config = {
          layout: "mosaic",
          rounded: !!b.rounded,
          cap: (b.cap || "").slice(0, 280),
          imgs: cells.map((c) => c.seed),
          cols: Math.max(2, Math.min(4, b.cols || 3)),
          gap: Math.max(0, Math.min(32, b.gap ?? 0)),
          pad: Math.max(0, Math.min(48, b.pad ?? 0)),
          cells,
        };
      } else {
        config = {
          layout: b.layout || "full",
          rounded: !!b.rounded,
          cap: (b.cap || "").slice(0, 280),
          imgs: baseImgs,
        };
      }
    } else if (b.t === "embed") {
      config = { url: (b.embedUrl || "").trim().slice(0, 2048) };
    } else if (b.t === "palette") {
      config = { colors: (b.colors || []).slice(0, 8) };
    } else if (b.t === "spacer") {
      config = { size: b.size || "m" };
    } else if (b.t === "divider") {
      const thick: "thin" | "med" | "thick" =
        b.dividerThick === "thin" || b.dividerThick === "thick"
          ? b.dividerThick
          : "med";
      config = {
        len: Math.max(5, Math.min(100, b.dividerLen ?? 8)),
        thick,
      };
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
