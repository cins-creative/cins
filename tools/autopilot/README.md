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

## Env

- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (chỉ khi migrate)
- `SINE_ART_WORKER_URL` + `SINE_ART_WORKER_SECRET` (ArtStation RSS)
- `ANTHROPIC_API_KEY` (caption AI; thiếu → heuristic)
- `NEXT_PUBLIC_SITE_URL` (`https://cins.vn` khi đăng prod) + `CINS_NOI_BO_DANG_BAI_SECRET`

Brief: `docs/cursor_brief_seed_autopilot_handoff.md`
