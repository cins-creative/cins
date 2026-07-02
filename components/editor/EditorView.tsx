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
  getImgLayoutMeta,
  IMG_LAYOUTS,
  imgLayoutPreviewSlots,
  type ImgLayout,
  type MosaicCell,
} from "@/lib/editor/image-layout";
import { CongDongFeedFilterDropdown } from "@/components/cong-dong/CongDongFeedFilterDropdown";
import { updatePost } from "@/app/[slug]/p/[postSlug]/edit/actions";
import { publishPost } from "@/app/[slug]/p/new/actions";
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
import { DEFAULT_ARTICLE_POST_TITLE } from "@/lib/journey/post-media";
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
import { uploadPostImageWithProgress } from "@/lib/files/upload-post-image";
import type { ComposePublishedDetail } from "@/lib/journey/compose-published-sync";
import { sanitizeBaiDangCoverIdInput } from "@/lib/truong/bai-dang-cover";
import { isTemporaryImageRef } from "@/lib/truong/image-ref";
import type { ComposeIntent } from "@/lib/journey/compose-types";
import {
  COMPOSE_PREVIEW_LABELS,
  inferComposePreviewKind,
} from "@/lib/journey/compose-preview-kind";
import { useEditorVideoUpload } from "@/lib/journey/use-editor-video-upload";
import { bunnyIframeSrc, classifyBunnyVideoUrl } from "@/lib/bunny/embed";

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
  /** True khi đang chọn ảnh cho 1 ô mosaic (ghi vào `cells[slot].seed`). */
  mosaic?: boolean;
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

const ph = (s: string, w = 900, h = 600) => resolveImageSeedUrl(s, w, h);

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
  return inferComposePreviewKind(initial.blocks ?? [], cover) === "text";
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
  const isTextOnlyEdit = isEdit && isTextOnlyEditorInitial(initial);
  const usesMinimalFlow =
    (isCreateCompose && composeIntent === "minimal") || isTextOnlyEdit;
  const [editorExpanded, setEditorExpanded] = useState(() => {
    if (composeIntent === "photo" || composeIntent === "video") return true;
    if (isEdit) return !isTextOnlyEditorInitial(initial);
    return composeIntent !== "minimal";
  });
  const [minimalCoverVisible, setMinimalCoverVisible] = useState(false);
  const isMinimalUI = isOverlay && usesMinimalFlow && !editorExpanded;
  const showFullEditor = !isMinimalUI;
  /* Huỷ → journey (không link `/p/slug` — intercept modal sẽ mở popup thay vì thoát edit). */
  const cancelHref = `/${ownerSlug}`;

  const [coverSeed, setCoverSeed] = useState<string | null>(() =>
    sanitizeBaiDangCoverIdInput(initial?.coverSeed ?? null, initial?.blocks),
  );
  const showCoverArea = useMemo(
    () =>
      Boolean(coverSeed) ||
      minimalCoverVisible ||
      (showFullEditor && !usesMinimalFlow),
    [coverSeed, minimalCoverVisible, showFullEditor, usesMinimalFlow],
  );
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
  const [title, setTitle] = useState(initial?.tieuDe ?? "");
  const [sub, setSub] = useState(() => {
    if (initial?.moTa?.trim()) return initial.moTa ?? "";
    if (initial && isTextOnlyEditorInitial(initial)) {
      return bodyPlainFromServerBlocks(initial.blocks);
    }
    return "";
  });
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const parsed = initial?.blocks ? fromServerBlocks(initial.blocks) : [];
    if (initial && isTextOnlyEditorInitial(initial) && !initial.moTa?.trim()) {
      return parsed.filter((b) => b.t !== "body");
    }
    return parsed;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openAddIdx, setOpenAddIdx] = useState<number | null>(null);

  const [tags, setTags] = useState<ArticleTagRef[]>(() => [...(initial?.tags ?? [])]);
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
  const [vis, setVis] = useState<Visibility>(initial?.visibility ?? "public");
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
  const [composeLoaiBaiDang, setComposeLoaiBaiDang] = useState<string>(
    () => {
      if (initial?.orgBaiDangLoai) {
        return normalizeLoaiBaiDang(initial.orgBaiDangLoai);
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
  >(() => initial?.orgBaiDangSchedulePublishAt ?? null);
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
  const initialPhotosStartedRef = useRef(false);
  const initialVideoStartedRef = useRef(false);
  const videoBlockIdRef = useRef<string | null>(null);

  const {
    videoUrl,
    videoUploading,
    videoUploadError,
    localVideoPreviewUrl,
    uploadVideoFile,
  } = useEditorVideoUpload();

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
        const cells = b.cells?.map((cell) =>
          cell.seed === from ? { ...cell, seed: to } : cell,
        );
        return { ...b, imgs, cells };
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

  const beginImageUpload = useCallback(
    (
      file: File,
      onPick: (seed: string) => void,
      onUploadResolved?: (from: string, to: string) => void,
    ) => {
      if (!file.type?.startsWith("image/")) return;
      const localSeed = URL.createObjectURL(file);
      onPick(localSeed);
      setImageUploadTrack(localSeed, { progress: 0, status: "uploading" });

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
          onUploadResolved?.(localSeed, resolvedId);
          activeKey = resolvedId;
          finishTrack(localSeed, null);
          finishTrack(resolvedId, { progress: 100, status: "done" });
          URL.revokeObjectURL(localSeed);
          window.setTimeout(() => finishTrack(resolvedId, null), 900);
        } catch (e) {
          finishTrack(activeKey, {
            progress: 0,
            status: "error",
            error: e instanceof Error ? e.message : "Upload thất bại.",
          });
        }
      })();
    },
    [setImageUploadTrack],
  );

  const hasPendingUploads = useMemo(
    () =>
      videoUploading ||
      Object.values(imageUploads).some((track) => track.status === "uploading"),
    [imageUploads, videoUploading],
  );

  const previewKind = useMemo(
    () => inferComposePreviewKind(toServerBlocks(blocks), coverSeed),
    [blocks, coverSeed],
  );
  const previewMeta = COMPOSE_PREVIEW_LABELS[previewKind];

  const applyImageToBlock = useCallback(
    (target: ImgPickerTarget, seed: string) => {
      const { blockId, slot, mosaic } = target;
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

  const seedPhotoFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      pushHistory();
      const created: Array<{ id: string; placeholder: string }> = [];
      setBlocks((prev) => {
        const next = prev.slice();
        for (const _file of files) {
          const id = newId();
          const placeholder = `new-${id}`;
          next.push({
            id,
            t: "imgs",
            layout: "full",
            imgs: [placeholder],
            cap: "",
            rounded: false,
          });
          created.push({ id, placeholder });
        }
        return next;
      });
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const meta = created[i];
        if (!meta) continue;
        beginImageUpload(
          file,
          (seed) => {
            setBlocks((prev) =>
              prev.map((b) =>
                b.id === meta.id ? { ...b, imgs: [seed] } : b,
              ),
            );
          },
          replaceImageSeed,
        );
      }
    },
    [beginImageUpload, pushHistory, replaceImageSeed],
  );

  const expandMinimalToFullEditor = useCallback(() => {
    setBlocks((prev) => {
      if (prev.some((b) => b.t !== "body" && b.t !== "spacer")) return prev;
      return prev.filter((b) => b.t !== "body");
    });
    setEditorExpanded(true);
  }, []);

  const hasPhotoBlocks = blocks.some((b) => b.t === "imgs");
  const hasVideoBlock = blocks.some((b) => b.t === "embed");
  const isMinimalMediaCompose =
    usesMinimalFlow && editorExpanded && (hasPhotoBlocks || hasVideoBlock);
  /** Minimal compose expanded — mỗi lần bấm + tạo thêm một block (session nội dung). */
  const canAddMoreSessions = usesMinimalFlow && editorExpanded;

  const pickBlockAt = useCallback(
    (type: BlockType, idx: number) => {
      if (isMinimalMediaCompose) {
        if (hasVideoBlock && type === "imgs") {
          setToast("Không thể thêm album khi đã có video.");
          return;
        }
        if (hasPhotoBlocks && type === "embed") {
          setToast("Không thể thêm video vào bài album ảnh.");
          return;
        }
      }
      addBlock(type, idx);
    },
    [addBlock, hasPhotoBlocks, hasVideoBlock, isMinimalMediaCompose],
  );

  const onMinimalAlbumPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      if (files.length === 0) return;
      if (hasVideoBlock) {
        setToast("Không thể thêm album khi đã có video.");
        return;
      }
      expandMinimalToFullEditor();
      setEditorExpanded(true);
      seedPhotoFiles(files);
    },
    [expandMinimalToFullEditor, hasVideoBlock, seedPhotoFiles],
  );

  const onMinimalVideoPick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (hasVideoBlock) {
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
      hasVideoBlock,
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
    if (!videoUrl || !blockId) return;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, embedUrl: videoUrl } : b,
      ),
    );
  }, [videoUrl]);

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
          const meta = getImgLayoutMeta(layout);
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
      openImageFilePick({ blockId: id, slot, mosaic: true });
    },
    [openImageFilePick],
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

  const mosaicPasteImage = useCallback(
    (id: string, slot: number) => {
      void pasteImageFromClipboard({ blockId: id, slot, mosaic: true });
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
          : "Đang tải ảnh lên — vui lòng đợi hoàn tất.",
      );
      return;
    }

    if (videoUploadError) {
      setToast(videoUploadError);
      return;
    }

    const serverBlocks: ServerBlock[] = toServerBlocks(blocks);

    const hasBodyText = blocks.some(
      (b) => b.t === "body" && Boolean(b.text?.trim()),
    );
    const hasMediaBlock = blocks.some((b) => b.t === "imgs" || b.t === "embed");
    const hasCaption = Boolean(sub.trim());
    if (!hasBodyText && !hasMediaBlock && !coverSeed && !hasCaption) {
      setToast("Thêm nội dung trước khi đăng.");
      return;
    }

    if (congDongCompose && composeFilterSlugs.length === 0) {
      setToast("Chọn loại bài đăng trước khi đăng.");
      return;
    }

    let tieuDeFinal = title.trim();
    if (!tieuDeFinal) {
      const captionLine = sub.trim().split("\n")[0]?.trim();
      const bodyLine = blocks
        .find((b) => b.t === "body")
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
    let publishBlocks: ServerBlock[] = serverBlocks;
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

    startTransition(async () => {
      if (orgBaiDangCompose && isEdit && initial) {
        const result = await updateOrgBaiDangClient({
          orgId: orgBaiDangCompose.orgId,
          baiDangId: initial.tacPhamId,
          tieuDe: tieuDeFinal,
          tomTat: moTaFinal || null,
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
          tomTat: moTaFinal || null,
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
          moTa: moTaFinal,
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
        moTa: moTaFinal,
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
  ]);

  return (
    <div
      className={`cins-editor-page${isOverlay ? " is-overlay" : ""}${usesMinimalFlow && isOverlay ? " is-minimal-compose" : ""}${usesMinimalFlow && editorExpanded ? " is-minimal-compose-expanded" : ""}`}
      ref={editorRef}
    >
      {/* TOPBAR */}
      <header className="ed-topbar">
        <div className="ed-topbar-inner">
          {isOverlay ? (
            <span className="ed-title">
              {isEdit
                ? "Chỉnh sửa bài viết"
                : isMinimalUI
                  ? "Đăng bài mới"
                  : "Trình tạo bài viết"}
            </span>
          ) : (
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
          />
        ) : null}

        {showCoverArea ? (
          <CoverArea
            seed={coverSeed}
            uploadTrack={coverSeed ? imageUploads[coverSeed] : undefined}
            dismissible={usesMinimalFlow && minimalCoverVisible && !coverSeed}
            showEmptyHint={usesMinimalFlow && !coverSeed}
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
            {!(minimalCoverVisible || coverSeed) ? (
              <button
                type="button"
                className="ed-minimal-tool ed-minimal-tool--cover"
                onClick={() => setMinimalCoverVisible(true)}
              >
                <ImagePlus size={18} strokeWidth={1.8} aria-hidden />
                <span className="ed-minimal-tool--cover-label">
                  <span className="ed-minimal-tool--cover-title">
                    Thêm ảnh bìa
                  </span>
                  <span className="ed-minimal-tool--cover-hint">Tuỳ chọn</span>
                </span>
              </button>
            ) : null}
            <div className="ed-minimal-toolbar-actions">
              {!hasPhotoBlocks && !hasVideoBlock ? (
                <button
                  type="button"
                  className="ed-btn ghost ed-minimal-tool"
                  onClick={() => minimalAlbumInputRef.current?.click()}
                >
                  <Images size={15} strokeWidth={2} aria-hidden />
                  Album ảnh
                </button>
              ) : null}
              {!hasPhotoBlocks && !hasVideoBlock ? (
                <button
                  type="button"
                  className="ed-btn ghost ed-minimal-tool"
                  onClick={() => minimalVideoInputRef.current?.click()}
                >
                  <Video size={15} strokeWidth={2} aria-hidden />
                  Thêm video
                </button>
              ) : null}
              {isMinimalUI ? (
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
          className={`blocks${isMinimalMediaCompose ? " is-minimal-media-compose" : ""}`}
        >
          {!isMinimalMediaCompose ? (
            <AddZone
              idx={0}
              open={openAddIdx === 0}
              onToggle={(open) => setOpenAddIdx(open ? 0 : null)}
              onPick={(type) => pickBlockAt(type, 0)}
              starter={blocks.length === 0}
              anchorPicker={isOverlay}
            />
          ) : null}
          {blocks.map((b, i) => (
            <div key={b.id}>
              <BlockRow
                block={b}
                imageUploads={imageUploads}
                selected={selectedId === b.id}
                isMinimalMediaCompose={isMinimalMediaCompose}
                minimalVideoState={
                  isMinimalMediaCompose && b.t === "embed"
                    ? {
                        localPreviewUrl: localVideoPreviewUrl,
                        uploading: videoUploading,
                        error: videoUploadError,
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
                onMosaicPasteImage={(slot) => mosaicPasteImage(b.id, slot)}
                enableAtHash={showFullEditor}
                onAtHashSync={(trigger, textarea) =>
                  handleAtHashSync(b.id, trigger, textarea)
                }
              />
              {!isMinimalMediaCompose || i === blocks.length - 1 ? (
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
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
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
}: {
  seed: string | null;
  uploadTrack?: ImageUploadTrack;
  dismissible?: boolean;
  showEmptyHint?: boolean;
  onSeedChange: (seed: string) => void;
  onUploadResolved: (from: string, to: string) => void;
  onRemove: () => void;
  onUploadFile: (
    file: File,
    onPick: (seed: string) => void,
    onResolved?: (from: string, to: string) => void,
  ) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [picking, setPicking] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const applyFile = useCallback(
    (file: File) => {
      onUploadFile(file, onSeedChange, onUploadResolved);
      setPicking(false);
      setDragOver(false);
      dragDepthRef.current = 0;
    },
    [onSeedChange, onUploadFile, onUploadResolved],
  );

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

  useEffect(() => {
    if (!picking) return;

    function onPaste(e: globalThis.ClipboardEvent) {
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      applyFile(file);
    }

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      setPicking(false);
    }

    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setPicking(false);
    }

    document.addEventListener("paste", onPaste);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [picking, applyFile]);

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

  const pickPanel = (
    <div className="cover-pick-panel">
      <p className="cover-pick-hint">
        Dán ảnh (<kbd>Ctrl+V</kbd>), kéo thả từ máy, hoặc chọn file.
      </p>
      <button
        type="button"
        className="cover-pick-btn"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        <ImagePlus size={16} strokeWidth={1.8} aria-hidden />
        Chọn ảnh
      </button>
      {fileInput}
    </div>
  );

  if (seed) {
    const isUploading = uploadTrack?.status === "uploading";
    return (
      <div
        className={`cover-add has${isUploading ? " is-uploading" : ""}${coverDragClass}`}
        ref={rootRef}
        {...coverDragProps}
      >
        <div className="cover-img-wrap">
          <img
            src={ph(seed, 1600, 640)}
            alt="Ảnh bìa"
            onError={() => {
              if (isTemporaryImageRef(seed)) onRemove();
            }}
          />
          {uploadTrack ? (
            <ImageUploadProgressOverlay
              progress={uploadTrack.progress}
              status={uploadTrack.status}
              error={uploadTrack.error}
            />
          ) : null}
        </div>
        {picking ? (
          <div className="cover-pick-overlay" role="dialog" aria-label="Đổi ảnh bìa">
            {pickPanel}
            <button
              type="button"
              className="cover-pick-cancel"
              onClick={() => setPicking(false)}
            >
              Huỷ
            </button>
          </div>
        ) : (
          <div className="cover-actions">
            <button
              type="button"
              className="cover-act"
              onClick={() => setPicking(true)}
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
        )}
      </div>
    );
  }

  const cancelPick = () => {
    if (dismissible) onRemove();
    else setPicking(false);
  };

  const emptyCoverHint = showEmptyHint ? (
    <p className="cover-add-hint">
      Ảnh bìa giúp hiển thị thẻ nội dung của bạn đẹp hơn, tỉ lệ gợi ý: 5:3
    </p>
  ) : null;

  if (picking) {
    return (
      <div className="cover-add-slot">
        <div
          ref={rootRef}
          className={`cover-add is-picking${coverDragClass}`}
          role="group"
          aria-label="Thêm ảnh bìa"
          {...coverDragProps}
        >
          <span className="ico" aria-hidden>
            <ImagePlus size={22} strokeWidth={1.7} />
          </span>
          {pickPanel}
          <button
            type="button"
            className="cover-pick-cancel-inline"
            onClick={cancelPick}
          >
            Huỷ
          </button>
        </div>
        {dismissible ? (
          <CoverDismissButton onDismiss={onRemove} label="Bỏ ảnh bìa" />
        ) : null}
        {emptyCoverHint}
      </div>
    );
  }

  return (
    <div className="cover-add-slot">
      <button
        type="button"
        className={`cover-add${coverDragClass}`}
        onClick={() => setPicking(true)}
        aria-label="Thêm ảnh bìa"
        {...coverDragProps}
      >
        <span className="ico" aria-hidden>
          <ImagePlus size={22} strokeWidth={1.7} />
        </span>
        <span>{dragOver ? "Thả ảnh vào đây" : "Thêm ảnh bìa"}</span>
      </button>
      {dismissible ? (
        <CoverDismissButton onDismiss={onRemove} label="Bỏ ảnh bìa" />
      ) : null}
      {emptyCoverHint}
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

/* ─── Block dispatch ─────────────────────────────────────────────── */

type BlockRowProps = {
  block: Block;
  imageUploads: Record<string, ImageUploadTrack>;
  selected: boolean;
  isMinimalMediaCompose?: boolean;
  minimalVideoState?: {
    localPreviewUrl: string | null;
    uploading: boolean;
    error: string | null;
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
  onMosaicPasteImage: (slot: number) => void;
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
  error,
}: {
  embedUrl: string;
  localPreviewUrl: string | null;
  uploading: boolean;
  error: string | null;
}) {
  const bunny = embedUrl.trim() ? classifyBunnyVideoUrl(embedUrl) : null;

  if (error) {
    return <p className="ed-minimal-video-error">{error}</p>;
  }

  if (localPreviewUrl) {
    return (
      <div className="ed-minimal-video-preview ed-minimal-video-preview--local">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={localPreviewUrl} controls playsInline />
        {uploading ? (
          <div className="ed-minimal-video-uploading" aria-live="polite">
            <Loader2 size={18} strokeWidth={2} className="ed-spin" aria-hidden />
            <span>Đang tải video lên…</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (bunny) {
    return (
      <div className="ed-minimal-video-preview">
        <iframe
          src={bunnyIframeSrc(bunny)}
          title="Xem trước video"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      </div>
    );
  }

  if (uploading) {
    return (
      <div className="ed-minimal-video-preview ed-minimal-video-preview--pending">
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
          error={p.minimalVideoState.error}
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

function ImageBlock({ block, p }: { block: Block; p: BlockRowProps }) {
  const layout = (block.layout || "full") as ImgLayout;

  if (layout === "mosaic") {
    return <MosaicBlock block={block} p={p} />;
  }

  const need = imgLayoutPreviewSlots(layout, (block.imgs || []).length);
  const imgs = (block.imgs || []).slice(0, need);

  return (
    <div className="b-imgs">
      {!p.isMinimalMediaCompose ? (
        <LayBar block={block} p={p} layout={layout} />
      ) : null}

      <div className={`imgwrap ${layout}${block.rounded ? " rounded" : ""}`}>
        {imgs.map((seed, i) => (
          <div key={`${seed}-${i}`} className="ph">
            <img src={ph(seed, 900, 900)} alt="" />
            {p.imageUploads[seed] ? (
              <ImageUploadProgressOverlay
                progress={p.imageUploads[seed].progress}
                status={p.imageUploads[seed].status}
                error={p.imageUploads[seed].error}
              />
            ) : null}
            <PhImageActions
              onPick={() => p.onPickImage(i)}
              onPaste={() => p.onPasteImage(i)}
            />
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
            {IMG_LAYOUTS.map((l) => (
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
                  <LayoutThumbIcon layout={l.k} />
                </button>
              ))}
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
                      p.onMosaicPasteImage(i);
                    }}
                  >
                    <ClipboardPaste size={20} strokeWidth={1.8} aria-hidden />
                    <span>Dán ảnh</span>
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
                  {p.imageUploads[cell.seed] ? (
                    <ImageUploadProgressOverlay
                      progress={p.imageUploads[cell.seed].progress}
                      status={p.imageUploads[cell.seed].status}
                      error={p.imageUploads[cell.seed].error}
                    />
                  ) : null}
                  <PhImageActions
                    onPick={() => p.onMosaicPickImage(i)}
                    onPaste={() => p.onMosaicPasteImage(i)}
                    pickLabel="Đổi"
                    pasteLabel="Dán"
                  />
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
  enableAtHash = false,
  onAtHashSync,
}: {
  className?: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  maxRows?: number;
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
