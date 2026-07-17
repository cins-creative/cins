import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block as ServerBlock, Visibility as ServerVisibility } from "@/lib/editor/types";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import { TIER1_EMBED_PLATFORMS } from "@/lib/editor/embed-providers";
import { isLottieAssetEmbedUrl } from "@/lib/editor/lottie-asset-url";
import { isRiveAssetEmbedUrl } from "@/lib/editor/rive-asset-url";
import type { CoverThumbMeta } from "@/lib/journey/cover-thumb";
import type { ComposeIntent } from "@/lib/journey/compose-types";
import type { OrgBaiDangComposeConfig } from "@/lib/truong/org-bai-dang-compose";

const COMPOSE_INTENTS: readonly ComposeIntent[] = [
  "minimal",
  "photo",
  "video",
  "full",
  "embed",
];

const DRAFT_VERSION = 1 as const;

export type ComposeEditorDraft = {
  v: typeof DRAFT_VERSION;
  savedAt: string;
  tieuDe: string;
  moTa: string;
  coverSeed: string | null;
  blocks: ServerBlock[];
  visibility: ServerVisibility;
  tags: ArticleTagRef[];
  composeFilterSlugs?: string[];
  composeLoaiBaiDang?: string;
  composeSchedulePublishAt?: string | null;
  editorExpanded?: boolean;
  minimalCoverVisible?: boolean;
  albumGridCompose?: boolean;
  minimalRichBlocks?: boolean;
  /** Hiện `cover_id` trên card Journey + thân bài khi xem (opt-in). */
  showCoverInPost?: boolean;
  /** Tỉ lệ + điểm neo khung thumbnail (Gallery / bài dài). */
  coverThumb?: CoverThumbMeta | null;
};

export function buildComposeEditorDraftKey(input: {
  ownerSlug: string;
  composeIntent: ComposeIntent;
  congDongCompose?: CongDongComposeConfig;
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
}): string {
  if (input.congDongCompose?.orgId) {
    return `cins-compose-editor:${input.ownerSlug}:cong-dong:${input.congDongCompose.orgId}:${input.composeIntent}`;
  }
  if (input.orgBaiDangCompose?.orgId) {
    return `cins-compose-editor:${input.ownerSlug}:org:${input.orgBaiDangCompose.orgId}:${input.composeIntent}`;
  }
  return `cins-compose-editor:${input.ownerSlug}:journey:${input.composeIntent}`;
}

function isComposeEditorDraft(value: unknown): value is ComposeEditorDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as ComposeEditorDraft;
  return (
    draft.v === DRAFT_VERSION &&
    typeof draft.savedAt === "string" &&
    typeof draft.tieuDe === "string" &&
    typeof draft.moTa === "string" &&
    Array.isArray(draft.blocks)
  );
}

export function readComposeEditorDraft(key: string): ComposeEditorDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isComposeEditorDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeComposeEditorDraft(
  key: string,
  draft: Omit<ComposeEditorDraft, "v" | "savedAt">,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ComposeEditorDraft = {
      v: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      ...draft,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearComposeEditorDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Xóa toàn bộ nháp compose của owner (minimal/full/embed + :file|:url + legacy)
 * sau khi đăng thành công — tránh mở lại trình soạn còn bài cũ.
 */
export function clearComposeSessionDrafts(input: {
  ownerSlug: string;
  congDongCompose?: CongDongComposeConfig;
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
}): void {
  if (typeof window === "undefined") return;
  const ownerSlug = input.ownerSlug.trim();
  if (!ownerSlug) return;

  for (const intent of COMPOSE_INTENTS) {
    const base = buildComposeEditorDraftKey({
      ownerSlug,
      composeIntent: intent,
      congDongCompose: input.congDongCompose,
      orgBaiDangCompose: input.orgBaiDangCompose,
    });
    clearComposeEditorDraft(base);
    if (intent !== "embed") continue;
    for (const platform of TIER1_EMBED_PLATFORMS) {
      clearComposeEditorDraft(`${base}:${platform.id}`);
      clearComposeEditorDraft(`${base}:${platform.id}:file`);
      clearComposeEditorDraft(`${base}:${platform.id}:url`);
    }
  }
}

/** Key nháp compose embed — đồng bộ EditorView (`…:platform:file|url`). */
export function buildComposeEmbedDraftKey(input: {
  ownerSlug: string;
  platform: string;
  source: "file" | "url";
  congDongCompose?: CongDongComposeConfig;
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
}): string {
  const base = buildComposeEditorDraftKey({
    ownerSlug: input.ownerSlug,
    composeIntent: "embed",
    congDongCompose: input.congDongCompose,
    orgBaiDangCompose: input.orgBaiDangCompose,
  });
  return `${base}:${input.platform}:${input.source}`;
}

export function getComposeDraftEmbedUrl(
  draft: ComposeEditorDraft | null | undefined,
): string | null {
  if (!draft?.blocks?.length) return null;
  for (const block of draft.blocks) {
    if (block.loai !== "embed") continue;
    const url = block.config?.url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

/** Nháp có nội dung đáng khôi phục (chữ / media / tag…). */
export function composeDraftHasRestorableContent(
  draft: ComposeEditorDraft | null | undefined,
): boolean {
  if (!draft) return false;
  if (draft.tieuDe.trim() || draft.moTa.trim()) return true;
  if (draft.coverSeed?.trim()) return true;
  if (draft.tags.length > 0) return true;
  if (draft.blocks.length > 0) return true;
  return false;
}

export function composeDraftHasRiveFileAsset(
  draft: ComposeEditorDraft | null | undefined,
): boolean {
  return isRiveAssetEmbedUrl(getComposeDraftEmbedUrl(draft) ?? undefined);
}

export function composeDraftHasLottieFileAsset(
  draft: ComposeEditorDraft | null | undefined,
): boolean {
  return isLottieAssetEmbedUrl(getComposeDraftEmbedUrl(draft) ?? undefined);
}

export function readComposeEmbedFileDraft(input: {
  ownerSlug: string;
  platform: "rive" | "lottie";
  congDongCompose?: CongDongComposeConfig;
  orgBaiDangCompose?: OrgBaiDangComposeConfig;
}): ComposeEditorDraft | null {
  const key = buildComposeEmbedDraftKey({
    ownerSlug: input.ownerSlug,
    platform: input.platform,
    source: "file",
    congDongCompose: input.congDongCompose,
    orgBaiDangCompose: input.orgBaiDangCompose,
  });
  const current = readComposeEditorDraft(key);
  if (current && composeDraftHasRestorableContent(current)) return current;
  const base = buildComposeEditorDraftKey({
    ownerSlug: input.ownerSlug,
    composeIntent: "embed",
    congDongCompose: input.congDongCompose,
    orgBaiDangCompose: input.orgBaiDangCompose,
  });
  const legacy = readComposeEditorDraft(`${base}:${input.platform}`);
  if (legacy && composeDraftHasRestorableContent(legacy)) return legacy;
  return null;
}
