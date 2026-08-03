# PLAN — Tuỳ chỉnh trang chủ: edit mode tại chỗ cho 2 sidebar

> Trạng thái: **BUILT Phase 1** · Edit mode + prefs + API (2026-08-03). Phase 2–3 chưa.
> Chốt UX: **không** có trang cài đặt riêng. Bấm «Cài đặt giao diện» → điều hướng về `/` với trang chủ ở **chế độ chỉnh sửa**; 2 sidebar thành card kéo–thả, thêm/xoá tại chỗ, có Lưu / Huỷ.
> **1 migration** (thêm 1 cột jsonb trên `user_nguoi_dung` — tiền lệ `journey_loai_moc_visibility`).
> **Phase 4 — mở rộng catalog theo vai trò vận hành (shop / org staff / admin sự kiện / tuyển dụng):** xem `docs/PLAN_home_modules_vai_tro.md`.

---

## 0. Vấn đề & mục tiêu

| # | Việc | Hiện tại |
|---|---|---|
| **A** | Trang chủ desktop dày đặc — 2 sidebar nhồi module người dùng không phải lúc nào cũng cần | `MODULE_ORDER` hard-code theo persona, user không can thiệp được |
| **B** | Persona là hộp cứng — sinh viên không bao giờ thấy `co_hoi`, giảng viên không thấy `khoa_hoc_goi_y` | `resolvePersona()` quyết định tất cả |
| **C** | Module ẩn vẫn tốn query | Mỗi module tự fetch trong `Promise.all` — chạy hết bất kể hữu ích hay không |
| **D** | Nhiều dữ liệu giá trị chưa lên sidebar (chat, lời mời, org của mình, đã lưu…) | Nằm rải ở trang riêng |

Mục tiêu: user tự chọn khối nào hiện, thứ tự nào, cột nào — **ngay trên trang chủ**, thấy kết quả trong đúng bối cảnh.

---

## 1. Điểm khởi đầu (fact)

- Sidebar **không** hard-code JSX: `HomeModuleColumn.tsx` L29–42 có `MODULE_REGISTRY: Record<ModuleId, ModuleComponent>`; L64–70 lấy `MODULE_LAYOUT[persona][side]` rồi `Promise.all(ids.map(...))`. **Đây là điểm chèn lớp preference.**
- `lib/cins/home-adaptive/persona.ts` L82–101 `MODULE_ORDER` (3 persona) → L105–113 `splitColumns()` tách trái/phải theo `NOTIFY_MODULES` (L72–75).
- `HomeWorldJourneyMain.tsx` L90–100 truyền `leftAside` / `rightAside` (Suspense riêng) xuống `HomeWorldJourneyClient` — **đã có một client component bọc cả hai cột**, chỗ đặt provider draft state.
- `HomeModuleColumn` là **async server component**; mỗi module tự fetch + tự `return null` khi rỗng.
- Grid 3 cột: `app/world-journey-feed.css` L674–686 `.wj-shell`. Cột phải ẩn <1200px, cột trái ẩn <992px → **edit mode là tính năng desktop-only**.
- 2 module đã code nhưng **không nằm trong `MODULE_ORDER`**: `goi_y_theo_doi`, `duong_toi_do` — bật là chạy.
- `user_nguoi_dung` **không có** cột `cau_hinh`/`settings`. Tiền lệ preference: `journey_loai_moc_visibility` (jsonb), `journey_mac_dinh_view` (text) + `app/api/user/journey-default-view/route.ts`.
- Preference bố cục hiện tại nằm ở **localStorage**: `cins-home-feed-layout` (`lib/home/home-feed-layout.ts`), `cins-feed-source` (`lib/cins/worldJourneyFeedSource.ts`). UI: `UserAccountSettingsModal.tsx` → «Cài đặt bố cục».
- **Không có** thư viện DnD trong `package.json`. Tiền lệ reorder tự viết: `components/editor/EditorView.tsx` (HTML5 drag), `lib/journey/gallery-noi-bat-order.ts`.

---

## 2. Catalog module

### Nhóm A — 10 khối đang chạy

| ModuleId | Nhãn | Cột mặc định | Persona mặc định | Cho ẩn? |
|---|---|---|---|---|
| `theo_doi_org` | Sự kiện & thông báo | Phải | mọi | Có |
| `co_hoi` | Cơ hội cho bạn | Phải | lam | Có |
| `ho_so_cua_ban` | Hồ sơ của bạn | Trái | lam | Có |
| `nguoi_cung_nganh` | Người cùng ngành | Trái | lam | Có |
| `goi_y_studio` | Studio & doanh nghiệp | Trái | lam | Có |
| `kham_pha_linh_vuc` | Khám phá lĩnh vực | Trái | hoc | Có |
| `khoa_hoc_goi_y` | Khóa học gợi ý | Trái | hoc | Có |
| `cho_ban_duyet` | Chờ bạn duyệt | Trái | day | **Không** — nghĩa vụ xử lý, ẩn sẽ kẹt luồng verify của người khác |
| `hoc_vien_cua_ban` | Học viên của bạn | Trái | day | Có |
| `scout_tai_nang` | Scout tài năng | Trái | day | Có |

### Nhóm B — đã code, chưa mount (bật là dùng)

| ModuleId | Nhãn | Ghi chú |
|---|---|---|
| `goi_y_theo_doi` | Gợi ý theo dõi | `modules/GoiYTheoDoiModule.tsx` |
| `duong_toi_do` | Đường tới đó | `modules/hoc.tsx` |

### Nhóm C — cột giữa (toggle, không phải card kéo–thả)

| Key | Nhãn | Hiện lưu ở đâu |
|---|---|---|
| `feed_promo_rail` | Rail gợi ý xen feed | Chưa có — mới |
| `feed_composer` | Ô soạn bài | Chưa có — mới |
| `feed_layout` | Timeline / Gallery | localStorage `cins-home-feed-layout` → **di trú lên DB** |
| `feed_source` | Nguồn feed | localStorage `cins-feed-source` → **di trú lên DB** |
| — | Việc cần xác nhận | **Không cho tắt** (`HomePendingConfirmations`) |

### Nhóm D — khối mới (đã xác minh dữ liệu)

| ModuleId | Nhãn | Nguồn | Trạng thái data |
|---|---|---|---|
| `to_chuc_cua_ban` | Tổ chức của bạn | `user_thanh_vien_to_chuc` → `lib/journey/user-orgs-fetch.ts`, `GET /api/me/organizations` | Sẵn — chỉ cần ghép `orgQuanLyPath()` |
| `loi_moi_ket_ban` | Lời mời kết bạn | `user_ket_ban` (`trang_thai='pending'`) → `lib/social/ket-ban.ts` `listPendingReceived` | Sẵn |
| `da_luu` | Đã lưu | `social_luu` → `lib/cong-dong/post-bookmark.ts`, `lib/to-chuc/tuyen-dung-bookmark.ts` | Sẵn (cần 1 query gộp cho sidebar) |
| `se_tham_gia` | Sự kiện sẽ tham gia | `org_dang_ky_su_kien` (`loai_phan_hoi='se_tham_gia'`) → `lib/to-chuc/su-kien-dang-ky.ts` | Sẵn |
| `nhap_journey` | Cột mốc nháp | `content_cot_moc` **không có** cột draft — «nháp» = `che_do_hien_thi='chi_minh'` | Cần query mới |
| `ung_tuyen_cua_toi` | Ứng tuyển của tôi | `org_tuyen_dung_ung_tuyen` (`id_nguoi_dung=viewer`) | Cần query mới (hiện chỉ có chiều admin) |
| `truong_theo_doi` | Trường đang theo dõi | `user_theo_doi` `loai_doi_tuong='to_chuc'` + lọc `loai_to_chuc='truong_dai_hoc'` | Trường: sẵn. **Ngành: chưa có loại follow riêng** → cắt khỏi scope |
| `tin_nhan_gan_day` | Tin nhắn gần đây | `GET /api/chat/threads` (`{ threads, totalUnread }`) | Sẵn nhưng **đắt** — realtime, trùng overlay chat |
| `journey_tuan_nay` | Journey tuần này | `social_luot_xem` raw, `social_thong_ke_doi_tuong_ngay` chưa dùng | **Chưa có rollup** — hoãn |

---

## 3. Database

**1 migration.** Thêm cột jsonb trên `user_nguoi_dung` (không tạo bảng mới: profile row đã được fetch sẵn ở mọi request trang chủ qua `fetchOwnerBySlug`, thêm cột = **0 query phát sinh**).

```
ALTER TABLE user_nguoi_dung
  ADD COLUMN home_layout jsonb NOT NULL DEFAULT '{}'::jsonb;
```

Shape:

```
{
  "v": 1,
  "left":   ["ho_so_cua_ban", "nguoi_cung_nganh", "to_chuc_cua_ban"],
  "right":  ["theo_doi_org", "co_hoi"],
  "hidden": ["goi_y_studio"],
  "feed":   { "promo_rail": false, "composer": true },
  "at":     "2026-08-03T01:00:00Z"
}
```

Quy tắc giải nghĩa (quan trọng cho khả năng tiến hoá):

1. `{}` rỗng ⇒ user **chưa từng** tuỳ chỉnh ⇒ dùng nguyên `MODULE_LAYOUT[persona]` như hiện nay. Không backfill.
2. `left`/`right` là **thứ tự tuyệt đối** (bắt buộc, vì cho kéo giữa 2 cột).
3. Module có trong registry nhưng **không** xuất hiện ở `left`/`right`/`hidden` ⇒ coi là **khối mới thêm sau khi user đã lưu** ⇒ tự chèn theo vị trí mặc định của persona + gắn badge «Mới». Nhờ vậy thêm module về sau không bị người đã tuỳ chỉnh bỏ lỡ vĩnh viễn.
4. `hidden` là **tường minh** — phân biệt "đã chủ động tắt" với "chưa biết tới".
5. Id lạ (module bị gỡ) ⇒ bỏ qua im lặng khi đọc.
6. `v` để migrate shape sau này.

**Di trú localStorage → DB:** `feed_layout` và `feed_source` đọc DB trước, fallback localStorage lần đầu rồi ghi lên DB. Giữ localStorage thêm 1 release cho tương thích ngược.

**Không** đụng `journey_mac_dinh_view` (đó là trang cá nhân, phạm vi khác).

---

## 4. API

| Route | Method | Việc |
|---|---|---|
| `/api/user/home-layout` | `GET` | Trả `home_layout` đã chuẩn hoá (đã áp quy tắc §3) — dùng cho client draft khởi tạo |
| `/api/user/home-layout` | `PUT` | Ghi toàn bộ layout (Lưu). Body = shape §3 không có `at` |
| `/api/user/home-layout` | `DELETE` | Khôi phục mặc định = set `{}` |

Theo tiền lệ `app/api/user/journey-default-view/route.ts` (cùng shape auth + `runtime`).

**Validate phía server (không tin client):**

- Mọi id phải thuộc `MODULE_REGISTRY` — whitelist, không nhận id tự do.
- `left ∪ right ∪ hidden` không trùng lặp; tổng ≤ 40 phần tử.
- `cho_ban_duyet` **không được** nằm trong `hidden` → nếu có, loại bỏ và vẫn trả 200 (silent correct, không chặn Lưu).
- Chỉ ghi được row của chính viewer (`auth_user_id` từ session, không nhận `userId` từ body).

**Không** thêm API cho từng module mới — mỗi module giữ nguyên kiểu tự fetch trong server component như hiện tại.

---

## 5. Frontend

### 5.1 Lớp preference chèn vào chuỗi render

```
fetchOwner (đã có home_layout)
   └─ resolveHomeLayout(persona, seeking, home_layout)   ← MỚI, thuần hàm, lib/cins/home-adaptive/layout-prefs.ts
        └─ { left: ModuleId[], right: ModuleId[] }
             └─ HomeModuleColumn  (bỏ MODULE_LAYOUT[persona][side], nhận ids qua prop)
```

`resolveHomeLayout()` gánh toàn bộ §3 + `orderForSeeking()`. `MODULE_LAYOUT` giữ nguyên vai trò **giá trị mặc định**, không bị xoá.

Lợi ích kèm theo: module bị ẩn **không vào `Promise.all`** ⇒ không chạy query. Đây là phần thu hồi chi phí của cả tính năng.

### 5.2 Ranh giới server / client — điểm khó nhất

Sidebar là async server component; kéo–thả bắt buộc client. Cách giải:

- `HomeModuleColumn` (server) render các module **đang bật** thành `Array<{ id, node: ReactNode }>` rồi truyền **xuống** một client component. Server component truyền được ReactNode làm prop — không cần biến module thành client.
- Client giữ `order` trong state, render children theo order ⇒ kéo–thả không re-render nội dung module.
- **Draft state phải nằm trên cả 2 cột** (vì kéo chéo trái↔phải) ⇒ provider đặt ở `HomeWorldJourneyClient` — nơi đã nhận cả `leftAside` và `rightAside`.

**Khối thêm mới trong lúc edit hiển thị placeholder** (icon + tên + mô tả + «Sẽ hiển thị sau khi lưu»), **không** render nội dung thật. Lý do: nếu muốn nội dung thật thì server phải fetch trước toàn bộ ~20 module cho mọi lần vào trang chủ — phá đúng mục tiêu hiệu năng. Sau khi Lưu → `router.refresh()` → server render nội dung thật.

### 5.3 Vào / ra edit mode

- Entry: `UserAccountSettingsModal` → «Cài đặt giao diện» → đóng modal + `router.push("/?tuy-chinh=1")`.
- URL param (không phải state thuần) để: back button thoát được, SSR biết ngay từ đầu, link được cho support.
- Server đọc `searchParams.tuy_chinh` → truyền `editing` xuống. Guest / mobile (<1200px) → bỏ qua param, không vào edit.

### 5.4 Giao diện edit mode

| Vùng | Trạng thái edit |
|---|---|
| Thanh trên cùng | Sticky bar: «Đang tuỳ chỉnh trang chủ» + [Khôi phục mặc định] [Huỷ] [Lưu] (Lưu disabled khi chưa đổi gì) |
| 2 sidebar | Mỗi card: viền dashed, handle kéo, nút ✕ xoá, badge «Mới» nếu chưa từng thấy |
| Cuối mỗi cột | Ô dashed «+ Thêm khối» → mở panel danh sách khối chưa dùng, gom nhóm, có mô tả 1 dòng, khối hợp persona xếp trên |
| Cột giữa | Làm mờ + `pointer-events: none`, **tắt infinite scroll**; riêng phần toggle nhóm C thì bật được |
| Card `cho_ban_duyet` | Kéo được, **không** có nút ✕ (tooltip giải thích) |

### 5.5 Kéo–thả: dùng gì

Repo **không** có thư viện DnD nhưng đã tự làm 2 lần (`EditorView.tsx`, gallery nổi bật). Edit mode là **desktop-only, dùng thưa** ⇒ chọn **HTML5 native drag**, 0 dependency, đồng bộ tiền lệ.

Bù trợ năng: mỗi card có menu `···` với «Lên / Xuống / Chuyển sang cột trái–phải / Xoá» — thao tác bằng bàn phím được, đồng thời là đường thoát khi drag lỗi. Nếu Phase 1 cho thấy kéo chéo cột quá rối, cân nhắc `@dnd-kit/core` ở Phase 2 (quyết định này đảo được, không ảnh hưởng data model).

---

## 6. Các bước

### Phase 1 — Hạ tầng + edit mode, catalog A + B

1. Migration cột `home_layout` (`supabase/sql/migration_user_home_layout.sql`).
2. `lib/cins/home-adaptive/layout-prefs.ts` — types + `resolveHomeLayout()` + validate dùng chung server/API. **Có unit test** cho 6 quy tắc §3.
3. `HomeModuleColumn` nhận `ids` qua prop; `HomeWorldJourneyMain` gọi `resolveHomeLayout()`. *Chưa có UI — hành vi không đổi, verify không regression.*
4. `/api/user/home-layout` (GET/PUT/DELETE) + validate.
5. Metadata catalog (`MODULE_META`: nhãn, mô tả, icon, cột gợi ý, `hideable`) — nguồn duy nhất cho panel «Thêm khối».
6. Edit mode UI: sticky bar, card chrome, panel thêm khối, menu `···`, kéo–thả, dirty guard.
7. Bật 2 module nhóm B vào catalog.

**Ship được ở đây.** Đo: % user vào edit mode, khối bị ẩn nhiều nhất, khối được bật chéo persona nhiều nhất.

### Phase 2 — Nhóm C (cột giữa) + di trú preference

8. Toggle `feed_promo_rail`, `feed_composer` trong edit mode.
9. Di trú `cins-home-feed-layout` + `cins-feed-source` từ localStorage vào `home_layout.feed`; «Cài đặt bố cục» cũ trong modal trỏ về edit mode.

### Phase 3 — Nhóm D, chia 3 đợt theo chi phí

- **D1 (data sẵn):** `to_chuc_cua_ban`, `loi_moi_ket_ban`, `se_tham_gia`, `da_luu`.
- **D2 (cần query mới):** `nhap_journey`, `ung_tuyen_cua_toi`, `truong_theo_doi`.
- **D3 (đắt / hoãn):** `tin_nhan_gan_day` (realtime, trùng overlay chat — cân nhắc có đáng không), `journey_tuan_nay` (**chặn**: chưa có rollup thống kê tuần; `StudioAnalyticsQuanLyClient` còn placeholder `—`).

Mỗi khối D = 1 component + 1 loader + 1 dòng registry + 1 dòng meta. Không đụng edit mode.

---

## 7. Edge cases

| Tình huống | Xử lý |
|---|---|
| User ẩn hết module một cột | Grid thu về 2 cột (không để khoảng trắng) — thêm modifier CSS trên `.wj-shell` |
| Ẩn hết cả hai cột | Feed full-width; hiện nút nhỏ «Tuỳ chỉnh trang chủ» để có đường quay lại |
| Module bật nhưng rỗng data | Giữ nguyên hành vi `return null`. **Trong edit mode thì vẫn hiện card** (placeholder «Chưa có nội dung») — nếu không user tưởng thêm hụt |
| User đổi `giai_doan` sau khi đã tuỳ chỉnh | Layout đã lưu **thắng**. Module mới hợp persona rơi vào quy tắc §3.3 → tự chèn + badge «Mới» |
| Thêm ModuleId mới trong code | Tự xuất hiện với người chưa tuỳ chỉnh; người đã tuỳ chỉnh nhận qua §3.3 |
| Gỡ ModuleId khỏi code | Id lạ bị bỏ qua khi đọc; dọn dần ở lần PUT kế |
| Vào `/?tuy-chinh=1` trên mobile | Bỏ qua param, có thể kèm toast «Tuỳ chỉnh trang chủ chỉ có trên máy tính» |
| Rời trang khi còn thay đổi chưa lưu | `beforeunload` + chặn điều hướng nội bộ, confirm |
| Mở 2 tab cùng edit | Last-write-wins. So `at` khi PUT, lệch thì cảnh báo «Layout đã đổi ở nơi khác» |
| `cho_ban_duyet` bị ẩn bằng cách gọi API tay | Server loại khỏi `hidden`, trả 200 |
| Đang edit thì Suspense của module chưa xong | Card giữ skeleton, vẫn kéo được (kéo cái vỏ, không phải nội dung) |
| Gallery view (`?view=gallery`) | 2 aside vốn bị ẩn → chặn edit mode, hoặc auto chuyển về timeline khi vào edit |

---

## 8. Security

- Viewer chỉ ghi được `home_layout` của chính mình — lấy id từ session, **không** nhận từ body. Kiểm tra RLS policy UPDATE hiện có trên `user_nguoi_dung` có cho phép user tự update cột này không; nếu policy đang liệt kê cột thì phải bổ sung.
- **Bật một module ≠ được xem dữ liệu.** Mỗi module giữ nguyên kiểm tra quyền riêng của nó (ví dụ `hoc_vien_cua_ban` vẫn phải verify membership org, `cho_ban_duyet` vẫn kiểm quyền duyệt). Lớp layout **chỉ** quyết định render hay không. Đây là bất biến quan trọng nhất — không được để `home_layout` trở thành đường vòng vào dữ liệu.
- Whitelist id theo `MODULE_REGISTRY`; chặn payload phình (giới hạn phần tử + kích thước body).
- `home_layout` không chứa dữ liệu nhạy cảm ⇒ không cần thêm quy tắc visibility; nhưng **không** expose nó ra API công khai của profile người khác.

---

## 9. Câu treo

1. Khối thêm mới trong edit mode hiện placeholder — chấp nhận được, hay cần render nội dung thật qua RSC fetch từng module? (v1 chọn placeholder.)
2. `tin_nhan_gan_day` có trùng vai trò với chat overlay đến mức không đáng làm không?
3. Có nên cho **guest** một layout mặc định tuỳ chỉnh được qua localStorage, hay bắt đăng nhập? (v1: bắt đăng nhập.)
4. Follow **ngành** chưa có loại riêng trong `user_theo_doi` — có mở rộng `loai_doi_tuong` không, hay bỏ hẳn khối `truong_theo_doi` phần ngành?
5. Sau Phase 1, có bổ sung Lớp 1 «ẩn tại chỗ» (nút `···` → Ẩn mục này ngay ở chế độ xem thường, không cần vào edit mode) không? Dùng chung `home_layout.hidden`, chi phí thấp, thường có tỷ lệ dùng cao hơn edit mode.
