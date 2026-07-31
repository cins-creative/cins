import { createClient } from "@/lib/supabase/client";
import { uploadImageToCloudflare } from "@/lib/upload";

export type CreateWorkInput = {
  tieu_de: string;
  mo_ta?: string;
  slug?: string;
  che_do_hien_thi?: "public" | "chi_minh" | "feature";
  loai_tac_pham?: "image" | "video";
  files: File[];
  linhVucIds: string[];
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function createWork(input: CreateWorkInput): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập.");

  const { data: profile, error: profileErr } = await supabase
    .from("user_nguoi_dung")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (profileErr || !profile) {
    throw new Error("Chưa có profile — hoàn tất onboarding trước.");
  }

  if (!input.tieu_de.trim()) throw new Error("Thiếu tiêu đề.");
  if (!input.files.length) throw new Error("Cần ít nhất 1 ảnh.");
  if (!input.linhVucIds.length) throw new Error("Chọn ít nhất 1 lĩnh vực.");
  if (input.linhVucIds.length > 3) throw new Error("Tối đa 3 lĩnh vực.");

  const workSlug = input.slug?.trim() || slugify(input.tieu_de) || `work-${Date.now()}`;

  const { data: work, error: workErr } = await supabase
    .from("content_tac_pham")
    .insert({
      tieu_de: input.tieu_de.trim(),
      mo_ta: input.mo_ta?.trim() || null,
      slug: workSlug,
      loai_tac_pham: input.loai_tac_pham || "image",
      che_do_hien_thi: input.che_do_hien_thi || "public",
      id_nguoi_dung: profile.id,
      noi_dung_blocks: [],
    })
    .select("id")
    .single();

  if (workErr || !work) {
    throw new Error(workErr?.message || "Không tạo được tác phẩm.");
  }

  let coverId: string | null = null;
  for (let i = 0; i < input.files.length; i++) {
    const uploaded = await uploadImageToCloudflare(input.files[i]);
    if (i === 0) coverId = uploaded.cloudflareId;

    const { error: mediaErr } = await supabase.from("content_media").insert({
      id_tac_pham: work.id,
      thu_tu: i,
      loai_media: "image",
      cloudflare_id: uploaded.cloudflareId,
      width: uploaded.width,
      height: uploaded.height,
    });
    if (mediaErr) {
      throw new Error(
        `Tác phẩm đã tạo nhưng media lỗi: ${mediaErr.message}. Sửa trong studio.`,
      );
    }
  }

  if (coverId) {
    await supabase
      .from("content_tac_pham")
      .update({ cover_id: coverId })
      .eq("id", work.id);
  }

  const junction = input.linhVucIds.map((id_linh_vuc, i) => ({
    id_tac_pham: work.id,
    id_linh_vuc,
    la_chinh: i === 0,
  }));
  const { error: lvErr } = await supabase
    .from("content_tac_pham_linh_vuc")
    .insert(junction);
  if (lvErr) {
    throw new Error(`Gắn lĩnh vực lỗi: ${lvErr.message}`);
  }

  return work.id;
}
