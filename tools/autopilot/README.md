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
npm run autopilot -- dong-bo-nick
npm run autopilot -- trang-thai
npm run autopilot -- them-nguon --nen-tang artstation --url 'https://www.artstation.com/wlop' --niche fantasy
npm run autopilot -- quet-nguon --nen-tang artstation --gioi-han 30
npm run autopilot -- liet-ke muc
npm run autopilot -- nhap-muc --url 'https://www.behance.net/gallery/…' --tieu-de '…' --tac-gia '…'
npm run autopilot -- chuan-bi-dang --gioi-han 30
npm run autopilot -- chay-dang
npm run autopilot -- liet-ke ban-thao
```

## Thu thập

| Nền tảng | Cách |
|---|---|
| ArtStation | RSS `/{user}.rss` qua `SINE_ART_WORKER_*` → `quet-nguon` |
| Behance | Chrome extension `extensions/cins-behance-import` → `POST /api/noi-bo/auto/muc` (CF chặn server-side) |

## Đăng

1. `chuan-bi-dang` — ghép niche → `auto_ban_thao` `san_sang`
2. `chay-dang` — gọi API đăng nội bộ, hạn 3 bài/nick/ngày (VN)
3. GitHub Actions: `autopilot-chay-dang.yml`

## Env

- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (chỉ khi migrate)
- `SINE_ART_WORKER_URL` + `SINE_ART_WORKER_SECRET` (ArtStation RSS)
- `NEXT_PUBLIC_SITE_URL` + `CINS_NOI_BO_DANG_BAI_SECRET` (khi `chay-dang`)

Brief: `docs/cursor_brief_seed_autopilot_handoff.md`
