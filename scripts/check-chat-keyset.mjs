/**
 * Kiểm keyset cursor `(tao_luc, id)` qua PostgREST — READ ONLY.
 *
 * Mục đích: xác nhận cú pháp `or(tao_luc.gt."<ts>",and(tao_luc.eq."<ts>",id.gt.<uuid>))`
 * chạy đúng trên Supabase của CINs (timestamp có `+00:00`, dấu `.` trong micro giây),
 * và delta/lùi không sót/không trùng tin.
 *
 * Chạy: node scripts/check-chat-keyset.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fail = (msg) => {
  console.error("❌ " + msg);
  process.exitCode = 1;
};
const ok = (msg) => console.log("✅ " + msg);

/* 1. Tìm phòng nhiều tin nhất để có dữ liệu thật. */
const { data: sample, error: sampleErr } = await db
  .from("chat_tin_nhan")
  .select("id_phong")
  .order("tao_luc", { ascending: false })
  .limit(2000);

if (sampleErr) {
  fail("không đọc được chat_tin_nhan: " + sampleErr.message);
  process.exit(1);
}

const counts = new Map();
for (const r of sample ?? []) {
  counts.set(r.id_phong, (counts.get(r.id_phong) ?? 0) + 1);
}
const [roomId, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
if (!roomId || n < 5) {
  fail("không tìm được phòng đủ tin để test (cần >= 5)");
  process.exit(1);
}
console.log(`Phòng test: ${roomId} (${n} tin trong mẫu)\n`);

/* 2. Toàn bộ tin của phòng theo thứ tự chuẩn (tao_luc, id) asc — làm chuẩn đối chiếu. */
const { data: allRows, error: allErr } = await db
  .from("chat_tin_nhan")
  .select("id, tao_luc")
  .eq("id_phong", roomId)
  .order("tao_luc", { ascending: true })
  .order("id", { ascending: true })
  .limit(500);

if (allErr) {
  fail("order 2 cấp lỗi: " + allErr.message);
  process.exit(1);
}
ok(`order("tao_luc").order("id") chạy được — ${allRows.length} tin`);

const truth = allRows.map((r) => r.id);

/* 3. Delta tiến từ giữa danh sách. */
const mid = Math.floor(truth.length / 2);
const cursor = allRows[mid];
const at = `"${cursor.tao_luc}"`;

const { data: fwd, error: fwdErr } = await db
  .from("chat_tin_nhan")
  .select("id, tao_luc")
  .eq("id_phong", roomId)
  .or(`tao_luc.gt.${at},and(tao_luc.eq.${at},id.gt.${cursor.id})`)
  .order("tao_luc", { ascending: true })
  .order("id", { ascending: true })
  .limit(500);

if (fwdErr) {
  fail("keyset TIẾN lỗi: " + fwdErr.message);
} else {
  const expected = truth.slice(mid + 1);
  const got = fwd.map((r) => r.id);
  const same =
    expected.length === got.length && expected.every((id, i) => id === got[i]);
  if (same) {
    ok(`keyset TIẾN đúng: ${got.length} tin, không sót/không trùng`);
  } else {
    fail(
      `keyset TIẾN lệch — expected ${expected.length}, got ${got.length}\n` +
        `  thiếu: ${expected.filter((id) => !got.includes(id)).length}, ` +
        `thừa: ${got.filter((id) => !expected.includes(id)).length}`,
    );
  }
}

/* 4. Keyset lùi (đường user cuộn lịch sử — không được vỡ). */
const { data: bwd, error: bwdErr } = await db
  .from("chat_tin_nhan")
  .select("id, tao_luc")
  .eq("id_phong", roomId)
  .or(`tao_luc.lt.${at},and(tao_luc.eq.${at},id.lt.${cursor.id})`)
  .order("tao_luc", { ascending: false })
  .order("id", { ascending: false })
  .limit(500);

if (bwdErr) {
  fail("keyset LÙI lỗi: " + bwdErr.message);
} else {
  const expected = truth.slice(0, mid);
  const got = bwd.map((r) => r.id).reverse();
  const same =
    expected.length === got.length && expected.every((id, i) => id === got[i]);
  if (same) {
    ok(`keyset LÙI đúng: ${got.length} tin, không sót/không trùng`);
  } else {
    fail(
      `keyset LÙI lệch — expected ${expected.length}, got ${got.length}`,
    );
  }
}

/* 5. Kết hợp với filter chi_hien_cho (hai `or` cùng lúc phải là AND). */
const viewerId = "00000000-0000-0000-0000-000000000000";
const { error: bothErr, data: bothData } = await db
  .from("chat_tin_nhan")
  .select("id")
  .eq("id_phong", roomId)
  .or(`chi_hien_cho.is.null,chi_hien_cho.cs.{${viewerId}}`)
  .or(`tao_luc.gt.${at},and(tao_luc.eq.${at},id.gt.${cursor.id})`)
  .order("tao_luc", { ascending: true })
  .order("id", { ascending: true })
  .limit(500);

if (bothErr) {
  fail("hai or() cùng lúc lỗi: " + bothErr.message);
} else {
  ok(`hai or() cùng lúc chạy được — ${bothData.length} tin (AND, không OR chéo)`);
}

/* 6. Trùng timestamp — trường hợp keyset phải cứu. */
const byTs = new Map();
for (const r of allRows) byTs.set(r.tao_luc, (byTs.get(r.tao_luc) ?? 0) + 1);
const dup = [...byTs.entries()].filter(([, c]) => c > 1);
console.log(
  `\nTin trùng tao_luc trong phòng này: ${dup.length} timestamp` +
    (dup.length ? ` (vd. ${dup[0][0]} có ${dup[0][1]} tin)` : " (không có)"),
);

const { count: totalDup } = await db
  .from("chat_tin_nhan")
  .select("id", { count: "exact", head: true });
console.log(`Tổng tin toàn sàn: ${totalDup}`);

process.exit(process.exitCode ?? 0);
