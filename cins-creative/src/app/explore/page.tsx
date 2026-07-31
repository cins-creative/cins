import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cfImageUrl } from "@/lib/cloudflare";

export const metadata: Metadata = {
  title: "Khám phá lĩnh vực",
  description: "Tất cả lĩnh vực sáng tạo trên Trung CINs website.",
};

type LinhVuc = {
  id: string;
  ten: string;
  slug: string;
  mo_ta: string | null;
  thumbnail_id: string | null;
  nhom: string | null;
  thu_tu: number;
};

type Nhom = {
  id: string;
  ten: string;
  slug: string;
  thu_tu: number;
  linh_vuc: LinhVuc[];
};

export default async function ExplorePage() {
  const supabase = await createClient();

  // Load all active lĩnh vực
  const { data: linhVucList } = await supabase
    .from("linh_vuc")
    .select("id, ten, slug, mo_ta, thumbnail_id, nhom, thu_tu")
    .eq("trang_thai", "active")
    .order("thu_tu");

  // Load nhóm
  const { data: nhomList } = await supabase
    .from("linh_vuc_nhom")
    .select("id, ten, slug, thu_tu")
    .eq("trang_thai", "active")
    .order("thu_tu");

  // Load junction
  const { data: ganNhom } = await supabase
    .from("linh_vuc_gan_nhom")
    .select("id_linh_vuc, id_nhom, la_chinh, thu_tu")
    .order("thu_tu");

  const allLv = linhVucList ?? [];
  const allNhom = nhomList ?? [];
  const allGan = ganNhom ?? [];

  // Group by nhóm
  const nhomMap = new Map<string, Nhom>();
  for (const n of allNhom) {
    nhomMap.set(n.id, { ...n, linh_vuc: [] });
  }

  const groupedLvIds = new Set<string>();
  for (const g of allGan) {
    const nhom = nhomMap.get(g.id_nhom);
    const lv = allLv.find((l) => l.id === g.id_linh_vuc);
    if (nhom && lv) {
      nhom.linh_vuc.push(lv);
      groupedLvIds.add(g.id_linh_vuc);
    }
  }

  // Sort lĩnh vực inside each nhóm by thu_tu
  for (const nhom of nhomMap.values()) {
    nhom.linh_vuc.sort((a, b) => a.thu_tu - b.thu_tu);
  }

  const ungrouped = allLv.filter((lv) => !groupedLvIds.has(lv.id));
  const nhoms = [...nhomMap.values()].filter((n) => n.linh_vuc.length > 0);

  return (
    <div className="stack">
      <div>
        <h1 style={{ margin: "0 0 4px" }}>Khám phá lĩnh vực</h1>
        <p className="muted">Tìm tác phẩm theo lĩnh vực sáng tạo bạn quan tâm.</p>
      </div>

      {/* Grouped by nhóm */}
      {nhoms.map((nhom) => (
        <section key={nhom.id} className="stack" style={{ gap: "var(--space-3)" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>
            {nhom.ten}
          </h2>
          <div className="card-grid">
            {nhom.linh_vuc.map((lv) => (
              <LinhVucCard key={lv.id} lv={lv} />
            ))}
          </div>
        </section>
      ))}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <section className="stack" style={{ gap: "var(--space-3)" }}>
          {nhoms.length > 0 && (
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--fg-2)" }}>
              Khác
            </h2>
          )}
          <div className="card-grid">
            {ungrouped.map((lv) => (
              <LinhVucCard key={lv.id} lv={lv} />
            ))}
          </div>
        </section>
      )}

      {!allLv.length && <p className="muted">Chưa có lĩnh vực nào.</p>}
    </div>
  );
}

function LinhVucCard({ lv }: { lv: LinhVuc }) {
  const thumb = cfImageUrl(lv.thumbnail_id, "public");
  return (
    <Link href={`/linh-vuc/${lv.slug}`} style={{ textDecoration: "none" }}>
      <article className="work-card">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={lv.ten} style={{ aspectRatio: "16/9", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              aspectRatio: "16/9",
              background: "var(--cins-blue-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--cins-blue)",
              fontSize: "1.5rem",
            }}
          >
            🎨
          </div>
        )}
        <div className="work-card-body">
          <strong style={{ display: "block" }}>{lv.ten}</strong>
          {lv.mo_ta && (
            <p
              className="muted"
              style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
            >
              {lv.mo_ta}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
