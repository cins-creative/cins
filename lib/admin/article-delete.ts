import { createServiceRoleClient, hasServiceRoleEnv } from "@/lib/supabase/service-role";

export type ArticleDeleteUsage = {
  ganNhom: number;
  ganTacPham: number;
  ganCotMoc: number;
  ganDuAn: number;
  lienQuan: number;
  monThi: number;
  truongNganh: number;
  userToChuc: number;
  userLinhVuc: number;
};

async function countEq(
  supabase: ReturnType<typeof createServiceRoleClient>,
  table: string,
  column: string,
  id: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, id);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countArticleDeleteUsage(
  articleId: string,
): Promise<
  { ok: true; usage: ArticleDeleteUsage } | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const id = articleId.trim();
  if (!id) return { ok: false, message: "Thiếu id bài viết." };

  try {
    const supabase = createServiceRoleClient();
    const [ganNhom, ganTacPham, ganCotMoc, ganDuAn, lienA, lienB, monThi, truongNganh, userToChuc, userLinhVuc] =
      await Promise.all([
        countEq(supabase, "article_gan_nhom", "id_bai_viet", id),
        countEq(supabase, "article_gan_tac_pham", "id_bai_viet", id),
        countEq(supabase, "article_gan_cot_moc", "id_bai_viet", id),
        countEq(supabase, "article_gan_du_an", "id_bai_viet", id),
        countEq(supabase, "article_lien_quan", "id_bai_viet_a", id),
        countEq(supabase, "article_lien_quan", "id_bai_viet_b", id),
        countEq(supabase, "edu_mon_thi", "id_bai_viet", id),
        countEq(supabase, "org_truong_nganh", "id_nganh", id),
        countEq(supabase, "user_thanh_vien_to_chuc", "id_nganh", id),
        countEq(supabase, "user_linh_vuc", "id_bai_viet", id),
      ]);

    return {
      ok: true,
      usage: {
        ganNhom,
        ganTacPham,
        ganCotMoc,
        ganDuAn,
        lienQuan: lienA + lienB,
        monThi,
        truongNganh,
        userToChuc,
        userLinhVuc,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

function unlinkSummary(usage: ArticleDeleteUsage): string {
  const parts: string[] = [];
  const j =
    usage.ganNhom +
    usage.ganTacPham +
    usage.ganCotMoc +
    usage.ganDuAn +
    usage.lienQuan;
  if (j > 0) parts.push(`${j} liên kết nội dung (nhóm/tác phẩm/mốc/dự án/graph)`);
  if (usage.monThi > 0) {
    parts.push(`${usage.monThi} môn thi (gỡ id_bai_viet)`);
  }
  if (usage.userLinhVuc > 0) parts.push(`${usage.userLinhVuc} user_linh_vuc`);
  return parts.length ? `\n\nSẽ gỡ: ${parts.join("; ")}.` : "";
}

export async function deleteArticleForAdmin(
  articleId: string,
): Promise<
  | { ok: true; usage: ArticleDeleteUsage }
  | { ok: false; message: string }
> {
  if (!hasServiceRoleEnv()) {
    return { ok: false, message: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." };
  }
  const id = articleId.trim();
  if (!id) return { ok: false, message: "Thiếu id bài viết." };

  const counted = await countArticleDeleteUsage(id);
  if (!counted.ok) return counted;
  const usage = counted.usage;

  if (usage.truongNganh > 0) {
    return {
      ok: false,
      message: `Không xóa được: bài đang là ngành của ${usage.truongNganh} chương trình trường (org_truong_nganh). Gỡ liên kết trường trước.`,
    };
  }
  if (usage.userToChuc > 0) {
    return {
      ok: false,
      message: `Không xóa được: ${usage.userToChuc} thành viên tổ chức tham chiếu id_nganh = bài này.`,
    };
  }

  try {
    const supabase = createServiceRoleClient();

    const unlinkTables: { table: string; column: string }[] = [
      { table: "article_gan_nhom", column: "id_bai_viet" },
      { table: "article_gan_tac_pham", column: "id_bai_viet" },
      { table: "article_gan_cot_moc", column: "id_bai_viet" },
      { table: "article_gan_du_an", column: "id_bai_viet" },
    ];
    for (const { table, column } of unlinkTables) {
      const { error } = await supabase.from(table).delete().eq(column, id);
      if (error) {
        return { ok: false, message: `Không gỡ ${table}: ${error.message}` };
      }
    }

    for (const col of ["id_bai_viet_a", "id_bai_viet_b"] as const) {
      const { error } = await supabase
        .from("article_lien_quan")
        .delete()
        .eq(col, id);
      if (error) {
        return { ok: false, message: `Không gỡ article_lien_quan: ${error.message}` };
      }
    }

    if (usage.userLinhVuc > 0) {
      const { error } = await supabase
        .from("user_linh_vuc")
        .delete()
        .eq("id_bai_viet", id);
      if (error) {
        return { ok: false, message: `Không gỡ user_linh_vuc: ${error.message}` };
      }
    }

    if (usage.monThi > 0) {
      const { error } = await supabase
        .from("edu_mon_thi")
        .update({ id_bai_viet: null })
        .eq("id_bai_viet", id);
      if (error) {
        return { ok: false, message: `Không gỡ edu_mon_thi.id_bai_viet: ${error.message}` };
      }
    }

    const { data, error } = await supabase
      .from("article_bai_viet")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      const msg = error.message;
      if (/foreign key|violates|23503/i.test(msg)) {
        return {
          ok: false,
          message:
            "Không xóa được: bài vẫn được tham chiếu ở bảng khác. Chi tiết: " + msg,
        };
      }
      return { ok: false, message: msg };
    }

    if (!data?.length) {
      return {
        ok: false,
        message: "Không tìm thấy bài viết (id không tồn tại hoặc đã bị xóa).",
      };
    }

    return { ok: true, usage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định.";
    return { ok: false, message: msg };
  }
}

export function formatArticleDeleteConfirmHint(usage: ArticleDeleteUsage): string {
  return unlinkSummary(usage);
}

export type ArticleDeleteWarningEffect = "unlink" | "block" | "none";

export type ArticleDeleteWarningRow = {
  id: string;
  label: string;
  table: string;
  count: number;
  effect: ArticleDeleteWarningEffect;
  note: string;
};

export function isArticleDeleteBlocked(usage: ArticleDeleteUsage): boolean {
  return usage.truongNganh > 0 || usage.userToChuc > 0;
}

/** Hàng bảng cảnh báo trước khi xóa bài viết. */
export function buildArticleDeleteWarningRows(
  usage: ArticleDeleteUsage,
): ArticleDeleteWarningRow[] {
  return [
    {
      id: "truongNganh",
      label: "Chương trình ngành tại trường",
      table: "org_truong_nganh.id_nganh",
      count: usage.truongNganh,
      effect: "block",
      note: "Phải gỡ liên kết trường trước",
    },
    {
      id: "userToChuc",
      label: "Thành viên tổ chức (ngành)",
      table: "user_thanh_vien_to_chuc.id_nganh",
      count: usage.userToChuc,
      effect: "block",
      note: "Phải gỡ tham chiếu trước",
    },
    {
      id: "ganNhom",
      label: "Nhóm phân loại",
      table: "article_gan_nhom",
      count: usage.ganNhom,
      effect: "unlink",
      note: "Tự gỡ khi xóa",
    },
    {
      id: "ganTacPham",
      label: "Tác phẩm gắn tag",
      table: "article_gan_tac_pham",
      count: usage.ganTacPham,
      effect: "unlink",
      note: "Tự gỡ khi xóa",
    },
    {
      id: "ganCotMoc",
      label: "Cột mốc gắn tag",
      table: "article_gan_cot_moc",
      count: usage.ganCotMoc,
      effect: "unlink",
      note: "Tự gỡ khi xóa",
    },
    {
      id: "ganDuAn",
      label: "Dự án gắn tag",
      table: "article_gan_du_an",
      count: usage.ganDuAn,
      effect: "unlink",
      note: "Tự gỡ khi xóa",
    },
    {
      id: "lienQuan",
      label: "Bài liên quan (graph)",
      table: "article_lien_quan",
      count: usage.lienQuan,
      effect: "unlink",
      note: "Tự gỡ khi xóa",
    },
    {
      id: "monThi",
      label: "Môn thi (catalog)",
      table: "edu_mon_thi.id_bai_viet",
      count: usage.monThi,
      effect: "unlink",
      note: "Gỡ link, giữ môn",
    },
    {
      id: "userLinhVuc",
      label: "User ↔ lĩnh vực",
      table: "user_linh_vuc",
      count: usage.userLinhVuc,
      effect: "unlink",
      note: "Tự gỡ khi xóa",
    },
    {
      id: "baiViet",
      label: "Bản ghi bài viết",
      table: "article_bai_viet",
      count: 1,
      effect: "none",
      note: "Xóa vĩnh viễn",
    },
  ];
}
