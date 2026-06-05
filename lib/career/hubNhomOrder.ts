import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/server";

import type { CareerHubSection } from "@/lib/career/hubSections";

import type { NgheNghiepHubItem } from "@/lib/career/types";



export type NhomThuTuRow = {

  id: string;

  thu_tu: number;

  ten: string;

};



function isBoPhanLoai(loai: string): boolean {

  return loai.trim().toLowerCase() === "bo_phan";

}



/**

 * Bộ phận có bài `nghe` trong lĩnh vực — lọc qua `article_bai_viet.id_linh_vuc`

 * (không dùng `article_nhom.id_linh_vuc`).

 */

export async function listBoPhanNhomOrderForLinhVuc(

  linhVucId: string,

  extraNhomIds: string[] = [],

): Promise<NhomThuTuRow[]> {

  if (!hasSupabaseEnv()) return [];

  const lvId = linhVucId.trim();

  if (!lvId && extraNhomIds.length === 0) return [];



  try {

    const supabase = createPublicSupabaseClient();

    const byId = new Map<string, NhomThuTuRow>();



    if (lvId) {

      const nested = await supabase

        .from("article_nhom")

        .select(

          `

          id, ten, thu_tu, loai_nhom,

          article_gan_nhom!inner(

            article_bai_viet!inner(id)

          )

        `,

        )

        .eq("loai_nhom", "bo_phan")

        .eq("article_gan_nhom.article_bai_viet.loai_bai_viet", "nghe")

        .eq("article_gan_nhom.article_bai_viet.id_linh_vuc", lvId)

        .order("thu_tu", { ascending: true });



      if (!nested.error && nested.data?.length) {

        for (const r of nested.data) {

          if (!isBoPhanLoai(String(r.loai_nhom ?? ""))) continue;

          byId.set(String(r.id), {

            id: String(r.id),

            ten: String(r.ten ?? "").trim() || "Nhóm",

            thu_tu: Number(r.thu_tu ?? 0),

          });

        }

      } else {

        const allBp = await supabase

          .from("article_nhom")

          .select("id, ten, thu_tu, loai_nhom")

          .eq("loai_nhom", "bo_phan")

          .order("thu_tu", { ascending: true });

        if (!allBp.error && allBp.data?.length) {

          for (const r of allBp.data) {

            byId.set(String(r.id), {

              id: String(r.id),

              ten: String(r.ten ?? "").trim() || "Nhóm",

              thu_tu: Number(r.thu_tu ?? 0),

            });

          }

        }

      }

    }



    const missing = extraNhomIds.filter((id) => id && !byId.has(id));

    if (missing.length > 0) {

      const { data, error } = await supabase

        .from("article_nhom")

        .select("id, ten, thu_tu, loai_nhom")

        .in("id", missing);



      if (!error && data?.length) {

        for (const r of data) {

          if (!isBoPhanLoai(String(r.loai_nhom ?? ""))) continue;

          byId.set(String(r.id), {

            id: String(r.id),

            ten: String(r.ten ?? "").trim() || "Nhóm",

            thu_tu: Number(r.thu_tu ?? 0),

          });

        }

      }

    }



    return [...byId.values()].sort((a, b) => {

      if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;

      return a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" });

    });

  } catch {

    return [];

  }

}



export function nhomThuTuFromCareers(

  nhomId: string,

  careers: NgheNghiepHubItem[],

): number {

  for (const c of careers) {

    const hit = c.article_nhom_all?.find((n) => n.id === nhomId);

    if (hit != null && !Number.isNaN(Number(hit.thu_tu))) {

      return Number(hit.thu_tu);

    }

  }

  const nh = careers[0]?.article_nhom;

  if (nh?.id === nhomId && nh.thu_tu != null && !Number.isNaN(Number(nh.thu_tu))) {

    return Number(nh.thu_tu);

  }

  return 9999;

}



/** Sắp xếp section/tab hub theo `article_nhom.thu_tu` (catalog DB ưu tiên). */

export function orderHubSectionsByNhomThuTu(

  sections: CareerHubSection[],

  catalog: NhomThuTuRow[],

): CareerHubSection[] {

  const rankById = new Map(catalog.map((c) => [c.id, c.thu_tu]));



  const sorted = [...sections].sort((a, b) => {

    if (a.nhomId === null && b.nhomId === null) return 0;

    if (a.nhomId === null) return 1;

    if (b.nhomId === null) return -1;



    const ta =

      rankById.get(a.nhomId) ??

      nhomThuTuFromCareers(a.nhomId, a.careers);

    const tb =

      rankById.get(b.nhomId) ??

      nhomThuTuFromCareers(b.nhomId, b.careers);

    if (ta !== tb) return ta - tb;

    return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });

  });



  return sorted.map((s, i) => ({

    ...s,

    id: s.nhomId ? `career-sec-${s.nhomId}` : `career-sec-${i}`,

    thu_tu:

      s.nhomId != null

        ? (rankById.get(s.nhomId) ?? nhomThuTuFromCareers(s.nhomId, s.careers))

        : 99999,

  }));

}

