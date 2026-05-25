"use client";

import type { ReactNode } from "react";

import { SwInlineField } from "@/components/article/software/inline/SwInlineField";
import { useSoftwareInlineEdit } from "@/components/article/software/inline/SoftwareInlineEditContext";
import {
  buildSoftwareMetaCardDisplayRows,
  formatSoftwareWebsiteHost,
  normalizeSoftwareWebsiteHref,
  readPhanMemMetaExtras,
} from "@/lib/articles/software-summary-helpers";
import { isMetaPhanMem } from "@/lib/articles/meta-phan-mem";
import type { ArticleBaiViet, MetaPhanMem } from "@/lib/articles/types";

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="sw-meta-row">
      <span className="sw-meta-row-label">{label}</span>
      <div className="sw-meta-row-value">{children}</div>
    </div>
  );
}

function buildMetaFromCtx(
  ctx: NonNullable<ReturnType<typeof useSoftwareInlineEdit>>,
): MetaPhanMem {
  return {
    nha_phat_hanh: ctx.nha_phat_hanh.trim(),
    version: ctx.version.trim(),
    platform: ctx.platform_text
      .split(/[,，\n]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    website: ctx.website.trim() || undefined,
    goi_mien_phi: ctx.goi_mien_phi.trim() || null,
    gia_thanh: ctx.gia_thanh.trim() || null,
    hinh_thuc_mua: ctx.hinh_thuc_mua.trim() || null,
    link_tai: ctx.link_tai.trim() || null,
    tac_pham_tren_cins: ctx.tac_pham_tren_cins.trim() || null,
    nguoi_dung_cins: ctx.nguoi_dung_cins.trim() || null,
  };
}

/** Phần bảng meta — nhúng trong `sw-spec-card`. */
export function SoftwareMetaSection({ article }: { article: ArticleBaiViet }) {
  const ctx = useSoftwareInlineEdit();

  const meta = ctx?.isEditing
    ? buildMetaFromCtx(ctx)
    : isMetaPhanMem(article.meta)
      ? article.meta
      : null;

  const extras = ctx?.isEditing
    ? {
        goi_mien_phi: meta?.goi_mien_phi,
        gia_thanh: meta?.gia_thanh,
        hinh_thuc_mua: meta?.hinh_thuc_mua,
        link_tai: meta?.link_tai,
      }
    : readPhanMemMetaExtras(article.meta);

  const rows = buildSoftwareMetaCardDisplayRows(
    meta,
    extras,
    article.cap_nhat_luc,
  );

  if (ctx?.isEditing) {
    return (
      <div className="sw-spec-meta sw-spec-meta--editing">
        <p className="sw-spec-meta-heading">Thông tin phần mềm</p>
        <SwInlineField label="Nhà phát hành">
          <input
            className="nct-inline-input"
            value={ctx.nha_phat_hanh}
            onChange={(e) => ctx.setNhaPhatHanh(e.target.value)}
            placeholder="Adobe Inc."
          />
        </SwInlineField>
        <SwInlineField label="Giá thành">
          <input
            className="nct-inline-input"
            value={ctx.gia_thanh}
            onChange={(e) => ctx.setGiaThanh(e.target.value)}
            placeholder="Từ 22 USD/tháng"
          />
        </SwInlineField>
        <SwInlineField label="Hình thức mua">
          <input
            className="nct-inline-input"
            value={ctx.hinh_thuc_mua}
            onChange={(e) => ctx.setHinhThucMua(e.target.value)}
            placeholder="Thuê bao tháng · Creative Cloud"
          />
        </SwInlineField>
        <SwInlineField label="Phiên bản">
          <input
            className="nct-inline-input"
            value={ctx.version}
            onChange={(e) => ctx.setVersion(e.target.value)}
            placeholder="2024"
          />
        </SwInlineField>
        <SwInlineField label="Nền tảng (cách nhau bởi dấu phẩy)">
          <input
            className="nct-inline-input"
            value={ctx.platform_text}
            onChange={(e) => ctx.setPlatformText(e.target.value)}
            placeholder="Windows, macOS"
          />
        </SwInlineField>
        <SwInlineField label="Gói miễn phí">
          <input
            className="nct-inline-input"
            value={ctx.goi_mien_phi}
            onChange={(e) => ctx.setGoiMienPhi(e.target.value)}
            placeholder="Dùng thử 7 ngày"
          />
        </SwInlineField>
        <SwInlineField label="Link tải chính thức">
          <input
            className="nct-inline-input"
            value={ctx.link_tai}
            onChange={(e) => ctx.setLinkTai(e.target.value)}
            placeholder="https://adobe.com/products/aftereffects"
          />
        </SwInlineField>
        <SwInlineField label="Website">
          <input
            className="nct-inline-input"
            value={ctx.website}
            onChange={(e) => ctx.setWebsite(e.target.value)}
          />
        </SwInlineField>
      </div>
    );
  }

  return (
    <div className="sw-spec-meta" aria-label="Thông tin phần mềm">
      <div className="sw-spec-meta-grid">
        {rows.map((row) => (
          <MetaRow key={row.label} label={row.label}>
            {row.platforms?.length ? (
              <div className="sw-meta-tags">
                {row.platforms.map((p) => (
                  <span
                    key={p}
                    className={[
                      "sw-meta-tag",
                      row.variant === "placeholder" ? "is-placeholder" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : row.variant === "link" ? (
              <a
                href={normalizeSoftwareWebsiteHref(row.raw)}
                className="sw-meta-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {formatSoftwareWebsiteHost(row.raw)}
                <span aria-hidden> ↗</span>
              </a>
            ) : (
              <span
                className={[
                  "sw-meta-text",
                  row.variant === "success" ? "sw-meta-text--success" : "",
                  row.variant === "placeholder"
                    ? "sw-meta-text--placeholder"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {row.raw}
              </span>
            )}
          </MetaRow>
        ))}
      </div>
    </div>
  );
}
