/** Ngày lịch VN (Asia/Ho_Chi_Minh) dạng YYYY-MM-DD. */
export function ngayVn(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function tachNiche(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s || "").trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,|/]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function diemTrungNiche(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const x of a) if (setB.has(x)) n += 1;
  return n;
}
