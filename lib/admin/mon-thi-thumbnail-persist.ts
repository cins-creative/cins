import { getCoverUrl } from "@/lib/articles/cover";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import type { CloudflareUploadResult } from "@/lib/cloudflare/upload-image";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function persistMonThiCloudflareThumbnail(
  monThiId: string,
  uploaded: CloudflareUploadResult,
): Promise<
  | { ok: true; thumbnail_id: string; thumbnail_url: string }
  | { ok: false; message: string }
> {
  const id = monThiId.trim();
  if (!id) return { ok: false, message: "Thiếu id môn thi." };

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("edu_mon_thi")
      .update({ thumbnail_id: uploaded.imageId })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, message: error.message };
    if (!data) {
      return {
        ok: false,
        message: "Không tìm thấy môn thi để cập nhật (id không khớp).",
      };
    }

    rememberCfAccountHashFromDeliveryUrl(uploaded.url);
    const thumbnail_url =
      uploaded.url || getCoverUrl(uploaded.imageId, "public") || "";

    return {
      ok: true,
      thumbnail_id: uploaded.imageId,
      thumbnail_url,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}
