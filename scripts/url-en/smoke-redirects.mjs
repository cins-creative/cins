/**
 * Smoke test redirect legacy URL → URL tiếng Anh.
 *
 *   node scripts/url-en/smoke-redirects.mjs [baseUrl]
 *
 * Mỗi dòng: `<status> <url cũ> -> <Location>`. Kỳ vọng 308 cho path/query cũ,
 * 200/3xx-auth cho URL mới.
 */
const BASE = process.argv[2] ?? "http://localhost:3005";

const CASES = [
  "/ban-hang/kho/tui-deo-cheo-canvas-harumasa-sunday",
  "/cua-hang/mat-hang",
  "/co-so-dao-tao",
  "/truong-dai-hoc/abc",
  "/nghe-nghiep",
  "/nghe-nghiep?tab=nganh-hoc",
  "/nganh-hoc?nhom=CNTT",
  "/thong-tin-du-an",
  "/ho-tro/huong-dan",
  "/tim-khoa-hoc",
  "/luoi",
  "/api/shop/bao-cao",
  "/abc?view=gallery&display=luoi",
  "/seller/inventory/tui-deo-cheo-canvas-harumasa-sunday",
  "/shopping/category",
  "/university/abc",
];

for (const path of CASES) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    console.log(`${res.status}  ${path.padEnd(52)} -> ${loc}`);
  } catch (err) {
    console.log(`ERR  ${path.padEnd(52)} -> ${err.message}`);
  }
}
