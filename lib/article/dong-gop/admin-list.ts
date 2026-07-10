import "server-only";

import { articlePublicHref } from "@/lib/articles/article-href";

import { fetchDongGopListForAdmin } from "./fetch";
import type { AdminDongGopRow, ArticleDongGopAdminItem } from "./types";

function mapAdminRow(item: ArticleDongGopAdminItem): AdminDongGopRow | null {
  const entity = item.bai_viet;
  if (!entity?.slug || !entity.tieu_de) return null;

  const loai = String(entity.loai_bai_viet);
  const contributor = item.nguoi_dong_gop;

  return {
    id: item.id,
    idBaiViet: item.id_bai_viet,
    trangThai: item.trang_thai,
    noiDung: item.noi_dung,
    ghiChuDuyet: item.ghi_chu_duyet,
    taoLuc: item.tao_luc,
    capNhatLuc: item.cap_nhat_luc,
    duyetLuc: item.duyet_luc,
    entity: {
      slug: entity.slug,
      tieuDe: entity.tieu_de,
      loaiBaiViet: loai,
      noiDungChinh: entity.noi_dung ?? null,
      href: articlePublicHref(loai, entity.slug),
    },
    contributor: contributor
      ? {
          id: contributor.id,
          slug: contributor.slug,
          tenHienThi: contributor.ten_hien_thi,
        }
      : null,
  };
}

export async function listDongGopForAdmin(): Promise<AdminDongGopRow[]> {
  const items = await fetchDongGopListForAdmin({ limit: 200 });
  return items.map(mapAdminRow).filter((r): r is AdminDongGopRow => r != null);
}
