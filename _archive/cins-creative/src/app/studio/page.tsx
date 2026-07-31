import Link from "next/link";
import { redirect } from "next/navigation";
import { cfImageUrl } from "@/lib/cloudflare";
import { getMyProfile, needsOnboarding } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export default async function StudioPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (needsOnboarding(profile)) redirect("/onboarding");

  const supabase = await createClient();
  const { data: works } = await supabase
    .from("content_tac_pham")
    .select("id, tieu_de, slug, cover_id, che_do_hien_thi, tao_luc")
    .eq("id_nguoi_dung", profile.id)
    .order("tao_luc", { ascending: false });

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Studio</h1>
        <div className="row">
          <Link href="/studio/collections" className="btn">
            Bộ sưu tập
          </Link>
          <Link href="/studio/new" className="btn btn-primary">
            Tác phẩm mới
          </Link>
        </div>
      </div>
      {!works?.length ? (
        <p className="muted">Chưa có tác phẩm — tạo cái đầu tiên.</p>
      ) : (
        <div className="card-grid">
          {works.map((w) => {
            const cover = cfImageUrl(w.cover_id);
            return (
              <article key={w.id} className="work-card">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" width={400} height={300} />
                ) : (
                  <div className="skeleton" />
                )}
                <div className="work-card-body">
                  <strong>{w.tieu_de}</strong>
                  <p className="muted" style={{ margin: "4px 0 8px" }}>
                    {w.che_do_hien_thi}
                  </p>
                  <div className="row">
                    <Link href={`/studio/${w.id}/edit`}>Sửa</Link>
                    {profile.slug && w.slug ? (
                      <Link href={`/@${profile.slug}/${w.slug}`}>Xem</Link>
                    ) : null}
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
