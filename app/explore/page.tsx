import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { fetchExploreCatalog } from "@/lib/linh-vuc/explore-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCfImageUrl } from "@/lib/truong/images";

import "./explore.css";

export const metadata: Metadata = {
  title: "Khám phá lĩnh vực | CINs",
  description: "Danh mục lĩnh vực sáng tạo trên CINs — duyệt tác phẩm theo lĩnh vực.",
};

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  if (!hasSupabaseEnv()) notFound();

  const catalog = await fetchExploreCatalog();

  return (
    <CinsShell>
      <div className="lv-explore">
        <header className="lv-explore__head">
          <h1 className="lv-explore__title">Khám phá lĩnh vực</h1>
          <p className="lv-explore__lead">
            Tìm tác phẩm theo lĩnh vực sáng tạo bạn quan tâm.
          </p>
        </header>

        {catalog.nhoms.map((nhom) => (
          <section key={nhom.id} className="lv-explore__section">
            <h2 className="lv-explore__section-title">{nhom.ten}</h2>
            <div className="lv-explore__grid">
              {nhom.linh_vuc.map((lv) => (
                <LinhVucCard key={lv.id} lv={lv} />
              ))}
            </div>
          </section>
        ))}

        {catalog.ungrouped.length > 0 ? (
          <section className="lv-explore__section">
            {catalog.nhoms.length > 0 ? (
              <h2 className="lv-explore__section-title">Khác</h2>
            ) : null}
            <div className="lv-explore__grid">
              {catalog.ungrouped.map((lv) => (
                <LinhVucCard key={lv.id} lv={lv} />
              ))}
            </div>
          </section>
        ) : null}

        {!catalog.total ? (
          <p className="lv-explore__empty">Chưa có lĩnh vực nào.</p>
        ) : null}
      </div>
    </CinsShell>
  );
}

function LinhVucCard({
  lv,
}: {
  lv: {
    id: string;
    ten: string;
    slug: string;
    mo_ta: string | null;
    thumbnail_id: string | null;
  };
}) {
  const thumb = getCfImageUrl(lv.thumbnail_id, "grid");
  return (
    <Link href={`/linh-vuc/${lv.slug}`} className="lv-card">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" className="lv-card__media" />
      ) : (
        <div className="lv-card__media lv-card__media--empty" aria-hidden />
      )}
      <div className="lv-card__body">
        <strong className="lv-card__name">{lv.ten}</strong>
        {lv.mo_ta ? <p className="lv-card__desc">{lv.mo_ta}</p> : null}
      </div>
    </Link>
  );
}
