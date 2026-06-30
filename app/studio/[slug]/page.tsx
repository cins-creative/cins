import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CinsShell } from "@/components/cins/CinsShell";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStudioBySlugCached } from "@/lib/to-chuc/studio-page-queries";

import "./studio-page.css";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!hasSupabaseEnv()) return { title: "Studio | CINs" };
  const studio = await getStudioBySlugCached(slug);
  if (!studio) return { title: "Không tìm thấy studio | CINs" };
  return {
    title: `${studio.ten} | CINs`,
    description: studio.moTa ?? `Studio ${studio.ten} trên CINs.`,
  };
}

export default async function StudioPage({ params }: Props) {
  const { slug } = await params;
  if (!hasSupabaseEnv()) notFound();

  const studio = await getStudioBySlugCached(slug);
  if (!studio) notFound();

  const initials = studio.ten.slice(0, 2).toUpperCase();
  const metaItems = [
    studio.tinhThanh ? { icon: MapPin, label: studio.tinhThanh } : null,
    studio.website
      ? { icon: Globe, label: studio.website.replace(/^https?:\/\//, "") }
      : null,
    studio.emailLienHe ? { icon: Mail, label: studio.emailLienHe } : null,
    studio.dienThoai ? { icon: Phone, label: studio.dienThoai } : null,
  ].filter(Boolean) as Array<{
    icon: typeof MapPin;
    label: string;
  }>;

  return (
    <CinsShell data-screen-label="Studio-chi-tiet">
      <div className="studio-page">
        {studio.coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="studio-cover" src={studio.coverSrc} alt="" />
        ) : (
          <div className="studio-cover studio-cover--empty" aria-hidden />
        )}

        <header className="studio-head">
          <div className="studio-avatar">
            {studio.avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={studio.avatarSrc} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="studio-head-main">
            <span className="studio-kind">Studio / Doanh nghiệp</span>
            <h1 className="studio-name">{studio.ten}</h1>
            {studio.tenChinhThuc ? (
              <p className="studio-legal">{studio.tenChinhThuc}</p>
            ) : null}
            {studio.moTa ? <p className="studio-desc">{studio.moTa}</p> : null}
            {metaItems.length > 0 ? (
              <ul className="studio-meta">
                {metaItems.map((m) => (
                  <li key={m.label}>
                    <m.icon size={15} aria-hidden />
                    <span>{m.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </header>

        <nav className="studio-tabs" aria-label="Mục studio">
          <span className="studio-tab is-active">Dự án</span>
          <span className="studio-tab">Bài đăng</span>
          <span className="studio-tab">Hình ảnh</span>
        </nav>

        <section className="studio-body">
          {studio.gioiThieu ? (
            <div className="studio-intro">
              <h2>Giới thiệu</h2>
              <p>{studio.gioiThieu}</p>
            </div>
          ) : null}
          <div className="studio-empty">
            <p>
              Trang studio đang được hoàn thiện. Dự án, bài đăng và hình ảnh sẽ
              sớm hiển thị ở đây.
            </p>
          </div>
        </section>
      </div>
    </CinsShell>
  );
}
