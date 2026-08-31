/**
 * Thử HTTP Broadcast của Supabase Realtime — không đụng bảng nghiệp vụ.
 * Chạy: node scripts/check-chat-broadcast.mjs
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !service) {
  console.error("Thiếu URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const topic = `cins-broadcast-probe:${Date.now()}`;
const body = JSON.stringify({
  messages: [
    {
      topic,
      event: "probe",
      payload: { ok: true, at: new Date().toISOString() },
    },
  ],
});

const endpoints = [
  `${url}/realtime/v1/api/broadcast`,
  `${url}/realtime/v1/broadcast`,
];

for (const ep of endpoints) {
  const res = await fetch(ep, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body,
  });
  const text = await res.text();
  console.log(`HTTP ${res.status} ${ep}`);
  console.log(text.slice(0, 400) || "(empty body)");
  console.log("---");
}

const db = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});
try {
  const { data, error } = await db.rpc("realtime.send", {
    payload: { ok: true },
    event: "probe",
    topic,
    private: false,
  });
  console.log("rpc realtime.send:", error ? error.message : data);
} catch (err) {
  console.log("rpc realtime.send throw:", err instanceof Error ? err.message : err);
}
