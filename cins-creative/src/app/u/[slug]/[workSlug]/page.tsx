import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cfImageUrl } from "@/lib/cloudflare";
import { renderBlocks } from "@/lib/blocks";
import { WorkSocial } from "@/components/WorkSocial";

type Props = { params: Promise<{ slug: string; workSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, workSlug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi")
    .eq("slug", slug)
    .maybeSingle();
  if (!profile) return { title: "Không tìm thấy" };

  const { data: work } = await supabase
    .from("content_tac_pham")
    .select("tieu_de, mo_ta, cover_id, meta_title, meta_description")
    .eq("id_nguoi_dung", profile.id)
    .eq("slug", workSlug)
    .maybeSingle();
  if (!work) return { title: "Không tìm thấy" };

  const coverUrl = cfImageUrl(work.cover_id);
  return {
    title: work.meta_title ?? work.tieu_de,
    description: work.meta_description ?? work.mo_ta ?? undefined,
    openGraph: {
      title: work.meta_title ?? work.tieu_de,
      description: work.meta_description ?? work.mo_ta ?? undefined,
      images: coverUrl ? [coverUrl] : [],
    },
  };
}

export default async function WorkDetailPage({ params }: Props) {
  const { slug, workSlug } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id, trang_thai_tai_khoan, da_xac_minh")
    .eq("slug", slug)
    .maybeSingle();
  if (!profile) notFound();
  if (profile.trang_thai_tai_khoan !== "dang_hoat_dong") notFound();

  const { data: work } = await supabase
    .from("content_tac_pham")
    .select(`
      id,
      tieu_de,
      slug,
      mo_ta,
      cover_id,
      che_do_hien_thi,
      noi_dung_blocks,
      id_nguoi_dung,
      content_media(id, cloudflare_id, thu_tu, loai_media, width, height),
      content_tac_pham_linh_vuc(la_chinh, linh_vuc(id, ten, slug))
    `)
    .eq("id_nguoi_dung", profile.id)
    .eq("slug", workSlug)
    .maybeSingle();
  if (!work) notFound();

  // Auth check: chi_minh only visible to owner
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && work.id_nguoi_dung === profile.id;

  if (work.che_do_hien_thi === "chi_minh") {
    if (!isOwner) notFound();
  }
  if (!["public", "feature", "chi_minh"].includes(work.che_do_hien_thi)) {
    if (!isOwner) notFound();
  }

  const media = (work.content_media as Array<{
    id: string;
    cloudflare_id: string;
    thu_tu: number;
    loai_media: string;
  }>).sort((a, b) => a.thu_tu - b.thu_tu);

  const linhVucList = (
    work.content_tac_pham_linh_vuc as Array<{
      la_chinh: boolean;
      linh_vuc: { id: string; ten: string; slug: string } | null;
    }>
  )
    .sort((a, b) => (b.la_chinh ? 1 : 0) - (a.la_chinh ? 1 : 0))
    .map((r) => r.linh_vuc)
    .filter(Boolean);

  const coverUrl = cfImageUrl(work.cover_id);
  const avatarUrl = cfImageUrl(profile.avatar_id, "public");

  return (
    <article className="stack" style={{ maxWidth: 760 }}>
      {/* Cover */}
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={work.tieu_de}
          style={{
            width: "100%",
            borderRadius: "var(--radius-md)",
            display: "block",
            objectFit: "cover",
            maxHeight: 480,
          }}
        />
      )}

      {/* Title + badges */}
      <div className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", lineHeight: 1.3 }}>{work.tieu_de}</h1>
        <div className="row" style={{ gap: 6 }}>
          {linhVucList.map((lv) => (
            <Link key={lv!.slug} href={`/linh-vuc/${lv!.slug}`} className="badge">
              {lv!.ten}
            </Link>
          ))}
          {work.che_do_hien_thi === "feature" && (
            <span className="badge" style={{ background: "var(--cins-yellow)", color: "#333" }}>
              Nổi bật
            </span>
          )}
        </div>
      </div>

      {/* Author row */}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Link href={`/@${profile.slug}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={profile.ten_hien_thi}
              width={36}
              height={36}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--neutral-200)" }} />
          )}
          <span style={{ fontWeight: 500 }}>
            {profile.ten_hien_thi}
            {profile.da_xac_minh && (
              <span style={{ marginLeft: 4, color: "var(--cins-blue)" }}>✓</span>
            )}
          </span>
        </Link>

        {isOwner && (
          <Link href={`/studio/${work.id}/edit`} className="btn">
            Sửa tác phẩm
          </Link>
        )}
      </div>

      {/* Mô tả */}
      {work.mo_ta && (
        <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.7 }}>{work.mo_ta}</p>
      )}

      {/* Social interactions */}
      <WorkSocial workId={work.id} authorId={profile.id} />

      {/* Media gallery (all images except cover) */}
      {media.length > 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {media.slice(1).map((m) => {
            const src = cfImageUrl(m.cloudflare_id);
            if (!src) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={src}
                alt=""
                loading="lazy"
                style={{
                  width: "100%",
                  borderRadius: "var(--radius-sm)",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Blocks */}
      {renderBlocks(work.noi_dung_blocks)}
    </article>
  );
}
