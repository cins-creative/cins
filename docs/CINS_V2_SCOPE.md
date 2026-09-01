# CINs v2 — Scope & Kiến trúc

> **Mục đích:** File router duy nhất cho agent / dev mới bắt đầu làm việc với CINs v2.
> **Trạng thái:** Scope đã chốt — chưa có code. Đây là bản thiết kế sản phẩm + kiến trúc kỹ thuật.
> **Ngôn ngữ làm việc:** Tiếng Việt (English giữ cho technical term, tên phần mềm).

---

## 1. Bối cảnh — Vì sao build lại

CINs v1 (repo hiện tại) là monolith Next.js ~1.100 file lib, 413 API route, ~70 bảng DB, 4 loại org song song (academy/university/studio/community), articles/edu/billing phức tạp. Vấn đề chính:

- Worker Cloudflare vượt giới hạn 10 MB → phải "park route" khi build
- Dual-write billing / chi nhánh / lộ trình (3 SSOT chưa giải)
- 443 file dùng `createServiceRoleClient` → auth app-layer, không RLS
- 2 file test / 413 route → không có safety net
- Org × 4 loại → CRUD lặp, fix bug phải sửa 4 chỗ

**Quyết định:** Đập đi xây lại hoàn toàn (greenfield) theo mô hình **User + Plugin**.

---

## 2. Định vị sản phẩm

**CINs v2 = Mạng xã hội portfolio cho người sáng tạo.**

- Một tài khoản duy nhất, một URL công khai `cins.vn/@slug`
- Đăng bài / khoe tác phẩm → **Portfolio (core)**
- Bật thêm module kinh doanh / vận hành → **Plugin**
- Không có "trang tổ chức" riêng — mọi thứ gắn trên profile user

**Nhóm người dùng mũi nhọn:** indie creator / artist / seller (wibu, merch, commission, giáo viên solo)

---

## 3. Nguyên tắc kiến trúc (bắt buộc)

1. **Một danh tính** — chỉ `user`, không có entity "org" thứ hai
2. **Một loại bài** — `content_cot_moc` (Journey post), không `org_bai_dang` song song
3. **RLS trước, service role sau** — ngược v1; route user-scoped dùng cookie client + RLS
4. **Plugin = tab + data + API** trên profile, không tạo URL entity riêng
5. **Migration ledger** từ ngày 1 (bảng `schema_migrations`, không chạy SQL tay rời)
6. **Một sự kiện = một SoT** — không dual-write
7. **Add-on** nằm trong plugin, không phải plugin mới
8. **Chat auto** theo plugin — không bật riêng
9. **VN-specific** (VietQR, địa chỉ tỉnh/huyện) bọc sau adapter, không hardcode core
10. **i18n từ đầu** — chuỗi UI shell vào `messages/vi.ts` + `messages/en.ts`; không chôn tiếng Việt trong component

---

## 4. Tech stack

| Tầng | Công nghệ |
|------|-----------|
| Frontend | Next.js App Router (phiên bản mới nhất) |
| Database | Supabase (Postgres) + RLS ưu tiên |
| Auth | Supabase OAuth (Google + email) |
| Media | Cloudflare Images + Cloudflare Stream |
| Chat realtime | Supabase Realtime |
| Deploy | Cloudflare Workers qua OpenNext |
| Email | Resend (transactional) |
| Search | Postgres FTS hoặc Typesense |
| Background jobs | Queue (xem xét Cloudflare Queue / pg_boss) |

---

## 5. Cấu trúc 4 lớp UI

```
A. CORE Portfolio        /@slug · Journey · bài đăng · tag · social
B. HUB /me               Giỏ hàng · Đơn · Commission · Khóa đang học…
C. MANAGE /manage/*      Quản trị từng plugin (seller / teacher / organizer…)
D. ADMIN /admin          CINs staff — moderation + vận hành nền tảng
```

---

## 6. Hai quy tắc ngang áp dụng mọi plugin

### Quy tắc 1 — Cộng tác viên (CTV)

Mọi plugin đều có: invite CTV → CTV accept → đồng quản trị plugin đó.

```
Vai trò CTV: Owner (user chính) · Editor (CRUD + xử lý) · Viewer (chỉ xem báo cáo)
Bảng chung: plugin_ctv (id_plugin, loai_plugin, id_nguoi_dung, vai_tro, trang_thai)
```

### Quy tắc 2 — Phí nền tảng (% giao dịch)

Plugin tạo doanh thu → CINs thu % tự động khi giao dịch hoàn thành:

| Plugin | Thu phí |
|--------|---------|
| Shop (đơn hàng) | % GMV |
| Commission (đơn đặt làm) | % giá trị đơn |
| Khóa học (mua khóa / video / subscription) | % doanh thu |
| Sự kiện (bán vé) | % giá vé |
| Cộng đồng (member trả phí) | % subscription |
| Tuyển dụng / RSVP free / Customize / Analytics | Không thu |

Admin cấu hình % per plugin / tier. Seller xem phí đã trả trong Analytics & Pro.

---

## 7. Plugin marketplace

User vào `/settings/plugins` → xem danh sách plugin → bật/tắt → wizard onboarding lần đầu.

---

## 8. Scope tính năng chi tiết

### A. CORE — Portfolio (luôn có)

#### A1. Nội dung & hiển thị
- Đăng bài / upload (ảnh, video, text…)
- 3 chế độ xem: Timeline / Grid / Masonry
- Chuyển view mặc định (lưu preference)
- Hẹn đăng bài
- Bài: riêng tư / nhóm / công khai / featured
- Co-author (tag đồng tác giả)
- Series / album gom bài
- Card user
- Chia sẻ bài ra ngoài (copy link + OG meta)
- Embed bài ra website ngoài (iframe / widget)
- SEO per bài / profile (OG, JSON-LD, sitemap, robots.txt)
- Mention @user trong caption / comment
- Lưu / bookmark bài người khác
- Watermark (optional, user bật)

#### A2. Tag & phân loại
- Gắn tag khi đăng
- Hệ thống tag toàn cục — **2 loại:** `tag` (content) + `categories` (shop/fandom)
- Filter cá nhân (chỉ mình thấy, không discovery)
- Tag autocomplete khi compose
- Merge categories trùng (admin)
- Trending tags (discovery)

#### A3. Thông tin user (chỉ cơ bản)
- Slug, tên hiển thị, avatar, cover, giới tính, ngày sinh
- Bio / giới thiệu ngắn
- Nhiều liên hệ công khai (email / social link — tuỳ chọn)
- Vị trí / thành phố (text tự do)
- Privacy settings (ai xem profile / ai nhắn / ai follow)
- 2FA bảo mật tài khoản
- Xóa tài khoản (soft-delete + data export GDPR)
- Connected accounts (Google, sau thêm)

#### A4. Social
- Follow (1 chiều)
- Kết bạn (2 chiều)
- Like / reaction
- Comment + reply thread
- Thông báo in-app
- Cài đặt thông báo (email / push / in-app per loại)
- DM 1-1
- Báo cáo nội dung
- Chặn user
- Danh sách đang follow / bạn bè (quản lý)
- Gợi ý theo dõi (suggested connections)

#### A5. Hub `/me` (mặc định mọi user khi login)
- Tổng quan (đơn / khóa / commission gần đây)
- Giỏ hàng (không cần bật plugin Shop)
- Đơn hàng Shop (buyer)
- Commission đã đặt (buyer)
- Khóa đang học + tiến độ + lịch sử xem / resume
- Ứng tuyển đã nộp
- Sự kiện đã đăng ký
- Cộng đồng đã tham gia
- Bài đã lưu / bookmark
- Địa chỉ đã lưu
- Cài đặt: ngôn ngữ / sáng tối / mật khẩu / 2FA / privacy
- Plugin marketplace (/settings/plugins)

#### A6. Tìm kiếm
- Tìm user (theo tên / slug)
- Tìm bài (theo tag / caption)
- Tìm sản phẩm (khi có Shop)
- Tìm tag / categories
- Trending creators

#### A7. Chat (hạ tầng — auto theo plugin, không bật riêng)
- Engine chat: phòng + tin + realtime
- DM 1-1 (core)
- Chat nhóm + nhiều sub-chat
- Auto khi bật Shop: chat giao dịch (gom đơn shop)
- Auto khi bật Commission: gom chung chat giao dịch
- Auto khi bật Khóa LIVE: phòng học (nhiều phòng theo khóa/cohort)
- Auto khi bật Tuyển dụng: chat ứng viên
- Auto khi bật Sự kiện: chat sự kiện
- Auto khi bật Cộng đồng: chat nhóm

**Phân nhóm chat UI:**

| Nhóm | Gom |
|------|-----|
| Giao dịch | Shop + Commission |
| Nhóm | Lớp học + Sự kiện + Cộng đồng |
| Người lạ | Ứng viên tuyển dụng |
| 1-1 | DM |

---

### B. PLUGIN 1 — Shop *(% giao dịch)*

#### B1. Core (bật Shop là có)
- Nhiều cửa hàng / user
- Sản phẩm + biến thể + giá + tồn kho
- Sản phẩm nháp (draft)
- SEO per sản phẩm (slug, meta)
- Checkout + xác nhận TT (QR…)
- Trạng thái đơn (chờ TT / đóng gói / giao / hoàn)
- Đơn bị hủy + hoàn tiền (flow)
- Chính sách hoàn / đổi trả (per shop)
- Chat đơn (auto — nhóm Giao dịch)
- Thông báo đơn mới (push + email)
- Cảnh báo tồn kho thấp
- Preview sản phẩm (trang / modal)
- Tab Shop trên profile (ẩn/hiện)
- Đăng SP lên Journey (post-kiosk)
- Phí ship / địa chỉ giao (VN default)
- Đánh giá sản phẩm (cơ bản)
- In phiếu / export đơn
- Khiếu nại / tranh chấp đơn
- CTV (invite + phân quyền owner/editor/viewer)
- Phí nền tảng: % / đơn hoàn thành
- Manage: sản phẩm, đơn, khách cơ bản

#### B2. Add-on Shop
- Voucher (mã giảm)
- Combo / Bundle
- Flash sale
- Freeship (rule miễn/giảm)
- Import sản phẩm (URL / CSV)
- Nhiều bảng giá (lẻ / sỉ)
- **Đa thị trường (Multi-market):** chọn thị trường → tên SP + mô tả + tiền tệ theo quốc gia
- Preorder (đặt trước)
- Watermark sản phẩm (chống trộm)
- Digital delivery (file tải sau TT)
- Báo cáo doanh thu → tab trong Analytics & Pro
- Quầy / booth sự kiện (POS nhẹ — liên kết plugin Sự kiện)

---

### C. PLUGIN 2 — Commission (đặt làm) *(% giao dịch)*

#### C1. Core
- Nhiều gói dịch vụ / user
- Trạng thái mở/đóng nhận đơn — hiển thị public trên profile
- Portfolio mẫu (showcase đơn đã làm)
- Brief form (field bắt buộc)
- Đơn commission + pipeline trạng thái
- Upload bản giao / revision
- Thanh toán (QR / full / cọc)
- Đơn hủy + hoàn tiền (flow)
- Chat đơn (auto — nhóm Giao dịch)
- Hub: Commission của tôi (buyer)
- Tab Commission trên profile
- CTV (invite + phân quyền)
- Phí nền tảng: % / đơn hoàn thành
- Manage: gói dịch vụ + đơn

#### C2. Add-on Commission
- Rush / express (phụ phí giao nhanh)
- Gói revision thêm (mua thêm vòng sửa)
- Cọc + thanh toán cuối (50/50)
- Slot lịch / calendar
- Milestone thanh toán (nhiều đợt)
- NDA / điều khoản bắt buộc trước brief
- File vault (giao file source sau hoàn thành)

---

### D. PLUGIN 3 — Khóa học *(% giao dịch)*

Một plugin, hai **loại khóa** (chọn khi tạo): `live` (học trực tiếp) và `video` (bán bài giảng).

#### D1. Core — chung
- Nhiều khóa / user
- Mua khóa + enrollment
- Email xác nhận enrollment
- Rating khóa (sau khi học xong)
- Refund policy per khóa
- Announcement cho học viên
- Hub: Khóa của tôi + tiến độ
- Tab Khóa học trên profile
- Preview khóa (trailer / bài free)
- CTV (mời trợ giảng / editor + phân quyền)
- Phí nền tảng: % / lượt mua
- Manage: khóa, học viên, doanh thu cơ bản

#### D2. Loại LIVE (học trực tiếp với GV)
- Cohort / đợt khai giảng
- Lịch buổi học
- Enrollment có hạn / sĩ số
- Phòng chat lớp (auto, nhiều phòng)
- Tiến độ: buổi đã học

#### D3. Loại VIDEO (bán bài giảng ghi sẵn — Udemy/Skillshare style)
- Chương + bài video
- Tiến độ: % xem
- Resume (tiếp tục xem)
- Mua cả khóa

#### D4. Add-on Khóa học
- Bán video lẻ (không cần mua cả khóa)
- Preview miễn phí (1–2 bài)
- Bài tập / nộp bài + chấm
- Chứng chỉ hoàn thành
- Gói tháng / subscription (LIVE) *(% phí)*
- Điểm danh (LIVE)
- Ghi hình buổi live → replay
- WebRTC / video call LIVE *(tính phí thêm)*
- Voucher khóa (engine voucher chung)
- Combo khóa (bundle nhiều khóa)
- Sản phẩm học viên (showcase)
- Affiliate (user chia sẻ link → hoa hồng)

---

### E. PLUGIN 4 — Tuyển dụng *(không thu phí)*

#### E1. Core
- Nhiều tin / user
- Ứng viên gắn profile CINs khi nộp
- Form ứng tuyển
- Pipeline (mới / xem / PV / từ chối)
- Đóng tin tự động theo hạn
- Email thông báo ứng viên mới
- Chat ứng viên (auto — nhóm Người lạ)
- Ẩn/hiện mức lương
- Hub: Việc đã ứng tuyển
- Tab Jobs trên profile
- CTV (mời HR / editor + phân quyền)
- Manage: tin + ứng viên

#### E2. Add-on Tuyển dụng
- Câu hỏi sàng lọc tùy chỉnh
- Talent pool (lưu CV)
- Lịch phỏng vấn
- Scorecard đánh giá nội bộ

---

### F. PLUGIN 5 — Sự kiện *(% khi bán vé)*

#### F1. Core
- Nhiều event / user
- Tạo event (thời gian, địa điểm, online/offline)
- Map embed địa điểm
- Chia sẻ sự kiện ra ngoài (OG event)
- RSVP / đăng ký (miễn phí)
- Email xác nhận đăng ký
- Danh sách người tham gia
- Hub: Sự kiện của tôi
- Tab Events trên profile
- CTV (mời co-host / editor + phân quyền)
- Manage: event + RSVP

#### F2. Add-on Sự kiện
- Bán vé / loại vé → QR mua vé → quản lý bán vé *(% phí)*
- QR check-in
- Livestream event
- Recurring event (sự kiện lặp lại)
- Waitlist (hết chỗ)
- Email / push nhắc trước event
- Accept shop tham dự (booth — liên kết plugin Shop)

---

### G. PLUGIN 6 — Cộng đồng *(% khi member trả phí)*

#### G1. Core
- Nhiều nhóm / user (owner = user, không có trang org riêng)
- Join / invite qua link / duyệt (nhóm kín)
- Vai trò: member / mod / owner
- Bài trong nhóm (engine Journey, scope nhóm)
- Pin bài / announcement trong nhóm
- Flair / nhãn bài
- Badge member (lâu năm, active…)
- Hub: Cộng đồng đã tham gia
- Tab Communities trên profile
- CTV (mời mod / editor + phân quyền)
- Manage: nhóm + member + bài

#### G2. Add-on Cộng đồng
- Chat nhóm (auto)
- Member trả phí — subscription *(% phí)*
- Rules gate (đọc quy tắc trước join)
- Poll / vote
- Wiki / pin trang (nhẹ)
- Event trong nhóm (liên kết plugin Sự kiện)

---

### H. PLUGIN 7 — Customize (trang cá nhân)

#### H1. Core
- Preset màu / accent profile
- Pattern / gradient nền
- Live preview (mobile / desktop)
- Draft → Publish theme
- Scope: chỉ profile public (không ảnh hưởng chrome CINs)
- Manage: `/manage/customize`

#### H2. Add-on Customize
- Ảnh nền upload (cap số ảnh)
- Featured block (pin bài / SP / khóa lên đầu profile)
- Custom sections (text, CTA, link hub)
- Card style (bo góc, shadow timeline)
- Avatar frame
- Scheduled theme (đổi tự động theo mùa / sự kiện)
- Custom watermark (Shop & bài đăng)

---

### I. PLUGIN 8 — Analytics & Pro

#### I1. Core
- View profile / bài (cơ bản)
- View per plugin (conversion cơ bản)
- Dashboard tổng hợp — **mỗi plugin bật = 1 tab riêng**
- Báo cáo phí nền tảng (seller xem đã trả bao nhiêu)

#### I2. Add-on Analytics & Pro
- Funnel chi tiết (shop / khóa / commission)
- Custom domain → profile
- Watermark batch (bài Journey)
- Export CSV / báo cáo
- API / webhook (đơn → Google Sheet…)
- Gate add-on premium (Customize preset, v.v.)

---

## 9. Hạ tầng dùng chung

### Auth & bảo mật
- Auth: email + Google OAuth (Supabase)
- 2FA
- Session management
- Rate limiting / anti-spam
- GDPR: data export + xóa tài khoản
- Content moderation (auto-flag trước khi public)
- Audit log (ai làm gì — cho dispute / admin)

### Data & DB
- Supabase + **RLS ưu tiên** (hạn chế `createServiceRoleClient`)
- Migration ledger từ ngày 1
- Backup / disaster recovery
- **Không dual-write** — một sự kiện = một bảng SoT

### Media
- Cloudflare Images / Stream
- File virus scan (digital delivery / commission attachment)
- CDN / asset optimization

### Messaging & notification
- Email transactional (đăng ký, đơn, nhắc lịch, xác nhận…) — Resend
- Push notification (FCM / web push)
- Announcement toàn hệ thống (CINs → tất cả user)
- Cài đặt thông báo per loại per user

### Thanh toán & phí
- Thanh toán QR (pattern chung cho mọi plugin)
- Engine phí nền tảng (% per plugin — cấu hình admin)
- VN Pack: VietQR, địa chỉ VN (adapter — không hardcode core)
- Background job / queue (email, export, video encode…)

### Plugin system
- Plugin marketplace (`/settings/plugins`)
- Addon registry (voucher/combo engine dùng chung Shop + Khóa)
- Bảng `plugin_ctv` (CTV dùng chung mọi plugin)
- Onboarding wizard per plugin (lần đầu bật)

### Search & discovery
- Full-text search (Postgres FTS hoặc Typesense)
- Trending tags / trending creators
- Gợi ý theo dõi (suggested connections)

### UX & i18n
- i18n: `vi` / `en` — chuỗi shell vào catalog, không hardcode component
- Theme site: sáng / tối / theo hệ thống
- SEO: sitemap, robots.txt, OG global
- Help center / FAQ in-app

---

## 10. Admin nền tảng `/admin`

- Users: tìm, ban, soft-delete, gán admin
- Bài / user bị báo cáo → moderation queue
- Moderation: shop / khóa / cộng đồng / commission
- Merge tag / categories
- Feature flag / bảo trì / maintenance mode
- **Cấu hình % phí** per plugin / tier
- **Báo cáo phí toàn hệ thống**
- **Tranh chấp escalation** (shop, commission, vé)
- Announcement toàn hệ thống
- Audit log viewer

---

## 11. Ma trận plugin tổng hợp

| Plugin | % phí | CTV | Chat auto | Add-on nổi bật |
|--------|-------|-----|-----------|----------------|
| Shop | % đơn | ✅ | Giao dịch | Voucher, Flash sale, Đa thị trường, Digital |
| Commission | % đơn | ✅ | Giao dịch | Rush, File vault, Milestone TT |
| Khóa học | % mua/sub | ✅ | Nhóm (lớp) | Video lẻ, Cert, WebRTC, Affiliate |
| Tuyển dụng | Không | ✅ | Người lạ | Talent pool, Scorecard |
| Sự kiện | % vé | ✅ | Nhóm | Bán vé QR, Livestream, Booth |
| Cộng đồng | % sub | ✅ | Nhóm | Member trả phí, Poll |
| Customize | Không | — | — | Scheduled theme, Custom watermark |
| Analytics & Pro | Không | — | — | Custom domain, API/webhook |

---

## 12. Quy trình build (thứ tự phase)

```
0. Chốt scope (file này) + schema DB + stack
1. Nền móng: design tokens, theme light/dark, i18n hook, layout shell
2. Auth & user: signup/login/onboarding/slug + RLS + role mỏng
3. Core Journey: profile public + compose + timeline/grid/masonry + trang bài
4. Social: follow + like + comment + feed người theo dõi
5. Tag: gắn bài + trang tag + trending
6. Plugin marketplace: /settings/plugins
7. Plugin #1 (Shop core) + Hub /me giỏ hàng / đơn
8. Chat engine + DM + auto chat shop
9. Settings user đầy đủ (ngôn ngữ, theme, privacy, 2FA)
10. Admin /admin tối thiểu (user + moderation)
11. Plugin #2 (Commission) + Plugin #3 (Khóa học)
12. Plugin #4–#6 (Tuyển dụng, Sự kiện, Cộng đồng)
13. Plugin #7 (Customize) + Plugin #8 (Analytics & Pro)
14. Add-on per plugin (voucher, flash sale, v.v.)
15. Analytics & Pro đầy đủ + phí nền tảng
16. Migrate user / bài cũ từ CINs v1
```

*Mỗi phase = có thể demo được. Không phase "chỉ refactor".*

---

## 13. Scope KHÔNG làm trong v2

- Org / trường ĐH / CSĐT (app riêng nếu cần, không trong v2)
- Articles / canonical / đóng góp curator / wiki
- Hệ thống verify membership phức tạp (org-veto)
- Admin autopilot seed
- Calculator điểm chuẩn / tuyển sinh
- Multi-account / clone account

---

## 14. Ước lượng giảm so với v1

| Chỉ số | v1 | v2 |
|--------|----|----|
| API routes | ~413 | ~80–120 |
| Lib files | ~1.100+ | ~150–250 |
| DB tables | ~70–73 | ~35–50 |
| Loại org / entity riêng | 4 loại × CRUD | 0 |
| Dual-write | 3 cụm active | 0 |
| Worker deploy | 2 + park route | 1, dư margin |
| Test files | 2 | Từ đầu có test auth + billing |

---

## 15. DB — bảng gợi ý (MVP ~40 bảng)

### Core
```
user_nguoi_dung         -- profile, slug, avatar, bio, privacy
user_lien_ket           -- nhiều social link
user_theo_doi           -- follow 1 chiều
user_ket_ban            -- kết bạn 2 chiều
user_chan               -- block
user_dia_chi            -- địa chỉ giao hàng (buyer)
user_quyen_he_thong     -- admin / super_admin
```

### Content
```
content_cot_moc         -- bài đăng / milestone (SoT duy nhất)
content_tac_pham        -- media gắn bài (ảnh, video, file)
content_tac_pham_tac_gia -- co-author
content_luu             -- bookmark bài
```

### Tag
```
tag                     -- keyword / fandom (2 loai)
content_gan_tag         -- junction bài × tag
```

### Social
```
social_reaction         -- like / reaction
social_binh_luan        -- comment (có reply_id)
social_thong_bao        -- notification
```

### Chat
```
chat_phong              -- room (loai: dm|shop_don|commission_don|lop_hoc|ung_tuyen|su_kien|cong_dong)
chat_tin_nhan           -- message
chat_thanh_vien         -- room members
chat_doc_cursor         -- read receipts
```

### Plugin system
```
user_plugin             -- (id_nguoi_dung, loai, trang_thai, cau_hinh)
user_plugin_addon       -- (id_plugin, addon_key, bat, cau_hinh)
plugin_ctv              -- CTV chung mọi plugin
plugin_phi              -- lịch sử phí nền tảng per giao dịch
```

### Shop
```
shop_cua_hang           -- nhiều shop / user_plugin
shop_san_pham
shop_bien_the           -- size/màu/tồn
shop_don_hang
shop_don_hang_chi_tiet
shop_danh_gia
```

### Commission
```
commission_goi          -- gói dịch vụ
commission_don          -- đơn đặt làm
commission_ban_giao     -- file upload từng version
```

### Khóa học
```
khoa_hoc                -- (loai: live|video)
khoa_hoc_chuong
khoa_hoc_bai            -- video bài giảng
khoa_hoc_enrollment     -- học viên đã mua
khoa_hoc_tien_do        -- % xem per bài per user
khoa_hoc_dot            -- cohort (chỉ LIVE)
```

### Tuyển dụng
```
tuyen_dung_tin
tuyen_dung_don          -- ứng tuyển
```

### Sự kiện
```
su_kien
su_kien_dang_ky         -- RSVP / mua vé
su_kien_loai_ve
```

### Cộng đồng
```
cong_dong
cong_dong_thanh_vien
cong_dong_bai_flair
```

### Billing
```
cins_hoa_don            -- phí nền tảng (SoT duy nhất)
```

---

## 16. Quy ước code

- **Naming:** bảng/cột tiếng Việt không dấu (`tao_luc`, `cap_nhat_luc`, `da_xoa`)
- **RLS:** mọi bảng user-scoped phải có RLS policy + `createServerClient` (cookie), không service role
- **Migration:** file SQL trong `supabase/migrations/`, đánh số timestamp, idempotent
- **API:** route mỏng (thin handler) → logic trong `lib/{domain}/`
- **i18n:** chuỗi UI mới → vào `messages/vi.ts` + `messages/en.ts`
- **Theme:** dùng CSS variables (`--cins-blue`, `--bg-page`…), không hardcode màu
- **Test:** auth flow + billing + RLS phải có test từ phase 2

---

*File này là SoT cho v2. Mọi quyết định kiến trúc thêm → cập nhật vào đây trước khi code.*
