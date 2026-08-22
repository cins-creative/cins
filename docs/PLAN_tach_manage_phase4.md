# PLAN — Phase 4: tách trang quản lý sang `manage.cins.vn/{loại}/[slug]`

> Nối tiếp [`PLAN_tach_worker.md`](./PLAN_tach_worker.md) §7 Phase 4. Phase 3-lite đã đẩy `/admin` sang Worker `cins-manage`. Phase 4 đẩy tiếp **trang quản lý entity** để hạ tiếp size Worker `cins` (web).
> Trạng thái: **đã deploy 2026-08-22** (`deploy:all`). Đo gzip: **manage 5754 KiB** · **web 7757 KiB** (trần 10240; biên web ~2.5 MiB). Không đổi schema / RLS / migration.

## 0. Quyết định đã chốt (2026-08-22)

| # | Chốt |
|---|---|
| 1 | **Chỉ tách subtree `/manage`** (không đụng trang công khai `(public)`). |
| 2 | **Chỉ tách quản lý shop phía người bán** (`/seller/*`); phần mua giữ ở `cins.vn`. |
| 3 | **University manage** làm cùng đợt. |
| 4 | Đích `manage.cins.vn/` **giữ 308 → `/admin`** bây giờ; hub để sau (người dùng luôn tới URL cụ thể qua link). |
| 5 | **URL model:** `manage.cins.vn/{academy\|studio\|university\|shop}/[slug]/...` — loại org nằm trong path, không cần resolve. |
| 6 | **API quản lý chuyển sang manage** (same-origin), tránh CORS. Chi tiết §4. |
| 7 | **Cách làm:** rewrite + park, **không dời file** (giữ component/route hiện có). §5. |

## 1. Vì sao cần Phase này

- `npm run deploy` (build cả `app/` vào worker `cins`) fail `code 10027` — gzip ~10470 KiB > trần 10240 KiB.
- Phase 3-lite chỉ park `admin` + `api/admin`. Cụm quản lý nặng **vẫn compile vào `cins.vn`**: `api/academy/[id]/**` (~50 route, ~800 KB), `academy/[slug]/manage` (14 trang), `studio/[slug]/manage` (10 trang), `seller` (10 trang).
- Mục tiêu: web tụt **dưới trần với biên ≥ 400 KiB** (không chỉ lọt sát). Chưa kỳ vọng giải quyết vĩnh viễn — chat + journey + OG là khối lớn còn lại.

## 2. URL model & ánh xạ route

Loại org tường minh trong path; đoạn `/manage` nội bộ **ẩn** khỏi URL người dùng qua rewrite.

| URL người dùng (manage) | Rewrite nội bộ (route file hiện có) |
|---|---|
| `manage.cins.vn/academy/[slug]/students` | `/academy/[slug]/manage/students` |
| `manage.cins.vn/academy/[slug]` | `/academy/[slug]/manage` (hub CSĐT) |
| `manage.cins.vn/studio/[slug]/info` | `/studio/[slug]/manage/info` |
| `manage.cins.vn/university/[slug]/...` | `/university/[slug]/manage/...` |
| `manage.cins.vn/shop/[slug]/orders` | `/seller/orders` (xem §5.3 về slug) |
| `manage.cins.vn/admin/...` | `/admin/...` (đã có) |

Đối xứng: `cins.vn/academy/[slug]` = công khai · `manage.cins.vn/academy/[slug]` = quản lý cùng thực thể.

**Path dành riêng trên manage** (slug không được trùng): `admin`, `api`, `auth`, `login`, `shop`, `academy`, `studio`, `university`, OG/asset. Next match route tĩnh trước động nên `/admin` vẫn thắng.

## 3. Database

**Không đổi.** Hai worker chung Supabase `ospzzzxcomrmhqrnkoiw` + chung RLS. Service-role key có ở cả hai (§8). Không CREATE/ALTER/migration.

## 4. API — phân loại

### 4.1 Chuyển sang manage (park khỏi web)

| Thư mục | Ghi chú |
|---|---|
| `api/academy/[id]/**` | Quản lý CSĐT. **Ngoại lệ giữ web:** `api/academy/preview` (public). |
| `api/studio/[id]/**` phần quản lý | `settings`, `members`, `lifecycle`, `transfer-owner`. **Giữ web:** `api/studio/jobs/**`, `api/studio/preview` (public/ứng tuyển). |
| `api/org/[orgId]/**` phần quản lý | `events/manage`, `inbox/threads`, `student-*`, `milestone-*`, `membership-*`. **Giữ web:** `register`, `showcase-aside`, phần công khai. Rà từng route. |

### 4.2 `api/shop/**` — thư mục lẫn, compile CẢ HAI worker

46 route trộn buyer + seller. **Không** `renameSync` cả cụm. Phase 4: **không park `api/shop` khỏi worker nào** — web giữ nguyên (buyer), manage cũng có (seller pages gọi same-origin). Web không giảm phần `api/shop` nhưng giảm được `app/seller` pages + `api/academy`. Tách buyer/seller theo thư mục = Phase 5.

> `parkManage` hiện park **mọi** `api/*` trừ `admin`,`auth` ⇒ đang park nhầm `api/shop`,`api/academy`,`api/studio` khỏi manage. Phase 4 **đảo lại**: manage GIỮ `api/academy`, `api/studio`(quản lý), `api/shop`, `api/org`(quản lý), `api/user/seller`.

### 4.3 Giữ ở web

Journey, bài đăng, trường/ngành, chat, tìm kiếm, `auth/**`, `login`, `onboarding`, OG, `api/academy/preview`, `api/studio/preview`, `api/studio/jobs/**`, toàn bộ API buyer.

## 5. Frontend — rewrite, park, redirect

### 5.1 Rewrite URL đẹp (trên manage)

`next.config.ts`, nhánh `cinsSurface === "manage"`, thêm `rewrites()`:
- `/academy/:slug/:seg*` → `/academy/:slug/manage/:seg*` (và `/academy/:slug` → `/academy/:slug/manage`).
- Tương tự `studio`, `university`.
- `/shop/:slug/:seg*` → `/seller/:seg*`.
- Cần loại trừ để rewrite không nuốt `/api`, `/admin`, asset.

### 5.2 Park (sửa `scripts/cins-surface.mjs`)

- **Cần helper `parkNested(relPath)`** — `parkEntry` hiện chỉ cấp 1; phải park được `app/academy/[slug]/manage` mà giữ `(public)`/`layout.tsx`/OG, và restore đúng chỗ trong `finally`.
- **`parkWeb()`** thêm: `app/seller`, `app/api/user/seller`, nested `app/{academy,studio,university}/[slug]/manage`, `app/api/academy` (trừ `preview`), phần quản lý `app/api/studio`/`app/api/org`.
  - Giữ pattern `WEB_KEEP_*` cho server action nào UI public còn import (rà `academy/**/actions.ts`, `studio/**/actions.ts`).
- **`parkManage()`** sửa: bỏ park `seller` + `api/shop` + `api/academy` + `api/studio`(quản lý) + `api/user/seller`; **vẫn** park `(public)` của academy/studio/university (manage không cần trang công khai) → park theo nested `(public)` thay vì cả `[slug]`.
  - `MANAGE_KEEP_API_DIRS`: `admin`,`auth`,`academy`,`studio`,`shop`,`org`,`user`.

### 5.3 Seller & slug

`/seller/*` hiện **theo user** (một người một gian), không theo slug. Ánh xạ:
- URL đẹp `manage.cins.vn/shop/[slug]/...`; rewrite bỏ `[slug]` về `/seller/...`; **route seller vẫn resolve shop theo session** như hôm nay. `[slug]` = handle shop của user, chủ yếu hiển thị.
- **Giả định:** một user một shop (đúng hiện trạng). Đa shop = việc sau.
- Redirect từ web cần suy `[slug]` từ shop của user → dùng helper trả handle hiện tại; nếu chưa có handle, fallback `manage.cins.vn/shop` (route seller tự resolve).

### 5.4 Redirect 308 (web → manage)

`next.config.ts` nhánh `web` (giống `/admin` đã có) + `middleware.ts` (mở rộng match ngoài `/admin`):
- `/academy/:slug/manage/:seg*` → `manage.cins.vn/academy/:slug/:seg*` (bỏ `/manage`).
- `studio`, `university` tương tự.
- `/seller/:seg*` → `manage.cins.vn/shop/:slug/:seg*` (slug từ session; hoặc `/shop/:seg*`).
- `/api/academy/:path*` (quản lý) → manage (`permanent:false`).

### 5.5 Link nội bộ `<Link>` → `<a>` (chuyển origin = full load)

Tổng quát hoá `lib/cins/manage-site.ts` thêm `manageHref(path)` (đã có `manageAdminHref`). Đổi các link **từ web sang quản lý** thành `<a>` tuyệt đối:
- `components/journey/JourneyShopLoaiClient.tsx` (`/seller/orders`,`/seller/store`).
- `components/cins/home-adaptive/modules/*` (`ban-hang.tsx`,`QuanLyKhoList.tsx`,`DonCanXuLyClient.tsx`).
- `components/co-so/CoSoPageSettingsModal.tsx` (`/academy/.../manage/facilities`).
- `lib/billing/enrich-dich-vu.ts` (trả href `/seller/store`,`/academy/{slug}/manage`).
- **Nội bộ trong manage** (tab↔tab: `ShopDashTabs`,`BanHangShell`,`ShopUuDaiSubTabs`) giữ `<Link>` — nhưng đích phải là URL đẹp mới (`/shop/[slug]/...`) nếu đã rewrite; cân nhắc để rewrite lo, link tương đối vẫn chạy.

## 6. Auth & session

**Sẵn sàng — không làm lại.** `lib/supabase/cookie-options.ts` set `Domain=.cins.vn` trên prod ⇒ `cins.vn` + `manage.cins.vn` chung phiên. `middleware.ts` đã có `expireHostOnlyAuthCookies`. OAuth callback chỉ ở `cins-web`; manage redirect sang web login rồi quay lại.

## 7. Các bước (rủi ro tăng dần — mỗi bước deploy + verify riêng)

- **B1 — Shop/seller trước** (gọn nhất). Park `app/seller`+`api/user/seller` khỏi web; manage giữ `seller`+`api/shop`. Rewrite `/shop/:slug/*`→`/seller/*`. Redirect `/seller/*`. Đổi link web→manage. `deploy:manage` → `deploy:web` → đo size → smoke: bán trên `manage.cins.vn/shop/...`, mua trên `cins.vn`.
- **B2 — CSĐT.** `parkNested academy/[slug]/manage` + `api/academy` (trừ preview). Rewrite `/academy/:slug/*`. Verify public `/academy/[slug]` còn trên web; quản lý học viên/học phí trên manage.
- **B3 — Studio.** Tương tự; tách `api/studio` quản lý vs `jobs`/`preview`.
- **B4 — University manage.**
- **B5 — Đo & chốt.** Ghi gzip hai worker vào `PLAN_tach_worker.md`. Nếu web vẫn > trần → Phase 5 (tách `api/shop` buyer/seller, hoặc chuyển chat).

## 8. Edge cases & rủi ro

- **`parkNested` + restore:** phải restore đúng chỗ trong `finally` (luật dev-host — workspace không để dở). Windows `renameSync` EPERM → fallback `cpSync`+`rmSync` (đã có trong `parkEntry`).
- **Rewrite nuốt asset/api:** loại trừ `/api`,`/admin`,`/_next`,OG khỏi rewrite.
- **Import chéo:** `typescript.ignoreBuildErrors` bật cho web/manage; nhưng runtime lỗi nếu `(public)` import runtime từ `manage/` đã park. Rà import.
- **Server action chéo:** như `WEB_KEEP_ADMIN_FILES` — làm tương tự nếu `academy/(public)` import action trong `manage/`.
- **Cross-origin fetch:** nếu lỡ park API khỏi manage mà trang manage gọi relative → 404 runtime. Lý do §4.2 giữ `api/shop` trên manage.
- **Binding wrangler:** `wrangler.manage.jsonc` đã có HYPERDRIVE + R2 (`cins-rive-assets`,`cins-chat-video`). Env/secret khác set qua `scripts/sync-manage-secrets.mjs`; `--keep-vars` cần var đã set lần đầu.
- **SEO/link cũ:** mọi URL quản lý cũ 308, không 404. Kiểm link trong thông báo/email nếu có.

## 9. Security

- Service-role key ở **cả hai** worker ⇒ cân nhắc Cloudflare Access cho `manage.cins.vn` (ít nhất `/admin`; `/shop`,`/academy` để user thường vào nên **không** bịt).
- `Domain=.cins.vn` ⇒ mọi subdomain đọc session — không trỏ subdomain cho bên thứ ba, không dùng cho UGC.
- RLS là tầng phòng thủ chính; **không** giả định "route ở manage nên là quyền quản lý". Mọi route tự check quyền.

## 10. Giả định còn lại (không chặn, xác nhận khi gặp)

1. Một user một shop → `/shop/[slug]` slug hiển thị, seller resolve theo session. Đa shop = sau.
2. Segment con dưới `[slug]` giữ tên hiện có (`students`,`tuition`,`orders`…) — chưa Việt hoá URL.
3. `api/org` quản lý vs công khai rà từng route ở B2/B3.

---

### Verify size (sau mỗi bước)

- `deploy:web`/`deploy:manage` in `Total Upload … / gzip …`. Mục tiêu web gzip **< ~9800 KiB** (biên ≥ 400 KiB).
- Chi tiết: `WRANGLER_LOG=debug` xem diff asset; esbuild metafile đo `handler.mjs` theo nhóm (§1.1 plan gốc).
