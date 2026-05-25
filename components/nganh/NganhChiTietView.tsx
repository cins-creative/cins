"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { NganhArticleMedia } from "@/components/nganh/NganhArticleMedia";
import { NganhEditableIntro } from "@/components/nganh/NganhEditableIntro";
import { NctJobsGrid } from "@/components/nganh/NctJobsGrid";
import { NganhCompareSection } from "@/components/nganh/NganhCompareSection";
import { NganhMonHocSection } from "@/components/nganh/NganhMonHocSection";
import { NganhTruongSection } from "@/components/nganh/NganhTruongSection";
import { NganhDetailSidebar } from "@/components/nganh/NganhDetailSidebar";
import { useNganhInlineEdit } from "@/components/nganh/inline/NganhInlineEditContext";
import { stripImageBreakFromHtml } from "@/lib/nganh/editorialImage";
import {
  heroDescFromArticle,
  heroTitlePartsVi,
} from "@/lib/nganh/parseNoiDung";
import { partitionNganhRelated } from "@/lib/articles/rel-visual";
import type { NgheNganhRow, NganhDetailBundle } from "@/lib/nganh/queries";
import type { ArticleCard } from "@/lib/articles/types";

type Props = Pick<
  NganhDetailBundle,
  | "article"
  | "parsed"
  | "monHoc"
  | "nghe"
  | "truong"
  | "khoiThiLabels"
  | "lienQuan"
  | "soTruong"
>;

function ngheLabel(row: NgheNganhRow): string {
  return (row.tieu_de_viet ?? row.tieu_de).trim();
}

function ngheAsSidebarCards(rows: NgheNganhRow[]): ArticleCard[] {
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    tieu_de: ngheLabel(r),
    loai_bai_viet: "nghe",
    tom_tat: null,
    loai_quan_he: "DUNG_TRONG_NGHE",
  }));
}

function displayTitleVi(article: Props["article"]): string {
  return (article.tieu_de_viet ?? article.tieu_de).trim();
}

function compareNameParts(title: string): { main: string; em: string | null } {
  const { lead, em } = heroTitlePartsVi(title);
  if (!em) return { main: title, em: null };
  if (!lead) return { main: title, em: null };
  return { main: lead, em };
}

function khoiChipsFromText(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function NganhChiTietView({
  article,
  parsed: parsedProp,
  monHoc,
  nghe,
  truong,
  khoiThiLabels,
  lienQuan,
}: Props) {
  const ctx = useNganhInlineEdit();
  const parsed = ctx?.isEditing ? ctx.parsed : parsedProp;

  const titleVi = ctx?.isEditing
    ? (ctx.tieu_de_viet.trim() || ctx.tieu_de.trim())
    : displayTitleVi(article);
  const meta = ctx?.isEditing
    ? {
        ma_nganh: ctx.ma_nganh.trim() || undefined,
        khoi_thi: khoiChipsFromText(ctx.khoi_thi_text),
        mon_nang_khieu: ctx.mon_nang_khieu.trim() || null,
        thoi_gian_dao_tao: ctx.thoi_gian_dao_tao.trim() || null,
        editorial_images: ctx.editorial_images
          .map((s) => s.trim())
          .filter(Boolean),
        video_url: ctx.video_url.trim() || null,
      }
    : article.meta;
  const nhomTen = article.article_nhom?.ten?.trim() ?? "Ngành đào tạo";
  const heroEn = ctx?.isEditing
    ? ctx.tieu_de.trim() || null
    : article.tieu_de?.trim() || null;
  const heroDesc = ctx?.isEditing
    ? ctx.heroDesc.trim() || null
    : heroDescFromArticle(
        article.mo_ta_ngan,
        article.tom_tat,
        parsedProp.introHtml,
      );
  const khoiLabels = ctx?.isEditing
    ? khoiChipsFromText(ctx.khoi_thi_text)
    : khoiThiLabels;

  const { keywords } = partitionNganhRelated(lienQuan);
  const compareItems = parsed.compareItems;
  const truongRows = ctx?.isEditing ? ctx.truong : truong;
  const thisCompare = compareNameParts(titleVi);
  const ngheSidebar = ngheAsSidebarCards(nghe);
  const editorialImages = ctx?.isEditing
    ? ctx.editorial_images.map((s) => s.trim()).filter(Boolean)
    : (meta?.editorial_images ?? []);
  const introHtml =
    parsed.introHtml && editorialImages.length > 0
      ? stripImageBreakFromHtml(parsed.introHtml)
      : parsed.introHtml;

  return (
    <>
      <section className="nct-hero">
        <div className="nct-hero-bg" aria-hidden>
          <div className="blob-v" />
          <div className="blob-y" />
        </div>
        <div className="nct-hero-inner">
          <div>
            <nav className="nct-breadcrumb" aria-label="Breadcrumb">
              <Link href="/">Trang chủ</Link>
              <span>/</span>
              <Link href="/nghe-nghiep">Hướng nghiệp</Link>
              <span>/</span>
              <Link href="/nganh-hoc">Ngành đào tạo</Link>
              <span>/</span>
              <span className="here">{titleVi}</span>
            </nav>
            <div className="nct-kicker">
              {nhomTen}
              {meta?.ma_nganh ? (
                <>
                  <span className="code-divider" />
                  <span className="code">{meta.ma_nganh}</span>
                </>
              ) : null}
            </div>
            {ctx?.isEditing ? (
              <NctInlineField label="Tiêu đề (tiếng Việt)">
                <input
                  className="nct-inline-input nct-inline-input--title"
                  value={ctx.tieu_de_viet}
                  onChange={(e) => ctx.setTieuDeViet(e.target.value)}
                />
              </NctInlineField>
            ) : (
              <h1 className="nct-hero-title">{titleVi}</h1>
            )}
            {ctx?.isEditing ? (
              <NctInlineField label="Tên tiếng Anh (hero)">
                <input
                  className="nct-inline-input"
                  value={ctx.tieu_de}
                  onChange={(e) => ctx.setTieuDe(e.target.value)}
                />
              </NctInlineField>
            ) : heroEn ? (
              <p className="nct-hero-en">{heroEn}</p>
            ) : null}
            {ctx?.isEditing ? (
              <NctInlineField label="Mô tả ngắn (hero)">
                <textarea
                  className="nct-inline-input nct-inline-input--desc"
                  rows={3}
                  value={ctx.heroDesc}
                  onChange={(e) => ctx.setHeroDesc(e.target.value)}
                />
              </NctInlineField>
            ) : heroDesc ? (
              <p className="nct-hero-desc">{heroDesc}</p>
            ) : null}
          </div>

          <div className="nct-meta-card">
            <div className="nct-meta-card-head">
              <div>
                <div className="label">Thông tin tuyển sinh</div>
                <h3>{titleVi}</h3>
              </div>
              {meta?.ma_nganh ? (
                <span className="nct-meta-card-badge">{meta.ma_nganh}</span>
              ) : null}
            </div>
            <div>
              {ctx?.isEditing ? (
                <>
                  <NctInlineField label="Mã ngành">
                    <input
                      className="nct-inline-input"
                      value={ctx.ma_nganh}
                      onChange={(e) => ctx.setMaNganh(e.target.value)}
                    />
                  </NctInlineField>
                  <NctInlineField label="Khối thi (mã, cách nhau bởi dấu phẩy)">
                    <input
                      className="nct-inline-input"
                      value={ctx.khoi_thi_text}
                      onChange={(e) => ctx.setKhoiThiText(e.target.value)}
                      placeholder="A00, D01, …"
                    />
                  </NctInlineField>
                  <NctInlineField label="Môn năng khiếu">
                    <input
                      className="nct-inline-input"
                      value={ctx.mon_nang_khieu}
                      onChange={(e) => ctx.setMonNangKhieu(e.target.value)}
                    />
                  </NctInlineField>
                  <NctInlineField label="Thời gian đào tạo">
                    <input
                      className="nct-inline-input"
                      value={ctx.thoi_gian_dao_tao}
                      onChange={(e) => ctx.setThoiGianDaoTao(e.target.value)}
                    />
                  </NctInlineField>
                </>
              ) : (
                <>
                  {khoiLabels.length > 0 ? (
                    <div className="nct-meta-row">
                      <span className="nct-meta-row-label">Khối thi</span>
                      <div className="nct-khoi-wrap">
                        {khoiLabels.map((k) => (
                          <span key={k} className="nct-khoi">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {meta?.mon_nang_khieu ? (
                    <div className="nct-meta-row">
                      <span className="nct-meta-row-label">Môn năng khiếu</span>
                      <span className="nct-meta-row-value">
                        {meta.mon_nang_khieu}
                      </span>
                    </div>
                  ) : null}
                  {meta?.thoi_gian_dao_tao ? (
                    <div className="nct-meta-row">
                      <span className="nct-meta-row-label">Thời gian đào tạo</span>
                      <span className="nct-meta-row-value">
                        {meta.thoi_gian_dao_tao}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <MetaNote>
              Khối thi, Điểm chuẩn và chỉ tiêu khác nhau theo từng trường
            </MetaNote>
          </div>
        </div>
      </section>

      <div className="nct-layout">
        <main>
          <NganhArticleMedia article={article} part="video" />

          <NganhEditableIntro titleVi={titleVi} introHtml={introHtml} />

          <NganhArticleMedia article={article} part="banner" />

          <NganhMonHocSection items={monHoc} />

          <NganhCompareSection
            compareItems={compareItems}
            titleVi={titleVi}
            thisCompare={thisCompare}
            heroDesc={heroDesc}
            maNganh={meta?.ma_nganh}
          />


          {nghe.length > 0 ? (
            <>
              <div className="nct-sec-title">
                <div className="nct-sec-num">04</div>
                <div>
                  <h2 className="nct-sec-h">Ra trường làm nghề gì?</h2>
                  <div className="nct-sec-sub">
                    {nghe.length} hướng nghề nghiệp phổ biến
                  </div>
                </div>
              </div>
              <NctJobsGrid items={nghe} />
            </>
          ) : null}

          <NganhTruongSection rows={truong} />
        </main>

        <aside className="nct-side-col">
          <NganhDetailSidebar
            truong={truongRows}
            nghe={ngheSidebar}
            keywords={keywords}
          />
        </aside>
      </div>
    </>
  );
}

function NctInlineField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="nct-inline-field">
      <span className="nct-inline-field-label">{label}</span>
      {children}
    </label>
  );
}

function MetaNote({ children }: { children: ReactNode }) {
  return (
    <div className="meta-note">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
