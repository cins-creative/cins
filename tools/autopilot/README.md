# Autopilot CINs — worker (Giai đoạn 1–3)

Monorepo trong `cins` (`tools/autopilot`).

## Bảng (service role only)

| Bảng | Việc |
|---|---|
| `auto_tai_khoan` | 10 nick seed + niche + hạn mức/ngày |
| `auto_nguon` | Danh sách theo dõi artist |
| `auto_muc` | Mục đã thu thập (`url_canonic` unique) |
| `auto_ban_thao` | Bản thảo trước khi đăng |
| `auto_da_dang` | Nhật ký publish |
| `auto_han_muc` | Đếm bài/ngày theo nick (lịch VN) |
| `auto_viec` | Hàng đợi cron |

## Lệnh

```bash
npm run migrate:autopilot
npm run migrate:autopilot-pixiv          # CHECK nen_tang + pixiv
npm run autopilot -- dong-bo-nick
npm run autopilot -- them-nguon-mau          # AS + Behance + Pixiv mẫu
npm run autopilot -- trang-thai
npm run autopilot -- quet-nguon --nen-tang artstation --gioi-han 30
npm run autopilot -- liet-ke muc
npm run autopilot -- chuan-bi-dang --gioi-han 30   # chia đều nick cùng kênh
npm run autopilot -- duyet-ban-thao --chi-xem
npm run autopilot -- duyet-ban-thao --gioi-han 10
npm run autopilot -- chay-dang
```

## Phân kênh 10 nick

| Kênh | Nick | Ghi chú |
|---|---|---|
| ArtStation ×3 | kiritominh · hinatavy · levikhoa | RSS `quet-nguon` |
| Behance ×3 | yukitrang · sakuralinh · remnhi | Extension scrap |
| Pixiv ×3 | itachihung · mikungoc · nezukochi | Extension scrap |
| Truyện ×1 | zorobao | Tắt tạm — chờ brief |

## Thu thập

| Nền tảng | Cách |
|---|---|
| ArtStation | RSS `/{user}.rss` qua `SINE_ART_WORKER_*` → `quet-nguon` |
| Behance | Chrome extension `extensions/cins-behance-import` → `POST /api/noi-bo/auto/muc` |
| Pixiv | Chrome extension `extensions/cins-pixiv-import` → `POST /api/noi-bo/auto/muc` (ajax server 403) |

Pack: `npm run pack:behance-ext` · `npm run pack:pixiv-ext`

## Đăng (duyệt tay)

1. `chuan-bi-dang` — AI caption → `cho_duyet`
2. `duyet-ban-thao` — bạn duyệt → `san_sang`
3. `chay-dang` — đăng + cover từ `anh_bia_url`
4. Actions cron chỉ soạn + đăng bài đã duyệt (không tự `duyet`)

## Tương tác ảo (Giai đoạn 7 — TẮT mặc định)

Ghi thẳng `social_reaction` + `social_binh_luan` (service role). Bật/tắt **từng nick** ở
`/admin/tai-khoan-ai` → tab **Nick** → cột **Tương tác** (cột `auto_tai_khoan.tuong_tac_bat`).

```bash
npm run migrate:autopilot-tuong-tac                # thêm cột tuong_tac_bat (1 lần)
npm run autopilot -- lich-ghe-tham                 # xem 4 khung giờ ghé/ngày mỗi nick
npm run autopilot -- tuong-tac --chi-xem           # dry-run
npm run autopilot -- tuong-tac --tat-ca            # chạy ngay mọi nick ĐÃ bật (bỏ lịch ghé)
npm run autopilot -- tuong-tac                     # theo lịch ghé (như cron)
```

- **Mô hình:** mỗi nick "ghé" **4 phiên/ngày** (khung 07–11 / 11–15 / 15–19 / 19–24 VN, jitter theo nick + theo ngày → gap lệch nhau). Cron chạy mỗi giờ; nick chỉ hành động khi tới cữ ghé trong cửa sổ `--cua-so` (mặc định 90′).
- **Emoji:** chỉ tích cực (`heart · thumbsup · joy · wow · party · fire · clap · hundred`) — **bỏ angry/dislike/sad**; phân bố theo giọng nick.
- **Xác suất:** nền theo "độ hoạt bát" từng nick, cộng/trừ theo khớp niche (khi tác giả là nick seed khác), clamp `[0.4, 0.95]` → số reaction dao động, tránh 100% đồng loạt lộ bot. Quyết định react/skip **ổn định** (seeded RNG theo `slug|postId`).
- **Comment:** ~30% (`--ti-le-comment`) bài đã thả emoji → 1 câu khen chung theo pool giọng nick.
- **Phạm vi:** bài `content_cot_moc` `che_do_hien_thi='public'` mới trong `--nhin-lai` giờ (mặc định 48), cả bài người thật lẫn bài seed, **trừ bài của chính nick**.
- **Idempotent:** unique key `social_reaction` (1 emoji/user/đối tượng) + dedup query `social_binh_luan` → chạy lại vô hại.
- **Gate:** chỉ nick có `tuong_tac_bat = true` mới hành động (toggle admin). `CINS_SEED_TUONG_TAC=off` = kill-switch khẩn cấp tắt hết.
- Cron: `.github/workflows/autopilot-tuong-tac.yml` (hourly + `workflow_dispatch`).

Cấu hình giọng/emoji/pool câu khen: `tools/autopilot/lib/nick-tuong-tac.mjs`.

## Env

- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (chỉ khi migrate)
- `SINE_ART_WORKER_URL` + `SINE_ART_WORKER_SECRET` (ArtStation RSS)
- `ANTHROPIC_API_KEY` (caption AI; thiếu → heuristic)
- `NEXT_PUBLIC_SITE_URL` (`https://cins.vn` khi đăng prod) + `CINS_NOI_BO_DANG_BAI_SECRET`
- `CINS_SEED_TUONG_TAC` (tuỳ chọn) — đặt `off` để kill-switch tương tác ảo; bật/tắt thường ngày qua toggle admin

## Admin UI

`/admin/tai-khoan-ai` (super_admin | admin) — Tổng quan · Pipeline (Hàng đợi → Chờ duyệt → Đã duyệt → Đã đăng) · Nick.

API: `GET /api/admin/autopilot?view=` · `POST /api/admin/autopilot/action`

Brief: `docs/cursor_brief_seed_autopilot_handoff.md`
