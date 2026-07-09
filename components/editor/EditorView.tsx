"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CalendarClock,
  Check,
  ClipboardPaste,
  Columns2,
  Columns3,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  Pencil,
  Play,
  Plus,
  Save,
  SquareRoundCorner,
  Star,
  Trash2,
  Users,
  Video,
  X,
  Images,
  type LucideIcon,
} from "lucide-react";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import {
  EditorTagMenu,
  type EditorTagMenuPick,
} from "@/components/editor/EditorTagMenu";
import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import {
  getAtHashTrigger,
  stripAtHashTrigger,
  type AtHashTrigger,
} from "@/lib/editor/use-at-hash-trigger";
import { getTextareaCaretRect } from "@/lib/editor/textarea-caret";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  collectScrollResizeTargets,
  computeCenteredAnchoredMenuPosition,
  computeFixedMenuPosition,
} from "@/lib/ui/clamp-fixed-menu-position";
import {
  flattenMosaicCells,
  IMG_LAYOUTS,
  countFilledImageSeeds,
  getImgLayoutMeta,
  canAppendImageSlot,
  padBlockImageSeedsForLayout,
  normalizeLegacyLayout,
  type ImgLayout,
} from "@/lib/editor/image-layout";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { CongDongFeedFilterDropdown } from "@/components/cong-dong/CongDongFeedFilterDropdown";
import { updatePost } from "@/app/[slug]/p/[postSlug]/edit/actions";
import { publishPost } from "@/app/[slug]/p/new/actions";
import { resolveAlbumGridCell } from "@/lib/editor/album-grid-block";
import { isEditorEmptyImageSeed } from "@/lib/editor/editor-stock-image-seeds";
import { resolveImageSeedUrl } from "@/lib/editor/resolve-image-seed-url";
import {
  getCfAccountHash,
  rememberCfAccountHashFromDeliveryUrl,
} from "@/lib/cloudflare/account-hash";
import type { CoAuthorDraft } from "@/lib/social/types";
import type {
  Block as ServerBlock,
  BlockType as ServerBlockType,
  LoaiMoc,
  Visibility as ServerVisibility,
} from "@/lib/editor/types";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  type GridImage,
  type GridUploadSlotState,
} from "@/lib/journey/image-grid";
import {
  DEFAULT_ARTICLE_POST_TITLE,
  detectMediaPostKind,
  mediaPostHasContent,
} from "@/lib/journey/post-media";
import { validatePostContentForPublish, POST_MOTA_MAX } from "@/lib/journey/post-content-kind";
import { readImageFileFromClipboard } from "@/lib/files/clipboard-images";
import { OrgBaiDangLoaiComposeDropdown } from "@/components/truong/OrgBaiDangLoaiComposeDropdown";
import { OrgBaiDangScheduleComposeButton } from "@/components/truong/OrgBaiDangScheduleComposeButton";
import {
  defaultLoaiBaiDangFromBlocks,
  publishOrgBaiDangClient,
  updateOrgBaiDangClient,
  type OrgBaiDangComposeConfig,
} from "@/lib/truong/org-bai-dang-compose";
import {
  normalizeLoaiBaiDang,
  type BaiDangLoai,
} from "@/lib/truong/bai-dang";
import {
  formatOrgBaiDangScheduleLabel,
  isFutureOrgBaiDangSchedule,
} from "@/lib/truong/org-bai-dang-schedule";
import { ImageUploadProgressOverlay } from "@/components/ui/ImageUploadProgressOverlay";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";
import { uploadPostImageWithProgress } from "@/lib/files/upload-post-image";
import type { ComposePublishedDetail } from "@/lib/journey/compose-published-sync";
import { sanitizeBaiDangCoverIdInput } from "@/lib/truong/bai-dang-cover";
import {
  isTemporaryImageRef,
  isPersistedImageSeed,
} from "@/lib/truong/image-ref";
import type { ComposeIntent } from "@/lib/journey/compose-types";
import {
  buildComposeEditorDraftKey,
  clearComposeEditorDraft,
  readComposeEditorDraft,
  writeComposeEditorDraft,
  type ComposeEditorDraft,
} from "@/lib/journey/compose-editor-draft";
import {
  COMPOSE_PREVIEW_LABELS,
  inferComposePreviewKind,
  inferComposePreviewKindFromEditor,
} from "@/lib/journey/compose-preview-kind";
import { useEditorVideoUpload } from "@/lib/journey/use-editor-video-upload";
import { readImageFileDimensions } from "@/lib/journey/probe-image-dimensions";
import { videoCanvasRatioClass } from "@/lib/journey/video-canvas-ratio";
import { bunnyIframeSrc, buildBunnyVideoMp4Url, buildBunnyVideoThumbnailUrl, classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { EditorVideoThumbnailPicker } from "@/components/editor/EditorVideoThumbnailPicker";

type ImageUploadTrack = {
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

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

type ImgPickerTarget = {
  blockId: string;
  slot: number;
};

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
  /** Kích thước gốc ảnh (ô đầu / album 1 ảnh–1 block) — lưu xuống server cho grid layout. */
  width?: number;
  height?: number;
  /* Embed block */
  embedUrl?: string;
  /** Tỉ lệ khung canvas Journey — suy từ kích thước file upload. */
  videoCanvasRatio?: import("@/lib/journey/video-canvas-ratio").VideoCanvasRatio;
  /* Palette block */
  colors?: string[];
  /* Spacer */
  size?: "s" | "m" | "l";
  /* Divider: phần trăm chiều rộng canvas (5–100). Mặc định 8 (~70px). */
  dividerLen?: number;
  /* Divider: độ dày line (thin/med/thick → 2/3/6 px). Mặc định "med". */
  dividerThick?: "thin" | "med" | "thick";
  /** Ô trong album grid justify/masonry — false = block ảnh độc (LayBar). */
  albumGridCell?: boolean;
};

type Visibility = "feature" | "public" | "theo_nhom" | "chi_minh";

const ph = (s: string, w = 900, h = 600) => resolveImageSeedUrl(s, w, h);

const MAX_EDITOR_ALBUM_PHOTOS = 10;

/** Bài album ảnh thuần (caption tuỳ chọn) — không phải bài viết dài. */
function isEditorPhotoAlbumBlocks(blocks: Block[]): boolean {
  if (!blocks.some((b) => b.t === "imgs")) return false;
  if (blocks.some((b) => b.t === "embed")) return false;
  return blocks.every(
    (b) => b.t === "imgs" || b.t === "body" || b.t === "spacer",
  );
}

/** Chỉ Bunny Stream upload / embed — không gồm YouTube · Figma · Behance. */
function isEditorBunnyVideoBlock(
  block: Block,
  bunnyUploadBlockId: string | null,
): boolean {
  if (block.t !== "embed") return false;
  if (bunnyUploadBlockId && block.id === bunnyUploadBlockId) return true;
  const url = (block.embedUrl || "").trim();
  if (!url) return false;
  return classifyBunnyVideoUrl(url) !== null;
}

function blockGridDimensions(block: Block): {
  width: number;
  height: number;
} {
  const width =
    typeof block.width === "number" && block.width > 0
      ? Math.round(block.width)
      : GRID_IMAGE_DEFAULT_WIDTH;
  const height =
    typeof block.height === "number" && block.height > 0
      ? Math.round(block.height)
      : GRID_IMAGE_DEFAULT_HEIGHT;
  return { width, height };
}

/** Album compose: mỗi ảnh một block `imgs` (grid justify/masonry) — không phải 1 block nhiều ô. */
function looksLikeEditorAlbumGrid(blocks: ReadonlyArray<Block>): boolean {
  const gridBlocks = blocks.filter(isAlbumGridImgBlock);
  if (gridBlocks.length === 0) return false;
  if (blocks.some((b) => isEditorBunnyVideoBlock(b, null))) return false;
  return true;
}

/** Một ảnh / block thuộc album grid (không phải block ảnh độc LayBar). */
function isAlbumGridImgBlock(block: Block): boolean {
  if (block.t !== "imgs") return false;
  return resolveAlbumGridCell({
    albumGridCell: block.albumGridCell,
    layout: block.layout,
    imgs: (block.imgs || []).map(String).filter(Boolean),
  });
}

/** Chèn ngay sau dãy album — luôn gộp ảnh mới vào album. */
function isInsertIndexAfterAlbumRun(
  blocks: ReadonlyArray<Block>,
  idx: number,
): boolean {
  if (idx <= 0) return false;
  const prev = blocks[idx - 1];
  if (!prev || prev.t !== "imgs") return false;
  if (prev.albumGridCell === true) return true;
  if (prev.albumGridCell === false) return false;
  return isAlbumGridImgBlock(prev);
}

/** Chèn tại `idx` có liền kề block album grid — mới gộp vào album. */
function isInsertIndexAdjacentToAlbumRun(
  blocks: ReadonlyArray<Block>,
  idx: number,
): boolean {
  if (isInsertIndexAfterAlbumRun(blocks, idx)) return true;
  const next = idx < blocks.length ? blocks[idx] : undefined;
  return next != null && isAlbumGridImgBlock(next);
}

type EditorAlbumComposeSegment =
  | { kind: "album"; blocks: Block[]; startIndex: number }
  | { kind: "block"; block: Block; index: number };

/** Tách các dãy `imgs` liên tiếp — xen block chữ thì tách album riêng. */
function buildEditorAlbumComposeSegments(
  blocks: ReadonlyArray<Block>,
): EditorAlbumComposeSegment[] {
  const segments: EditorAlbumComposeSegment[] = [];
  let run: Block[] = [];
  let runStart = -1;

  const flushAlbum = () => {
    if (run.length === 0) return;
    segments.push({ kind: "album", blocks: run, startIndex: runStart });
    run = [];
    runStart = -1;
  };

  blocks.forEach((block, index) => {
    if (isAlbumGridImgBlock(block)) {
      if (run.length === 0) runStart = index;
      run.push(block);
      return;
    }
    flushAlbum();
    segments.push({ kind: "block", block, index });
  });
  flushAlbum();
  return segments;
}

/** Ảnh compose chưa có CF id — blob preview hoặc ô placeholder `new-…` / stock `lib-…`. */
function editorBlocksHaveUnpersistedImages(
  blocks: ReadonlyArray<Block>,
  coverSeed: string | null,
): boolean {
  if (
    coverSeed &&
    (isTemporaryImageRef(coverSeed) || isEditorEmptyImageSeed(coverSeed))
  ) {
    return true;
  }
  for (const block of blocks) {
    if (block.t !== "imgs") continue;
    for (const raw of block.imgs ?? []) {
      const seed = typeof raw === "string" ? raw.trim() : "";
      if (!seed) continue;
      if (isTemporaryImageRef(seed) || isEditorEmptyImageSeed(seed)) return true;
    }
  }
  return false;
}

function editorAlbumGridFromBlocks(
  imgBlocks: ReadonlyArray<Block>,
  imageUploads: Record<string, ImageUploadTrack>,
): {
  images: GridImage[];
  uploadingSlots: Set<number>;
  uploadProgressBySlot: Map<number, number>;
  slotErrors: Map<number, string>;
  uploadBySlot: Map<number, GridUploadSlotState>;
} {
  const images: GridImage[] = [];
  const uploadingSlots = new Set<number>();
  const uploadProgressBySlot = new Map<number, number>();
  const slotErrors = new Map<number, string>();
  const uploadBySlot = new Map<number, GridUploadSlotState>();

  imgBlocks.forEach((block, index) => {
    const seed = (block.imgs || [])[0]?.trim() ?? "";
    const isPlaceholder = isEditorEmptyImageSeed(seed);
    const isTemp = isTemporaryImageRef(seed);
    const isPersisted = isPersistedImageSeed(seed);
    const hasPreview = Boolean(seed && !isPlaceholder);

    const { width, height } = blockGridDimensions(block);

    images.push({
      id: isPersisted ? seed : block.id,
      width,
      height,
      previewSrc: isTemp
        ? seed
        : hasPreview
          ? ph(seed, 900, 900)
          : undefined,
      composePending: isPlaceholder,
    });

    const track = seed ? imageUploads[seed] : undefined;
    if (track?.status === "uploading") {
      uploadingSlots.add(index);
      uploadProgressBySlot.set(index, track.progress);
      uploadBySlot.set(index, {
        progress: track.progress,
        status: "uploading",
      });
    } else if (track?.status === "done") {
      uploadBySlot.set(index, { progress: 100, status: "done" });
    } else if (track?.status === "error") {
      const message = track.error ?? "Upload lỗi";
      slotErrors.set(index, message);
      uploadBySlot.set(index, { progress: 0, status: "error", error: message });
    } else if (isPersisted) {
      uploadBySlot.set(index, { progress: 100, status: "done" });
    } else if (isTemp) {
      uploadingSlots.add(index);
      uploadProgressBySlot.set(index, 0);
      uploadBySlot.set(index, { progress: 0, status: "uploading" });
    }
  });

  return {
    images,
    uploadingSlots,
    uploadProgressBySlot,
    slotErrors,
    uploadBySlot,
  };
}

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
    label: "Bạn bè",
    desc: "Chỉ nhóm bối cảnh được chọn",
  },
  {
    k: "chi_minh",
    Icon: Lock,
    label: "Chỉ mình tôi",
    desc: "Riêng tư, không ai khác thấy",
  },
];

const VIS_MENU_W = 264;
const VIS_MENU_EST_H = 260;
const VIS_MENU_Z = 9600;

function EditorVisibilitySelect({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const current = useMemo(
    () => VIS_OPTIONS.find((o) => o.k === value) ?? VIS_OPTIONS[0],
    [value],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuHeight =
      menuRef.current?.getBoundingClientRect().height || VIS_MENU_EST_H;
    const { top, left } = computeFixedMenuPosition(
      rect,
      { width: VIS_MENU_W, height: menuHeight },
      { gap: 6, margin: 8 },
    );
    setMenuStyle({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    const scrollTargets = collectScrollResizeTargets(btnRef.current);
    const onReflow = () => updateMenuPosition();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", onReflow, { passive: true });
    }
    window.addEventListener("resize", onReflow);
    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", onReflow);
      }
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const node = menuRef.current;
    const ro = new ResizeObserver(() => updateMenuPosition());
    ro.observe(node);
    return () => ro.disconnect();
  }, [open, updateMenuPosition, menuStyle?.top]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (event: globalThis.MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && menuStyle && portalReady && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-editor-page vis-portal-root">
            <div
              ref={menuRef}
              className="vis-menu is-portal"
              role="menu"
              style={{
                position: "fixed",
                top: menuStyle.top,
                left: menuStyle.left,
                width: VIS_MENU_W,
                zIndex: VIS_MENU_Z,
                maxHeight: "min(70vh, 480px)",
                overflowY: "auto",
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {VIS_OPTIONS.map((o) => (
                <button
                  key={o.k}
                  type="button"
                  className={`vis-opt${o.k === value ? " active" : ""}`}
                  onClick={() => {
                    onChange(o.k);
                    setOpen(false);
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`vis-select${open ? " open" : ""}`} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="vis-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="ico" aria-hidden>
          <current.Icon size={14} strokeWidth={1.7} />
        </span>
        <span>{current.label}</span>
        <span className="caret" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}

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
  /** Nhãn cá nhân gắn trên cột mốc (`filter_nhan`). */
  personalFilterIds?: string[];
  /** `org_bai_dang.loai_bai_dang` khi sửa bài trường. */
  orgBaiDangLoai?: BaiDangLoai;
  /** Giờ hẹn đăng (`nhap` + `tao_luc` tương lai). */
  orgBaiDangSchedulePublishAt?: string | null;
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
  /** Tab bài đăng trường — publish `org_bai_dang` thay Journey. */
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
  /** Luồng compose mới — một sheet cho mọi loại nội dung. */
  composeIntent?: ComposeIntent;
  initialPhotoFiles?: File[];
  initialVideoFile?: File;
  onClose?: () => void;
  onPublished?: (detail?: ComposePublishedDetail) => void;
};

function isTextOnlyEditorInitial(initial: EditorInitial | undefined): boolean {
  if (!initial) return false;
  const cover = sanitizeBaiDangCoverIdInput(
    initial.coverSeed ?? null,
    initial.blocks,
  );
  return inferComposePreviewKind(initial.blocks ?? [], cover, initial.moTa) === "text";
}

function bodyPlainFromServerBlocks(
  blocks: EditorInitial["blocks"] | undefined,
): string {
  if (!blocks?.length) return "";
  return blocks
    .filter((b) => b.loai === "body")
    .map((b) => {
      const html = b.config?.html;
      if (typeof html !== "string") return "";
      return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

/** blockId giả cho textarea minimal (`sub`) — tái dùng hạ tầng menu @/# theo block. */
const MINIMAL_SUB_BLOCK_ID = "__minimal_sub__";

const MINIMAL_THUMB_ADD_LABEL = "Thêm ảnh Thumbnail";
const MINIMAL_THUMB_ADD_HINT =
  "Không bắt buộc, tỉ lệ mặc định 16:9 hoặc kích thước tự do — không cần cắt ảnh để xem ở dạng lưới masonry";
const MINIMAL_THUMB_EMPTY_HINT =
  "Thumbnail chỉ hiển thị trên grid view. Không thêm thì tự lấy ảnh đầu tiên trong bài.";

export function EditorView({
  ownerId,
  ownerSlug,
  ownerName,
  mode = "create",
  initial,
  postSlug,
  presentation = "page",
  congDongCompose,
  orgBaiDangCompose,
  composeIntent = "full",
  initialPhotoFiles,
  initialVideoFile,
  onClose,
  onPublished,
}: Props) {
  const isOverlay = presentation === "overlay";
  const isEdit = mode === "edit" && !!initial;
  const isCreateCompose = !isEdit && isOverlay;
  const canPersistComposeDraft =
    isCreateCompose && !initialPhotoFiles?.length && !initialVideoFile;
  const composeDraftKey = useMemo(
    () =>
      buildComposeEditorDraftKey({
        ownerSlug,
        composeIntent,
        congDongCompose,
        orgBaiDangCompose,
      }),
    [ownerSlug, composeIntent, congDongCompose, orgBaiDangCompose],
  );

  let restoredComposeDraft: ComposeEditorDraft | null | undefined;
  const peekRestoredComposeDraft = (): ComposeEditorDraft | null => {
    if (restoredComposeDraft !== undefined) return restoredComposeDraft;
    if (!canPersistComposeDraft) {
      restoredComposeDraft = null;
      return null;
    }
    restoredComposeDraft = readComposeEditorDraft(composeDraftKey);
    return restoredComposeDraft;
  };
  const restoredDraft = peekRestoredComposeDraft();

  const isTextOnlyEdit = isEdit && isTextOnlyEditorInitial(initial);
  /** Ảnh/video overlay dùng cùng shell minimal expanded (canvas, cover, thumbnail). */
  const isOverlayMediaComposeIntent =
    composeIntent === "photo" || composeIntent === "video";
  const usesMinimalFlow =
    (isCreateCompose &&
      (composeIntent === "minimal" || isOverlayMediaComposeIntent)) ||
    isTextOnlyEdit ||
    (isEdit &&
      isOverlay &&
      (composeIntent === "minimal" || isOverlayMediaComposeIntent));
  const [editorExpanded, setEditorExpanded] = useState(() => {
    if (restoredDraft?.editorExpanded != null) return restoredDraft.editorExpanded;
    if (composeIntent === "photo" || composeIntent === "video") return true;
    if (isEdit) return !isTextOnlyEditorInitial(initial);
    return composeIntent !== "minimal";
  });
  const [minimalCoverVisible, setMinimalCoverVisible] = useState(
    () => restoredDraft?.minimalCoverVisible ?? false,
  );
  /** Bật chrome block đầy đủ (lay-bar, add-zone giữa block, side controls). */
  const [minimalRichBlocks, setMinimalRichBlocks] = useState(
    () => restoredDraft?.minimalRichBlocks ?? false,
  );
  /** Giữ preview grid justify/masonry khi chèn thêm H2, body, … */
  const [albumGridCompose, setAlbumGridCompose] = useState(() => {
    if (restoredDraft?.albumGridCompose != null) {
      return restoredDraft.albumGridCompose;
    }
    if (composeIntent === "photo") return true;
    const parsed = initial?.blocks ? fromServerBlocks(initial.blocks) : [];
    return looksLikeEditorAlbumGrid(parsed);
  });
  const isMinimalUI = isOverlay && usesMinimalFlow && !editorExpanded;
  const showFullEditor = !isMinimalUI;
  /* Huỷ → journey (không link `/p/slug` — intercept modal sẽ mở popup thay vì thoát edit). */
  const cancelHref = `/${ownerSlug}`;

  const [coverSeed, setCoverSeed] = useState<string | null>(() => {
    if (restoredDraft) {
      return sanitizeBaiDangCoverIdInput(
        restoredDraft.coverSeed,
        restoredDraft.blocks,
      );
    }
    return sanitizeBaiDangCoverIdInput(initial?.coverSeed ?? null, initial?.blocks);
  });
  const showMinimalToolbar = useMemo(
    () =>
      usesMinimalFlow &&
      (isMinimalUI || (showFullEditor && !(coverSeed || minimalCoverVisible))),
    [
      usesMinimalFlow,
      isMinimalUI,
      showFullEditor,
      coverSeed,
      minimalCoverVisible,
    ],
  );
  const [title, setTitle] = useState(
    () => initial?.tieuDe ?? restoredDraft?.tieuDe ?? "",
  );
  const [sub, setSub] = useState(() => {
    if (initial?.moTa?.trim()) return initial.moTa ?? "";
    if (restoredDraft?.moTa) return restoredDraft.moTa;
    if (initial && isTextOnlyEditorInitial(initial)) {
      return bodyPlainFromServerBlocks(initial.blocks);
    }
    return "";
  });
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (restoredDraft?.blocks?.length) {
      return fromServerBlocks(restoredDraft.blocks);
    }
    const parsed = initial?.blocks ? fromServerBlocks(initial.blocks) : [];
    if (initial && isTextOnlyEditorInitial(initial) && !initial.moTa?.trim()) {
      return parsed.filter((b) => b.t !== "body");
    }
    return parsed;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAddIdx, setOpenAddIdx] = useState<number | null>(null);

  const [tags, setTags] = useState<ArticleTagRef[]>(() => [
    ...(initial?.tags ?? restoredDraft?.tags ?? []),
  ]);
  const [collaborators, setCollaborators] = useState<CoAuthorDraft[]>(() =>
    [...(initial?.coAuthors ?? [])],
  );
  const [ownerVaiTro] = useState(() => initial?.ownerVaiTro ?? "");
  const [atHashMenu, setAtHashMenu] = useState<{
    blockId: string;
    trigger: AtHashTrigger;
    anchorRect: DOMRect;
    textarea: HTMLTextAreaElement;
  } | null>(null);
  const [vis, setVis] = useState<Visibility>(
    () => initial?.visibility ?? restoredDraft?.visibility ?? "public",
  );
  const sortedCongDongFilters = useMemo(
    () =>
      [...(congDongCompose?.filters ?? [])].sort(
        (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
      ),
    [congDongCompose?.filters],
  );
  const [composeFilterSlugs, setComposeFilterSlugs] = useState<string[]>(() => {
    if (restoredDraft?.composeFilterSlugs?.length) {
      return restoredDraft.composeFilterSlugs;
    }
    const first = sortedCongDongFilters[0]?.slug;
    return first ? [first] : [];
  });
  const [composeLoaiBaiDang, setComposeLoaiBaiDang] = useState<string>(
    () => {
      if (initial?.orgBaiDangLoai) {
        return normalizeLoaiBaiDang(initial.orgBaiDangLoai);
      }
      if (restoredDraft?.composeLoaiBaiDang) {
        return normalizeLoaiBaiDang(restoredDraft.composeLoaiBaiDang);
      }
      if (orgBaiDangCompose?.defaultLoaiBaiDang) {
        return orgBaiDangCompose.defaultLoaiBaiDang;
      }
      if (initial?.blocks?.length) {
        return defaultLoaiBaiDangFromBlocks(initial.blocks);
      }
      return "thong_bao";
    },
  );
  const [composeSchedulePublishAt, setComposeSchedulePublishAt] = useState<
    string | null
  >(
    () =>
      initial?.orgBaiDangSchedulePublishAt ??
      restoredDraft?.composeSchedulePublishAt ??
      null,
  );
  const composeScheduleActive = isFutureOrgBaiDangSchedule(
    composeSchedulePublishAt,
  );
  const personalFilterIds = initial?.personalFilterIds ?? [];
  const publishVisibility: Visibility = congDongCompose ? "public" : vis;
  const [imgPickerTarget, setImgPickerTarget] = useState<ImgPickerTarget | null>(
    null,
  );
  const imgPickerTargetRef = useRef<ImgPickerTarget | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const minimalAlbumInputRef = useRef<HTMLInputElement | null>(null);
  const minimalVideoInputRef = useRef<HTMLInputElement | null>(null);
  const minimalCoverInputRef = useRef<HTMLInputElement | null>(null);
  const initialPhotosStartedRef = useRef(false);
  const initialVideoStartedRef = useRef(false);
  const videoBlockIdRef = useRef<string | null>(null);

  const {
    videoUrl,
    bunnyVideoId,
    videoUploading,
    videoUploadProgress,
    videoUploadError,
    videoEncodeReady,
    videoEncoding,
    localVideoPreviewUrl,
    videoCanvasRatio,
    uploadVideoFile,
  } = useEditorVideoUpload();

  const videoEncodeReadyNotifiedRef = useRef(false);
  useEffect(() => {
    if (videoUploading) {
      videoEncodeReadyNotifiedRef.current = false;
    }
  }, [videoUploading]);
  useEffect(() => {
    if (!videoEncodeReady || videoEncodeReadyNotifiedRef.current) return;
    videoEncodeReadyNotifiedRef.current = true;
    setToast("Video đã sẵn sàng — bạn có thể xem trước.");
  }, [videoEncodeReady]);

  const [toast, setToast] = useState<string | null>(null);
  const [imageUploads, setImageUploads] = useState<
    Record<string, ImageUploadTrack>
  >({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  useEffect(() => {
    if (!canPersistComposeDraft) return;
    const timer = window.setTimeout(() => {
      writeComposeEditorDraft(composeDraftKey, {
        tieuDe: title,
        moTa: sub,
        coverSeed: sanitizeBaiDangCoverIdInput(coverSeed, toServerBlocks(blocks)),
        blocks: toServerBlocks(blocks),
        visibility: vis,
        tags,
        composeFilterSlugs: congDongCompose ? composeFilterSlugs : undefined,
        composeLoaiBaiDang: orgBaiDangCompose ? composeLoaiBaiDang : undefined,
        composeSchedulePublishAt: orgBaiDangCompose
          ? composeSchedulePublishAt
          : undefined,
        editorExpanded,
        minimalCoverVisible,
        albumGridCompose,
        minimalRichBlocks,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    canPersistComposeDraft,
    composeDraftKey,
    title,
    sub,
    coverSeed,
    blocks,
    vis,
    tags,
    composeFilterSlugs,
    composeLoaiBaiDang,
    composeSchedulePublishAt,
    editorExpanded,
    minimalCoverVisible,
    albumGridCompose,
    minimalRichBlocks,
    congDongCompose,
    orgBaiDangCompose,
  ]);

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

  /* Đóng dropdown / bỏ chọn block khi click ra ngoài. */
  useEffect(() => {
    function onDocClick(e: globalThis.MouseEvent) {
      const t = e.target as HTMLElement;
      const root = editorRef.current;

      if (
        t.closest(".ed-editor-tag-menu") ||
        t.closest(".picker-portal-root")
      ) {
        return;
      }

      if (root && !root.contains(e.target as Node)) {
        setOpenAddIdx(null);
        setSelectedId(null);
        return;
      }
      if (root) {
        /* click trong editor nhưng ngoài add-zone */
        if (!t.closest(".add-zone")) setOpenAddIdx(null);
        if (!t.closest(".block")) setSelectedId(null);
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

  const replaceImageSeed = useCallback((from: string, to: string) => {
    setImageUploads((prev) => {
      if (!prev[from]) return prev;
      const next = { ...prev };
      next[to] = next[from];
      delete next[from];
      return next;
    });
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.t !== "imgs") return b;
        const imgs = b.imgs?.map((seed) => (seed === from ? to : seed));
        return { ...b, imgs };
      }),
    );
    setCoverSeed((current) => (current === from ? to : current));
  }, []);

  const setImageUploadTrack = useCallback(
    (key: string, track: ImageUploadTrack | null) => {
      setImageUploads((prev) => {
        if (!track) {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: track };
      });
    },
    [],
  );

  const applyImageDimensionsToSeed = useCallback(
    (seed: string, width: number, height: number) => {
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.t !== "imgs" || !b.imgs?.includes(seed)) return b;
          return { ...b, width, height };
        }),
      );
    },
    [],
  );

  const beginImageUpload = useCallback(
    (
      file: File,
      onPick: (seed: string) => void,
      _onUploadResolved?: (from: string, to: string) => void,
      opts?: { existingLocalSeed?: string },
    ) => {
      const localSeed = opts?.existingLocalSeed ?? URL.createObjectURL(file);

      if (!isAllowedUploadImageFile(file)) {
        if (opts?.existingLocalSeed) {
          setImageUploadTrack(localSeed, {
            progress: 0,
            status: "error",
            error: "File không phải ảnh (JPEG, PNG, WebP, GIF).",
          });
        }
        return;
      }

      if (!opts?.existingLocalSeed) {
        onPick(localSeed);
      }
      setImageUploadTrack(localSeed, { progress: 0, status: "uploading" });

      void readImageFileDimensions(file).then(({ width, height }) => {
        applyImageDimensionsToSeed(localSeed, width, height);
      });

      const finishTrack = (key: string, track: ImageUploadTrack | null) => {
        setImageUploadTrack(key, track);
      };

      void (async () => {
        let activeKey = localSeed;
        try {
          const result = await uploadPostImageWithProgress(file, (pct) => {
            finishTrack(activeKey, { progress: pct, status: "uploading" });
          });
          if (result.url) {
            rememberCfAccountHashFromDeliveryUrl(result.url);
          }
          const resolvedId = result.imageId;
          setImageUploads((prev) => {
            const next = { ...prev };
            delete next[localSeed];
            return next;
          });
          setBlocks((prev) =>
            prev.map((b) => {
              if (b.t !== "imgs") return b;
              const imgs = b.imgs?.map((seed) =>
                seed === localSeed ? resolvedId : seed,
              );
              return { ...b, imgs };
            }),
          );
          setCoverSeed((current) => (current === localSeed ? resolvedId : current));
          _onUploadResolved?.(localSeed, resolvedId);
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Upload thất bại.";
          finishTrack(activeKey, {
            progress: 0,
            status: "error",
            error: message,
          });
          setToast(message);
        }
      })();
    },
    [applyImageDimensionsToSeed, setImageUploadTrack],
  );

  const applyMinimalCoverFile = useCallback(
    (file: File) => {
      setMinimalCoverVisible(true);
      beginImageUpload(file, setCoverSeed, replaceImageSeed);
    },
    [beginImageUpload, replaceImageSeed],
  );

  const videoScrubSrc = useMemo(() => {
    if (localVideoPreviewUrl) return localVideoPreviewUrl;
    const resolvedVideoId =
      bunnyVideoId ??
      (() => {
        for (const block of blocks) {
          if (block.t !== "embed") continue;
          const url = (block.embedUrl || videoUrl || "").trim();
          if (!url) continue;
          const bunny = classifyBunnyVideoUrl(url);
          if (bunny) return bunny.videoId;
        }
        return null;
      })();
    if (!resolvedVideoId) return null;
    return buildBunnyVideoMp4Url(resolvedVideoId, "360p");
  }, [blocks, bunnyVideoId, localVideoPreviewUrl, videoUrl]);

  const videoThumbDisabledHint = videoUploading
    ? "Đang tải video lên — chọn frame sau khi upload xong hoặc tải ảnh riêng."
    : videoEncoding
      ? "Video đang xử lý — thử chọn frame khi encode xong hoặc tải ảnh riêng."
      : null;

  const hasPendingUploads = useMemo(
    () =>
      videoUploading ||
      editorBlocksHaveUnpersistedImages(blocks, coverSeed) ||
      Object.values(imageUploads).some((track) => track.status === "uploading"),
    [blocks, coverSeed, imageUploads, videoUploading],
  );

  const previewKind = useMemo(
    () =>
      inferComposePreviewKindFromEditor(
        blocks,
        coverSeed,
        toServerBlocks(blocks),
        sub.trim(),
      ),
    [blocks, coverSeed, sub],
  );
  const previewMeta = COMPOSE_PREVIEW_LABELS[previewKind];

  const applyImageToBlock = useCallback(
    (target: ImgPickerTarget, seed: string) => {
      const { blockId, slot } = target;
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId || b.t !== "imgs") return b;
          const layout = normalizeLegacyLayout(b.layout);
          let imgs = [...(b.imgs || [])];
          while (imgs.length <= slot) {
            imgs.push(`new-${b.id}-${imgs.length}`);
          }
          imgs[slot] = seed;
          imgs = padBlockImageSeedsForLayout(b.id, imgs, layout, "expand");
          return { ...b, imgs };
        }),
      );
    },
    [pushHistory],
  );

  const clearImagePick = useCallback(() => {
    imgPickerTargetRef.current = null;
    setImgPickerTarget(null);
  }, []);

  /** Mở native file picker — phải gọi sync trong user gesture (click). */
  const openImageFilePick = useCallback((target: ImgPickerTarget) => {
    imgPickerTargetRef.current = target;
    setImgPickerTarget(target);
    imageFileInputRef.current?.click();
  }, []);

  const onImageFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      const target = imgPickerTargetRef.current;
      if (!file || !target) {
        clearImagePick();
        return;
      }
      beginImageUpload(
        file,
        (seed) => applyImageToBlock(target, seed),
        replaceImageSeed,
      );
      clearImagePick();
    },
    [applyImageToBlock, beginImageUpload, clearImagePick, replaceImageSeed],
  );

  useEffect(() => {
    if (!imgPickerTarget) return;

    function onPaste(e: globalThis.ClipboardEvent) {
      const file = imageFileFromClipboard(e.clipboardData);
      const target = imgPickerTargetRef.current;
      if (!file || !target) return;
      e.preventDefault();
      beginImageUpload(
        file,
        (seed) => applyImageToBlock(target, seed),
        replaceImageSeed,
      );
      clearImagePick();
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [imgPickerTarget, applyImageToBlock, beginImageUpload, clearImagePick, replaceImageSeed]);

  const addBlock = useCallback(
    (type: BlockType, idx: number) => {
      const b: Block = { id: newId(), t: type };
      if (type === "imgs") {
        b.layout = "full";
        b.imgs = [`new-${b.id}`];
        b.cap = "";
        b.rounded = false;
        b.albumGridCell = false;
      }
      if (type === "spacer") b.size = "m";
      if (type === "palette") b.colors = DEMO_PALETTE.slice();
      if (["h2", "h3", "body", "quote"].includes(type)) b.text = "";
      if (type === "embed") b.embedUrl = "";
      pushHistory();
      setBlocks((prev) => {
        const next = prev.slice();
        next.splice(idx, 0, b);
        return next;
      });
      setOpenAddIdx(null);
      setSelectedId(b.id);
      return b.id;
    },
    [pushHistory],
  );

  const seedPhotoFilesAt = useCallback(
    (
      insertAt: number,
      files: File[],
      options?: { albumGrid?: boolean },
    ) => {
      const albumGrid = options?.albumGrid ?? true;
      const imageFiles = files.filter(isAllowedUploadImageFile);
      if (imageFiles.length === 0) {
        setToast("Chọn ảnh JPEG, PNG, WebP hoặc GIF.");
        return;
      }
      if (albumGrid) {
        setAlbumGridCompose(true);
      }
      pushHistory();

      const pending: Array<{ file: File; localSeed: string; block: Block }> = [];
      for (const file of imageFiles) {
        const id = newId();
        const localSeed = URL.createObjectURL(file);
        pending.push({
          file,
          localSeed,
          block: {
            id,
            t: "imgs",
            layout: "full",
            imgs: [localSeed],
            cap: "",
            rounded: false,
            albumGridCell: albumGrid,
          },
        });
      }

      setBlocks((prev) => {
        const next = prev.slice();
        let at = Math.max(0, Math.min(insertAt, next.length));
        for (const { block } of pending) {
          next.splice(at, 0, block);
          at += 1;
        }
        return next;
      });

      for (const { file, localSeed } of pending) {
        beginImageUpload(
          file,
          () => {
            /* blob đã gán trong setBlocks ở trên */
          },
          replaceImageSeed,
          { existingLocalSeed: localSeed },
        );
      }
    },
    [beginImageUpload, pushHistory, replaceImageSeed],
  );

  const insertDummyImageBlockAt = useCallback(
    (insertAt: number, albumGrid: boolean) => {
      if (albumGrid) {
        setAlbumGridCompose(true);
      }
      pushHistory();
      const id = newId();
      setBlocks((prev) => {
        const next = prev.slice();
        const at = Math.max(0, Math.min(insertAt, next.length));
        next.splice(at, 0, {
          id,
          t: "imgs",
          layout: "full",
          imgs: [`new-${id}`],
          cap: "",
          rounded: false,
          albumGridCell: albumGrid,
        });
        return next;
      });
      setOpenAddIdx(null);
      setSelectedId(id);
    },
    [pushHistory],
  );

  const seedPhotoFiles = useCallback(
    (files: File[]) => {
      seedPhotoFilesAt(blocksRef.current.length, files);
    },
    [seedPhotoFilesAt],
  );

  const expandMinimalToFullEditor = useCallback(() => {
    if (
      blocks.some((b) =>
        isEditorBunnyVideoBlock(b, videoBlockIdRef.current),
      )
    ) {
      setToast("Bài video chỉ gồm tiêu đề, mô tả và video.");
      return;
    }
    setMinimalRichBlocks(true);
    setBlocks((prev) => {
      if (prev.some((b) => b.t !== "body" && b.t !== "spacer")) return prev;
      return prev.filter((b) => b.t !== "body");
    });
    setEditorExpanded(true);
  }, [blocks, setToast]);

  const hasPhotoBlocks = blocks.some((b) => b.t === "imgs");
  const hasBunnyVideoBlock = useMemo(
    () =>
      blocks.some((b) =>
        isEditorBunnyVideoBlock(b, videoBlockIdRef.current),
      ),
    [blocks],
  );

  useEffect(() => {
    if (!hasPhotoBlocks || hasBunnyVideoBlock) {
      setAlbumGridCompose(false);
    }
  }, [hasPhotoBlocks, hasBunnyVideoBlock]);

  const isPhotoAlbumCompose = useMemo(
    () =>
      hasPhotoBlocks &&
      !hasBunnyVideoBlock &&
      (albumGridCompose ||
        looksLikeEditorAlbumGrid(blocks) ||
        (!minimalRichBlocks && isEditorPhotoAlbumBlocks(blocks))),
    [albumGridCompose, blocks, hasPhotoBlocks, hasBunnyVideoBlock, minimalRichBlocks],
  );
  const albumComposeSegments = useMemo(
    () =>
      isPhotoAlbumCompose ? buildEditorAlbumComposeSegments(blocks) : [],
    [blocks, isPhotoAlbumCompose],
  );
  const isMinimalMediaCompose =
    usesMinimalFlow &&
    editorExpanded &&
    (hasPhotoBlocks || hasBunnyVideoBlock) &&
    !minimalRichBlocks &&
    !isPhotoAlbumCompose;
  const isBunnyVideoCompose =
    composeIntent === "video" ||
    (hasBunnyVideoBlock && !hasPhotoBlocks && !isPhotoAlbumCompose);
  const showCoverArea = useMemo(
    () => {
      const wantsCover =
        Boolean(coverSeed) ||
        minimalCoverVisible ||
        (showFullEditor && !usesMinimalFlow);
      if (isBunnyVideoCompose) {
        return Boolean(coverSeed) || minimalCoverVisible;
      }
      return wantsCover;
    },
    [
      coverSeed,
      minimalCoverVisible,
      showFullEditor,
      usesMinimalFlow,
      isBunnyVideoCompose,
    ],
  );
  const hideBlockPalette = isMinimalMediaCompose || isBunnyVideoCompose;
  /** Minimal compose expanded — mỗi lần bấm + tạo thêm một block (session nội dung). */
  const canAddMoreSessions = usesMinimalFlow && editorExpanded;

  const pickBlockAt = useCallback(
    (type: BlockType, idx: number) => {
      if (hasBunnyVideoBlock && !hasPhotoBlocks) {
        if (type === "imgs") {
          setToast("Không thể thêm album khi đã có video.");
          return;
        }
        if (
          type === "embed" &&
          blocksRef.current.some((b) =>
            isEditorBunnyVideoBlock(b, videoBlockIdRef.current),
          )
        ) {
          setToast("Bài video chỉ gồm một video.");
          return;
        }
        if (type !== "body" && type !== "spacer" && type !== "embed") {
          setToast("Bài video chỉ gồm tiêu đề, mô tả và video.");
          return;
        }
      }
      if (usesMinimalFlow && editorExpanded) {
        if (hasBunnyVideoBlock) {
          if (type !== "body" && type !== "spacer" && type !== "embed") {
            setToast("Bài video chỉ gồm tiêu đề, mô tả và video.");
            return;
          }
        } else if (["h2", "h3", "body", "quote"].includes(type)) {
          setMinimalRichBlocks(true);
        } else if (
          !albumGridCompose &&
          (type === "imgs" || !["imgs", "embed"].includes(type))
        ) {
          setMinimalRichBlocks(true);
        }
      }
      if (type === "imgs") {
        if (isMinimalMediaCompose && hasBunnyVideoBlock) {
          setToast("Không thể thêm album khi đã có video.");
          return;
        }
        setOpenAddIdx(null);
        const extendAlbum = isInsertIndexAdjacentToAlbumRun(
          blocksRef.current,
          idx,
        );
        if (!extendAlbum) {
          setMinimalRichBlocks(true);
        }
        insertDummyImageBlockAt(idx, extendAlbum);
        return;
      }
      if (isMinimalMediaCompose) {
        if (hasPhotoBlocks && type === "embed") {
          setToast("Không thể thêm video vào bài album ảnh.");
          return;
        }
      }
      addBlock(type, idx);
    },
    [
      addBlock,
      editorExpanded,
      hasPhotoBlocks,
      hasBunnyVideoBlock,
      insertDummyImageBlockAt,
      isMinimalMediaCompose,
      usesMinimalFlow,
    ],
  );

  const onMinimalAlbumPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (files.length === 0) return;
      if (hasBunnyVideoBlock) {
        setToast("Không thể thêm album khi đã có video.");
        return;
      }
      setEditorExpanded(true);
      seedPhotoFiles(files);
    },
    [hasBunnyVideoBlock, seedPhotoFiles],
  );

  const onMinimalVideoPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (hasBunnyVideoBlock) {
        setToast("Bài đã có video.");
        return;
      }
      if (hasPhotoBlocks) {
        setToast("Không thể thêm video vào bài album ảnh.");
        return;
      }
      expandMinimalToFullEditor();
      setEditorExpanded(true);
      const blockId = newId();
      videoBlockIdRef.current = blockId;
      pushHistory();
      setBlocks((prev) => {
        const withoutBody = prev.filter((b) => b.t !== "body");
        return [...withoutBody, { id: blockId, t: "embed", embedUrl: "" }];
      });
      void uploadVideoFile(file);
    },
    [
      expandMinimalToFullEditor,
      hasPhotoBlocks,
      hasBunnyVideoBlock,
      pushHistory,
      uploadVideoFile,
    ],
  );

  useEffect(() => {
    if (
      !initialPhotoFiles?.length ||
      isEdit ||
      initialPhotosStartedRef.current
    ) {
      return;
    }
    initialPhotosStartedRef.current = true;
    seedPhotoFiles(initialPhotoFiles);
  }, [initialPhotoFiles, isEdit, seedPhotoFiles]);

  useEffect(() => {
    if (!initialVideoFile || isEdit || initialVideoStartedRef.current) return;
    initialVideoStartedRef.current = true;
    const blockId = newId();
    videoBlockIdRef.current = blockId;
    pushHistory();
    setBlocks((prev) => [...prev, { id: blockId, t: "embed", embedUrl: "" }]);
    void uploadVideoFile(initialVideoFile);
  }, [initialVideoFile, isEdit, pushHistory, uploadVideoFile]);

  useEffect(() => {
    const blockId = videoBlockIdRef.current;
    if (!blockId) return;
    if (!videoUrl && !videoCanvasRatio) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              ...(videoUrl ? { embedUrl: videoUrl } : {}),
              ...(videoCanvasRatio ? { videoCanvasRatio } : {}),
            }
          : b,
      ),
    );
  }, [videoUrl, videoCanvasRatio]);

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

  const openImgPicker = useCallback(
    (blockId: string, slot: number) => {
      openImageFilePick({ blockId, slot });
    },
    [openImageFilePick],
  );

  const setLayout = useCallback(
    (id: string, layout: ImgLayout) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          return {
            ...b,
            layout,
            imgs: padBlockImageSeedsForLayout(b.id, b.imgs || [], layout, "expand"),
          };
        }),
      );
    },
    [pushHistory],
  );

  const appendImageSlotToBlock = useCallback(
    (id: string) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          const layout = normalizeLegacyLayout(b.layout);
          const imgs = padBlockImageSeedsForLayout(
            b.id,
            b.imgs || [],
            layout,
            "display",
          );
          if (!canAppendImageSlot(layout, imgs)) return b;
          return { ...b, imgs: [...imgs, `new-${b.id}-${imgs.length}`] };
        }),
      );
    },
    [pushHistory],
  );

  const appendImageFilesToBlock = useCallback(
    (id: string, files: File[]) => {
      const imageFiles = files.filter(isAllowedUploadImageFile);
      if (imageFiles.length === 0) {
        setToast("Chọn ảnh JPEG, PNG, WebP hoặc GIF.");
        return;
      }

      const block = blocksRef.current.find((b) => b.id === id);
      if (!block || block.t !== "imgs") return;
      const layout = normalizeLegacyLayout(block.layout);
      const meta = getImgLayoutMeta(layout);
      const current = padBlockImageSeedsForLayout(
        block.id,
        block.imgs || [],
        layout,
        "display",
      );
      const room = meta.dynamic ? meta.n - current.length : 0;
      const toAdd = Math.min(imageFiles.length, room);
      if (toAdd <= 0) {
        setToast(`Block ảnh tối đa ${meta.n} ảnh.`);
        return;
      }

      pushHistory();
      const pending: Array<{
        file: File;
        localSeed: string;
      }> = [];

      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          const imgs = padBlockImageSeedsForLayout(
            b.id,
            b.imgs || [],
            layout,
            "display",
          );
          for (let i = 0; i < toAdd; i++) {
            const localSeed = URL.createObjectURL(imageFiles[i]!);
            pending.push({ file: imageFiles[i]!, localSeed });
            imgs.push(localSeed);
          }
          return { ...b, imgs };
        }),
      );

      for (const { file, localSeed } of pending) {
        beginImageUpload(
          file,
          () => {
            /* blob đã gán trong setBlocks */
          },
          replaceImageSeed,
          { existingLocalSeed: localSeed },
        );
      }
    },
    [beginImageUpload, pushHistory, replaceImageSeed],
  );

  /* Xoá 1 ô ảnh khỏi block — ô trống thu gọn; ảnh thật → placeholder hoặc bỏ ô. */
  const removeImageFromBlock = useCallback(
    (id: string, slot: number) => {
      pushHistory();
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id || b.t !== "imgs") return b;
          const layout = normalizeLegacyLayout(b.layout);
          const imgs = [...(b.imgs || [])];
          if (slot < 0 || slot >= imgs.length) return b;

          if (isEditorEmptyImageSeed(imgs[slot] ?? "")) {
            const next = imgs.filter((_, i) => i !== slot);
            return { ...b, imgs: next.length > 0 ? next : [`new-${b.id}-0`] };
          }

          const meta = getImgLayoutMeta(layout);
          const filled = countFilledImageSeeds(imgs);

          if (!meta.dynamic) {
            imgs[slot] = `new-${b.id}-${slot}`;
            return { ...b, imgs };
          }

          if (filled <= 1) {
            const next = imgs.filter((_, i) => i !== slot);
            return { ...b, imgs: next.length > 0 ? next : [`new-${b.id}-0`] };
          }

          imgs[slot] = `new-${b.id}-${slot}`;
          return { ...b, imgs };
        }),
      );
    },
    [pushHistory],
  );

  const pasteImageFromClipboard = useCallback(
    async (target: ImgPickerTarget) => {
      const file = await readImageFileFromClipboard();
      if (!file) {
        setToast("Không có ảnh trong bộ nhớ tạm. Sao chép ảnh rồi bấm lại.");
        return;
      }
      beginImageUpload(
        file,
        (seed) => applyImageToBlock(target, seed),
        replaceImageSeed,
      );
    },
    [applyImageToBlock, beginImageUpload, replaceImageSeed],
  );

  const pasteImgPicker = useCallback(
    (blockId: string, slot: number) => {
      void pasteImageFromClipboard({ blockId, slot });
    },
    [pasteImageFromClipboard],
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

  const existingUserIds = useMemo(
    () => new Set(collaborators.map((c) => c.idNguoiDung)),
    [collaborators],
  );
  const existingTagIds = useMemo(
    () => new Set(tags.map((t) => t.id)),
    [tags],
  );

  const handleAtHashSync = useCallback(
    (blockId: string, trigger: AtHashTrigger | null, textarea: HTMLTextAreaElement) => {
      if (!trigger) {
        setAtHashMenu((prev) => (prev?.blockId === blockId ? null : prev));
        return;
      }
      setAtHashMenu({
        blockId,
        trigger,
        // Neo menu ngay tại ký tự `@`/`#` vừa gõ (caret), không phải góc textarea.
        anchorRect: getTextareaCaretRect(textarea, trigger.start),
        textarea,
      });
    },
    [],
  );

  const applyTagPickSelection = useCallback(
    (pick: EditorTagMenuPick) => {
      if (pick.kind === "user") {
        setCollaborators((prev) => {
          if (prev.some((c) => c.idNguoiDung === pick.user.idNguoiDung)) {
            return prev;
          }
          return [...prev, pick.user];
        });
      } else {
        setTags((prev) => {
          if (prev.some((t) => t.id === pick.tag.id)) return prev;
          return [...prev, pick.tag];
        });
      }
    },
    [],
  );

  const handleEditorTagPick = useCallback(
    (pick: EditorTagMenuPick) => {
      if (!atHashMenu) return;
      const { blockId, trigger, textarea } = atHashMenu;

      if (blockId === MINIMAL_SUB_BLOCK_ID) {
        const { text: stripped, caret } = stripAtHashTrigger(sub, trigger);
        setSub(stripped);
        applyTagPickSelection(pick);
        setAtHashMenu(null);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(caret, caret);
        });
        return;
      }

      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      const { text: stripped, caret } = stripAtHashTrigger(
        block.text ?? "",
        trigger,
      );
      updateBlock(blockId, { text: stripped });
      applyTagPickSelection(pick);
      setAtHashMenu(null);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      });
    },
    [atHashMenu, blocks, updateBlock, sub, applyTagPickSelection],
  );

  const handlePublish = useCallback(() => {
    if (isPending) return;

    if (hasPendingUploads) {
      setToast(
        videoUploading
          ? "Đang tải video lên — vui lòng đợi hoàn tất."
          : editorBlocksHaveUnpersistedImages(blocks, coverSeed)
            ? "Đang tải ảnh lên Cloudflare — vui lòng đợi hoàn tất."
            : "Đang tải ảnh lên — vui lòng đợi hoàn tất.",
      );
      return;
    }

    if (videoUploadError) {
      setToast(videoUploadError);
      return;
    }

    const serverBlocks: ServerBlock[] = toServerBlocks(blocks);

    const hasMediaBlock = blocks.some((b) => b.t === "imgs" || b.t === "embed");

    if (congDongCompose && composeFilterSlugs.length === 0) {
      setToast("Chọn loại bài đăng trước khi đăng.");
      return;
    }

    let tieuDeFinal = title.trim();
    if (!tieuDeFinal) {
      const captionLine = sub.trim().split("\n")[0]?.trim();
      const bodyLine = blocks
        .find((b) => b.t === "body" || b.t === "h2" || b.t === "h3")
        ?.text?.trim()
        .split("\n")[0]
        ?.trim();
      tieuDeFinal =
        captionLine?.slice(0, 120) ||
        bodyLine?.slice(0, 120) ||
        DEFAULT_ARTICLE_POST_TITLE;
    }
    const moTaFinal = sub.trim();
    let coverFinal = sanitizeBaiDangCoverIdInput(coverSeed, serverBlocks);

    /* Bài chỉ có ảnh bìa, không block nội dung nào → coi ảnh bìa như 1 album
       ảnh (album 1 tấm). Bài hợp lệ (qua validate `blocks.length > 0`) và
       render dạng photo card thay vì bị chặn "thiếu ít nhất 1 block". Ảnh bìa
       chuyển hẳn vào album nên xoá `coverFinal` để tránh hiện ảnh 2 lần. */
    let publishBlocks: ServerBlock[] = enrichBunnyEmbedBlocksForPublish(
      serverBlocks,
      isEdit,
    );
    if (serverBlocks.length === 0 && coverFinal) {
      publishBlocks = [
        {
          id: newId(),
          loai: "imgs",
          thu_tu: 0,
          config: { layout: "full", rounded: false, cap: "", imgs: [coverFinal] },
        },
      ];
      coverFinal = null;
    }

    if (
      detectMediaPostKind(publishBlocks) === "photo" &&
      !mediaPostHasContent(publishBlocks, "photo")
    ) {
      setToast("Ảnh album chưa sẵn sàng — đợi upload xong rồi thử lại.");
      return;
    } else if (publishBlocks.length === 0) {
      if (hasMediaBlock || coverSeed) {
        setToast("Ảnh chưa sẵn sàng — đợi upload xong rồi thử lại.");
        return;
      }
      /* mo_ta / tiêu đề only — blocks rỗng vẫn publish được. */
    }

    const contentCheck = validatePostContentForPublish({
      moTa: moTaFinal,
      coverId: coverFinal,
      tieuDe: tieuDeFinal,
      blocks: publishBlocks,
    });
    if (!contentCheck.ok) {
      setToast(contentCheck.error);
      return;
    }
    const moTaForPublish = contentCheck.resolution.effectiveMoTa ?? "";

    startTransition(async () => {
      try {
      if (orgBaiDangCompose && isEdit && initial) {
        const result = await updateOrgBaiDangClient({
          orgId: orgBaiDangCompose.orgId,
          baiDangId: initial.tacPhamId,
          tieuDe: tieuDeFinal,
          tomTat: moTaForPublish || null,
          coverId: coverFinal,
          blocks: publishBlocks,
          loaiBaiDang: orgBaiDangCompose.forceLoaiBaiDang ?? composeLoaiBaiDang,
          schedulePublishAt: composeSchedulePublishAt,
        });
        if (!result.ok) {
          setToast(result.error || "Không lưu được bài đăng.");
          return;
        }
        orgBaiDangCompose.onPostUpdated?.(result.post);
        setSavedFlash(true);
        setToast(
          composeScheduleActive
            ? `✓ Đã hẹn đăng ${formatOrgBaiDangScheduleLabel(composeSchedulePublishAt)}.`
            : "✓ Đã cập nhật bài đăng.",
        );
        if (isOverlay && onPublished) {
          onPublished();
        }
        return;
      }

      if (orgBaiDangCompose && !isEdit) {
        const result = await publishOrgBaiDangClient({
          orgId: orgBaiDangCompose.orgId,
          tieuDe: tieuDeFinal,
          tomTat: moTaForPublish || null,
          coverId: coverFinal,
          blocks: publishBlocks,
          loaiBaiDang: orgBaiDangCompose.forceLoaiBaiDang ?? composeLoaiBaiDang,
          schedulePublishAt: composeSchedulePublishAt,
        });
        if (!result.ok) {
          setToast(result.error || "Không lưu được bài đăng.");
          return;
        }
        orgBaiDangCompose.onPostPublished?.(result.post);
        setSavedFlash(true);
        setToast(
          composeScheduleActive
            ? `✓ Đã hẹn đăng ${formatOrgBaiDangScheduleLabel(composeSchedulePublishAt)}.`
            : "✓ Đã đăng bài.",
        );
        if (canPersistComposeDraft) {
          clearComposeEditorDraft(composeDraftKey);
        }
        if (isOverlay && onPublished) {
          onPublished();
        }
        return;
      }

      if (isEdit && initial) {
        const result = await updatePost({
          ownerSlug,
          tacPhamId: initial.tacPhamId,
          cotMocId: initial.cotMocId,
          tieuDe: tieuDeFinal,
          moTa: moTaForPublish,
          coverSeed: coverFinal,
          tags,
          visibility: publishVisibility,
          loaiMoc: initial.loaiMoc,
          thoiDiem: initial.thoiDiem,
          blocks: publishBlocks,
          personalFilterIds,
          coAuthors: collaborators,
          ownerVaiTro,
        });
        if (!result.ok) {
          setToast(result.error || "Không lưu được bài viết.");
          return;
        }
        setSavedFlash(true);
        setToast("✓ Đã lưu thay đổi.");
        const publishDetail: ComposePublishedDetail = {
          ownerSlug,
          postSlug: result.postSlug ?? postSlug,
          tacPhamId: result.tacPhamId,
          cotMocId: result.cotMocId,
          milestone: result.milestone,
        };
        if (isOverlay && onPublished) {
          onPublished(publishDetail);
        } else {
          router.push(`/${ownerSlug}`);
        }
        return;
      }

      const result = await publishPost({
        ownerSlug,
        tieuDe: tieuDeFinal,
        moTa: moTaForPublish,
        coverSeed: coverFinal,
        tags,
        visibility: publishVisibility,
        loaiMoc: DEFAULT_LOAI_MOC,
        thoiDiem: isoToday(),
        blocks: publishBlocks,
        personalFilterIds,
        coAuthors: collaborators.length > 0 ? collaborators : undefined,
        ownerVaiTro: ownerVaiTro.trim() || undefined,
        congDong: congDongCompose
          ? {
              orgId: congDongCompose.orgId,
              filterSlugs: composeFilterSlugs,
            }
          : undefined,
      });

      if (!result.ok) {
        setToast(result.error || "Không lưu được bài viết.");
        return;
      }

      setSavedFlash(true);
      setToast("✓ Đã đăng bài.");
      if (canPersistComposeDraft) {
        clearComposeEditorDraft(composeDraftKey);
      }
      const publishDetail: ComposePublishedDetail = {
        ownerSlug,
        postSlug: result.slug,
        tacPhamId: result.tacPhamId,
        cotMocId: result.cotMocId,
        milestone: result.milestone,
      };
      if (isOverlay && onPublished) {
        onPublished(publishDetail);
      } else {
        router.push(`/${ownerSlug}`);
      }
      } catch (e) {
        setToast(
          e instanceof Error ? e.message : "Không lưu được — thử lại.",
        );
      }
    });
  }, [
    isEdit,
    initial,
    isPending,
    hasPendingUploads,
    title,
    sub,
    coverSeed,
    tags,
    collaborators,
    ownerVaiTro,
    vis,
    publishVisibility,
    congDongCompose,
    orgBaiDangCompose,
    videoUploadError,
    composeFilterSlugs,
    composeLoaiBaiDang,
    composeSchedulePublishAt,
    composeScheduleActive,
    personalFilterIds,
    blocks,
    ownerSlug,
    postSlug,
    router,
    isOverlay,
    onPublished,
    canPersistComposeDraft,
    composeDraftKey,
  ]);

  return (
    <div
      className={`cins-editor-page${isOverlay ? " is-overlay" : ""}${usesMinimalFlow && isOverlay ? " is-minimal-compose" : ""}${usesMinimalFlow && editorExpanded ? " is-minimal-compose-expanded" : ""}`}
      ref={editorRef}
    >
      {/* TOPBAR */}
      <header className="ed-topbar">
        <div className="ed-topbar-inner">
          {isOverlay ? null : (
            <Link href={`/${ownerSlug}`} className="ed-brand" title="Về Journey">
              <span className="ed-brand-mark">CI</span>
              <span className="ed-title">Trình tạo bài viết</span>
            </Link>
          )}
          {isOverlay ? (
            <span
              className={`ed-compose-badge ed-compose-badge--${previewKind}`}
              title={previewMeta.hint}
            >
              {previewMeta.label}
            </span>
          ) : null}
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
          ) : orgBaiDangCompose ? (
            <div className="ed-topbar-actions-cluster">
              {orgBaiDangCompose.forceLoaiBaiDang ? null : (
                <OrgBaiDangLoaiComposeDropdown
                  value={composeLoaiBaiDang}
                  onChange={setComposeLoaiBaiDang}
                  options={orgBaiDangCompose.loaiOptions}
                  menuZIndex={9200}
                />
              )}
              <OrgBaiDangScheduleComposeButton
                value={composeSchedulePublishAt}
                onChange={setComposeSchedulePublishAt}
                menuZIndex={9210}
              />
            </div>
          ) : (
            <EditorVisibilitySelect value={vis} onChange={setVis} />
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
            disabled={isPending || savedFlash || hasPendingUploads}
            aria-busy={isPending || hasPendingUploads}
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
            ) : orgBaiDangCompose && composeScheduleActive ? (
              <>
                <CalendarClock size={14} strokeWidth={2} aria-hidden /> Hẹn đăng
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={2} aria-hidden /> Lưu
              </>
            )}
          </button>
          {isOverlay && onClose ? (
            <button
              type="button"
              className="ed-compose-close"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>
      </header>

      {/* CANVAS */}
      <main
        className="editor-canvas"
        aria-label={`Soạn bài cho ${ownerName}`}
      >
        <AutosizeTextarea
          className="title-in"
          placeholder={
            isMinimalUI ? "Tiêu đề (tuỳ chọn)…" : "Tiêu đề bài viết…"
          }
          value={title}
          onChange={setTitle}
          maxRows={4}
        />
        {usesMinimalFlow ? (
          <AutosizeTextarea
            className="ed-minimal-body"
            placeholder={
              isMinimalUI ? "Bạn đang nghĩ gì?" : "Mô tả bài viết"
            }
            value={sub}
            onChange={setSub}
            maxRows={12}
            maxLength={POST_MOTA_MAX}
            enableAtHash
            onAtHashSync={(trigger, textarea) =>
              handleAtHashSync(MINIMAL_SUB_BLOCK_ID, trigger, textarea)
            }
          />
        ) : showFullEditor ? (
          <AutosizeTextarea
            className="sub-in"
            placeholder="Mô tả ngắn (tuỳ chọn)…"
            value={sub}
            onChange={setSub}
            maxRows={3}
            maxLength={POST_MOTA_MAX}
          />
        ) : null}

        {showCoverArea ? (
          <CoverArea
            seed={coverSeed}
            uploadTrack={coverSeed ? imageUploads[coverSeed] : undefined}
            dismissible={usesMinimalFlow && minimalCoverVisible && !coverSeed}
            showEmptyHint={usesMinimalFlow && !coverSeed}
            allowPaste={!imgPickerTarget}
            onSeedChange={setCoverSeed}
            onUploadResolved={replaceImageSeed}
            onRemove={() => {
              setCoverSeed(null);
              setMinimalCoverVisible(false);
            }}
            onUploadFile={beginImageUpload}
          />
        ) : null}

        {(showFullEditor || usesMinimalFlow) &&
        (collaborators.length > 0 || tags.length > 0) ? (
          <EditorComposeMetaChips
            collaborators={collaborators}
            tags={tags}
            onRemoveCollaborator={(id) =>
              setCollaborators((prev) =>
                prev.filter((c) => c.idNguoiDung !== id),
              )
            }
            onRemoveTag={(id) =>
              setTags((prev) => prev.filter((t) => t.id !== id))
            }
          />
        ) : null}

        {showMinimalToolbar ? (
          <div className="ed-minimal-toolbar">
            {isBunnyVideoCompose && !(minimalCoverVisible || coverSeed) ? (
              <EditorVideoThumbnailPicker
                videoSrc={videoScrubSrc}
                videoCanvasRatio={videoCanvasRatio}
                disabled={videoUploading}
                disabledHint={videoThumbDisabledHint}
                onCaptureFrame={applyMinimalCoverFile}
                onUploadImage={applyMinimalCoverFile}
                onError={(message) => setToast(message)}
              />
            ) : null}
            {composeIntent !== "video" && !isBunnyVideoCompose && !(minimalCoverVisible || coverSeed) ? (
              <button
                type="button"
                className="ed-minimal-tool ed-minimal-tool--cover"
                onClick={() => minimalCoverInputRef.current?.click()}
              >
                <ImagePlus size={18} strokeWidth={1.8} aria-hidden />
                <span className="ed-minimal-tool--cover-label">
                  <span className="ed-minimal-tool--cover-title">
                    {MINIMAL_THUMB_ADD_LABEL}
                  </span>
                  <span className="ed-minimal-tool--cover-hint">
                    {MINIMAL_THUMB_ADD_HINT}
                  </span>
                </span>
              </button>
            ) : null}
            {composeIntent !== "video" && !isBunnyVideoCompose && !(minimalCoverVisible || coverSeed) ? (
              <input
                ref={minimalCoverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setMinimalCoverVisible(true);
                    beginImageUpload(f, setCoverSeed, replaceImageSeed);
                  }
                  e.target.value = "";
                }}
              />
            ) : null}
            <div className="ed-minimal-toolbar-actions">
              {composeIntent !== "video" && !hasPhotoBlocks && !hasBunnyVideoBlock ? (
                <button
                  type="button"
                  className="ed-btn ghost ed-minimal-tool"
                  onClick={() => minimalAlbumInputRef.current?.click()}
                >
                  <Images size={15} strokeWidth={2} aria-hidden />
                  Album ảnh
                </button>
              ) : null}
              {composeIntent !== "video" && !hasPhotoBlocks && !hasBunnyVideoBlock ? (
                <button
                  type="button"
                  className="ed-btn ghost ed-minimal-tool"
                  onClick={() => minimalVideoInputRef.current?.click()}
                >
                  <Video size={15} strokeWidth={2} aria-hidden />
                  Thêm video
                </button>
              ) : null}
              {isMinimalUI && composeIntent !== "video" && !hasBunnyVideoBlock ? (
                <button
                  type="button"
                  className="ed-btn ghost ed-minimal-tool"
                  onClick={expandMinimalToFullEditor}
                >
                  <Plus size={15} strokeWidth={2} aria-hidden />
                  Bài viết dài
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {showFullEditor ? (
        <div
          className={`blocks${hideBlockPalette ? " is-minimal-media-compose" : ""}${isPhotoAlbumCompose ? " is-photo-album-compose" : ""}`}
        >
          {!hideBlockPalette ? (
            <AddZone
              idx={0}
              open={openAddIdx === 0}
              onToggle={(open) => setOpenAddIdx(open ? 0 : null)}
              onPick={(type) => pickBlockAt(type, 0)}
              starter={blocks.length === 0}
              anchorPicker={isOverlay}
            />
          ) : null}
          {isPhotoAlbumCompose
            ? albumComposeSegments.map((segment) => {
                if (segment.kind === "album") {
                  const grid = editorAlbumGridFromBlocks(
                    segment.blocks,
                    imageUploads,
                  );
                  if (grid.images.length === 0) return null;
                  const insertAt =
                    segment.startIndex + segment.blocks.length;
                  return (
                    <div key={`album-${segment.startIndex}-${segment.blocks.map((b) => b.id).join("-")}`}>
                      <EditorPhotoAlbumPreview
                        grid={grid}
                        photoCount={segment.blocks.length}
                        maxPhotos={MAX_EDITOR_ALBUM_PHOTOS}
                        showAddDropzone={previewKind !== "article"}
                        onAddFiles={(files) => {
                          const room =
                            MAX_EDITOR_ALBUM_PHOTOS - segment.blocks.length;
                          if (room <= 0) {
                            setToast(
                              `Album tối đa ${MAX_EDITOR_ALBUM_PHOTOS} ảnh.`,
                            );
                            return;
                          }
                          seedPhotoFilesAt(insertAt, files.slice(0, room));
                        }}
                        onAddSlot={() => {
                          const room =
                            MAX_EDITOR_ALBUM_PHOTOS - segment.blocks.length;
                          if (room <= 0) {
                            setToast(
                              `Album tối đa ${MAX_EDITOR_ALBUM_PHOTOS} ảnh.`,
                            );
                            return;
                          }
                          insertDummyImageBlockAt(insertAt, true);
                        }}
                        onPickImage={(slot) =>
                          openImgPicker(segment.blocks[slot]!.id, 0)
                        }
                        onPasteImage={(slot) =>
                          pasteImgPicker(segment.blocks[slot]!.id, 0)
                        }
                        onRemoveImage={(slot) =>
                          deleteBlock(segment.blocks[slot]!.id)
                        }
                      />
                      {!hideBlockPalette ? (
                        <AddZone
                          idx={insertAt}
                          open={openAddIdx === insertAt}
                          onToggle={(open) =>
                            setOpenAddIdx(open ? insertAt : null)
                          }
                          onPick={(type) => {
                            if (type === "imgs") {
                              const room =
                                MAX_EDITOR_ALBUM_PHOTOS - segment.blocks.length;
                              if (room <= 0) {
                                setToast(
                                  `Album tối đa ${MAX_EDITOR_ALBUM_PHOTOS} ảnh.`,
                                );
                                return;
                              }
                              insertDummyImageBlockAt(insertAt, true);
                              return;
                            }
                            pickBlockAt(type, insertAt);
                          }}
                          starter={
                            canAddMoreSessions && insertAt === blocks.length
                          }
                          anchorPicker={isOverlay}
                        />
                      ) : null}
                    </div>
                  );
                }
                const b = segment.block;
                const i = segment.index;
                return (
                  <div key={b.id}>
                    <BlockRow
                      block={b}
                      imageUploads={imageUploads}
                      selected={selectedId === b.id}
                      isMinimalMediaCompose={
                        isMinimalMediaCompose || isBunnyVideoCompose
                      }
                      minimalVideoState={
                        (isMinimalMediaCompose || isBunnyVideoCompose) &&
                        b.t === "embed"
                          ? {
                              localPreviewUrl: localVideoPreviewUrl,
                              uploading: videoUploading,
                              uploadProgress: videoUploadProgress,
                              encoding: videoEncoding,
                              encodeReady: videoEncodeReady,
                              error: videoUploadError,
                              posterSeed: coverSeed,
                            }
                          : undefined
                      }
                      onSelect={() => setSelectedId(b.id)}
                      onChangeText={(text) => updateBlock(b.id, { text })}
                      onChangeSize={(size) => updateBlock(b.id, { size })}
                      onChangeLayout={(layout) => setLayout(b.id, layout)}
                      onToggleRound={() => toggleRound(b.id)}
                      onPickImage={(slot) => openImgPicker(b.id, slot)}
                      onPasteImage={(slot) => pasteImgPicker(b.id, slot)}
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
                      onRemoveImage={(slot) =>
                        removeImageFromBlock(b.id, slot)
                      }
                      onAddImageSlot={() => appendImageSlotToBlock(b.id)}
                      onAddImageFiles={(files) =>
                        appendImageFilesToBlock(b.id, files)
                      }
                      enableAtHash={showFullEditor}
                      onAtHashSync={(trigger, textarea) =>
                        handleAtHashSync(b.id, trigger, textarea)
                      }
                    />
                    {!hideBlockPalette &&
                    (!isMinimalMediaCompose || i === blocks.length - 1) ? (
                      <AddZone
                        idx={i + 1}
                        open={openAddIdx === i + 1}
                        onToggle={(open) =>
                          setOpenAddIdx(open ? i + 1 : null)
                        }
                        onPick={(type) => pickBlockAt(type, i + 1)}
                        starter={
                          canAddMoreSessions && i === blocks.length - 1
                        }
                        anchorPicker={isOverlay}
                      />
                    ) : null}
                  </div>
                );
              })
            : blocks.map((b, i) => (
                <div key={b.id}>
                  <BlockRow
                    block={b}
                    imageUploads={imageUploads}
                    selected={selectedId === b.id}
                    isMinimalMediaCompose={
                      isMinimalMediaCompose || isBunnyVideoCompose
                    }
                    minimalVideoState={
                      (isMinimalMediaCompose || isBunnyVideoCompose) &&
                      b.t === "embed"
                        ? {
                            localPreviewUrl: localVideoPreviewUrl,
                            uploading: videoUploading,
                            uploadProgress: videoUploadProgress,
                            encoding: videoEncoding,
                            encodeReady: videoEncodeReady,
                            error: videoUploadError,
                            posterSeed: coverSeed,
                          }
                        : undefined
                    }
                    onSelect={() => setSelectedId(b.id)}
                    onChangeText={(text) => updateBlock(b.id, { text })}
                    onChangeSize={(size) => updateBlock(b.id, { size })}
                    onChangeLayout={(layout) => setLayout(b.id, layout)}
                    onToggleRound={() => toggleRound(b.id)}
                    onPickImage={(slot) => openImgPicker(b.id, slot)}
                    onPasteImage={(slot) => pasteImgPicker(b.id, slot)}
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
                    onRemoveImage={(slot) => removeImageFromBlock(b.id, slot)}
                    onAddImageSlot={() => appendImageSlotToBlock(b.id)}
                    onAddImageFiles={(files) =>
                      appendImageFilesToBlock(b.id, files)
                    }
                    enableAtHash={showFullEditor}
                    onAtHashSync={(trigger, textarea) =>
                      handleAtHashSync(b.id, trigger, textarea)
                    }
                  />
                  {!hideBlockPalette &&
                  (!isMinimalMediaCompose || i === blocks.length - 1) ? (
                    <AddZone
                      idx={i + 1}
                      open={openAddIdx === i + 1}
                      onToggle={(open) => setOpenAddIdx(open ? i + 1 : null)}
                      onPick={(type) => pickBlockAt(type, i + 1)}
                      starter={canAddMoreSessions && i === blocks.length - 1}
                      anchorPicker={isOverlay}
                    />
                  ) : null}
                </div>
              ))}
        </div>
        ) : null}

        {showFullEditor &&
        !isPhotoAlbumCompose &&
        !isBunnyVideoCompose &&
        (!isMinimalMediaCompose || (canAddMoreSessions && blocks.length > 0)) ? (
        <div className="hint-foot">
          Bấm nút <b>+</b> ở khe giữa các block để chèn nội dung mới. Gõ{" "}
          <b>@</b> để gắn cộng sự, <b>#</b> để gắn thẻ bài viết.
        </div>
        ) : null}

        {atHashMenu ? (
          <EditorTagMenu
            trigger={atHashMenu.trigger}
            anchorRect={atHashMenu.anchorRect}
            ownerId={ownerId}
            existingUserIds={existingUserIds}
            existingTagIds={existingTagIds}
            onPick={handleEditorTagPick}
            onClose={() => setAtHashMenu(null)}
          />
        ) : null}
      </main>

      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        aria-hidden
        tabIndex={-1}
        onChange={onImageFileInputChange}
      />
      <input
        ref={minimalAlbumInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        style={{ display: "none" }}
        aria-hidden
        tabIndex={-1}
        onChange={onMinimalAlbumPick}
      />
      <input
        ref={minimalVideoInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        aria-hidden
        tabIndex={-1}
        onChange={onMinimalVideoPick}
      />

      {toast ? <div className="ed-toast">{toast}</div> : null}
    </div>
  );
}

/* ─── Cover ──────────────────────────────────────────────────────── */

function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of data.items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file && isAllowedUploadImageFile(file)) return file;
  }
  return null;
}

function isImageFileDrag(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes("Files");
}

function imageFileFromDataTransfer(data: DataTransfer | null): File | null {
  const fromItems = imageFileFromClipboard(data);
  if (fromItems) return fromItems;
  if (!data) return null;
  for (const file of data.files) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

/** Đang gõ trong ô chữ / vùng soạn thảo → đừng cướp sự kiện dán của nội dung. */
function isEditablePasteTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function CoverDismissButton({
  onDismiss,
  label = "Xoá ảnh bìa",
}: {
  onDismiss: () => void;
  label?: string;
}) {
  return (
    <div className="cover-actions">
      <button
        type="button"
        className="cover-act cover-act-del"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label={label}
      >
        <Trash2 size={13} strokeWidth={1.8} aria-hidden />
        <span>Xoá</span>
      </button>
    </div>
  );
}

function CoverArea({
  seed,
  uploadTrack,
  dismissible = false,
  onSeedChange,
  onUploadResolved,
  onRemove,
  onUploadFile,
  showEmptyHint = false,
  allowPaste = true,
}: {
  seed: string | null;
  uploadTrack?: ImageUploadTrack;
  dismissible?: boolean;
  showEmptyHint?: boolean;
  /** Cho dán ảnh (Ctrl+V) vào ô bìa trống — tắt khi có picker ảnh của block. */
  allowPaste?: boolean;
  onSeedChange: (seed: string) => void;
  onUploadResolved: (from: string, to: string) => void;
  onRemove: () => void;
  onUploadFile: (
    file: File,
    onPick: (seed: string) => void,
    onResolved?: (from: string, to: string) => void,
  ) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  const applyFile = useCallback(
    (file: File) => {
      onUploadFile(file, onSeedChange, onUploadResolved);
      setDragOver(false);
      dragDepthRef.current = 0;
    },
    [onSeedChange, onUploadFile, onUploadResolved],
  );

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const coverDragProps = useMemo(
    () => ({
      onDragEnter: (e: DragEvent<HTMLElement>) => {
        if (!isImageFileDrag(e)) return;
        e.preventDefault();
        dragDepthRef.current += 1;
        setDragOver(true);
      },
      onDragLeave: (e: DragEvent<HTMLElement>) => {
        if (!isImageFileDrag(e)) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragOver(false);
      },
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (!isImageFileDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        dragDepthRef.current = 0;
        setDragOver(false);
        const file = imageFileFromDataTransfer(e.dataTransfer);
        if (file) applyFile(file);
      },
    }),
    [applyFile],
  );

  const coverDragClass = dragOver ? " is-dragover" : "";

  // Ô bìa trống: cho dán ảnh (Ctrl+V) trực tiếp — 1 bước, không cần mở panel.
  // Bỏ qua khi đang gõ chữ hoặc khi có picker ảnh của block (tránh dán 2 nơi).
  useEffect(() => {
    if (seed || allowPaste === false) return;

    function onPaste(e: globalThis.ClipboardEvent) {
      if (isEditablePasteTarget()) return;
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      applyFile(file);
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [seed, allowPaste, applyFile]);

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      style={{ display: "none" }}
      aria-hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) applyFile(f);
        e.target.value = "";
      }}
    />
  );

  if (seed) {
    const isUploading = uploadTrack?.status === "uploading";
    return (
      <div
        className={`cover-add has${isUploading ? " is-uploading" : ""}${coverDragClass}`}
        {...coverDragProps}
      >
        <div className="cover-img-wrap">
          <EditorComposeImage seed={seed} width={1600} height={640} alt="Ảnh bìa" />
          {uploadTrack ? (
            <ImageUploadProgressOverlay
              progress={uploadTrack.progress}
              status={uploadTrack.status}
              error={uploadTrack.error}
            />
          ) : null}
        </div>
        <div className="cover-actions">
          <button
            type="button"
            className="cover-act"
            onClick={openFileDialog}
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
        {fileInput}
      </div>
    );
  }

  const emptyCoverHint = showEmptyHint ? (
    <p className="cover-add-hint">{MINIMAL_THUMB_EMPTY_HINT}</p>
  ) : null;

  const coverAddTitle = showEmptyHint
    ? MINIMAL_THUMB_ADD_LABEL
    : dragOver
      ? "Thả ảnh vào đây"
      : "Thêm ảnh bìa";
  const coverAddAriaLabel = showEmptyHint ? MINIMAL_THUMB_ADD_LABEL : "Thêm ảnh bìa";

  return (
    <div className="cover-add-slot">
      <button
        type="button"
        className={`cover-add${coverDragClass}`}
        onClick={openFileDialog}
        aria-label={coverAddAriaLabel}
        {...coverDragProps}
      >
        <span className="ico" aria-hidden>
          <ImagePlus size={22} strokeWidth={1.7} />
        </span>
        <span className="cover-add-txt">
          <span className="cover-add-title">{coverAddTitle}</span>
          <span className="cover-add-sub">
            {showEmptyHint
              ? MINIMAL_THUMB_ADD_HINT
              : "Nhấp để chọn ảnh — hoặc kéo thả / dán (Ctrl+V)"}
          </span>
        </span>
      </button>
      {dismissible ? (
        <CoverDismissButton onDismiss={onRemove} label="Bỏ ảnh bìa" />
      ) : null}
      {emptyCoverHint}
      {fileInput}
    </div>
  );
}

/* ─── AddZone + Picker ───────────────────────────────────────────── */

const PICKER_MAX_W = 420;
const PICKER_EST_H = 280;

function BlockInsertPicker({
  onPick,
  style,
  pickerRef,
}: {
  onPick: (t: BlockType) => void;
  style?: React.CSSProperties;
  pickerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={pickerRef}
      className="picker"
      onClick={(e) => e.stopPropagation()}
      role="menu"
      style={style}
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
  );
}

function AddZone({
  open,
  onToggle,
  onPick,
  starter,
  anchorPicker = false,
}: {
  idx: number;
  open: boolean;
  onToggle: (next: boolean) => void;
  onPick: (t: BlockType) => void;
  /** Khi `true` → AddZone hiển thị to + xanh nổi bật (state khởi đầu). */
  starter?: boolean;
  /** Compose overlay — portal picker, neo theo nút `+` (tránh clip + lệch vị trí). */
  anchorPicker?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerPos, setPickerPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const updatePickerPos = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const measuredH = pickerRef.current?.getBoundingClientRect().height;
    const menuHeight = measuredH && measuredH > 0 ? measuredH : PICKER_EST_H;
    const width = Math.min(PICKER_MAX_W, window.innerWidth - 24);
    const { top, left, maxHeight } = computeCenteredAnchoredMenuPosition(
      rect,
      { width, height: menuHeight },
      { maxHeightCap: 480, minVisibleHeight: 160 },
    );
    setPickerPos({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorPicker) {
      setPickerPos(null);
      return;
    }
    updatePickerPos();
  }, [anchorPicker, open, updatePickerPos]);

  useEffect(() => {
    if (!open || !anchorPicker) return;
    const scrollTargets = collectScrollResizeTargets(btnRef.current);
    const onReflow = () => updatePickerPos();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", onReflow, { passive: true });
    }
    window.addEventListener("resize", onReflow);
    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", onReflow);
      }
      window.removeEventListener("resize", onReflow);
    };
  }, [anchorPicker, open, updatePickerPos]);

  useEffect(() => {
    if (!open || !anchorPicker || !pickerRef.current) return;
    const node = pickerRef.current;
    const ro = new ResizeObserver(() => updatePickerPos());
    ro.observe(node);
    return () => ro.disconnect();
  }, [anchorPicker, open, updatePickerPos, pickerPos?.top]);

  const pickerStyle: React.CSSProperties | undefined =
    anchorPicker && pickerPos
      ? {
          position: "fixed",
          top: pickerPos.top,
          left: pickerPos.left,
          width: pickerPos.width,
          transform: "none",
          maxHeight: pickerPos.maxHeight,
          overflowY: "auto",
        }
      : undefined;

  const picker = open ? (
    <BlockInsertPicker
      onPick={onPick}
      style={pickerStyle}
      pickerRef={pickerRef}
    />
  ) : null;

  const portaledPicker =
    open && anchorPicker && pickerPos && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-editor-page picker-portal-root">
            {picker}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`add-zone${open ? " open" : ""}${starter ? " starter" : ""}`}
    >
      <button
        ref={btnRef}
        type="button"
        className="add-btn"
        onClick={(e) => {
          e.stopPropagation();
          const next = !open;
          onToggle(next);
          if (next && anchorPicker) {
            requestAnimationFrame(() => updatePickerPos());
          }
        }}
        aria-label="Chèn block"
        title="Chèn block"
      >
        +
      </button>
      {anchorPicker ? portaledPicker : picker}
    </div>
  );
}

/* ─── Photo album compose preview (WYSIWYG grid) ─────────────────── */

function EditorPhotoAlbumPreview({
  grid,
  photoCount,
  maxPhotos,
  showAddDropzone = true,
  onAddFiles,
  onAddSlot,
  onPickImage,
  onPasteImage,
  onRemoveImage,
}: {
  grid: ReturnType<typeof editorAlbumGridFromBlocks>;
  photoCount: number;
  maxPhotos: number;
  showAddDropzone?: boolean;
  onAddFiles: (files: File[]) => void;
  onAddSlot: () => void;
  onPickImage: (slotIndex: number) => void;
  onPasteImage: (slotIndex: number) => void;
  onRemoveImage: (slotIndex: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canAddMore = photoCount < maxPhotos;
  const showDropzone = showAddDropzone && canAddMore;
  const showCompactAdd = !showAddDropzone && canAddMore;

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (files.length === 0) return;
      onAddFiles(files);
    },
    [onAddFiles],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(isAllowedUploadImageFile);
      if (files.length === 0) return;
      onAddFiles(files);
    },
    [onAddFiles],
  );

  return (
    <div className="ed-photo-album-compose">
      <div className="preview preview--photo-grid">
        <ImageGrid
          images={grid.images}
          isFirstGroup
          uploadingSlots={grid.uploadingSlots}
          uploadProgressBySlot={grid.uploadProgressBySlot}
          slotErrors={grid.slotErrors}
          uploadBySlot={grid.uploadBySlot}
          showAllImages
          readOnly
          composeSlotActions={{
            onPickImage,
            onPasteImage,
            onRemoveImage,
          }}
        />
      </div>

      {showDropzone ? (
        <div
          className="ed-photo-album-add"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              fileInputRef.current?.click();
            }
          }}
        >
          <ImagePlus size={24} strokeWidth={1.6} aria-hidden />
          <strong>Thêm ảnh</strong>
          <span>
            Kéo thả hoặc bấm để chọn — layout tự động theo số ảnh (tối đa{" "}
            {maxPhotos})
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={onFileChange}
          />
        </div>
      ) : null}

      {showCompactAdd ? (
        <div className="ed-photo-album-add-compact">
          <button
            type="button"
            className="ed-photo-album-add-btn"
            onClick={onAddSlot}
            aria-label="Thêm ảnh vào album"
          >
            <ImagePlus size={18} strokeWidth={1.8} aria-hidden />
            Thêm ảnh
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Block dispatch ─────────────────────────────────────────────── */

type BlockRowProps = {
  block: Block;
  imageUploads: Record<string, ImageUploadTrack>;
  selected: boolean;
  isMinimalMediaCompose?: boolean;
  minimalVideoState?: {
    localPreviewUrl: string | null;
    uploading: boolean;
    uploadProgress: number;
    encoding: boolean;
    encodeReady: boolean;
    error: string | null;
    posterSeed?: string | null;
  };
  onSelect: () => void;
  onChangeText: (s: string) => void;
  onChangeSize: (s: "s" | "m" | "l") => void;
  onChangeLayout: (l: ImgLayout) => void;
  onToggleRound: () => void;
  onPickImage: (slot: number) => void;
  onPasteImage: (slot: number) => void;
  onChangeCap: (c: string) => void;
  onChangeEmbedUrl: (u: string) => void;
  onChangeDividerLen: (len: number) => void;
  onChangeDividerThick: (thick: "thin" | "med" | "thick") => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  onRemoveImage: (slot: number) => void;
  onAddImageSlot: () => void;
  onAddImageFiles: (files: File[]) => void;
  enableAtHash?: boolean;
  onAtHashSync?: (
    trigger: AtHashTrigger | null,
    textarea: HTMLTextAreaElement,
  ) => void;
};

function PhImageActions({
  onPick,
  onPaste,
  pickLabel = "Đổi ảnh",
  pasteLabel = "Dán ảnh",
}: {
  onPick: () => void;
  onPaste: () => void;
  pickLabel?: string;
  pasteLabel?: string;
}) {
  return (
    <div className="ph-actions">
      <button
        type="button"
        className="ph-change"
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
      >
        <ImagePlus size={14} strokeWidth={1.8} aria-hidden />
        {pickLabel}
      </button>
      <button
        type="button"
        className="ph-change ph-paste"
        onClick={(e) => {
          e.stopPropagation();
          onPaste();
        }}
      >
        <ClipboardPaste size={14} strokeWidth={1.8} aria-hidden />
        {pasteLabel}
      </button>
    </div>
  );
}

function BlockRow(p: BlockRowProps) {
  const { block: b, selected, onSelect, isMinimalMediaCompose } = p;
  return (
    <div
      className={`block${selected ? " selected" : ""}${isMinimalMediaCompose ? " is-minimal-media-block" : ""}`}
      data-block-type={b.t}
      onClick={onSelect}
    >
      {!isMinimalMediaCompose ? (
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
      ) : null}
      <div className="block-inner">
        <BlockInner {...p} />
      </div>
    </div>
  );
}

function EditorMinimalVideoPreview({
  embedUrl,
  localPreviewUrl,
  uploading,
  uploadProgress,
  encoding,
  encodeReady,
  error,
  videoCanvasRatio,
  posterSeed = null,
}: {
  embedUrl: string;
  localPreviewUrl: string | null;
  uploading: boolean;
  uploadProgress: number;
  encoding: boolean;
  encodeReady: boolean;
  error: string | null;
  videoCanvasRatio?: Block["videoCanvasRatio"];
  posterSeed?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const bunny = embedUrl.trim() ? classifyBunnyVideoUrl(embedUrl) : null;
  const canvasClass = videoCanvasRatioClass(videoCanvasRatio);
  const bunnyPoster = bunny ? buildBunnyVideoThumbnailUrl(bunny.videoId) : null;
  const hasPoster = Boolean(posterSeed?.trim() || bunnyPoster);

  const previewClass = (extra: string) =>
    `ed-minimal-video-preview ${extra} ${canvasClass}`.trim();

  useEffect(() => {
    setPlaying(false);
  }, [embedUrl, posterSeed, localPreviewUrl]);

  const playBadge = (
    <span className="jcard-video-play" aria-hidden>
      <Play size={28} strokeWidth={2} fill="currentColor" />
    </span>
  );

  const uploadPanel =
    uploading ? (
      <div className="ed-minimal-video-upload-panel" aria-live="polite">
        <div className="ed-minimal-video-upload-head">
          <Loader2 size={16} strokeWidth={2} className="ed-spin" aria-hidden />
          <span>Đang tải video lên… {uploadProgress}%</span>
        </div>
        <div
          className="ed-minimal-video-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={uploadProgress}
          aria-label="Tiến trình tải video lên"
        >
          <span style={{ width: `${uploadProgress}%` }} />
        </div>
      </div>
    ) : null;

  function renderPosterImage() {
    if (posterSeed?.trim()) {
      return (
        <EditorComposeImage seed={posterSeed} width={1600} height={900} alt="" />
      );
    }
    if (bunnyPoster) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={bunnyPoster} alt="" />;
    }
    return null;
  }

  function renderPosterTrigger(
    onPlay: () => void,
    extraClass = "",
    ariaLabel = "Phát video",
  ) {
    return (
      <button
        type="button"
        className={previewClass(
          `ed-minimal-video-preview--poster ed-minimal-video-preview--compact ${extraClass}`.trim(),
        )}
        aria-label={ariaLabel}
        onClick={onPlay}
      >
        {renderPosterImage()}
        {playBadge}
      </button>
    );
  }

  if (error) {
    return <p className="ed-minimal-video-error">{error}</p>;
  }

  if (localPreviewUrl) {
    if (!playing && hasPoster) {
      return (
        <div
          className={previewClass(
            "ed-minimal-video-preview--local ed-minimal-video-preview--compact",
          )}
        >
          {renderPosterTrigger(() => setPlaying(true))}
          {uploadPanel}
        </div>
      );
    }
    return (
      <div
        className={previewClass(
          "ed-minimal-video-preview--local ed-minimal-video-preview--compact",
        )}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={localPreviewUrl} controls playsInline />
        {uploadPanel}
      </div>
    );
  }

  if (bunny && encoding) {
    return (
      <div
        className={previewClass(
          "ed-minimal-video-preview--encoding ed-minimal-video-preview--compact" +
            (hasPoster ? " ed-minimal-video-preview--encoding-has-poster" : ""),
        )}
        aria-live="polite"
      >
        {hasPoster ? (
          <div className="ed-minimal-video-poster-bg" aria-hidden>
            {renderPosterImage()}
          </div>
        ) : (
          <Video size={28} strokeWidth={1.6} aria-hidden />
        )}
        <strong>Tải lên thành công</strong>
        <span className="ed-minimal-video-encoding-note">
          Video đang được xử lý trên máy chủ. Bạn có thể đóng tab hoặc tiếp tục
          soạn bài — chúng tôi sẽ thông báo khi video sẵn sàng.
        </span>
        <div className="ed-minimal-video-progress ed-minimal-video-progress--indeterminate">
          <span />
        </div>
        <span className="ed-minimal-video-encoding-status">Đang xử lý video…</span>
      </div>
    );
  }

  if (bunny && !playing) {
    if (hasPoster) {
      return renderPosterTrigger(() => setPlaying(true));
    }
    return (
      <div
        className={previewClass("ed-minimal-video-preview--compact")}
      >
        <iframe
          key={encodeReady ? "ready" : "loaded"}
          src={bunnyIframeSrc(bunny)}
          title="Xem trước video"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      </div>
    );
  }

  if (bunny && playing) {
    return (
      <div className={previewClass("ed-minimal-video-preview--compact")}>
        <iframe
          key={encodeReady ? "ready-playing" : "playing"}
          src={bunnyIframeSrc(bunny)}
          title="Xem trước video"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      </div>
    );
  }

  if (uploading) {
    if (posterSeed?.trim()) {
      return (
        <div
          className={previewClass(
            "ed-minimal-video-preview--pending ed-minimal-video-preview--compact ed-minimal-video-preview--pending-has-poster",
          )}
        >
          <div className="ed-minimal-video-poster-bg" aria-hidden>
            {renderPosterImage()}
          </div>
          <Loader2 size={22} strokeWidth={2} className="ed-spin" aria-hidden />
          <span>Đang chuẩn bị video…</span>
        </div>
      );
    }
    return (
      <div
        className={previewClass(
          "ed-minimal-video-preview--pending ed-minimal-video-preview--compact",
        )}
      >
        <Loader2 size={22} strokeWidth={2} className="ed-spin" aria-hidden />
        <span>Đang chuẩn bị video…</span>
      </div>
    );
  }

  return null;
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
        enableAtHash={p.enableAtHash}
        onAtHashSync={p.onAtHashSync}
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
          enableAtHash={p.enableAtHash}
          onAtHashSync={p.onAtHashSync}
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
    if (p.isMinimalMediaCompose && p.minimalVideoState) {
      return (
        <EditorMinimalVideoPreview
          embedUrl={b.embedUrl || ""}
          localPreviewUrl={p.minimalVideoState.localPreviewUrl}
          uploading={p.minimalVideoState.uploading}
          uploadProgress={p.minimalVideoState.uploadProgress}
          encoding={p.minimalVideoState.encoding}
          encodeReady={p.minimalVideoState.encodeReady}
          error={p.minimalVideoState.error}
          posterSeed={p.minimalVideoState.posterSeed}
          videoCanvasRatio={b.videoCanvasRatio}
        />
      );
    }
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

/** Giữ blob preview đến khi CDN tải xong — tránh giật khi upload hoàn tất. */
function EditorComposeImage({
  seed,
  width = 900,
  height = 900,
  alt = "",
}: {
  seed: string;
  width?: number;
  height?: number;
  alt?: string;
}) {
  const [displaySrc, setDisplaySrc] = useState(() => ph(seed, width, height));
  const blobRef = useRef<string | null>(
    isTemporaryImageRef(seed) ? seed : null,
  );

  useEffect(() => {
    if (isTemporaryImageRef(seed)) {
      blobRef.current = seed;
      setDisplaySrc(seed);
      return;
    }

    const next = ph(seed, width, height);
    const blob = blobRef.current;
    if (blob && next !== blob) {
      const probe = new Image();
      probe.onload = () => {
        if (blobRef.current === blob) {
          blobRef.current = null;
          try {
            URL.revokeObjectURL(blob);
          } catch {
            /* ignore */
          }
        }
        setDisplaySrc(next);
      };
      probe.onerror = () => {
        blobRef.current = null;
        setDisplaySrc(next);
      };
      probe.src = next;
      return () => {
        probe.onload = null;
        probe.onerror = null;
      };
    }

    blobRef.current = null;
    setDisplaySrc(next);
  }, [seed, width, height]);

  return <img src={displaySrc} alt={alt} />;
}

function ImageBlock({ block, p }: { block: Block; p: BlockRowProps }) {
  const layout = normalizeLegacyLayout(block.layout);
  const imgs = padBlockImageSeedsForLayout(
    block.id,
    block.imgs || [],
    layout,
    "display",
  );
  const canAdd = canAppendImageSlot(layout, imgs);
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  const onAddFilesChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (files.length === 0) return;
      p.onAddImageFiles(files);
    },
    [p],
  );

  return (
    <div className="b-imgs">
      <LayBar block={block} p={p} layout={layout} />

      <div className={`imgwrap ${layout}${block.rounded ? " rounded" : ""}`}>
        {imgs.map((seed, i) => {
          const isEmpty = isEditorEmptyImageSeed(seed);
          return (
          <div key={`${block.id}-${i}`} className={`ph${isEmpty ? " is-empty" : ""}`}>
            {isEmpty ? null : (
              <EditorComposeImage seed={seed} width={900} height={900} alt="" />
            )}
            {p.imageUploads[seed] ? (
              <ImageUploadProgressOverlay
                progress={p.imageUploads[seed].progress}
                status={p.imageUploads[seed].status}
                error={p.imageUploads[seed].error}
              />
            ) : null}
            {imgs.length > 1 ? (
              <button
                type="button"
                className="ph-del"
                title="Xoá ảnh"
                aria-label="Xoá ảnh"
                onClick={(e) => {
                  e.stopPropagation();
                  p.onRemoveImage(i);
                }}
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <PhImageActions
              onPick={() => p.onPickImage(i)}
              onPaste={() => p.onPasteImage(i)}
            />
          </div>
          );
        })}
      </div>

      {canAdd ? (
        <div className="img-add-row">
          <button
            type="button"
            className="img-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              addFileInputRef.current?.click();
            }}
          >
            <ImagePlus size={14} strokeWidth={2} aria-hidden />
            Thêm ảnh
          </button>
          <button
            type="button"
            className="img-add-btn img-add-btn--ghost"
            onClick={(e) => {
              e.stopPropagation();
              p.onAddImageSlot();
            }}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
            Ô trống
          </button>
          <input
            ref={addFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={onAddFilesChange}
          />
        </div>
      ) : null}
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
      {IMG_LAYOUTS.map((l) => (
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
            <LayoutThumbIcon layout={l.k} />
          </button>
        ))}
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


/* ─── Image file picker (native dialog — không modal thư viện demo) ─ */

/* ─── Autosize textarea ──────────────────────────────────────────── */

function EditorComposeMetaChips({
  collaborators,
  tags,
  onRemoveCollaborator,
  onRemoveTag,
}: {
  collaborators: CoAuthorDraft[];
  tags: ArticleTagRef[];
  onRemoveCollaborator: (id: string) => void;
  onRemoveTag: (id: string) => void;
}) {
  if (collaborators.length === 0 && tags.length === 0) return null;
  return (
    <div className="meta-chips ed-compose-meta-chips" aria-label="Cộng sự và thẻ">
      {collaborators.map((c) => {
        const name = c.tenHienThi || c.slug;
        const avatarUrl = getAvatarUrl(c.avatarId ?? null);
        return (
          <span key={c.idNguoiDung} className="meta-chip meta-chip-coauthor">
            <span className="ed-coauthor-avatar" aria-hidden>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="meta-chip-name">{name}</span>
            <button
              type="button"
              className="meta-chip-x"
              aria-label={`Bỏ cộng sự ${name}`}
              onClick={() => onRemoveCollaborator(c.idNguoiDung)}
            >
              ×
            </button>
          </span>
        );
      })}
      {tags.map((t) => {
        const cls = articleTagLoaiClass(t.loai_bai_viet);
        return (
          <span key={t.id} className={`meta-chip meta-chip-tag ${cls}`}>
            <span className="meta-chip-loai" aria-hidden>
              {articleTagLabel(t.loai_bai_viet)}
            </span>
            <span className="meta-chip-name">{t.tieu_de}</span>
            <button
              type="button"
              className="meta-chip-x"
              aria-label={`Bỏ tag ${t.tieu_de}`}
              onClick={() => onRemoveTag(t.id)}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}

function AutosizeTextarea({
  className,
  value,
  onChange,
  placeholder,
  maxRows,
  maxLength,
  enableAtHash = false,
  onAtHashSync,
}: {
  className?: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxRows?: number;
  maxLength?: number;
  enableAtHash?: boolean;
  onAtHashSync?: (
    trigger: AtHashTrigger | null,
    textarea: HTMLTextAreaElement,
  ) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight + 2}px`;
  }, []);

  const syncAtHash = useCallback(() => {
    const ta = ref.current;
    if (!ta || !enableAtHash || !onAtHashSync) return;
    onAtHashSync(getAtHashTrigger(ta.value, ta.selectionStart), ta);
  }, [enableAtHash, onAtHashSync]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const onChangeRaw = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      queueMicrotask(syncAtHash);
    },
    [onChange, syncAtHash],
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
      maxLength={maxLength}
      onChange={onChangeRaw}
      onKeyDown={onKeyDown}
      onKeyUp={syncAtHash}
      onClick={syncAtHash}
      onSelect={syncAtHash}
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
      local.layout = normalizeLegacyLayout(cfg.layout);
      local.rounded = !!cfg.rounded;
      local.cap = typeof cfg.cap === "string" ? cfg.cap : "";
      /* Ảnh: đọc `imgs`; nếu là mosaic cũ (chỉ có `cells`) thì gom seed ra. */
      const rawImgs = Array.isArray(cfg.imgs)
        ? (cfg.imgs as unknown[]).map(String).filter(Boolean)
        : [];
      const imgs =
        rawImgs.length > 0 ? rawImgs : flattenMosaicCells(cfg.cells);
      local.imgs = imgs.filter((s) => !/^m-|^extra-/.test(s));
      if (cfg.albumGridCell === true) local.albumGridCell = true;
      else if (cfg.albumGridCell === false) local.albumGridCell = false;
      if (typeof cfg.width === "number" && cfg.width > 0) {
        local.width = Math.round(cfg.width);
      }
      if (typeof cfg.height === "number" && cfg.height > 0) {
        local.height = Math.round(cfg.height);
      }
    } else if (t === "embed") {
      local.embedUrl = typeof cfg.url === "string" ? cfg.url : "";
      const ratio =
        cfg.videoCanvasRatio === "16:9" ||
        cfg.videoCanvasRatio === "1:1" ||
        cfg.videoCanvasRatio === "3:4" ||
        cfg.videoCanvasRatio === "9:16"
          ? cfg.videoCanvasRatio
          : null;
      if (ratio) local.videoCanvasRatio = ratio;
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

function enrichBunnyEmbedBlocksForPublish(
  blocks: ServerBlock[],
  isEdit: boolean,
): ServerBlock[] {
  return blocks.map((block) => {
    if (block.loai !== "embed") return block;
    const url = String(block.config?.url ?? "").trim();
    const bunny = classifyBunnyVideoUrl(url);
    if (!bunny) return block;
    return {
      ...block,
      config: {
        ...(block.config ?? {}),
        bunnyVideoId: bunny.videoId,
        ...(!isEdit ? { videoProcessing: true } : {}),
      },
    };
  });
}

function toServerBlocks(blocks: Block[]): ServerBlock[] {
  return blocks
    .map((b, i) => {
      const loai = LOCAL_TO_SERVER_TYPE[b.t];
      let config: Record<string, unknown> = {};
      if (b.t === "h2" || b.t === "h3" || b.t === "body" || b.t === "quote") {
        /* Plain text — server sẽ escape khi render HTML. */
        config = { html: (b.text || "").slice(0, 8000) };
      } else if (b.t === "imgs") {
        const baseImgs = (b.imgs || [])
          .filter(
            (seed) =>
              !seed.startsWith("blob:") &&
              !seed.startsWith("data:") &&
              isPersistedImageSeed(seed),
          )
          .slice(0, 24);
        config = {
          layout: normalizeLegacyLayout(b.layout),
          rounded: !!b.rounded,
          cap: (b.cap || "").slice(0, 280),
          imgs: baseImgs,
          ...(typeof b.width === "number" && b.width > 0
            ? { width: Math.round(b.width) }
            : {}),
          ...(typeof b.height === "number" && b.height > 0
            ? { height: Math.round(b.height) }
            : {}),
          ...(b.albumGridCell === true
            ? { albumGridCell: true }
            : b.albumGridCell === false
              ? { albumGridCell: false }
              : {}),
        };
      } else if (b.t === "embed") {
        const url = (b.embedUrl || "").trim().slice(0, 2048);
        config = { url };
        if (b.videoCanvasRatio) {
          config.videoCanvasRatio = b.videoCanvasRatio;
        }
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
    })
    .filter(
      (block) =>
        block.loai !== "imgs" ||
        (Array.isArray(block.config.imgs) &&
          (block.config.imgs as string[]).length > 0),
    )
    .map((block, i) => ({ ...block, thu_tu: i }));
}

function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
