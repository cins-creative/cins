import { NextResponse } from "next/server";

import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  buildToHopMonCatalogItems,
  type MonLookupRow,
} from "@/lib/truong/to-hop-mon-catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const supabase = createPublicSupabaseClient();

    const { data: monData, error: monErr } = await supabase
      .from("edu_mon_thi")
      .select("id, ma, ten, loai")
      .order("ten", { ascending: true });

    if (monErr) {
      return NextResponse.json({ error: monErr.message }, { status: 500 });
    }

    const monList: MonLookupRow[] = [];
    for (const row of monData ?? []) {
      const r = row as {
        id?: string;
        ma?: string | null;
        ten?: string;
        loai?: string | null;
      };
      const mid = r.id?.trim();
      const ten = r.ten?.trim();
      if (!mid || !ten) continue;
      monList.push({
        id: mid,
        ma: r.ma?.trim() || null,
        ten,
        loai: r.loai?.trim() || null,
      });
    }

    const { data: hopData, error: hopErr } = await supabase
      .from("edu_to_hop_mon")
      .select(
        `
        id,
        ma_to_hop,
        ten_to_hop,
        mo_ta,
        cac_mon,
        edu_to_hop_mon_chi_tiet ( so_thu_tu, ten_slot, loai, co_dinh )
      `,
      )
      .order("ma_to_hop", { ascending: true });

    if (hopErr) {
      return NextResponse.json({ error: hopErr.message }, { status: 500 });
    }

    const items = buildToHopMonCatalogItems(hopData ?? [], monList);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to load khoi catalog" }, { status: 500 });
  }
}
