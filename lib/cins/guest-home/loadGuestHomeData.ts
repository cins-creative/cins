import "server-only";

import { getCoverUrl } from "@/lib/articles/cover";
import {
  fetchRecentTacPhamGallery,
  listNgheArticlesForHub,
} from "@/lib/articles/queries";
import { listBlogHub } from "@/lib/bai-viet/queries";
import { mapNgheArticlesToHubItems } from "@/lib/career/articleMappers";
import { listLinhVucForHub } from "@/lib/career/queries";
import type { NgheNghiepHubItem } from "@/lib/career/types";
import { loadUpcomingEventsForHome } from "@/lib/cong-dong/events";
import { congDongBannerImageUrl } from "@/lib/cong-dong/images";
import type { CongDongEvent } from "@/lib/cong-dong/types";
import { loadKhoaHocGoiY, type KhoaHocGoiYItem } from "@/lib/cins/home-adaptive/fetches";
import { listNganhArticlesForHub } from "@/lib/nganh/queries";
import type { NganhHubItem } from "@/lib/nganh/types";
import { listCoSoDaoTaoForListing } from "@/lib/to-chuc/listing-queries";
import { listTruongDaiHoc } from "@/lib/truong/queries";
import type { TruongListItem } from "@/lib/truong/types";

export type GuestHomeStats = {
  nghe: number;
  nganh: number;
  truong: number;
  coSo: number;
  linhVuc: number;
};

export type GuestHomeWork = {
  id: string;
  title: string;
  coverSrc: string | null;
  authorSlug: string | null;
  authorName: string | null;
  loai: string | null;
};

export type GuestHomeEvent = CongDongEvent & {
  coverSrc: string | null;
};

export type GuestHomeBlog = {
  slug: string;
  title: string;
  summary: string | null;
  thumbSrc: string | null;
  loai: string;
};

export type GuestHomeLinhVuc = {
  slug: string;
  ten: string;
  nhom: string | null;
  accent: string | null;
};

export type GuestHomeData = {
  stats: GuestHomeStats;
  linhVucs: GuestHomeLinhVuc[];
  careers: NgheNghiepHubItem[];
  majors: NganhHubItem[];
  schools: TruongListItem[];
  coSo: TruongListItem[];
  courses: KhoaHocGoiYItem[];
  events: GuestHomeEvent[];
  works: GuestHomeWork[];
  blog: GuestHomeBlog[];
};

function pickSchools(items: TruongListItem[], limit: number): TruongListItem[] {
  return [...items]
    .sort((a, b) => b.nganhCount - a.nganhCount || a.ten.localeCompare(b.ten, "vi"))
    .slice(0, limit);
}

function pickCoSo(items: TruongListItem[], limit: number): TruongListItem[] {
  return [...items]
    .sort(
      (a, b) =>
        (b.khoaHocCount ?? 0) - (a.khoaHocCount ?? 0) ||
        a.ten.localeCompare(b.ten, "vi"),
    )
    .slice(0, limit);
}

export async function loadGuestHomeData(): Promise<GuestHomeData> {
  const [
    truong,
    coSoAll,
    ngheResult,
    nganhResult,
    linhVucsRaw,
    eventsRaw,
    courses,
    worksRaw,
    blogResult,
  ] = await Promise.all([
    listTruongDaiHoc(),
    listCoSoDaoTaoForListing(),
    listNgheArticlesForHub({ limit: 500 }),
    listNganhArticlesForHub({ limit: 500 }),
    listLinhVucForHub(),
    loadUpcomingEventsForHome([], 6),
    loadKhoaHocGoiY(6),
    fetchRecentTacPhamGallery(8),
    listBlogHub({ limit: 4 }),
  ]);

  const ngheRows = ngheResult.ok ? ngheResult.items : [];
  const nganhRows = nganhResult.ok ? nganhResult.items : [];
  const careers = mapNgheArticlesToHubItems(ngheRows).slice(0, 8);
  const majors = nganhRows.slice(0, 6);

  const linhVucs: GuestHomeLinhVuc[] = linhVucsRaw
    .filter((lv) => lv.slug?.trim())
    .map((lv) => ({
      slug: lv.slug!.trim(),
      ten: lv.ten_vi?.trim() || lv.slug!.trim(),
      nhom: lv.nhom_vi?.trim() || null,
      accent: lv.mau_accent?.trim() || null,
    }));

  const events: GuestHomeEvent[] = eventsRaw.map((ev) => ({
    ...ev,
    coverSrc: congDongBannerImageUrl(ev.coverId),
  }));

  const works: GuestHomeWork[] = worksRaw.map((w) => ({
    id: w.id,
    title: w.tieu_de?.trim() || "Tác phẩm",
    coverSrc: getCoverUrl(w.cover_id, "public"),
    authorSlug: w.author_slug ?? null,
    authorName: w.author_name ?? null,
    loai: w.loai_tac_pham ?? null,
  }));

  const blog: GuestHomeBlog[] = blogResult.ok
    ? blogResult.items.map((row) => ({
        slug: row.slug,
        title: row.tieu_de_eng?.trim() || row.tieu_de,
        summary: row.tom_tat,
        thumbSrc: row.thumb_url ?? row.cover_url,
        loai: row.loai_bai_viet,
      }))
    : [];

  return {
    stats: {
      nghe: ngheRows.length,
      nganh: nganhRows.length,
      truong: truong.length,
      coSo: coSoAll.length,
      linhVuc: linhVucs.length,
    },
    linhVucs,
    careers,
    majors,
    schools: pickSchools(truong, 6),
    coSo: pickCoSo(coSoAll, 4),
    courses,
    events,
    works,
    blog,
  };
}
