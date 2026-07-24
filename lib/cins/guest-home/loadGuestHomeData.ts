import "server-only";

import { unstable_cache } from "next/cache";

import { getCoverUrl } from "@/lib/articles/cover";
import {
  countNgheArticlesForHub,
  fetchRecentTacPhamGallery,
  listNgheArticlesForHub,
} from "@/lib/articles/queries";
import { mapNgheArticlesToHubItems } from "@/lib/career/articleMappers";
import { listLinhVucForHub } from "@/lib/career/queries";
import type { NgheNghiepHubItem } from "@/lib/career/types";
import { loadUpcomingEventsForHome } from "@/lib/cong-dong/events";
import { congDongBannerImageUrl } from "@/lib/cong-dong/images";
import type { CongDongEvent } from "@/lib/cong-dong/types";
import { loadKhoaHocGoiY, type KhoaHocGoiYItem } from "@/lib/cins/home-adaptive/fetches";
import {
  countNganhArticlesForHub,
  listNganhArticlesForHub,
} from "@/lib/nganh/queries";
import type { NganhHubItem } from "@/lib/nganh/types";
import { countCoSoDaoTao } from "@/lib/to-chuc/listing-queries";
import { listTruongDaiHoc } from "@/lib/truong/queries";
import type { TruongListItem } from "@/lib/truong/types";

/** Số item hiển thị trên trang chủ khách — fetch đúng chừng này, không kéo dư. */
const HOME_CAREER_LIMIT = 8;
const HOME_MAJOR_LIMIT = 6;
const HOME_SCHOOL_LIMIT = 6;
const HOME_EVENT_LIMIT = 6;
const HOME_COURSE_LIMIT = 6;
const HOME_WORK_LIMIT = 8;

/**
 * Cache dùng chung cho khách vãng lai (không phụ thuộc session).
 * Revalidate 5 phút; nội dung (ngành/nghề/trường/sự kiện) đổi chậm.
 * Invalidation: revalidateTag("guest-home") khi publish nội dung mới,
 * hoặc chờ hết `revalidate`.
 */
const GUEST_HOME_CACHE_TAG = "guest-home";
const GUEST_HOME_REVALIDATE_SECONDS = 300;

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
  courses: KhoaHocGoiYItem[];
  events: GuestHomeEvent[];
  works: GuestHomeWork[];
};

function pickSchools(items: TruongListItem[], limit: number): TruongListItem[] {
  return [...items]
    .sort((a, b) => b.nganhCount - a.nganhCount || a.ten.localeCompare(b.ten, "vi"))
    .slice(0, limit);
}

async function loadGuestHomeDataUncached(): Promise<GuestHomeData> {
  const [
    truong,
    ngheResult,
    nganhResult,
    linhVucsRaw,
    eventsRaw,
    courses,
    worksRaw,
    ngheCount,
    nganhCount,
    coSoCount,
  ] = await Promise.all([
    listTruongDaiHoc(),
    listNgheArticlesForHub({ limit: HOME_CAREER_LIMIT }),
    listNganhArticlesForHub({ limit: HOME_MAJOR_LIMIT }),
    listLinhVucForHub(),
    loadUpcomingEventsForHome([], HOME_EVENT_LIMIT),
    loadKhoaHocGoiY(HOME_COURSE_LIMIT),
    fetchRecentTacPhamGallery(HOME_WORK_LIMIT),
    countNgheArticlesForHub(),
    countNganhArticlesForHub(),
    countCoSoDaoTao(),
  ]);

  const ngheRows = ngheResult.ok ? ngheResult.items : [];
  const nganhRows = nganhResult.ok ? nganhResult.items : [];
  const careers = mapNgheArticlesToHubItems(ngheRows);
  const majors = nganhRows;

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

  return {
    stats: {
      nghe: ngheCount,
      nganh: nganhCount,
      truong: truong.length,
      coSo: coSoCount,
      linhVuc: linhVucs.length,
    },
    linhVucs,
    careers,
    majors,
    schools: pickSchools(truong, HOME_SCHOOL_LIMIT),
    courses,
    events,
    works,
  };
}

export const loadGuestHomeData = unstable_cache(
  loadGuestHomeDataUncached,
  ["guest-home-data"],
  { revalidate: GUEST_HOME_REVALIDATE_SECONDS, tags: [GUEST_HOME_CACHE_TAG] },
);
