# CINS — IMPLEMENTATION

> **File trong repo:** `docs/CINS_IMPLEMENTATION.md`
> **Tầng đổi nhanh nhất.** Map API route · lib · SQL migration · env/infra · ghi chú triển khai site. Dựng từ cây thư mục thật repo `cins-website` (2026-06-07).
> Khi conflict về *cấu trúc DB*: SCHEMA.md / DB thắng. File này map *code*, không phải schema.
> Regenerate khi cấu trúc thư mục đổi đáng kể: `dir /b /s app\api\*.ts` + `dir /b /s lib\*.ts`.

---

## 1. API Routes (`app/api/`)

### Auth & user
| Route | Việc |
|---|---|
| `auth/session-profile` | Lấy profile từ session |
| `users/preview` · `users/search` | Card preview user · tìm user (cho tag, kết bạn) |
| `avatar/upload` · `cover/upload` | Upload ảnh đại diện / cover → Cloudflare |

### Kết bạn & social
| Route | Việc |
|---|---|
| `ket-ban` · `ket-ban/[id]` · `ket-ban/[id]/block` | Gửi/hủy lời mời · thao tác 1 quan hệ · chặn |
| `ket-ban/loi-moi` · `ket-ban/danh-sach` · `ket-ban/chung` · `ket-ban/status` | Lời mời · danh bạ · bạn chung · trạng thái cặp |
| `follow` · `follow/status` · `follow/requests` | Follow **entity (tag/org)** — xem ⚠️ §5 |
| `reactions` · `bookmarks` · `notifications` · `notifications/video-ready` | Like/reaction · lưu · thông báo · báo video xong |

### Journey
| Route | Việc |
|---|---|
| `journey/[slug]/milestones` · `milestone/[milestoneId]` | List milestone · thao tác 1 milestone |
| `journey/[slug]/gallery` · `gallery-aside` | Tab Gallery của Journey + aside |
| `journey/[slug]/friends` | Bạn bè hiển thị trên Journey |
| `journey/[slug]/p/[postSlug]` · `.../edit` | Trang post · sửa post |

### Filter cá nhân (`filters`) — đề xuất, Cursor chỉnh tên nếu trùng
| Route | Việc |
|---|---|
| `filters` | GET list nhãn current user (`?userId=` xem nhãn người khác, read-only) · POST tạo nhãn |
| `filters/[id]` | PATCH sửa (`ten`/`mau`/`thu_tu`; slug bất biến) · DELETE xóa (chỉ chủ sở hữu) |
| `milestone/[milestoneId]/filters` | PUT set danh sách nhãn 1 cột mốc (gửi mảng `id_filter`, server diff insert/delete `filter_gan`) |

### Tác phẩm & co-author
| Route | Việc |
|---|---|
| `tac-pham/[id]/tac-gia` · `.../[nguoiDungId]` | Co-author (thêm/accept/reject), gate kết bạn (quy tắc 19–20) |
| `tac-pham/[id]/tags` · `journey-card` | Tag tác phẩm · card hiển thị trên Journey |
| `coauthor/reviews` | Hàng chờ duyệt lời mời co-author |

### Tag / keyword / nghề
| Route | Việc |
|---|---|
| `tag` · `tag/dedup` | Tạo tag (AI gen tom_tat) · dedup alias |
| `admin/tag/list` · `merge` · `[id]/tom-tat` · `[id]/verify` | Admin: list · gộp · regen tóm tắt · set `da_verify` |
| `keywords/link-content` | Link keyword vào content |
| `nghe/role-preview` | Preview vị trí nghề |

### Cộng đồng (`cong-dong`)
| Route | Việc |
|---|---|
| `cong-dong/preview` | Card preview cộng đồng |
| `[id]/posts` · `[id]/posts/[postId]/comments` · `[id]/posts/[postId]/bookmark` | Feed cộng đồng (`content_cot_moc` che_do=`cong_dong`) · bình luận/reaction/lưu trên cột mốc |
| `[id]/filters` · `[id]/filters/[filterId]` | Flair/filter (seed 4 nhãn mặc định) |
| `[id]/tham-gia` · `[id]/theo-doi` · `[id]/sidebar-live` | Tham gia · theo dõi · sidebar realtime |
| `[id]/categories` | PATCH gắn tối đa 4 bài nghề/ngành (`org_gan_bai_viet`) — admin org |
| `[id]/profile` | PATCH `avatar_id` / `cover_id` trên `org_to_chuc` — admin org (`isCongDongAdmin`) |
| `[id]/event-rail` | GET/PATCH banner sự kiện dọc (`org_su_kien` trong `org_to_chuc.cau_hinh`) — admin/quản trị nội dung |
| `[id]/members` · `[id]/members/[membershipId]` | GET danh sách · POST thêm/cập nhật theo user · PATCH đổi `vai_tro` — **chỉ admin** (`canManageCommunity`) |
| `category-articles/search` | Tìm bài nghề/ngành cho picker chủ đề nhóm |

### Tổ chức & trường (`to-chuc`, `truong`)
| Route | Việc |
|---|---|
| `to-chuc` | Tạo org (transaction 2 dòng: CINS owner + user admin, quy tắc 13) |
| `truong/[id]` + `bai-dang` · `hinh-anh` · `nganh` · `phuong-thuc` · `tuyen-sinh` · `cau-hinh-tinh-diem` · `mon-thi-catalog` · `upload` | Module trường ĐH đầy đủ |

### Media upload
| Route | Việc |
|---|---|
| `post-image/upload` · `article-inline-image` · `career-thumbnail` | Ảnh → Cloudflare |
| `post-video/prepare` · `complete` · `processing` · `status` | Video → Bunny qua TUS (prepare ký request, complete/processing/status poll) |

---

## 2. Lib (`lib/`) — theo domain

| Folder | Vai trò chính | File đáng chú ý |
|---|---|---|
| `supabase/` | Client server/browser/service-role, env, cookie, error | `service-role.ts`, `route-handler.ts`, `env.ts` |
| `auth/` | Google OAuth, session, login-intent (state param đăng ký/đăng nhập) | `google-oauth.ts`, `session.ts`, `oauth-intent-*`, `cins-admin*` |
| `social/` | Kết bạn, follow entity, notification, co-author, video-ready | `ket-ban.ts`, `follow.ts`, `follow-entity.ts` ⚠️§5, `thong-bao-insert.ts` |
| `journey/` | Milestone, timeline, gallery, video processing, co-author credit, cache | `timeline-merge.ts`, `milestone-verify.ts`, `foreign-milestone-visibility.ts`, `video-upload-session.ts`, `sync-tac-pham-tags.ts` |
| `cong-dong/` | Tạo org, membership, thảo luận, filter, sidebar, mirror tác phẩm, **quản lý thành viên**, categories, event rail, **branding** | `org-create.ts`, `org-profile.ts`, `membership.ts`, `members.ts`, `vai-tro.ts`, `categories.ts`, `event-rail.ts`, `creator-milestone.ts`, `sync-from-publish.ts`, `tac-pham-mirror.ts` ⚠️§5 |
| `tag/` | Tạo tag, dedup, gen tom-tat, normalize, slug, admin merge | `create.ts`, `gen-tom-tat.ts`, `dedup.ts`, `normalize.ts` |
| `filter/` | **Filter cá nhân** (user & org): tạo/sửa/xóa nhãn, gắn lên cột mốc/bài đăng org, list theo chủ sở hữu | `create.ts`, `update.ts`, `delete.ts`, `gan.ts`, `list-cua-user.ts` |
| `articles/` | Bài viết nghề/keyword/phần mềm, quan hệ liên quan, link keyword | `queries.ts`, `nghe-role-preview.ts`, `link-keywords-in-html.ts`, `partition-*` |
| `bai-viet/` | Hub card, phân loại, pagination | `hub-card.ts`, `hub-loai.ts` |
| `career/` | Hub nghề nghiệp: lĩnh vực → bộ phận → vị trí | `loadNgheNghiepHubListing.ts`, `groupCareers.ts` |
| `nganh/` | Ngành đào tạo, môn học, editorial | `loadNganhHubListing.ts`, `nganh-page-queries.ts` |
| `truong/` | Module trường: tính điểm, tuyển sinh, phương thức, gallery, timeline | `calc.ts`, `admission-calc-eval.ts`, `cau-hinh-tinh-diem.ts`, `merge-programs-tuyen-sinh.ts` |
| `bunny/` | Video delivery: config, stream, embed, thumbnail | `stream.ts`, `config.ts` |
| `cloudflare/` | Image upload + delivery URL | `upload-image.ts`, `pick-image-delivery-url.ts` |
| `editor/` · `tiptap/` | Editor: sanitize, image-layout, co-author role, search | `sanitize.ts`, `coauthor-role-action.ts` |
| `images/` | Crop cover/square/viewport | `crop-*.ts` |
| `admin/` | Article admin, môn thi, sql-runner, require-admin | `require-admin.ts`, `sql-runner.ts`, `db-connection.ts` |
| `cins/` | Navigation, hub paths | `mainNav.ts`, `hubPaths.ts` |
| `dev/` | Dev tools inline edit | `inline-article-edit.ts` |
| `youtube.ts` | Nhúng YouTube | (root) |

---

## 3. SQL Migrations (`supabase/sql/`)

| File | Tạo gì |
|---|---|
| `migration_ket_ban.sql` | Bảng `user_ket_ban` (thay follow-user) |
| `migration_content_thao_luan.sql` | Bảng `content_thao_luan` (+ liên quan) |
| `migration_cong_dong.sql` | Cộng đồng (org loại `cong_dong`) |
| `migration_cong_dong_v2_cot_moc.sql` | **v2:** enum `cong_dong`, cột `ghim`, rename `cong_dong_filter`, `cong_dong_filter_gan`, drop `content_thao_luan*` |
| `migration_cong_dong_filter.sql` | (legacy) `content_thao_luan_filter` — superseded bởi v2 rename |
| `migration_cong_dong_tac_pham_link.sql` | Link tác phẩm ↔ cộng đồng — ⚠️§5 kiểm tra có sinh bảng/cột mới không |
| `migration_da_verify_tag.sql` | Thêm `da_verify` vào tag |
| `migration_journey_foreign_visibility.sql` | Visibility milestone của người được tag (quy tắc 21) |
| `migration_social_thong_bao_read.sql` | Trạng thái đã đọc thông báo |
| `migration_user_theo_doi_muc.sql` | Follow entity (tag/org) — tách khỏi follow-user |
| `migration_filter_dong.sql` | **Filter cá nhân động**: `filter_nhan` + `filter_gan` + enum `filter_doi_tuong_enum` + cột `org_bai_dang.thoi_diem` (org journey). Chạy lại an toàn (IF NOT EXISTS). |
| `migration_org_bai_dang_reaction.sql` | Enum `loai_doi_tuong_social_enum` + value `org_bai_dang` (like/lưu polymorphic). |
| `migration_org_bai_dang_noi_dung_blocks.sql` | Cột `org_bai_dang.noi_dung_blocks` jsonb — nội dung Block kiểu Journey; `noi_dung` HTML legacy giữ tạm. |

**Org bài đăng — blocks (app, sau migration):** `lib/truong/bai-dang-blocks.ts` · API `bai-dang` POST/PATCH nhận `noi_dung_blocks` · fetch `queries.ts` · card có blocks → `JourneyMilestoneCardBodyContent` + `PostBlockRenderer`; không blocks → HTML legacy. Compose org vẫn Tiptap/HTML — chưa ghi blocks từ UI.

| `script_delete_org_bai_dang_legacy.sql` | Xóa bài `org_bai_dang` legacy (`noi_dung_blocks` rỗng) + reaction/lưu/tag liên quan. Có block comment xóa toàn bộ nếu cần reset. |

**Cấu trúc 2 bảng mới** *(tham chiếu tạm cho Cursor — SCHEMA.md là sự thật sau khi chạy migration + regenerate)*:

```
filter_nhan
  id uuid PK · id_nguoi_dung uuid NULL→user_nguoi_dung · id_to_chuc uuid NULL→org_to_chuc
  ten text · slug text · mau text NULL · thu_tu int=0 · tao_luc timestamptz
  CHECK: đúng 1 trong (id_nguoi_dung, id_to_chuc) NOT NULL
  UNIQUE (chủ sở hữu, slug)  [2 partial unique index]

filter_gan
  id_filter uuid→filter_nhan ON DELETE CASCADE
  loai_doi_tuong filter_doi_tuong_enum ('cot_moc'|'org_bai_dang')
  id_doi_tuong uuid  (polymorphic, KHÔNG FK cứng — nếp social_reaction)
  tao_luc timestamptz · PK (id_filter, loai_doi_tuong, id_doi_tuong)

org_bai_dang  +  thoi_diem date NULL  (ngày mốc lịch sử, khác tao_luc)
```

---

## 4. Env / Infra

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL = https://ospzzzxcomrmhqrnkoiw.supabase.co
SUPABASE_SERVICE_ROLE_KEY  (server-only, dùng trong lib/supabase/service-role.ts)

# Bunny Stream (video)
BUNNY_LIBRARY_ID         (library "cins", Frankfurt + Singapore)
BUNNY_STREAM_API_KEY

# Cloudflare Images
CLOUDFLARE_*             (account hash, API token)

# Google OAuth (login only)
GOOGLE_CLIENT_ID / SECRET
```

- **Deploy**: Vercel. Max 4.5MB request body → video KHÔNG đi qua Vercel (browser upload thẳng Bunny qua TUS; Vercel chỉ `post-video/prepare` ký request).
- **Video flow**: `prepare` (tạo object + ký) → browser TUS upload → Bunny re-encode HLS → webhook/poll `status`/`processing` → `complete` → `notifications/video-ready`.
- **Auth**: Google OAuth only, `/login` với `state` phân biệt đăng ký/đăng nhập; onboarding modal overlay khi `giai_doan IS NULL`; trigger `handle_new_user()` `SECURITY DEFINER`.

---

## 5. ⚠️ Cần kiểm tra / nợ kỹ thuật

- **`follow` vs `ket-ban` cùng tồn tại.** `lib/social/follow.ts` + `follow-entity.ts` + route `follow/requests`, `follow/status`. Theo L6, follow-user đã bỏ, chỉ giữ follow entity (tag/org). Cần xác nhận: `follow/requests` có phải tàn dư follow-user cần dọn không? (→ liên quan O1 trong DECISIONS)
- **`tac-pham-mirror.ts` + `migration_cong_dong_tac_pham_link.sql`.** Có cơ chế mirror tác phẩm vào cộng đồng. Cần verify migration này có sinh **bảng/cột mới** ngoài 67 bảng đã đếm không → nếu có, cập nhật SCHEMA.md.
- **File mock/legacy trong `lib/truong/`**: `doan-project-mock.ts`, `message-inbox-mock.ts`, `milestone-tag-notify-mock.ts`, `timeline-steps-legacy.ts`. Là placeholder/cũ — đánh dấu để dọn hoặc thay bằng implement thật.
- **`gallery-stubs.ts`** (lib/journey) — stub, chưa thật.
- **`loai_bai_dang_org_enum` deprecate** (L13): filter động thay vai trò phân loại bài đăng org, nhưng enum GIỮ lại (còn code dùng). Dọn khi filter động đã thay xong toàn bộ điểm phân loại.

---

## 6. Site routes & pages (`cins-website`)

**Map chi tiết trường:** [`cursor_map_truong.md`](./cursor_map_truong.md) · [`cursor_map_admin.md`](./cursor_map_admin.md) · [`cursor_map_inline_edit.md`](./cursor_map_inline_edit.md)

| Thành phần | Ghi chú |
|---|---|
| Route trường | `/truong-dai-hoc/[slug]` — layout v6 (`tdh-page--v6`) |
| Route Journey | `/{slug}` timeline · `/{slug}/p/{postSlug}` bài viết · `/{slug}/p/new` tạo (cần login) |
| Hub công khai | `/`, `/nganh-hoc`, `/nghe-nghiep`, `/truong-dai-hoc`, `/bai-viet`, … |
| **Cộng đồng** | `/cong-dong` (listing) · `/cong-dong/tao` · `/cong-dong/[slug]` (feed v4) · `POST /api/to-chuc` · `POST/DELETE /api/cong-dong/:id/tham-gia` · `GET/POST /api/cong-dong/:id/posts` · filters · categories · event-rail · **members** · comment/reaction — xem §6 *Cộng đồng — chi tiết site* |
| API tính điểm | `GET /api/truong/{org_to_chuc.id}/cau-hinh-tinh-diem?nam=&nganh=` — `nganh` = `org_truong_nganh.id`; `PUT` lưu `org_cau_hinh_mon` |
| API catalog môn | `GET /api/truong/{id}/mon-thi-catalog` — `id, ten, loai, ma, thumbnail_id` |
| API ngành CRUD | `POST/GET …/nganh`, `DELETE …/nganh/{programId}` → ẩn (`tam_dung`) |
| UI môn thi tab Ngành | `TruongNganhMonThiDauVao` — lưới ≤3 cột; modal `TruongNganhMonThiEditModal` |
| Popup "Tạo tổ chức" | 3 card (`co_so_dao_tao`, `studio`, `cong_dong`) + dòng *"Đại diện trường đại học? → Đề xuất xác minh"* (`truong_dai_hoc` — flow CINS duyệt) |

### Journey & auth

| Quy tắc | Ghi chú |
|---|---|
| Xem công khai | Journey, timeline, bài viết, Gallery tab — **không** redirect `/login` |
| Tương tác | Like / bookmark / bình luận → modal đăng nhập nếu chưa session (`AuthGateProvider` trên `app/[slug]/layout`; cộng đồng: `useCongDongAuthGate` + `AuthRequiredModal`) |
| OAuth | Google PKCE — `app/auth/callback/route.ts`; cookie `cins-oauth-intent`, `cins-oauth-return` |
| Protected | `/onboarding`, `/admin`, `/{slug}/p/new`, `/{slug}/p/.../edit` |
| Dev OAuth | `NEXT_PUBLIC_SITE_URL=http://localhost:3001`; Supabase Redirect URLs `http://localhost:3001/auth/callback` (không lẫn `127.0.0.1`) |
| Callback | Đọc verifier từ **request** cookies, ghi session lên **response** redirect (`lib/supabase/route-handler.ts`) |
| Co-author trên Journey | Tagged/bookmark: `che_do_hien_thi_journey` — user tự đặt Nổi bật trên timeline của mình. Migration: `migration_journey_foreign_visibility.sql` |
| Like count | Hiển thị công khai mặc định (`attachSocialState`, `PostActionsRail`) |

### Cộng đồng — chi tiết site

- Feed scoped **trong 1 org** qua `content_cot_moc` (`che_do_hien_thi='cong_dong'`, `id_to_chuc`=org) — thành viên đăng cột mốc + comment/reaction (KHÔNG nhồi vào `org_bai_dang`, KHÔNG `content_thao_luan`).
- Helper loại trừ Journey public: `lib/journey/journey-visible-clause.ts`.
- Mỗi post kèm badge **nghề + verified journey** người đăng.
- `org_to_chuc.cau_hinh.che_do`: `cong_khai` (mặc định) / `rieng_tu`.
- Tạo org: `POST /api/to-chuc` → 2 dòng `user_thanh_vien_to_chuc` (CINS `owner` + creator `admin`) + cột mốc Journey (`loai_moc=thanh_tuu`, `nguon_goc=sinh_tu_org_assign`) + `verify_xac_nhan` → filter **Verified**, vai trò **Người tạo cộng đồng**. Env: `CINS_SYSTEM_USER_ID`.
- Nhãn lọc: admin định nghĩa taxonomy; seed 4 nhãn mặc định (`lib/cong-dong/default-filters.ts`) + tutorial `/cong-dong/[slug]/nhan`.
- **UI trang `/cong-dong/[slug]`** (`CongDongPageClient`, CSS `app/cong-dong/cong-dong.css`): layout 3 cột — sidebar org · feed · event rail (ẩn &lt;1100px). Nền trang: xám phẳng `#eceef2` (không dùng gradient `body`).

#### Menu thành viên (`CongDongRoleButton`)

Portal dropdown khi đã tham gia (nút vai trò ▾):

| Mục | Ai thấy | Hành vi |
|---|---|---|
| Thông báo | Mọi thành viên | PATCH `/api/cong-dong/:id/theo-doi` (`muc_thong_bao`) |
| Quản lý nhãn | `canManageLabels` (admin + quản trị nội dung) | Mở `CongDongFilterAdminModal` |
| Cài đặt nhóm | `isCongDongAdmin` (server) | Mở `CongDongGroupSettingsModal` — gắn chủ đề nghề/ngành |
| **Thành viên & quyền** | `canManageMembers` (= `vai_tro` **admin** only) | Mở `CongDongMembersModal` |
| Rời cộng đồng | `thanh_vien` | DELETE `/api/cong-dong/:id/tham-gia` |

Helper vai trò: `lib/cong-dong/vai-tro.ts` (`canManageLabels`, `canManageMembers`, `CONG_DONG_ASSIGNABLE_ROLES`, …).

#### Quản lý thành viên & quyền

**Lib:** `lib/cong-dong/members.ts` — đọc/ghi `user_thanh_vien_to_chuc` (service role). **UI:** `components/cong-dong/CongDongMembersModal.tsx`.

**Quyền actor:** chỉ user có `vai_tro = admin` trong org (`canManageCommunity` / `canManageMembers`). Quản trị nội dung **không** mở modal này (403 nếu gọi API).

**Vai trò gán được** (enum cộng đồng, không gán `owner`):

| `vai_tro` | Nhãn UI | Quyền trong nhóm (tóm tắt) |
|---|---|---|
| `thanh_vien` | Thành viên | Đăng/tương tác feed · chọn nhãn · thông báo · rời nhóm |
| `quan_ly_noi_dung` | Quản trị nội dung | + quản lý nhãn · banner sự kiện · cài đặt nhóm |
| `admin` | Admin | + thêm thành viên & gán quyền |

Chi tiết bullet: `assignableRolePermissions()` trong `lib/cong-dong/vai-tro.ts` — UI `CongDongMemberRolePicker`.

**Luật nghiệp vụ:**

- Danh sách: chỉ `trang_thai = active`, vai trò thuộc tập cộng đồng; gom 1 dòng/user (ưu tiên vai trò cao nhất).
- Dòng `owner` (CINS system): hiển thị read-only (`editable: false`), không PATCH.
- POST thêm user đã có membership cộng đồng → **cập nhật** `vai_tro` dòng hiện có (không insert trùng).
- Admin cuối cùng không thể tự hạ quyền nếu không còn admin khác.
- Tìm user thêm vào nhóm: client gọi `GET /api/users/search?q=` (tên hiển thị hoặc slug, debounce ≥1 ký tự), POST `{ userId, vaiTro }`.

**API**

| Method | Path | Body / response |
|---|---|---|
| `GET` | `/api/cong-dong/:id/members` | `{ members: CongDongMemberAdmin[] }` — `id` = PK membership, `userId`, `slug`, `tenHienThi`, `avatarId`, `vaiTro`, `editable` |
| `POST` | `/api/cong-dong/:id/members` | `{ userId?, slug?, vaiTro? }` → `{ ok, member }`. `vaiTro` mặc định `thanh_vien` |
| `PATCH` | `/api/cong-dong/:id/members/:membershipId` | `{ vaiTro }` → `{ ok, member }` |

**Type:** `CongDongMemberAdmin` trong `lib/cong-dong/types.ts`.

#### Event rail & cài đặt nhóm (tóm tắt)

- **Event rail** (`CongDongEventRail`): cột phải — chỉ ảnh banner; admin/quản trị hover → chỉnh (`CongDongEventRailEditorModal`, `GET/PATCH …/event-rail`).
- **Cài đặt nhóm** (`CongDongGroupSettingsModal`): tối đa 4 bài nghề/ngành (`PATCH …/categories`, picker `CongDongCategoryPicker` + `category-articles/search`).
- **Avatar & cover sidebar** (`CongDongOrgBrandingCover` / `CongDongOrgBrandingAvatar`): admin hover → đổi ảnh; upload `/api/avatar/upload` hoặc `/api/cover/upload` rồi `PATCH …/profile`.

### `edu_mon_thi` thumbnail

- Placeholder UI: `plh_nang_khieu` (9 môn), `plh_van_hoa` (8), `plh_ngoai_ngu` (6) — gradient + chữ viết tắt; thay bằng UUID ảnh CF khi có asset.
- SQL: `supabase/sql/edu-mon-thi-thumbnail.sql`. Admin: `lib/admin/mon-thi-server.ts`, `/admin/mon-thi`.
- Helper: `lib/truong/mon-thi-thumbnail.ts`, component `MonThiThumb`.
- Sau khi chạy SQL: bật `.select("id, ten, loai, ma, thumbnail_id")` trong `lib/truong/cau-hinh-tinh-diem.ts` và `app/api/truong/[id]/mon-thi-catalog/route.ts`.

---

## 7. Implementation notes (backend / worker)

- `user_nguoi_dung.auth_user_id` link `auth.users` — trigger `handle_new_user()`.
- `social_luot_xem` partition theo tháng — cron tạo partition mới. `da_xu_ly_hint` để batch AI viewer hint.
- Vector queue cần worker background — Supabase Edge Functions.
- RLS chưa apply trong schema cơ bản — phải làm trước khi public.
- Weight xác nhận tính ở app layer từ `loai_nguoi_xac_nhan`.
- `article_de_xuat`: user gắn tag tạm dạng text string, admin publish mới convert FK. **Chỉ `nghe` và `nganh_dao_tao`.**
- Render HTML bài `nghe`: `dangerouslySetInnerHTML` với CSS scope `.article-rich-content`.
- Timeline tuyển sinh: `tinh_trang` enum cho display tab; status chi tiết tính từ field ngày.
- Stat bar trang trường: `diem_chuan` = MAX | `chi_tieu` = SUM | `journey_count` = COUNT DISTINCT `user_thanh_vien_to_chuc`.
- RLS phân quyền org: admin + `quan_ly_tuyen_sinh` → tuyển sinh; admin + `quan_ly_noi_dung` → bài đăng/hình ảnh; admin → UPDATE `org_to_chuc`; owner (CINS) → không giới hạn.
- `content_cot_moc.thoi_diem` = ngày xảy ra (DATE); `tao_luc` = ngày tạo record.
- `org_truong_nganh`: «Gỡ ngành» → `trang_thai_chuong_trinh = tam_dung` (DELETE API thực chất là ẩn).
- `content_tac_pham_tac_gia`: owner row INSERT cùng transaction; tagged row → `social_thong_bao`.
- `social_binh_luan` / `chat_tin_nhan`: reply qua `id_cha` / `id_tin_tra_loi`; soft delete `da_xoa`.
- Viewer hint notification: batch cuối ngày, filter `da_xu_ly_hint = false` SQL trước rồi mới gọi AI.

### Engagement (v6)

- Like count: realtime từ `social_reaction`, hiển thị công khai. Không cache field, không toggle ẩn per-tác-phẩm.
- Sort trong tag/nghề/Gallery: mặc định `moi_nhat` | `a_z` | `nhieu_tuong_tac`. Sort engagement OK vì giới hạn trong context entity.
- KHÔNG feed thuật toán toàn cục, KHÔNG trending xuyên mạng.

### Kết bạn (v6)

- `user_ket_ban`: `pending` → `social_thong_bao` → `accepted` / decline / `blocked`. Chuẩn hoá cặp A-B = B-A.
- Dùng cho: danh bạ nghề, bạn chung (realtime), điều kiện tag co-author.
- Co-author check: `isFriend(A,B)` ở API layer trước INSERT.

### Follow tag/org (v6 — thu hẹp)

- `user_theo_doi` chỉ follow `bai_viet` (tag) và `org`. KHÔNG follow user. KHÔNG điều kiện co-author.
- Xem DECISIONS O1.

### Tag system (v7)

| Loại | Trang | Nội dung | Qua `article_de_xuat`? |
|---|---|---|---|
| `nghe` | Bài viết đầy đủ | Prose dài, ai_summary | Có |
| `nganh_dao_tao` | Bài viết đầy đủ | Prose dài | Có |
| `keyword` | Aggregation only | `tom_tat` AI + người + tác phẩm | **Không** |
| `phan_mem` | Aggregation only | `tom_tat` AI + người + tác phẩm | **Không** |

**Flow tag mới:** autocomplete (`da_verify` trước) → dedup alias → tạo `article_bai_viet` → AI gen `tom_tat` → admin verify sau.

**Dedup:** exact lowercase → `article_alias` tự động; AI fuzzy → suggest confirm. Keyword trùng tên khác ngành → qualifier + `article_lien_quan`.

**`tom_tat`:** gen ngay khi tạo; regen khi `so_data_point` tăng (`vector_dong`).

---

## 8. Seed strategy

Sine Art — partner đầu (`co_so_dao_tao`, `da_verify` do CINS xác nhận):
- ~520 học sinh = first users có Journey thật
- Mô hình `lien_tuc_theo_thang`

Pre-launch checklist:
- 10–20 Journey thật từ Sine Art; Tú là Journey số 1
- 20–30 bài article live; AI auto-tag cơ bản
- Seed `edu_to_hop_mon_chi_tiet` H00/H02/V00/V01; seed `edu_module_mon` 4 module template
- 3 trường ĐH seed (MTS, MHI, MMA): ngành, tuyển sinh, cấu hình MTS 2024 per-ngành. Năm 2025 seed riêng.

**SQL grant (chạy trên Supabase):**
1. `supabase/sql/org-truong-grant-anon-read.sql`
2. `supabase/sql/org-truong-public-read-extended.sql`
3. `supabase/sql/org-truong-grant-cau-hinh-tinh-diem.sql` — kiểm tra `mon_anon_*_dk = 3` dưới `SET ROLE anon`

**SQL seed MTS — cấu hình tính điểm (theo thứ tự):**

| File | Mục đích |
|---|---|
| `org-truong-seed-cau-hinh-mon-mts-h00-2024.sql` | Khối chung H00 2024 + môn fallback |
| `org-truong-seed-cau-hinh-mon-mts-per-nganh-2024.sql` | 4 ngành × 3 môn, 2024 |
| `org-truong-fix-mon-mts-2025.sql` | Tạo khối 2025 per-ngành + môn |
| `org-truong-sync-cau-hinh-mts-active-nganh.sql` | Copy khối/môn → UUID đang hiển thị |
| `org-truong-dedupe-khoi-2025.sql` | Xoá khối 2025 trùng/rỗng (tuỳ chọn) |
| `edu-mon-thi-thumbnail.sql` | Cột `thumbnail_id` + seed `plh_*` |
| `migration_co_author.sql` | ALTER `content_tac_pham_tac_gia` |
| `migration_ket_ban.sql` | CREATE `user_ket_ban` |
| `migration_da_verify_tag.sql` | ADD `da_verify BOOLEAN` |
| `migration_journey_foreign_visibility.sql` | ADD `che_do_hien_thi_journey` |

**Kiểm tra seed thumbnail:**
```sql
SELECT loai, thumbnail_id, count(*) AS so_mon
FROM public.edu_mon_thi
GROUP BY loai, thumbnail_id
ORDER BY loai;
```

**Chẩn đoán nhanh khối 2025:**
```sql
SELECT tn.slug, k.id, count(m.id) AS so_mon
FROM org_cau_hinh_khoi k
JOIN org_truong_nganh tn ON tn.id = k.id_truong_nganh
LEFT JOIN org_cau_hinh_mon m ON m.id_cau_hinh_khoi = k.id
WHERE k.id_to_chuc = 'a1000000-0000-0000-0000-000000000001'
  AND k.nam_ap_dung = 2025
GROUP BY tn.slug, k.id;
```
0 dòng → chạy `org-truong-fix-mon-mts-2025.sql`.
