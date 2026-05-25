import { formatBlogDate } from "@/lib/bai-viet/utils";
import type { ArticleMeta } from "@/lib/articles/types";
import type { MetaPhanMem } from "@/lib/articles/types";

export function formatSoftwareWebsiteHost(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? trimmed;
  }
}

export function normalizeSoftwareWebsiteHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export type SoftwareMetaRowData = {
  label: string;
  raw: string;
  variant?: "default" | "success" | "link" | "placeholder";
  platforms?: string[];
};

export function buildSoftwareMetaCardRows(
  meta: MetaPhanMem | null,
  extras?: {
    goi_mien_phi?: string | null;
    gia_thanh?: string | null;
    hinh_thuc_mua?: string | null;
    link_tai?: string | null;
  },
  updatedAt?: string | null,
): SoftwareMetaRowData[] {
  const rows: SoftwareMetaRowData[] = [];

  if (meta?.nha_phat_hanh?.trim()) {
    rows.push({ label: "Nhà phát hành", raw: meta.nha_phat_hanh.trim() });
  }

  const price = extras?.gia_thanh?.trim() ?? meta?.gia_thanh?.trim();
  if (price) {
    rows.push({ label: "Giá thành", raw: price });
  }

  const purchase = extras?.hinh_thuc_mua?.trim() ?? meta?.hinh_thuc_mua?.trim();
  if (purchase) {
    rows.push({ label: "Hình thức mua", raw: purchase });
  }

  if (meta?.platform?.length) {
    rows.push({
      label: "Nền tảng",
      raw: "",
      platforms: meta.platform,
    });
  }

  if (meta?.version?.trim()) {
    rows.push({ label: "Phiên bản", raw: meta.version.trim() });
  }

  const free = extras?.goi_mien_phi?.trim() ?? meta?.goi_mien_phi?.trim();
  if (free) {
    rows.push({
      label: "Gói miễn phí",
      raw: free,
      variant: /có|yes|free|miễn phí/i.test(free) ? "success" : "default",
    });
  }

  const download = extras?.link_tai?.trim() ?? meta?.link_tai?.trim();
  if (download) {
    rows.push({
      label: "Link tải chính thức",
      raw: download,
      variant: "link",
    });
  }

  if (meta?.website?.trim()) {
    const site = meta.website.trim();
    if (
      !download ||
      normalizeSoftwareWebsiteHref(site) !==
        normalizeSoftwareWebsiteHref(download)
    ) {
      rows.push({
        label: "Website",
        raw: site,
        variant: "link",
      });
    }
  }

  if (updatedAt?.trim()) {
    rows.push({
      label: "Ngày cập nhật",
      raw: formatBlogDate(updatedAt),
    });
  }

  return rows;
}

/** Luôn hiển thị đủ dòng meta; thiếu dữ liệu thì dùng placeholder mẫu. */
export function buildSoftwareMetaCardDisplayRows(
  meta: MetaPhanMem | null,
  extras?: {
    goi_mien_phi?: string | null;
    gia_thanh?: string | null;
    hinh_thuc_mua?: string | null;
    link_tai?: string | null;
  },
  updatedAt?: string | null,
): SoftwareMetaRowData[] {
  const filled = buildSoftwareMetaCardRows(meta, extras, updatedAt);
  const byLabel = new Map(filled.map((r) => [r.label, r]));

  type TemplateRow = {
    label: string;
    placeholder: string;
    platforms?: string[];
  };

  const template: TemplateRow[] = [
    { label: "Nhà phát hành", placeholder: "Adobe Inc." },
    { label: "Giá thành", placeholder: "Từ 22 USD/tháng" },
    {
      label: "Hình thức mua",
      placeholder: "Thuê bao tháng · Creative Cloud",
    },
    {
      label: "Nền tảng",
      placeholder: "",
      platforms: ["Windows", "macOS"],
    },
    { label: "Phiên bản", placeholder: "2024" },
    { label: "Gói miễn phí", placeholder: "Dùng thử 7 ngày" },
    {
      label: "Link tải chính thức",
      placeholder: "adobe.com/products/aftereffects",
    },
    { label: "Ngày cập nhật", placeholder: "—" },
  ];

  return template.map((t) => {
    const existing = byLabel.get(t.label);
    if (existing) return existing;

    if (t.label === "Ngày cập nhật" && updatedAt?.trim()) {
      return { label: t.label, raw: formatBlogDate(updatedAt) };
    }

    if (t.platforms?.length) {
      return {
        label: t.label,
        raw: "",
        platforms: t.platforms,
        variant: "placeholder",
      };
    }

    return {
      label: t.label,
      raw: t.placeholder,
      variant: "placeholder",
    };
  });
}

export type SoftwareSpecRowData = {
  label: string;
  raw: string;
  variant?: "default" | "success" | "link";
  /** Nền tảng — nhiều tag */
  platforms?: string[];
};

export function buildSoftwareSpecRows(
  meta: MetaPhanMem | null,
  extras?: {
    goi_mien_phi?: string | null;
    tac_pham_tren_cins?: number | string | null;
    nguoi_dung_cins?: number | string | null;
  },
): SoftwareSpecRowData[] {
  const rows: SoftwareSpecRowData[] = [];

  if (meta?.nha_phat_hanh?.trim()) {
    rows.push({ label: "Nhà phát hành", raw: meta.nha_phat_hanh.trim() });
  }
  if (meta?.version?.trim()) {
    rows.push({ label: "Phiên bản", raw: meta.version.trim() });
  }
  if (meta?.platform?.length) {
    rows.push({
      label: "Nền tảng",
      raw: "",
      platforms: meta.platform,
    });
  }
  const free = extras?.goi_mien_phi?.trim();
  if (free) {
    rows.push({
      label: "Gói miễn phí",
      raw: free,
      variant: /có|yes|free/i.test(free) ? "success" : "default",
    });
  }
  if (meta?.website?.trim()) {
    rows.push({
      label: "Website",
      raw: meta.website.trim(),
      variant: "link",
    });
  }
  const works = extras?.tac_pham_tren_cins;
  if (works != null && String(works).trim() !== "") {
    rows.push({
      label: "Tác phẩm trên CINs",
      raw:
        typeof works === "number"
          ? works.toLocaleString("vi-VN")
          : String(works).trim(),
    });
  }
  const users = extras?.nguoi_dung_cins;
  if (users != null && String(users).trim() !== "") {
    rows.push({
      label: "Người dùng CINs",
      raw:
        typeof users === "number"
          ? `${users.toLocaleString("vi-VN")}+`
          : String(users).trim(),
    });
  }

  return rows;
}

export function readPhanMemMetaExtras(
  meta: ArticleMeta | null | undefined,
): {
  goi_mien_phi?: string | null;
  gia_thanh?: string | null;
  hinh_thuc_mua?: string | null;
  link_tai?: string | null;
  tac_pham_tren_cins?: number | string | null;
  nguoi_dung_cins?: number | string | null;
} {
  if (!meta || typeof meta !== "object") return {};
  const m = meta as Record<string, unknown>;
  return {
    goi_mien_phi:
      typeof m.goi_mien_phi === "string" ? m.goi_mien_phi : null,
    gia_thanh: typeof m.gia_thanh === "string" ? m.gia_thanh : null,
    hinh_thuc_mua:
      typeof m.hinh_thuc_mua === "string" ? m.hinh_thuc_mua : null,
    link_tai: typeof m.link_tai === "string" ? m.link_tai : null,
    tac_pham_tren_cins:
      typeof m.tac_pham_tren_cins === "number" ||
      typeof m.tac_pham_tren_cins === "string"
        ? m.tac_pham_tren_cins
        : null,
    nguoi_dung_cins:
      typeof m.nguoi_dung_cins === "number" ||
      typeof m.nguoi_dung_cins === "string"
        ? m.nguoi_dung_cins
        : null,
  };
}
