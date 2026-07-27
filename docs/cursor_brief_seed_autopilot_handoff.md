# Brief — Nick seeding + Autopilot (bàn giao chat mới)

> **Mục đích:** bàn giao từ cloud agent chat tư duy → agent mới có Cursor Environment + Secrets.  
> **Ngày tóm tắt:** 2026-07-26  
> **Repo:** `cins-creative/cins`  
> **Chat cũ:** không có DB secrets (`environment: null`) — việc ghi DB phải làm ở **agent mới** gắn env đã setup.

---

## 0. Việc agent mới làm NGAY (ưu tiên 1)

### Thay avatar + cover cho 10 tài khoản seeding

1. Xác nhận env có secret: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (và CF images hash nếu cần resolve URL).
2. Query `user_nguoi_dung` theo **slug** (bảng dưới).
3. Tự do chọn **10 avatar + 10 cover** phong cách **wibu / anime vui nhẹ** từ ảnh đã có trên hệ thống (reuse `avatar_id` / `cover_id` Cloudflare của user khác, hoặc kho ảnh hợp lệ trong DB — **không** scrape ảnh lạ nếu không upload được CF).
4. `UPDATE` từng user: gán `avatar_id`, `cover_id`.
5. Báo cáo lại: bảng slug → avatar_id → cover_id (và URL xem nhanh nếu có).

**Không** commit mật khẩu vào git. Login/script nếu cần: đọc từ Cursor Runtime Secret (VD `CINS_SEED_PASSWORD`) — user đã tạo 10 nick; mật khẩu chung từng gửi trong chat cũ → **nên đã/đổi và chỉ để trong Secrets**.

### Roster seeding (đã tạo) — phân kênh Autopilot

| Kênh | Nick | Việc |
|---|---|---|
| **ArtStation** (3) | `kiritominh` · `hinatavy` · `levikhoa` | Curator tranh AS |
| **Behance** (3) | `yukitrang` · `sakuralinh` · `remnhi` | Curator Behance (extension) |
| **Pixiv** (3) | `itachihung` · `mikungoc` · `nezukochi` | Curator Pixiv (extension) |
| **Truyện** (1) | `zorobao` | **Chờ brief** — Autopilot `dang_bat=false` |

Tag niche: `nguon:artstation` / `nguon:behance` / `nguon:pixiv` / `nguon:truyen`. Router `chuan-bi-dang` chỉ gán mục cùng kênh.

**Admin UI:** `/admin/tai-khoan-ai` — quản lý nick / nguồn / hàng đợi / duyệt / đăng (gate admin).

Watchlist mẫu: `npm run autopilot -- them-nguon-mau` (nhiều artist, không chỉ WLOP).

| # | Tên hiển thị | Slug | Email | `giai_doan` | Giới thiệu (đã set) | Kênh |
|---|---|---|---|---|---|---|
| 1 | Kirito Minh | `kiritominh` | kiritominh@cins.vn | dang_hoc | Sinh viên năm 3 thiết kế, nhân vật fantasy, rigging; fan isekai | ArtStation |
| 2 | Hinata Vy | `hinatavy` | hinatavy@cins.vn | dang_hoc | Digital painting, ánh sáng chiều; fan slice of life | ArtStation |
| 3 | Yuki Trang | `yukitrang` | yukitrang@cins.vn | dang_lam | 2D animator studio nhỏ; cut-out + frame-by-frame | Behance |
| 4 | Levi Khoa | `levikhoa` | levikhoa@cins.vn | dang_lam | Concept vũ khí/giáp; silhouette sạch | ArtStation |
| 5 | Itachi Hùng | `itachihung` | itachihung@cins.vn | dang_lam | 3D character game mobile; tone tối/ninja | Pixiv |
| 6 | Sakura Linh | `sakuralinh` | sakuralinh@cins.vn | freelance | Fanart + bìa LN; pastel, commission | Behance |
| 7 | Zoro Bảo | `zorobao` | zorobao@cins.vn | freelance | Manga B&W + storyboard | Truyện (sau) |
| 8 | Rem Nhi | `remnhi` | remnhi@cins.vn | tim_viec | Mới tốt nghiệp; character design; đang cân portfolio | Behance |
| 9 | Nezuko Chi | `nezukochi` | nezukochi@cins.vn | tim_viec | Colorist webtoon; bảng cam hồng | Pixiv |
| 10 | Miku Ngọc | `mikungoc` | mikungoc@cins.vn | dang_day | Dạy vẽ anime thiếu nhi; chibi commission | Pixiv |

Sau khi xong avatar/cover → **báo cáo các bước tiếp theo** (mục 3 bên dưới), không nhất thiết implement hết trong một turn.

---

## 1. Bối cảnh chiến lược (đã chốt hướng)

- Acquisition giai đoạn này: **artist / wibu** — shop + Journey portfolio; **không** lấy user bằng focus CSĐT.
- Định vị **đổi theo giai đoạn** (xương sống Journey/sáng tạo giữ; câu ra ngoài giai đoạn 1 ≈ tìm/mua artist).
- Cold start content: hướng **curator / giới thiệu** từ **ArtStation + Behance + Pixiv** — link/embed + attribution về nguồn; AI soạn tiêu đề & mô tả ngắn.
- **10 nick** ở trên dùng làm mặt đăng (seed). Caption AI phải tránh giọng “tôi là tác giả ảnh gốc” khi chỉ dẫn nguồn ngoài.
- Tương tác ảo (AI like/comment): **kỹ thuật làm được**; trust/ops user tự siết sau — **không** nằm trong MVP publish.
- Import Shopee: cần Chrome + extension (không cài được trên Cursor browser / Chrome mobile đầy đủ). Mobile chỉ «Chỉ lấy tên + ảnh». Multi-account seed Shopee: Chrome multi-profile.

---

## 2. Cursor Cloud / secrets (đã hướng dẫn user)

- Thêm secret tại [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents) → Environment → Secrets.
- Để hết **Runtime Secret** vẫn OK; `NEXT_PUBLIC_*` có thể là Environment Variable.
- Agent đang chạy / chat cũ **không** tự nhận secret mới → cần **agent mới** sau Save + sau khi Development environment setup xong.
- **Không** push `.env.local` lên GitHub.

**Secret Phase 0 (đăng bài nội bộ):**

| Env | Việc |
|---|---|
| `CINS_NOI_BO_DANG_BAI_SECRET` | Bearer token gọi `POST /api/noi-bo/tac-pham/dang` |
| `CINS_NICK_SEED_SLUGS` | (tuỳ chọn) csv slug bổ sung ngoài 10 nick mặc định |

---

## 3. Sau avatar/cover — kế hoạch build Autopilot (GitHub Actions)

### Mục tiêu MVP

Repo tool (có thể repo mới hoặc thư mục/`apps` sau) + GitHub Actions cron:

- Danh sách theo dõi Behance + ArtStation (allowlist — **không** scrape cả sàn).
- Thu thập meta/OG project mới.
- Ghép niche → 1 trong 10 nick; hạn mức **3 bài/ngày/nick**.
- AI tiêu đề + mô tả ngắn + dòng ghi nguồn bắt buộc.
- Đăng lên Journey CINs (API nội bộ + secret).
- Chống trùng theo `urlNguon` / `canonical_url`.

### Các giai đoạn

| Giai đoạn | Việc |
|---|---|
| **0** ✅ | Chốt API đăng bài nội bộ + format khối link/embed |
| **1** ✅ | Khung worker + CLI + bảng `auto_*` (monorepo `tools/autopilot`) |
| **2** ✅ | Thu thập ArtStation (RSS) + Behance/Pixiv (extension / `nhap-muc`) |
| **3** ✅ | Ghép niche + hạn mức 10×3/ngày (múi giờ VN) — `chuan-bi-dang` / `chay-dang` |
| **4** ✅ | Soạn bài AI (`tools/autopilot/lib/soan-bai-ai.mjs`, cấm xưng tác giả gốc; `--khong-ai`) |
| **5** ✅ | Đăng CINs qua API + `auto_da_dang` idempotent URL |
| **6** ✅ | GitHub Actions `autopilot-chay-dang.yml` (cần secrets GH + merge) |
| **7** | (Sau) tương tác ảo like/comment — tắt mặc định |

### Việc user cần chốt khi build

1. Đăng bằng **API nội bộ** hay **phiên đăng nhập 10 nick**? → **Đã chọn API nội bộ** (Giai đoạn 0).
2. Duyệt tay bản thảo giai đoạn đầu: có/không?
3. Danh sách theo dõi ban đầu: ai chọn 50–200 artist/niche?
4. Tool để **repo mới** hay monorepo trong `cins`? → **Đã chọn monorepo** `tools/autopilot`.

---

## 3c. Giai đoạn 1 — khung worker (đã ship)

### Bảng (prefix `auto_`, service role only)

`auto_tai_khoan` · `auto_nguon` · `auto_muc` · `auto_ban_thao` · `auto_da_dang` · `auto_han_muc` · `auto_viec`

SQL: `supabase/sql/migration_autopilot_giai_doan_1.sql`  
Runner: `npm run migrate:autopilot`

### CLI

```bash
npm run autopilot -- trang-thai
npm run autopilot -- dong-bo-nick
npm run autopilot -- them-nguon --nen-tang artstation --url 'https://…' --niche fantasy
npm run autopilot -- liet-ke nguon|nick|muc
npm run autopilot -- tao-viec --loai quet_nguon
```

Code: `tools/autopilot/` · README cùng thư mục.

---

## 3d. Giai đoạn 2 — thu thập

### ArtStation (ưu tiên)

- Feed: `https://www.artstation.com/{username}.rss` qua `SINE_ART_WORKER_URL` / `SINE_ART_WORKER_SECRET`
- CLI: `npm run autopilot -- quet-nguon --nen-tang artstation [--gioi-han 30] [--chi-xem]`
- Ghi `auto_muc` (`url_canonic` unique, `trang_thai=moi`); cập nhật `auto_nguon.lan_quet_luc`

### Behance

- JSON/RSS/HTML từ môi trường cloud hiện **bị Cloudflare 403**
- **Cách chính:** Chrome extension `extensions/cins-behance-import` — quét tab Behance đang mở → `POST /api/noi-bo/auto/muc` → `auto_muc` (+ tự tạo `auto_nguon` từ username)
- Tạm CLI: `npm run autopilot -- nhap-muc --url 'https://www.behance.net/gallery/…' --tieu-de '…' --tac-gia '…'`
- Pack zip: `npm run pack:behance-ext`

### Pixiv

- Ajax server-side thường **403** — scrap trong browser
- **Cách chính:** Chrome extension `extensions/cins-pixiv-import` — mở `/users/{id}` → Quét → Gửi → `POST /api/noi-bo/auto/muc` (`nenTang: "pixiv"`)
- CLI: `npm run autopilot -- nhap-muc --url 'https://www.pixiv.net/artworks/…' --tieu-de '…' --tac-gia '…'`
- Pack zip: `npm run pack:pixiv-ext`
- Migrate CHECK: `npm run migrate:autopilot-pixiv`

### Code map Giai đoạn 2

- `tools/autopilot/lib/artstation.mjs` · `behance.mjs` · `pixiv.mjs` · `fetch-html.mjs` · `luu-muc.mjs`
- `tools/autopilot/lenh/quet-nguon.mjs` · `nhap-muc.mjs`
- API: `app/api/noi-bo/auto/muc/route.ts` · `lib/autopilot/luu-muc-batch.ts` · `dam-bao-nguon.ts`
- Extension: `extensions/cins-behance-import/` · `extensions/cins-pixiv-import/`

---

## 3e. Giai đoạn 3 — soạn + lịch đăng

Luồng: scrap nhiều (ArtStation CLI / Behance·Pixiv extension) → hàng đợi `auto_muc` → ghép nick → đăng theo hạn mức.

```bash
npm run autopilot -- chuan-bi-dang [--gioi-han 30] [--chi-xem] [--slug nick]
npm run autopilot -- chay-dang [--gioi-han 30] [--chi-xem] [--slug nick]
npm run autopilot -- liet-ke ban-thao
```

| Bước | Việc |
|---|---|
| `chuan-bi-dang` | `auto_muc` (`moi`) → AI caption → `auto_ban_thao` **`cho_duyet`** (mặc định); `--san-sang` bỏ duyệt |
| `duyet-ban-thao` | `cho_duyet` → `san_sang` (duyệt tay trước khi đăng) |
| `chay-dang` | Chỉ `san_sang` → API đăng; gửi `anhBiaUrl` từ `auto_muc.anh_bia_url` làm cover CF; hạn mức/ngày VN |

Cron: `.github/workflows/autopilot-chay-dang.yml` — soạn `cho_duyet` + chỉ đăng bài đã duyệt `san_sang`.

**Ảnh:** ArtStation không phải Tier-1 iframe; cover lấy từ `anh_bia_url` (RSS) → upload CF. Không có `anh_bia_url` → nền chữ màu (như bản thử trước).

---

## 3b. Giai đoạn 0 — hợp đồng API (đã ship trong repo)

### Endpoint

`POST /api/noi-bo/tac-pham/dang`

Header: `Authorization: Bearer <CINS_NOI_BO_DANG_BAI_SECRET>`

### Body (JSON)

| Field | Bắt buộc | Ý nghĩa |
|---|---|---|
| `slugChu` | ✅ | Nick seeding (allowlist 10 slug) |
| `urlNguon` | ✅ | URL Behance / ArtStation / Pixiv (http/s) |
| `tieuDe` | ✅* | Tiêu đề (*rỗng → mặc định app) |
| `moTa` | | Mô tả ngắn (AI sau) |
| `nenTang` | | `artstation` \| `behance` \| `khac` (tự đoán từ URL nếu bỏ) |
| `tenTacGiaNguon` | | Tên artist nguồn — gắn dòng ghi nguồn |
| `dongGhiNguon` | | Ghi đè attribution |
| `coverId` | | CF image id (không có → thử auto cover OG) |
| `loaiMoc` | | mặc định `du_an` |
| `cheDoHienThi` | | mặc định `public` |
| `thoiDiem` | | `YYYY-MM-DD` |
| `blocks` | | Tuỳ chọn; bỏ trống → tự ghép khối |
| `chiKiemTra` | | `true` = dry-run, không ghi DB |

### Khối mặc định (khi không gửi `blocks`)

1. `body` — `moTa` (nếu có)
2. `embed` — `{ url: urlNguon }` (Behance/ArtStation/Pixiv = card link, không iframe)
3. `body` — dòng ghi nguồn dạng *«Giới thiệu từ Pixiv — {tác giả}. Xem bản gốc: …»*

### Response

- `201` (hoặc `200` nếu `chiKiemTra`): `{ ok, slugChu, slugBai, idCotMoc, idTacPham, duongDan, nenTang, urlNguon }`
- `401` thiếu/sai secret · `403` slug ngoài allowlist · `422` validate nội dung

### Code map

- `app/api/noi-bo/tac-pham/dang/route.ts`
- `lib/editor/dang-bai-journey.ts`
- `lib/editor/khoi-bai-nguon.ts`
- `lib/noi-bo/xac-thuc-bearer.ts` · `danh-sach-nick-seed.ts`

---

## 4. Prompt gợi ý dán vào chat mới

```
Đọc docs/cursor_brief_seed_autopilot_handoff.md.

Bước 1 (làm ngay): truy cập DB (Supabase service role từ env), chọn 10 avatar + 10 cover wibu vui từ ảnh đã có trên hệ thống, UPDATE cho 10 slug seeding trong brief. Báo cáo bảng slug → avatar_id → cover_id.

Bước 2: sau khi xong, báo cáo các bước tiếp theo để build agent seeding (Behance + ArtStation → 10 nick × 3 bài/ngày) chạy trên GitHub Actions — theo mục 3 của brief. Chưa code hết trừ khi mình bảo làm tiếp Giai đoạn 0.
```

---

## 5. Tài liệu CINs liên quan

- Router: [`CINS_INSTRUCTION.md`](./CINS_INSTRUCTION.md)
- Shop / import Shopee: `CINS_IMPLEMENTATION.md` § Shop UGC · `lib/shop/shopee/`
- Embed / auto thumb Journey: IMPLEMENTATION *Embed → Gallery thumbnail*
- Khối Journey: [`cursor_brief_journey_blocks_css.md`](./cursor_brief_journey_blocks_css.md)
- Dev rules / security: `CINS_DEV_RULES.md`

---

## 6. Ngoài scope chat cũ (không làm nhầm)

- Không deploy Cloudflare từ agent nếu thiếu token (merge `main` → Actions `cloudflare-deploy.yml`).
- Không cài extension Shopee trên Cursor browser.
- Không scrape X/FB làm engine seed chính (đã chuyển sang Behance/ArtStation + attribution).
