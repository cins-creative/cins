import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type { Block as ServerBlock, Visibility as ServerVisibility } from "@/lib/editor/types";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";
import type { ComposeIntent } from "@/lib/journey/compose-types";
import type { OrgBaiDangComposeConfig } from "@/lib/truong/org-bai-dang-compose";

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
