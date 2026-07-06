export type TimKhoaHocLoai = "all" | "khoa" | "nganh";

export type TimKhoaHocSearchParams = {
  q: string;
  loai: TimKhoaHocLoai;
};

export function parseTimKhoaHocSearchParams(
  raw: Record<string, string | string[] | undefined>,
): TimKhoaHocSearchParams {
  const q = (typeof raw.q === "string" ? raw.q : "").trim();
  const loaiRaw = typeof raw.loai === "string" ? raw.loai : "";
  const loai: TimKhoaHocLoai =
    loaiRaw === "khoa" || loaiRaw === "nganh" ? loaiRaw : "all";
  return { q, loai };
}

export function timKhoaHocHubHref(opts?: {
  q?: string;
  loai?: TimKhoaHocLoai;
  hash?: string;
}): string {
  const params = new URLSearchParams();
  const q = opts?.q?.trim();
  if (q) params.set("q", q);
  if (opts?.loai && opts.loai !== "all") params.set("loai", opts.loai);
  const qs = params.toString();
  const hash = opts?.hash ? `#${opts.hash.replace(/^#/, "")}` : "";
  return `/tim-khoa-hoc${qs ? `?${qs}` : ""}${hash}`;
}
