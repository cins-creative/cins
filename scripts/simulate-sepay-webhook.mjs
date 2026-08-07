/**
 * Gọi webhook SePay qua HTTP (test auth + handler).
 *
 *   node scripts/simulate-sepay-webhook.mjs CINS7F3A9C2604 100000
 *   node scripts/simulate-sepay-webhook.mjs CINS7F3A9C2604 100000 --url http://localhost:3001
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const urlFlagIdx = process.argv.indexOf("--url");
const baseUrl =
  (urlFlagIdx >= 0 ? process.argv[urlFlagIdx + 1] : null)?.trim() ||
  "http://localhost:3001";

const maCk = (args[0] ?? "").trim().toUpperCase();
const amount = Number(args[1] ?? 100000);

if (!maCk || !/^CINS[A-Z0-9]{10}$/i.test(maCk)) {
  console.error("Usage: node scripts/simulate-sepay-webhook.mjs CINSXXXXXXXXXX [amount] [--url http://localhost:3001]");
  process.exit(1);
}

const secret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
if (!secret) {
  console.error("Missing SEPAY_WEBHOOK_SECRET in .env.local");
  process.exit(1);
}

const sepayId = String(Math.floor(Math.random() * 1e9));
const payload = {
  id: Number(sepayId),
  gateway: "TPBank",
  transactionDate: new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
    .replace("T", " ")
    .slice(0, 19),
  accountNumber: "10001834654",
  content: maCk,
  code: maCk,
  transferType: "in",
  transferAmount: amount,
  referenceCode: "TEST-SIM",
};

const endpoint = `${baseUrl.replace(/\/$/, "")}/api/webhook/sepay`;
console.log("POST", endpoint);
console.log("payload", { id: payload.id, amount, content: maCk });

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Apikey ${secret}`,
  },
  body: JSON.stringify(payload),
});

const json = await res.json().catch(() => null);
console.log("HTTP", res.status, json);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (supabaseUrl && serviceKey) {
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: log } = await sb
    .from("cins_sepay_giao_dich")
    .select("id, sepay_id, trang_thai_xu_ly, ma_trich_xuat, id_thanh_toan, so_tien_vnd")
    .eq("sepay_id", sepayId)
    .maybeSingle();
  console.log("cins_sepay_giao_dich:", log);

  const { data: hd } = await sb
    .from("cins_hoa_don")
    .select("id, ma_tham_chieu, trang_thai, da_tra_vnd, so_tien_vnd")
    .eq("ma_tham_chieu", maCk)
    .maybeSingle();
  console.log("cins_hoa_don:", hd);
} else {
  console.log("(skip DB verify — thiếu SUPABASE env)");
}
