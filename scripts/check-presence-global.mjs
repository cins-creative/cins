/**
 * Đo topic presence toàn sàn `room-presence:__cins_global__` — CHỈ LẮNG NGHE.
 *
 * Script **không** `track()` nên không tự thêm mình vào presence, không ảnh
 * hưởng dữ liệu ai đang online. Mục đích: biết topic này nặng cỡ nào (Q7 của
 * `docs/PLAN_kien_truc_tin_nhan.md` — L-10), vì lưu lượng presence tăng theo
 * ~O(N²) số người online và ăn chung quota Realtime với chat.
 *
 * Chạy: node scripts/check-presence-global.mjs [số giây, mặc định 45]
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const anon = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ""
).trim();

if (!url || !anon) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const seconds = Number(process.argv[2]) || 45;
const TOPIC = "room-presence:__cins_global__";

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let syncCount = 0;
let joinCount = 0;
let leaveCount = 0;
let maxOnline = 0;
let lastStateBytes = 0;
const seenUsers = new Set();

const channel = supabase.channel(TOPIC);

const snapshot = (label) => {
  const state = channel.presenceState();
  const keys = Object.keys(state);
  for (const k of keys) seenUsers.add(k);
  maxOnline = Math.max(maxOnline, keys.length);
  lastStateBytes = JSON.stringify(state).length;
  console.log(
    `[${new Date().toISOString().slice(11, 19)}] ${label} — online=${keys.length}, payload=${lastStateBytes}B`,
  );
};

channel
  .on("presence", { event: "sync" }, () => {
    syncCount += 1;
    snapshot("sync");
  })
  .on("presence", { event: "join" }, () => {
    joinCount += 1;
  })
  .on("presence", { event: "leave" }, () => {
    leaveCount += 1;
  })
  .subscribe((status) => {
    console.log("subscribe status:", status);
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      console.error(
        "Không join được topic — có thể project bật private channels cho presence.",
      );
    }
  });

console.log(`Đang lắng nghe ${TOPIC} trong ${seconds}s (không track)...\n`);

setTimeout(async () => {
  console.log("\n===== KẾT QUẢ =====");
  console.log(`Thời gian đo:            ${seconds}s`);
  console.log(`Người online (cao nhất): ${maxOnline}`);
  console.log(`User khác nhau thấy được:${seenUsers.size}`);
  console.log(`Payload presenceState:   ${lastStateBytes} B (lần cuối)`);
  console.log(`Sự kiện sync:            ${syncCount}`);
  console.log(`Sự kiện join / leave:    ${joinCount} / ${leaveCount}`);
  console.log(
    `\nƯớc lượng: mỗi join/leave khiến MỖI client online nhận 1 sync mang cả` +
      ` danh sách. Với N online: ~N × payload cho mỗi thay đổi.`,
  );
  if (maxOnline > 0) {
    const perChange = maxOnline * lastStateBytes;
    console.log(
      `Với N=${maxOnline} hiện tại: ~${(perChange / 1024).toFixed(1)} KB đẩy ra mỗi lần có người vào/ra.`,
    );
  }
  await supabase.removeChannel(channel);
  process.exit(0);
}, seconds * 1000);
