const KHOI_MA_RE = /^[A-Z0-9]{2,8}$/;

export type AdminToHopMonFormFields = {
  ma_to_hop: string;
  ten_to_hop: string;
  mo_ta: string | null;
  mon_ids: string[];
};

export function formatToHopMonDbError(message: string): string {
  if (/duplicate key.*ma_to_hop|edu_to_hop_mon_ma_to_hop/i.test(message)) {
    return "Mã khối thi đã được dùng bởi khối khác.";
  }
  if (/foreign key|23503/i.test(message)) {
    return "Không xóa/sửa được: khối đang được trường hoặc cấu hình khác tham chiếu.";
  }
  return message;
}

export function parseAdminToHopMonForm(input: {
  ma_to_hop: FormDataEntryValue | null | undefined;
  ten_to_hop: FormDataEntryValue | null | undefined;
  mo_ta?: FormDataEntryValue | null | undefined;
  mon_ids?: FormDataEntryValue | null | undefined;
}): { ok: true; fields: AdminToHopMonFormFields } | { ok: false; message: string } {
  const ma_to_hop = String(input.ma_to_hop ?? "")
    .trim()
    .toUpperCase();
  if (!ma_to_hop) {
    return { ok: false, message: "Mã khối thi không được trống (vd. A00, B00)." };
  }
  if (!KHOI_MA_RE.test(ma_to_hop)) {
    return {
      ok: false,
      message: "Mã khối chỉ gồm chữ in hoa và số (2–8 ký tự, vd. A00, H02).",
    };
  }

  const ten_to_hop = String(input.ten_to_hop ?? "").trim();
  if (!ten_to_hop) {
    return { ok: false, message: "Tên khối thi không được trống." };
  }

  const mo_taRaw = String(input.mo_ta ?? "").trim();
  const mo_ta = mo_taRaw || null;

  const rawMon = String(input.mon_ids ?? "").trim();
  const mon_ids = rawMon.length
    ? rawMon.split(",").map((s) => s.trim())
    : [];

  const linkedIds = mon_ids.filter(Boolean);
  if (linkedIds.length === 0 && mon_ids.length === 0) {
    return { ok: false, message: "Chọn ít nhất một môn thi trong khối." };
  }

  const seen = new Set<string>();
  for (const id of linkedIds) {
    if (seen.has(id)) {
      return { ok: false, message: "Mỗi môn chỉ được chọn một lần trong khối." };
    }
    seen.add(id);
  }

  return { ok: true, fields: { ma_to_hop, ten_to_hop, mo_ta, mon_ids } };
}
