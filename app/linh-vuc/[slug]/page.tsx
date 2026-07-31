import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import {
  fetchLinhVucBySlug,
  fetchWorksByLinhVucId,
} from "@/lib/linh-vuc/explore-fetch";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCfImageUrl } from "@/lib/truong/images";

import "../explore/explore.css";

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!hasSupabaseEnv()) return { title: "Lĩnh vực | CINs" };
  const { slug } = await params;
  const lv = await fetchLinhVucBySlug(slug);
  if (!lv) return { title: "Không tìm thấy | CINs" };
  return {
    title: `${lv.ten} | CINs`,
    description: lv.mo_ta ?? `Tác phẩm lĩnh vực ${lv.ten} trên CINs`,
  };
}

export const dynamic = "force-dynamic";

export default async function LinhVucDetailPage({
  params,
  searchParams,
}: Props) {
  if (!hasSupabaseEnv()) notFound();

  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const linhVuc = await fetchLinhVucBySlug(slug);
  if (!linhVuc) notFound();

  const { works, count, blockedByRls, errorMessage } =
    await fetchWorksByLinhVucId(linhVuc.id, page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const thumb = getCfImageUrl(linhVuc.thumbnail_id, "thumbnail");

  return (
    <CinsShell>
      <div className="lv-explore">
        <header className="lv-detail__head">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              width={72}
              height={72}
              className="lv-detail__thumb"
            />
          ) : null}
          <div>
            <h1 className="lv-explore__title">{linhVuc.ten}</h1>
            {linhVuc.mo_ta ? (
              <p className="lv-explore__lead">{linhVuc.mo_ta}</p>
            ) : null}
          </div>
        </header>

        <p className="lv-explore__meta">
          {count} tác phẩm
          {page > 1 ? ` — trang ${page}` : ""}
        </p>

        <Link href="/explore" className="lv-explore__back">
          ← Tất cả lĩnh vực
        </Link>

        {blockedByRls ? (
          <p className="lv-explore__notice" role="status">
            Danh sách tác phẩm tạm không đọc được bằng anon (RLS gọi{" "}
            <code>current_profile_id</code>). Cần{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> local để browse — không sửa
            RLS trên DB prod từ nhánh Trung.
          </p>
        ) : null}

        {errorMessage && !blockedByRls ? (
          <p className="lv-explore__notice" role="status">
            Không tải được tác phẩm: {errorMessage}
          </p>
        ) : null}

        {!works.length && !blockedByRls && !errorMessage ? (
          <p className="lv-explore__empty">
            Chưa có tác phẩm công khai trong lĩnh vực này.
          </p>
        ) : null}

        {works.length > 0 ? (
          <div className="lv-explore__grid">
            {works.map((w) => {
              const cover = getCfImageUrl(w.cover_id, "grid");
              const href = w.authorSlug
                ? `/${w.authorSlug}?view=gallery`
                : "/explore";
              return (
                <Link key={w.id} href={href} className="lv-card">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="lv-card__media" />
                  ) : (
                    <div
                      className="lv-card__media lv-card__media--empty"
                      aria-hidden
                    />
                  )}
                  <div className="lv-card__body">
                    <strong className="lv-card__name">{w.tieu_de}</strong>
                    {w.authorName ? (
                      <p className="lv-card__desc">{w.authorName}</p>
                    ) : null}
                    {w.che_do_hien_thi === "feature" ? (
                      <span className="lv-card__badge">Nổi bật</span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}

        {totalPages > 1 ? (
          <div className="lv-explore__pager">
            {page > 1 ? (
              <Link
                href={`/linh-vuc/${slug}?page=${page - 1}`}
                className="lv-explore__page-btn"
              >
                ← Trước
              </Link>
            ) : null}
            <span className="lv-explore__meta">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/linh-vuc/${slug}?page=${page + 1}`}
                className="lv-explore__page-btn"
              >
                Tiếp →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </CinsShell>
  );
}
