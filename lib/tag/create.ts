import "server-only";

import { findExactAlias } from "@/lib/tag/dedup";
import { enqueueTagTomTat } from "@/lib/tag/gen-tom-tat";
import { uniqueTagArticleSlug } from "@/lib/tag/slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CreatableTagLoai } from "@/lib/tag/tag-loai";

export type CreateTagInput = {
  ten: string;
  loai: CreatableTagLoai;
};

export type CreateTagResult = {
  id: string;
  da_ton_tai: boolean;
};

const MAX_TAG_LEN = 120;

function validateTagInput(input: CreateTagInput): string | null {
  const ten = input.ten?.trim() ?? "";
  if (!ten) return "Tên tag không được để trống.";
  if (ten.length > MAX_TAG_LEN) {
    return `Tên tag tối đa ${MAX_TAG_LEN} ký tự.`;
  }
  if (
    input.loai !== "keyword" &&
    input.loai !== "phan_mem" &&
    input.loai !== "mon_hoc" &&
    input.loai !== "nghe"
  ) {
    return "loai chỉ được keyword, phan_mem, mon_hoc hoặc nghe.";
  }
  return null;
}

/**
 * Tạo tag keyword/phan_mem/mon_hoc/nghe — không qua article_de_xuat.
 * Dedup exact trước; AI gen tom_tat async sau khi INSERT.
 */
export async function createTag(
  input: CreateTagInput,
): Promise<CreateTagResult | { error: string }> {
  const validationError = validateTagInput(input);
  if (validationError) return { error: validationError };

  const ten = input.ten.trim();
  const existing = await findExactAlias(ten);
  if (existing) {
    return { id: existing.id, da_ton_tai: true };
  }

  const admin = createServiceRoleClient();
  const slug = await uniqueTagArticleSlug(ten);
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("article_bai_viet")
    .insert({
      tieu_de: ten,
      slug,
      loai_bai_viet: input.loai,
      da_verify: false,
      noi_dung: null,
      tom_tat: null,
      trang_thai_noi_dung: "published",
      tao_luc: now,
      cap_nhat_luc: now,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    console.error("[tag/create] INSERT article_bai_viet:", error?.message);
    return { error: "Không tạo được tag." };
  }

  enqueueTagTomTat({
    tagId: data.id,
    ten,
    loai: input.loai,
  });

  return { id: data.id, da_ton_tai: false };
}
