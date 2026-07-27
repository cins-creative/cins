import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBanThaoJourneyPreview } from "@/components/admin/AdminBanThaoJourneyPreview";
import { layBanThaoChiTiet } from "@/lib/admin/autopilot";
import { renderAdminPage } from "@/lib/admin/admin-page";
import {
  canManageUsers,
  getCurrentUserSystemRole,
} from "@/lib/auth/system-role";

import "@/app/[slug]/journey/journey.css";
import "@/app/[slug]/journey/image-grid.css";
import "@/styles/article-rich-content.css";
import "@/app/[slug]/p/new/editor.css";
import "@/app/[slug]/p/[postSlug]/post-page.css";
import "../../tai-khoan-ai.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function kenhLabel(k: string | null | undefined): string {
  switch (k) {
    case "artstation":
      return "ArtStation";
    case "behance":
      return "Behance";
    case "pixiv":
      return "Pixiv";
    default:
      return k || "—";
  }
}

export default async function AdminBanThaoPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const role = await getCurrentUserSystemRole();
  if (!canManageUsers(role)) {
    return renderAdminPage(
      <>
        <header className="page-header">
          <h1 className="page-title">Xem bài viết</h1>
        </header>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-title">Không có quyền</div>
          </div>
        </div>
      </>,
    );
  }

  let bt: Awaited<ReturnType<typeof layBanThaoChiTiet>>;
  try {
    bt = await layBanThaoChiTiet(id);
  } catch {
    notFound();
  }
  if (!bt) notFound();

  const daDang = Boolean(bt.duongDanDaDang);

  return renderAdminPage(
    <>
      <header className="page-header">
        <h1 className="page-title">Xem bài viết</h1>
        <p className="page-desc">
          {daDang
            ? "Bài đã đăng trên CINs."
            : "Bản xem trước trên CINs — chưa đăng công khai."}
        </p>
      </header>
      <div className="page-body tkai-body">
        <div className="tkai-preview-actions">
          <Link href="/admin/tai-khoan-ai" className="btn btn-ghost">
            ← Pipeline
          </Link>
          {daDang && bt.duongDanDaDang ? (
            <a
              href={bt.duongDanDaDang}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Mở permalink công khai
            </a>
          ) : null}
          {bt.slug ? (
            <Link
              href={`/${bt.slug}/journey`}
              target="_blank"
              className="btn btn-ghost"
            >
              Journey @{bt.slug}
            </Link>
          ) : null}
          {bt.urlCanonic ? (
            <a
              href={bt.urlCanonic}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              Nguồn {kenhLabel(bt.nenTang)}
            </a>
          ) : null}
        </div>

        <div className="tkai-journey-preview-shell">
          <div className="tkai-preview__badge">
            {daDang ? "Đã đăng" : "Xem trước · chưa đăng"} · @{bt.slug || "?"} ·{" "}
            {kenhLabel(bt.nenTang)}
            {bt.previewNote ? (
              <span className="tkai-journey-preview-shell__note">
                {" "}
                · {bt.previewNote}
              </span>
            ) : null}
          </div>
          <AdminBanThaoJourneyPreview
            banThaoId={bt.id}
            tieuDe={bt.tieuDe}
            moTa={bt.moTa}
            taoLuc={bt.taoLuc}
            blocks={bt.blocks}
            coverSeed={bt.coverSeed}
            owner={bt.owner}
          />
        </div>
      </div>
    </>,
  );
}
