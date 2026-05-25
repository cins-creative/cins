const LOAI_LABELS: Record<string, string> = {
  nghe: "nghe",
  keyword: "keyword",
  phan_mem: "phan_mem",
  mon_hoc: "mon_hoc",
  nganh_dao_tao: "nganh",
  blog: "blog",
  event: "event",
};

const STATUS_LABELS: Record<string, string> = {
  published: "published",
  cho_review: "cho_review",
  dang_viet: "dang_viet",
  archived: "archived",
  merged: "merged",
};

const TIN_CAY_LABELS: Record<string, string> = {
  binh_thuong: "Bình thường",
  dang_review: "Đang review",
  bi_canh_bao: "Cảnh báo",
  bi_cam: "Bị cấm",
  verified_official: "✓ Verified",
};

function badgeClass(prefix: string, value: string): string {
  const safe = value.replace(/[^a-z0-9_]/gi, "_");
  return `badge badge-${prefix === "loai" ? (LOAI_LABELS[value] ?? safe) : safe}`;
}

export function BadgeLoai({ loai }: { loai: string }) {
  return <span className={badgeClass("loai", loai)}>{loai}</span>;
}

export function BadgeTrangThai({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  return <span className={`badge badge-${label}`}>{status}</span>;
}

export function BadgeTinCay({ status }: { status: string }) {
  const label = TIN_CAY_LABELS[status] ?? status;
  const cls =
    status === "verified_official"
      ? "badge badge-verified"
      : `badge badge-${status}`;
  return <span className={cls}>{label}</span>;
}
