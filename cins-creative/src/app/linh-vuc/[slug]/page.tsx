import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cfImageUrl } from "@/lib/cloudflare";

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("linh_vuc")
    .select("ten, mo_ta")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return { title: "Không tìm thấy" };
  return {
    title: data.ten,
    description: data.mo_ta ?? `Tác phẩm lĩnh vực ${data.ten} trên Trung CINs website`,
  };
}

export default async function LinhVucDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const { data: linhVuc } = await supabase
    .from("linh_vuc")
    .select("id, ten, slug, mo_ta, thumbnail_id")
    .eq("slug", slug)
    .eq("trang_thai", "active")
    .maybeSingle();
  if (!linhVuc) notFound();

  // Works in this lĩnh vực (public/feature only)
  const { data: works, count } = await supabase
    .from("content_tac_pham")
    .select(
      `
      id,
      tieu_de,
      slug,
      cover_id,
      che_do_hien_thi,
      tao_luc,
      id_nguoi_dung,
      content_tac_pham_linh_vuc!inner(id_linh_vuc),
      user_nguoi_dung:id_nguoi_dung(slug, ten_hien_thi)
    `,
      { count: "exact" },
    )
    .eq("content_tac_pham_linh_vuc.id_linh_vuc", linhVuc.id)
    .in("che_do_hien_thi", ["public", "feature"])
    .order("tao_luc", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="stack">
      {/* Header */}
      <div className="row" style={{ gap: "var(--space-5)", alignItems: "center" }}>
        {cfImageUrl(linhVuc.thumbnail_id) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cfImageUrl(linhVuc.thumbnail_id)!}
            alt={linhVuc.ten}
            width={72}
            height={72}
            style={{ borderRadius: "var(--radius-sm)", objectFit: "cover" }}
          />
        )}
        <div>
          <h1 style={{ margin: "0 0 4px" }}>{linhVuc.ten}</h1>
          {linhVuc.mo_ta && <p className="muted" style={{ margin: 0 }}>{linhVuc.mo_ta}</p>}
        </div>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        {count ?? 0} tác phẩm
        {page > 1 && ` — trang ${page}`}
      </p>

      <Link href="/explore" className="muted" style={{ fontSize: 13 }}>
        ← Tất cả lĩnh vực
      </Link>

      {!works?.length ? (
        <p className="muted">Chưa có tác phẩm nào trong lĩnh vực này.</p>
      ) : (
        <div className="card-grid">
          {works.map((w) => {
            const cover = cfImageUrl(w.cover_id);
            const author = w.user_nguoi_dung as { slug: string; ten_hien_thi: string } | null;
            return (
              <Link
                key={w.id}
                href={`/@${author?.slug}/${w.slug}`}
                style={{ textDecoration: "none" }}
              >
                <article className="work-card">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={w.tieu_de} />
                  ) : (
                    <div className="skeleton" style={{ minHeight: 160 }} />
                  )}
                  <div className="work-card-body">
                    <strong style={{ display: "block", marginBottom: 4 }}>{w.tieu_de}</strong>
                    {author && (
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                        {author.ten_hien_thi}
                      </p>
                    )}
                    {w.che_do_hien_thi === "feature" && (
                      <span
                        className="badge"
                        style={{ marginTop: 4, background: "var(--cins-yellow)", color: "#333" }}
                      >
                        Nổi bật
                      </span>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="row" style={{ justifyContent: "center", gap: "var(--space-2)" }}>
          {page > 1 && (
            <Link href={`/linh-vuc/${slug}?page=${page - 1}`} className="btn">
              ← Trước
            </Link>
          )}
          <span className="muted">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/linh-vuc/${slug}?page=${page + 1}`} className="btn">
              Tiếp →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
