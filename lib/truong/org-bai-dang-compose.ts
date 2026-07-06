import type { Block } from "@/lib/editor/types";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import {
  DEFAULT_ARTICLE_POST_TITLE,
  deriveMediaPostTitle,
  detectMediaPostKind,
  extractBodyCaption,
} from "@/lib/journey/post-media";
import type { BaiDangLoai } from "@/lib/truong/bai-dang";
import { validateOrgBaiDangContent } from "@/lib/truong/bai-dang-blocks";
import type { OrgBaiDangLoaiOption } from "@/lib/truong/org-bai-dang-loai-options";
import { mapOrgBaiDangApiRow } from "@/lib/truong/bai-dang-api-fields";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";
import {
  readTruongInlineError,
  truongInlineFetch,
} from "@/lib/truong/inline-api";
import type { TruongBaiDang } from "@/lib/truong/types";
import { isFutureOrgBaiDangSchedule } from "@/lib/truong/org-bai-dang-schedule";

/** Compose bài đăng trường — dùng overlay Journey, publish vào `org_bai_dang`. */
export type OrgBaiDangComposeConfig = {
  orgId: string;
  onPostPublished?: (post: TruongBaiDang) => void;
  onPostUpdated?: (post: TruongBaiDang) => void;
  /**
   * Ép `loai_bai_dang` cố định cho mọi bài tạo/sửa trong context này (vd. tab
   * Showcase studio luôn publish loại `showcase`). Khi set, ẩn dropdown chọn loại.
   */
  forceLoaiBaiDang?: string;
  /** Danh sách loại bài đăng cho dropdown — mặc định 5 loại trường/cơ sở. */
  loaiOptions?: OrgBaiDangLoaiOption[];
  /** Loại mặc định khi soạn bài mới (vd. studio → `khac` = "Bài đăng"). */
  defaultLoaiBaiDang?: string;
};

export type PublishOrgBaiDangInput = {
  orgId: string;
  tieuDe: string;
  tomTat?: string | null;
  coverId?: string | null;
  blocks: Block[];
  /** `BaiDangLoai` chuẩn, hoặc loại đặc thù (vd. `showcase`). */
  loaiBaiDang?: BaiDangLoai | string;
  /** ISO — nếu trong tương lai: lưu `nhap` + `tao_luc`, chỉ hiện feed khi đến giờ. */
  schedulePublishAt?: string | null;
};

export type PublishOrgBaiDangResult =
  | { ok: true; post: TruongBaiDang }
  | { ok: false; error: string };

export function defaultLoaiBaiDangFromBlocks(
  blocks: ReadonlyArray<Block>,
): BaiDangLoai {
  const kind = milestoneCardContentKind(blocks);
  if (kind === "photo" || kind === "video") return "su_kien";
  return "thong_bao";
}

function resolveLoaiBaiDang(input: PublishOrgBaiDangInput): string {
  return input.loaiBaiDang ?? defaultLoaiBaiDangFromBlocks(input.blocks);
}

function resolveTrangThaiPayload(input: PublishOrgBaiDangInput): {
  trang_thai: "da_dang" | "nhap";
  tao_luc?: string;
} {
  const at = input.schedulePublishAt?.trim();
  if (at && isFutureOrgBaiDangSchedule(at)) {
    return {
      trang_thai: "nhap",
      tao_luc: new Date(at).toISOString(),
    };
  }
  return { trang_thai: "da_dang" };
}

function deriveTieuDeFallback(blocks: ReadonlyArray<Block>): string {
  const kind = detectMediaPostKind(blocks);
  if (kind === "photo" || kind === "video") {
    return deriveMediaPostTitle(extractBodyCaption(blocks), kind);
  }
  return DEFAULT_ARTICLE_POST_TITLE;
}

export async function updateOrgBaiDangClient(
  input: PublishOrgBaiDangInput & { baiDangId: string },
): Promise<PublishOrgBaiDangResult> {
  const tieu_de =
    input.tieuDe.trim() || deriveTieuDeFallback(input.blocks);
  if (!input.blocks.length) {
    return { ok: false, error: "Bài đăng chưa có nội dung." };
  }

  const contentCheck = validateOrgBaiDangContent({
    tomTat: input.tomTat,
    coverId: input.coverId,
    blocks: input.blocks,
  });
  if (!contentCheck.ok) {
    return { ok: false, error: contentCheck.error };
  }
  const tom_tat = contentCheck.resolution.effectiveMoTa;

  const res = await truongInlineFetch(
    input.orgId,
    `/bai-dang/${encodeURIComponent(input.baiDangId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        tieu_de,
        tom_tat,
        noi_dung_blocks: input.blocks,
        cover_id: input.coverId?.trim() || null,
        loai_bai_dang: resolveLoaiBaiDang(input),
        ...resolveTrangThaiPayload(input),
      }),
    },
  );

  if (!res.ok) {
    return { ok: false, error: await readTruongInlineError(res) };
  }

  const json = (await res.json()) as { post: Parameters<typeof mapOrgBaiDangApiRow>[0] };
  const post = mapOrgBaiDangApiRow(json.post);
  return {
    ok: true,
    post: { ...post, cover_src: baiDangCoverDisplayUrl(post) },
  };
}

export async function publishOrgBaiDangClient(
  input: PublishOrgBaiDangInput,
): Promise<PublishOrgBaiDangResult> {
  const tieu_de =
    input.tieuDe.trim() || deriveTieuDeFallback(input.blocks);
  if (!input.blocks.length) {
    return { ok: false, error: "Bài đăng chưa có nội dung." };
  }

  const contentCheck = validateOrgBaiDangContent({
    tomTat: input.tomTat,
    coverId: input.coverId,
    blocks: input.blocks,
  });
  if (!contentCheck.ok) {
    return { ok: false, error: contentCheck.error };
  }
  const tom_tat = contentCheck.resolution.effectiveMoTa;

  const statusPayload = resolveTrangThaiPayload(input);
  const res = await truongInlineFetch(input.orgId, "/bai-dang", {
    method: "POST",
    body: JSON.stringify({
      tieu_de,
      tom_tat,
      noi_dung_blocks: input.blocks,
      cover_id: input.coverId?.trim() || null,
      loai_bai_dang: resolveLoaiBaiDang(input),
      trang_thai: statusPayload.trang_thai,
      ...(statusPayload.tao_luc ? { tao_luc: statusPayload.tao_luc } : {}),
    }),
  });

  if (!res.ok) {
    return { ok: false, error: await readTruongInlineError(res) };
  }

  const json = (await res.json()) as { post: Parameters<typeof mapOrgBaiDangApiRow>[0] };
  const post = mapOrgBaiDangApiRow(json.post);
  return {
    ok: true,
    post: { ...post, cover_src: baiDangCoverDisplayUrl(post) },
  };
}
