import type { Block } from "@/lib/editor/types";
import { milestoneCardContentKind } from "@/lib/journey/milestone-card-kind";
import { mapOrgBaiDangApiRow } from "@/lib/truong/bai-dang-api-fields";
import { baiDangCoverDisplayUrl } from "@/lib/truong/bai-dang-cover";
import {
  readTruongInlineError,
  truongInlineFetch,
} from "@/lib/truong/inline-api";
import type { TruongBaiDang } from "@/lib/truong/types";

/** Compose bài đăng trường — dùng overlay Journey, publish vào `org_bai_dang`. */
export type OrgBaiDangComposeConfig = {
  orgId: string;
  onPostPublished?: (post: TruongBaiDang) => void;
};

export type PublishOrgBaiDangInput = {
  orgId: string;
  tieuDe: string;
  tomTat?: string | null;
  coverId?: string | null;
  blocks: Block[];
};

export type PublishOrgBaiDangResult =
  | { ok: true; post: TruongBaiDang }
  | { ok: false; error: string };

function defaultLoaiFromBlocks(blocks: ReadonlyArray<Block>): string {
  const kind = milestoneCardContentKind(blocks);
  if (kind === "photo" || kind === "video") return "su_kien";
  return "thong_bao";
}

export async function publishOrgBaiDangClient(
  input: PublishOrgBaiDangInput,
): Promise<PublishOrgBaiDangResult> {
  const tieu_de = input.tieuDe.trim();
  if (!tieu_de) {
    return { ok: false, error: "Cần nhập tiêu đề." };
  }
  if (!input.blocks.length) {
    return { ok: false, error: "Bài đăng chưa có nội dung." };
  }

  const res = await truongInlineFetch(input.orgId, "/bai-dang", {
    method: "POST",
    body: JSON.stringify({
      tieu_de,
      tom_tat: input.tomTat?.trim() || null,
      noi_dung_blocks: input.blocks,
      cover_id: input.coverId?.trim() || null,
      loai_bai_dang: defaultLoaiFromBlocks(input.blocks),
      trang_thai: "da_dang",
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
