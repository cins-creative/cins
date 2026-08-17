/** Sentinel select «Thuộc nhóm» — seller đề xuất cấp cha mới, admin duyệt. */
export const ID_NHOM_MOI = "__new__";

const NHOM_MOI_RE = /Nhóm cha đề xuất:\s*(.{1,80}?)(?:\.|$)/u;

export function dongNhomMoi(ten: string): string {
  return `Nhóm cha đề xuất: ${ten.trim().slice(0, 80)}.`;
}

export function parseTenNhomMoi(moTa: string): string | null {
  const ten = moTa.match(NHOM_MOI_RE)?.[1]?.trim() ?? "";
  return ten || null;
}

export function moTaDeXuatDanhMuc(opts: {
  tuKhoa: string;
  chaTen: string | null;
  laTen: string | null;
  tenNhomMoi?: string | null;
}): string {
  const ten = opts.tuKhoa.trim() || "danh mục mới";
  const nhomMoi = opts.tenNhomMoi?.trim().slice(0, 80) || "";
  const parts = [`Seller đề xuất danh mục «${ten}».`];
  if (nhomMoi) parts.push(dongNhomMoi(nhomMoi));
  else if (opts.chaTen) parts.push(`Thuộc nhóm ${opts.chaTen}.`);
  else parts.push("Chưa rõ nhóm cha.");
  if (opts.laTen) parts.push(`Gần lá ${opts.laTen}.`);
  else parts.push("Đề xuất tạo lá mới.");
  return parts.join(" ").slice(0, 500);
}

export type HangChoDeXuatTomTat = {
  tenLa: string;
  tenCha: string | null;
  taoChaMoi: boolean;
  tenLaGan: string | null;
  hanhDong: "tao_la" | "gan_la" | "tao_cha";
};

/** Tách đề xuất khỏi đoạn `mo_ta` tự sinh — admin đọc cấu trúc, không đọc văn. */
export function tomTatHangChoDeXuat(opts: {
  tuKhoaChuan: string;
  moTa: string;
  tenDanhMucGanNhat: string | null;
  ganNhatLaCha?: boolean;
}): HangChoDeXuatTomTat {
  const tenLa = opts.tuKhoaChuan.trim() || "danh mục mới";
  const tenChaMoi = parseTenNhomMoi(opts.moTa);
  if (tenChaMoi) {
    return {
      tenLa,
      tenCha: tenChaMoi,
      taoChaMoi: true,
      tenLaGan: null,
      hanhDong: "tao_cha",
    };
  }
  if (opts.ganNhatLaCha && opts.tenDanhMucGanNhat) {
    return {
      tenLa,
      tenCha: opts.tenDanhMucGanNhat,
      taoChaMoi: false,
      tenLaGan: null,
      hanhDong: "tao_la",
    };
  }
  if (opts.tenDanhMucGanNhat) {
    return {
      tenLa,
      tenCha: null,
      taoChaMoi: false,
      tenLaGan: opts.tenDanhMucGanNhat,
      hanhDong: "gan_la",
    };
  }
  return {
    tenLa,
    tenCha: null,
    taoChaMoi: false,
    tenLaGan: null,
    hanhDong: "tao_la",
  };
}

export function hangChoHanhDongLabel(
  hanhDong: HangChoDeXuatTomTat["hanhDong"],
): string {
  if (hanhDong === "tao_cha") return "Tạo cấp cha + lá mới";
  if (hanhDong === "gan_la") return "Gần một lá có sẵn";
  return "Tạo lá mới";
}

export function matchParentByTen(
  parents: Array<{ id: string; ten: string }>,
  ten: string,
): { id: string; ten: string } | null {
  const needle = ten.trim().toLocaleLowerCase("vi");
  if (!needle) return null;
  return (
    parents.find((p) => p.ten.trim().toLocaleLowerCase("vi") === needle) ?? null
  );
}
