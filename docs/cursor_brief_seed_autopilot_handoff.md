# Brief — Seed accounts + Autopilot (handoff chat mới)

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

### Roster seeding (đã tạo)

| # | Tên hiển thị | Slug | Email | `giai_doan` | Giới thiệu (đã set) | Niche gợi ý router |
|---|---|---|---|---|---|---|
| 1 | Kirito Minh | `kiritominh` | kiritominh@cins.vn | dang_hoc | Sinh viên năm 3 thiết kế, nhân vật fantasy, rigging; fan isekai | Fantasy character / isekai |
| 2 | Hinata Vy | `hinatavy` | hinatavy@cins.vn | dang_hoc | Digital painting, ánh sáng chiều; fan slice of life | Digital paint / SoL |
| 3 | Yuki Trang | `yukitrang` | yukitrang@cins.vn | dang_lam | 2D animator studio nhỏ; cut-out + frame-by-frame | 2D animation |
| 4 | Levi Khoa | `levikhoa` | levikhoa@cins.vn | dang_lam | Concept vũ khí/giáp; silhouette sạch | Weapon / armor concept |
| 5 | Itachi Hùng | `itachihung` | itachihung@cins.vn | dang_lam | 3D character game mobile; tone tối/ninja | 3D character / dark |
| 6 | Sakura Linh | `sakuralinh` | sakuralinh@cins.vn | freelance | Fanart + bìa LN; pastel, commission | Fanart / LN cover |
| 7 | Zoro Bảo | `zorobao` | zorobao@cins.vn | freelance | Manga B&W + storyboard | Manga / storyboard |
| 8 | Rem Nhi | `remnhi` | remnhi@cins.vn | tim_viec | Mới tốt nghiệp; character design; đang cân portfolio | Character design |
| 9 | Nezuko Chi | `nezukochi` | nezukochi@cins.vn | tim_viec | Colorist webtoon; bảng cam hồng | Webtoon color |
| 10 | Miku Ngọc | `mikungoc` | mikungoc@cins.vn | dang_day | Dạy vẽ anime thiếu nhi; chibi commission | Chibi / teach anime |

Sau khi xong avatar/cover → **báo cáo các bước tiếp theo** (mục 3 bên dưới), không nhất thiết implement hết trong một turn.

---

## 1. Bối cảnh chiến lược (đã chốt hướng)

- Acquisition giai đoạn này: **artist / wibu** — shop + Journey portfolio; **không** lấy user bằng focus CSĐT.
- Định vị **đổi theo giai đoạn** (xương sống Journey/sáng tạo giữ; câu ra ngoài giai đoạn 1 ≈ tìm/mua artist).
- Cold start content: hướng **curator / giới thiệu** từ **Behance (bài dài/case) + ArtStation (album)** — link/embed + attribution về nguồn; AI soạn tiêu đề & mô tả ngắn.
- **10 nick** ở trên dùng làm mặt đăng (seed). Caption AI phải tránh giọng “tôi là tác giả ảnh gốc” khi chỉ dẫn nguồn Behance/ArtStation.
- Tương tác ảo (AI like/comment): **kỹ thuật làm được**; trust/ops user tự siết sau — **không** nằm trong MVP publish.
- Import Shopee: cần Chrome + extension (không cài được trên Cursor browser / Chrome mobile đầy đủ). Mobile chỉ «Chỉ lấy tên + ảnh». Multi-account seed Shopee: Chrome multi-profile.

---

## 2. Cursor Cloud / secrets (đã hướng dẫn user)

- Thêm secret tại [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents) → Environment → Secrets.
- Để hết **Runtime Secret** vẫn OK; `NEXT_PUBLIC_*` có thể là Environment Variable.
- Agent đang chạy / chat cũ **không** tự nhận secret mới → cần **agent mới** sau Save + sau khi Development environment setup xong.
- **Không** push `.env.local` lên GitHub.

---

## 3. Sau avatar/cover — kế hoạch build Autopilot (GitHub Actions)

Agent mới: tóm tắt lại cho user các bước sau (có thể bắt đầu Phase 0 nếu còn bandwidth).

### Mục tiêu MVP

Repo tool (có thể repo mới hoặc thư mục/`apps` sau) + GitHub Actions cron:

- Watchlist Behance + ArtStation (allowlist — **không** scrape cả sàn).
- Ingest meta/OG project mới.
- Router niche → 1 trong 10 nick; quota **3 post/ngày/nick**.
- AI title + mô tả ngắn + dòng attribution bắt buộc.
- Publish lên Journey CINs (API internal + secret **hoặc** session từng nick).
- Dedup theo `canonical_url`.

### Phases

| Phase | Việc |
|---|---|
| **0** | Contract publish trên CINs: `POST` internal curator/publish (secret) — chốt format blocks link/embed |
| **1** | Skeleton worker + CLI + bảng `accounts/sources/items/drafts/publishes/quotas/jobs` |
| **2** | Ingest ArtStation (ưu tiên) rồi Behance — theo watchlist |
| **3** | Router + quota 10×3/ngày (timezone VN) |
| **4** | AI composer (prompt cấm xưng tác giả gốc) |
| **5** | Publisher → CINs; idempotent; log fail |
| **6** | GitHub Actions `schedule` (Linux runner) + secrets GH; không cần mở PC |
| **7** | (Sau) module engage like/comment — feature flag off mặc định |

### Chi phí Actions (tham chiếu)

- Private Free ~**2000 phút/tháng**; bot nhẹ thường nằm trong free.
- Linux ~$0.006/phút nếu vượt. AI API thường đắt hơn phút Actions.
- Docs: [Actions runner pricing](https://docs.github.com/en/billing/reference/actions-runner-pricing).

### Việc user cần chốt khi build

1. Publish bằng **API internal** hay **session 10 nick**?  
2. Gate duyệt tay draft giai đoạn đầu: có/không?  
3. Watchlist ban đầu: ai curate 50–200 artist/niche?  
4. Tool để **repo mới** hay monorepo trong `cins`?

---

## 4. Prompt gợi ý dán vào chat mới

```
Đọc docs/cursor_brief_seed_autopilot_handoff.md.

Bước 1 (làm ngay): truy cập DB (Supabase service role từ env), chọn 10 avatar + 10 cover wibu vui từ ảnh đã có trên hệ thống, UPDATE cho 10 slug seeding trong brief. Báo cáo bảng slug → avatar_id → cover_id.

Bước 2: sau khi xong, báo cáo các bước tiếp theo để build agent seeding (Behance + ArtStation → 10 nick × 3 post/ngày) chạy trên GitHub Actions — theo mục 3 của brief. Chưa code hết trừ khi mình bảo làm tiếp Phase 0.
```

---

## 5. Tài liệu CINs liên quan

- Router: [`CINS_INSTRUCTION.md`](./CINS_INSTRUCTION.md)
- Shop / import Shopee: `CINS_IMPLEMENTATION.md` § Shop UGC · `lib/shop/shopee/`
- Embed / auto thumb Journey: IMPLEMENTATION *Embed → Gallery thumbnail*
- Dev rules / security: `CINS_DEV_RULES.md`

---

## 6. Ngoài scope chat cũ (không làm nhầm)

- Không deploy Cloudflare từ agent nếu thiếu token (merge `main` → Actions `cloudflare-deploy.yml`).
- Không cài extension Shopee trên Cursor browser.
- Không scrape X/FB làm engine seed chính (đã chuyển sang Behance/ArtStation + attribution).
