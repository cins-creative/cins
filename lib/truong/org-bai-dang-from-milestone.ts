import type { Block } from "@/lib/editor/types";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import type {
  CoAuthorCredit,
  MilestoneOrgBaiDangRef,
} from "@/components/journey/milestone-types";
import { extractCfImageIdFromDeliveryUrl } from "@/lib/cloudflare/image-id-from-url";
import type { TruongBaiDang, TruongListItem, TruongOrgLoai } from "@/lib/truong/types";

export type OrgBaiDangOverlayOrgKind = NonNullable<
  MilestoneOrgBaiDangRef["orgKind"]
>;

export type OrgBaiDangOverlayOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug" | "org_loai"
> & {
  /** JourneyOrgPopover — giữ cong_dong / studio từ feed. */
  orgKind?: OrgBaiDangOverlayOrgKind | null;
};

type StubInput = {
  orgBaiDangRef: MilestoneOrgBaiDangRef;
  title: string;
  body?: string | null;
  noiDungBlocks?: ReadonlyArray<Block> | null;
  createdAt?: string | null;
  /** Cloudflare Images id nếu đã biết. */
  coverId?: string | null;
  /** URL cover — suy ra id khi thiếu `coverId`. */
  coverSrc?: string | null;
  /** URL avatar org đã resolve trên feed (attribution / lens). */
  orgAvatarSrc?: string | null;
  /** Cloudflare Images id avatar/logo nếu có. */
  orgAvatarId?: string | null;
  orgLogoId?: string | null;
  loaiBaiDang?: string | null;
  articleTags?: readonly ArticleTagRef[];
  tags?: ReadonlyArray<{ label: string; slug: string }>;
  coAuthorCredits?: readonly CoAuthorCredit[];
  commentCount?: number;
};

function orgKindToOrgLoai(
  kind: MilestoneOrgBaiDangRef["orgKind"],
): TruongOrgLoai | undefined {
  if (kind === "co_so_dao_tao") return "co_so_dao_tao";
  if (kind === "truong") return "truong_dai_hoc";
  return undefined;
}

/** Stub `TruongBaiDang` + owner từ data đã hydrate trên Journey/World card. */
export function orgBaiDangStubFromMilestoneCard(input: StubInput): {
  post: TruongBaiDang;
  owner: OrgBaiDangOverlayOwner;
} {
  const ref = input.orgBaiDangRef;
  const coverFromSrc = input.coverSrc?.trim()
    ? extractCfImageIdFromDeliveryUrl(input.coverSrc.trim())
    : null;
  const coverId = input.coverId?.trim() || coverFromSrc || null;

  const post: TruongBaiDang = {
    id: ref.postId,
    loai_bai_dang: input.loaiBaiDang ?? null,
    tieu_de: input.title,
    tom_tat: input.body?.trim() || null,
    noi_dung: null,
    noiDungBlocks: input.noiDungBlocks ? [...input.noiDungBlocks] : null,
    cover_id: coverId,
    cover_src: input.coverSrc?.trim() || null,
    tao_luc: input.createdAt ?? null,
    tags: input.tags ? [...input.tags] : [],
    articleTags: input.articleTags ? [...input.articleTags] : undefined,
    coAuthorCredits: input.coAuthorCredits
      ? [...input.coAuthorCredits]
      : undefined,
    commentCount: input.commentCount,
  };

  const owner: OrgBaiDangOverlayOwner = {
    slug: ref.orgSlug,
    ten: ref.orgName,
    avatar_id: input.orgAvatarId?.trim() || null,
    logo_id: input.orgLogoId?.trim() || null,
    avatar_src: input.orgAvatarSrc?.trim() || null,
    org_loai: orgKindToOrgLoai(ref.orgKind),
    orgKind: ref.orgKind ?? null,
  };

  return { post, owner };
}
