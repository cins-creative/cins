import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cfImageUrl } from "@/lib/cloudflare";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ linh_vuc?: string }> };

async function loadProfile(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, bio, avatar_id, trang_thai_tai_khoan, da_xac_minh")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadProfile(slug);
  if (!profile) return { title: "Không tìm thấy" };
  return {
    title: profile.ten_hien_thi,
    description: profile.bio ?? `Portfolio của ${profile.ten_hien_thi} trên Trung CINs website`,
    openGraph: {
      title: profile.ten_hien_thi,
      images: profile.avatar_id ? [cfImageUrl(profile.avatar_id) ?? ""] : [],
    },
  };
}

export default async function PortfolioPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { linh_vuc: linhVucFilter } = await searchParams;

  const profile = await loadProfile(slug);
  if (!profile) notFound();
  if (profile.trang_thai_tai_khoan !== "dang_hoat_dong") notFound();

  const supabase = await createClient();

  // Load works — public or feature
  let query = supabase
    .from("content_tac_pham")
    .select(`
      id,
      tieu_de,
      slug,
      cover_id,
      che_do_hien_thi,
      tao_luc,
      content_tac_pham_linh_vuc(id_linh_vuc, la_chinh, linh_vuc(id, ten, slug))
    `)
    .eq("id_nguoi_dung", profile.id)
    .in("che_do_hien_thi", ["public", "feature"])
    .order("tao_luc", { ascending: false });

  if (linhVucFilter) {
    query = supabase
      .from("content_tac_pham")
      .select(`
        id,
        tieu_de,
        slug,
        cover_id,
        che_do_hien_thi,
        tao_luc,
        content_tac_pham_linh_vuc!inner(id_linh_vuc, la_chinh, linh_vuc(id, ten, slug))
      `)
      .eq("id_nguoi_dung", profile.id)
      .in("che_do_hien_thi", ["public", "feature"])
      .eq("content_tac_pham_linh_vuc.linh_vuc.slug", linhVucFilter)
      .order("tao_luc", { ascending: false });
  }

  const { data: works } = await query;

  // Gather unique lĩnh vực for filter bar
  const lvMap = new Map<string, { slug: string; ten: string }>();
  for (const w of works ?? []) {
    const arr = w.content_tac_pham_linh_vuc as Array<{
      id_linh_vuc: string;
      la_chinh: boolean;
      linh_vuc: { id: string; ten: string; slug: string } | null;
    }>;
    for (const r of arr ?? []) {
      if (r.linh_vuc) lvMap.set(r.id_linh_vuc, r.linh_vuc);
    }
  }
  const lvList = [...lvMap.values()];

  const avatarUrl = cfImageUrl(profile.avatar_id, "public");

  return (
    <div className="stack">
      {/* Profile header */}
      <div className="row" style={{ gap: "var(--space-5)", alignItems: "flex-start" }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={profile.ten_hien_thi}
            width={80}
            height={80}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--neutral-200)",
              flexShrink: 0,
            }}
          />
        )}
        <div className="stack" style={{ gap: "var(--space-2)" }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>
            {profile.ten_hien_thi}
            {profile.da_xac_minh && (
              <span
                title="Đã xác minh"
                style={{ marginLeft: 6, color: "var(--cins-blue)", fontSize: "0.9rem" }}
              >
                ✓
              </span>
            )}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            @{profile.slug}
          </p>
          {profile.bio && (
            <p style={{ margin: 0, fontSize: "var(--text-sm)", maxWidth: 520 }}>{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Lĩnh vực filter — lọc trong portfolio + link khám phá toàn hệ */}
      {lvList.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href={`/@${profile.slug}`}
            className="badge"
            style={!linhVucFilter ? { background: "var(--cins-blue)", color: "#fff" } : {}}
          >
            Tất cả
          </Link>
          {lvList.map((lv) => (
            <span key={lv.slug} className="row" style={{ gap: 4 }}>
              <Link
                href={`/@${profile.slug}?linh_vuc=${lv.slug}`}
                className="badge"
                style={
                  linhVucFilter === lv.slug
                    ? { background: "var(--cins-blue)", color: "#fff" }
                    : {}
                }
              >
                {lv.ten}
              </Link>
              <Link
                href={`/linh-vuc/${lv.slug}`}
                className="muted"
                style={{ fontSize: 12 }}
                title={`Khám phá ${lv.ten}`}
              >
                ↗
              </Link>
            </span>
          ))}
        </div>
      )}

      {/* Works grid */}
      {!works?.length ? (
        <p className="muted">Chưa có tác phẩm nào.</p>
      ) : (
        <div className="card-grid">
          {works.map((w) => {
            const cover = cfImageUrl(w.cover_id);
            const workLv = (
              w.content_tac_pham_linh_vuc as Array<{
                la_chinh: boolean;
                linh_vuc: { ten: string; slug: string } | null;
              }>
            )
              .sort((a, b) => (b.la_chinh ? 1 : 0) - (a.la_chinh ? 1 : 0))
              .map((r) => r.linh_vuc)
              .filter(Boolean);

            return (
              <article key={w.id} className="work-card">
                <Link
                  href={`/@${profile.slug}/${w.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={w.tieu_de} />
                  ) : (
                    <div className="skeleton" style={{ minHeight: 160 }} />
                  )}
                  <div className="work-card-body">
                    <strong style={{ display: "block", marginBottom: 4 }}>{w.tieu_de}</strong>
                  </div>
                </Link>
                <div className="work-card-body" style={{ paddingTop: 0 }}>
                  <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                    {workLv.slice(0, 2).map((lv) => (
                      <Link key={lv!.slug} href={`/linh-vuc/${lv!.slug}`} className="badge">
                        {lv!.ten}
                      </Link>
                    ))}
                    {w.che_do_hien_thi === "feature" && (
                      <span className="badge" style={{ background: "var(--cins-yellow)", color: "#333" }}>
                        Nổi bật
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
