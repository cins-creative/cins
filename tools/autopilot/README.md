# Autopilot CINs — worker skeleton (Giai đoạn 1)

Monorepo trong `cins` (`tools/autopilot`). Chưa thu thập ArtStation/Behance (Giai đoạn 2).

## Bảng (service role only)

| Bảng | Việc |
|---|---|
| `auto_tai_khoan` | 10 nick seed + niche + hạn mức/ngày |
| `auto_nguon` | Danh sách theo dõi artist |
| `auto_muc` | Mục đã thu thập (`url_canonic` unique) |
| `auto_ban_thao` | Bản thảo trước khi đăng |
| `auto_da_dang` | Nhật ký publish |
| `auto_han_muc` | Đếm bài/ngày theo nick |
| `auto_viec` | Hàng đợi cron |

## Lệnh

```bash
npm run migrate:autopilot          # tạo bảng
npm run autopilot -- dong-bo-nick  # map 10 nick
npm run autopilot -- trang-thai
npm run autopilot -- them-nguon --nen-tang artstation --url 'https://www.artstation.com/wlop' --niche fantasy
npm run autopilot -- quet-nguon --nen-tang artstation --gioi-han 30
npm run autopilot -- quet-nguon --chi-xem          # dry-run
npm run autopilot -- liet-ke muc
npm run autopilot -- nhap-muc --url 'https://www.behance.net/gallery/…' --tieu-de '…' --tac-gia '…'
```

## Thu thập (Giai đoạn 2)

| Nền tảng | Cách | Ghi chú |
|---|---|---|
| ArtStation | RSS `/{user}.rss` qua `SINE_ART_WORKER_*` | Ưu tiên — ổn định |
| Behance | RSS/HTML đang CF 403 | Dùng `nhap-muc` thủ công tạm |

## Env

- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (chỉ khi migrate)
- `SINE_ART_WORKER_URL` + `SINE_ART_WORKER_SECRET` (fetch RSS/HTML)
- `CINS_NOI_BO_DANG_BAI_SECRET` (Giai đoạn 5 khi gọi API đăng)

Brief: `docs/cursor_brief_seed_autopilot_handoff.md`
