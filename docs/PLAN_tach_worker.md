# PLAN — Tách «Quản lý» thành app/worker riêng

Trạng thái: **đang implement (Phase 3-lite)**. Host chốt: **`manage.cins.vn`** (không dùng `quan-ly.cins.vn`). `/admin` chuyển sang Worker `cins-manage`. Script: `npm run deploy:manage` rồi `npm run deploy:web`.

---

## 1. Vấn đề, đo bằng số thật

Deploy ngày 2026-08-05 fail ở bước upload:

```
Your Worker exceeded the size limit of 10 MiB. [code: 10027]
Total Upload: 49220.50 KiB / gzip: 10336.80 KiB
```

| Chỉ số | Giá trị | Ngưỡng | Tình trạng |
|---|---|---|---|
| Worker sau nén | 10336.80 KiB | 10240 KiB (Workers Paid) | ❌ vượt 96.8 KiB (0.94%) |
| Worker chưa nén (`handler.mjs`) | 46804.70 KiB | 65536 KiB | ⚠️ 71% ngưỡng |

Giới hạn 10 MiB là **mức cao nhất của bảng giá tiêu chuẩn** (Free 3 MB · Paid 10 MB). Không mua thêm được; chỉ có thể xin xét riêng qua [Limit Increase Request Form](https://forms.gle/eX6pXvit1wBv77Yw5) hoặc hợp đồng Enterprise.

### 1.1 Thành phần `handler.mjs` (32.78 MB input, đo từ esbuild metafile)

| Nhóm | Dung lượng | Ghi chú |
|---|---|---|
| Shared chunks `.next/server/chunks` | **12.51 MB** | 291 file; chunk lớn nhất `84350.js` = 1.76 MB |
| Route code `.next/server/app` | **13.58 MB** | xem 1.2 |
| Runtime Next.js | 6.09 MB | `load-manifest.external.js` một mình 3.78 MB |
| Còn lại (react-dom, sharp, semver…) | ~0.35 MB | không đáng kể |

### 1.2 Route code theo nhóm

| Nhóm | KB | Ghi chú |
|---|---:|---|
| `api` | **6641** | **716 file route** — nhóm nặng nhất, gấp 5.7× admin |
| `admin` | 1160 | |
| `co-so` | 1033 | gồm cả `(public)` và `quan-ly` |
| `[slug]` | 784 | journey/profile công khai |
| `studio` | 641 | gồm cả public và `quan-ly` |
| `cong-dong` | 384 | |
| `ban-hang` | 320 | dashboard người bán |
| `opengraph-image.png` + `twitter-image.png` | 483 | |
| Còn lại (~15 nhóm) | ~2100 | mỗi nhóm < 250 KB |

API nặng nhất: `api/co-so/[id]` 802 KB · `api/chat/rooms` 761 KB · `api/truong/[id]` 452 KB · `api/cong-dong/[id]` 429 KB · `api/org/[orgId]` 354 KB · `api/journey/[slug]` 300 KB.

### 1.3 Kết luận chẩn đoán

Không có dependency nào phình bất thường — **app đơn giản là đã quá lớn cho một worker**. Mọi trang và cả 716 API route compile vào chung một file. Nghĩa là:

- Cắt vụn (bỏ `@vercel/og`, xoá code chết) mua được vài trăm KB — đủ deploy lần này, **không** giải quyết được lâu dài.
- Tách theo ranh giới sản phẩm mới cắt được vài MB.

### 1.4 Các hướng đã loại

| Hướng | Vì sao loại |
|---|---|
| `functions` route-splitting trong `open-next.config.ts` | Trên Windows **im lặng no-op**: `traverseFiles` (`@opennextjs/aws/dist/build/helper.js` L161) dựng `relativePath` bằng `path.join` → route key thành `app/admin\page`, không khớp key gạch chéo xuôi mà `validateConfig` bắt buộc ⇒ `foundRoutes` rỗng, `remainingRoutes` giữ nguyên mọi route. Chạy trên Linux/WSL thì `patchVercelOgLibrary` crash ENOENT vì repo có route `opengraph-image` colocated (upstream issue #1314). |
| Tách middleware thành worker riêng (multi-worker docs OpenNext) | Chỉ chuyển 807 KiB thô (~200–250 KB nén) — vừa đủ lọt, biên gần bằng 0. Giá phải trả: mất `npm run deploy`, tự `wrangler deploy` từng worker + override `WORKER_VERSION_ID` + gradual deployment mỗi lần, mất skew protection và preview URL. |
| Chuyển toàn bộ OG sang ảnh tĩnh | `resvg.wasm` (1346 KiB) + `yoga.wasm` + font bin chỉ rời bundle khi **không còn route nào** `import` `next/og`. 13 route OG tĩnh chuyển đi không cắt được byte nào; phải bỏ cả **20 share card động** (profile, bài đăng, cơ sở, khóa học, tin tuyển dụng…) — mất tính năng thật để bù 0.94%. |

---

## 2. Mô hình đích — đúng, giống Meta Business

Câu hỏi «có phải giống Meta Business của Facebook không» — **đúng, gần như y hệt về hình dạng**:

| Facebook | CINs sau khi tách |
|---|---|
| `facebook.com` — người dùng cuối xem feed, profile, page | `cins.vn` — journey, trường/ngành, sự kiện, shop, chat |
| `business.facebook.com` — Meta Business Suite: quản lý page, quảng cáo, tài sản | `manage.cins.vn` — admin CINs (`/admin`); sau này thêm `*/quan-ly/*`, ban-hang |
| Cùng một tài khoản, đăng nhập một lần | Cùng session Supabase, cookie chia sẻ trên `.cins.vn` |
| Cùng backend dữ liệu | Cùng Supabase project `ospzzzxcomrmhqrnkoiw` |
| Hai app riêng, deploy riêng | Hai worker riêng, deploy riêng |

Khác biệt duy nhất về động cơ: Meta tách vì lý do sản phẩm (hai nhóm người dùng, hai bộ nhu cầu), CINs tách vì **vừa** lý do sản phẩm **vừa** bị giới hạn nền tảng ép. Điều đó thuận lợi: ranh giới sản phẩm và ranh giới kỹ thuật trùng nhau, nên không phải cắt bừa.

Hệ quả kích thước dự kiến:

| Worker | Nội dung | Ước lượng |
|---|---|---|
| `cins-web` (công khai) | journey, trường/ngành, sự kiện, shop mua, chat, tìm kiếm + API tương ứng | ~7–7.5 MB nén |
| `cins-quan-ly` | admin, `*/quan-ly/*`, ban-hang, tao-to-chuc + API quản lý | ~7 MB nén |

Lưu ý quan trọng: **runtime Next 6 MB và phần lớn shared chunks sẽ bị nhân đôi** ở cả hai worker. Tổng dung lượng tăng, nhưng mỗi worker về dưới ngưỡng — đó là mục tiêu, không phải tiết kiệm.

---

## 3. Ranh giới tách

### 3.1 Sang `cins-quan-ly`

| Đường dẫn hiện tại | Ghi chú |
|---|---|
| `app/admin/**` | 1160 KB, toàn bộ |
| `app/co-so/[slug]/quan-ly/**` | tách khỏi `(public)` |
| `app/studio/[slug]/quan-ly/**` | tách khỏi public |
| `app/cong-dong/[slug]/quan-ly/**` | nếu có |
| `app/ban-hang/**` | 320 KB dashboard người bán |
| `app/tao-to-chuc/**` | 111 KB |
| `app/api/admin/**`, `api/org/[orgId]/**`, `api/studio/[id]/**`, phần quản lý của `api/co-so/[id]/**`, `api/shop/**` (bán) | phần API nặng nhất |

### 3.2 Giữ ở `cins-web`

Journey `[slug]`, bài đăng `[slug]/p/[postSlug]`, trường/ngành/nghề, sự kiện, cộng đồng công khai, chat, tìm kiếm, shop phía mua, toàn bộ OG image, `auth/**`, `login`, `onboarding`.

### 3.3 Điểm khó — API dùng chung cả hai phía

`api/co-so/[id]` (802 KB) và `api/chat/rooms` (761 KB) phục vụ **cả** công khai lẫn quản lý. Ba cách xử lý, cần chốt:

1. **Nhân bản** route ở cả hai app (đơn giản, nhưng hai bản logic dễ lệch).
2. Đặt ở một app, app kia gọi qua **service binding** (một nguồn sự thật, thêm một chặng mạng nội bộ ~1–5 ms).
3. Tách endpoint theo mục đích đọc/ghi trước, rồi mỗi bên lấy phần của mình — sạch nhất, tốn công nhất.

Khuyến nghị: (2) cho `chat/rooms`, (3) cho `co-so/[id]` vì phần quản lý và phần công khai đã khác nhau về quyền.

---

## 4. Cấu trúc repo

Next không cho hai thư mục `app/` trong một project, nên phải thành workspace:

```
cins-website/
  apps/
    web/          # next app công khai  → worker cins-web
    quan-ly/      # next app quản lý    → worker cins-quan-ly
  packages/
    lib/          # lib/** hiện tại: supabase, to-chuc, shop, journey, truong…
    ui/           # component dùng chung + design tokens CSS
```

- npm workspaces (đã có `package-lock.json`, không cần thêm tool mới). Turborepo chỉ thêm nếu cần cache build.
- `packages/lib` giữ nguyên đường dẫn import `@/lib/*` bằng tsconfig paths để **giảm số file phải sửa**.
- Mỗi app có `open-next.config.ts`, `wrangler.jsonc`, script `deploy` riêng; thêm `npm run deploy:all`.

---

## 5. Auth & session — rủi ro cao nhất

Hiện tại `lib/supabase/cookie-options.ts` **không set `domain`**:

```ts
return { path: "/", sameSite: "lax", secure: isProd };
```

Cookie vì vậy là host-only trên `cins.vn` ⇒ `quan-ly.cins.vn` **sẽ không thấy session**, người dùng bị coi như chưa đăng nhập.

Việc phải làm:

1. Prod set `domain: ".cins.vn"`; dev giữ nguyên host-only cho `localhost` (đừng set domain cho localhost, browser sẽ từ chối).
2. Supabase Dashboard → Redirect URLs: thêm `https://manage.cins.vn/auth/callback`.
3. `NEXT_PUBLIC_SITE_URL` per app; `scripts/ensure-prod-site-url.mjs` cần biết app nào đang build.
4. **Rủi ro migration:** đổi từ host-only sang domain cookie tạo cookie trùng tên ở hai scope. Browser gửi cả hai, thứ tự không xác định ⇒ session lỗi ngẫu nhiên. Phải xoá cookie cũ ở lần request đầu (set host-only cookie hết hạn) trước khi ghi cookie domain. Cân nhắc chấp nhận đăng xuất toàn bộ người dùng một lần cho gọn.
5. OAuth PKCE: verifier phải được đọc/ghi cùng origin. Luồng login nên **chỉ nằm ở `cins-web`**, quản lý redirect sang đó rồi quay lại — tránh nhân đôi callback.

---

## 6. Database

**Không đổi schema, không migration, không sửa RLS.** Hai worker dùng cùng Supabase project và cùng bộ RLS. Service-role key có ở cả hai app — xem §8.

---

## 7. Các bước

**Phase 0 — mở đường deploy ngay (làm trước, độc lập với việc tách)**
Cắt ~200 KB nén để không bị chặn deploy trong lúc làm phần còn lại. Ứng viên: code chết, dep trùng, import nặng lọt vào server bundle (nghi `@tiptap`/ProseMirror vào chunk server), `scripts/cf-migrate/old-ids.json`. Phải đo lại metafile sau mỗi lần cắt.

**Phase 1 — dựng workspace, chưa tách route**
Chuyển sang `apps/web` + `packages/lib` + `packages/ui`, giữ nguyên toàn bộ route. Deploy `cins-web` phải chạy đúng như hôm nay. Đây là phase dễ vỡ nhất về import path — làm riêng, verify riêng.

**Phase 2 — dựng `apps/quan-ly` rỗng + auth**
App mới chỉ có layout, `/`, và luồng session. Deploy lên `quan-ly.cins.vn`, xác minh đăng nhập ở `cins.vn` thì `quan-ly.cins.vn` nhận được session (mục §5).

**Phase 3 — chuyển `app/admin/**`**
Nhóm gọn nhất, ít phụ thuộc public nhất ⇒ dùng làm phép thử. Đo lại kích thước hai worker.

**Phase 4 — chuyển `*/quan-ly/*`, `ban-hang`, `tao-to-chuc` + API tương ứng**
Chốt cách xử lý API dùng chung (§3.3) trước khi bắt đầu.

**Phase 5 — dọn**
Xoá route đã chuyển khỏi `apps/web`, thêm redirect `cins.vn/admin/*` → `quan-ly.cins.vn/*` để link cũ không chết. Đo lại cả hai worker, ghi số vào file này.

---

## 8. Edge cases & rủi ro

- **Link cũ / SEO:** mọi URL quản lý đang tồn tại phải redirect 301, không được 404.
- **Chuyển qua lại giữa hai app là full page load**, không phải client navigation. Nút «Quản lý» trong UI công khai cần `<a>` chứ không `<Link>`.
- **Shared chunk nhân đôi:** mỗi worker có bản Next runtime riêng ⇒ tổng build time và tổng dung lượng tăng gần gấp đôi. Build CI cần thời gian gấp đôi.
- **Design token lệch:** CSS tokens phải nằm ở `packages/ui`, không copy hai bản.
- **Cloudflare Images / R2 binding:** `wrangler.jsonc` của app mới phải khai lại binding (`CINS_RIVE_ASSETS`, `HYPERDRIVE`…) — thiếu binding chỉ lộ ra ở runtime, không ở build.
- **`--keep-vars`:** deploy hiện dùng cờ này; app mới cần set env var lần đầu bằng tay, nếu không `--keep-vars` sẽ giữ… không có gì.
- **Trần 64 MB chưa nén** vẫn áp cho từng worker; sau khi tách mỗi bên còn ~23 MB, thoải mái.

---

## 9. Security

- Service-role key sẽ tồn tại ở **hai** worker ⇒ tăng bề mặt tấn công. `cins-quan-ly` nên bật Cloudflare Access hoặc IP allowlist cho `/admin/*` nếu chỉ nội bộ dùng.
- Cookie `domain: ".cins.vn"` khiến **mọi** subdomain đọc được session. Không được trỏ subdomain nào cho bên thứ ba, và không dùng subdomain cho user-generated content.
- RLS vẫn là tầng phòng thủ chính; việc tách app **không** được dùng làm cơ chế phân quyền (đừng giả định «route nằm ở app quản lý nên chắc chắn là admin»). Mọi route quản lý vẫn phải tự kiểm tra quyền như hiện tại.

---

## 10. Câu treo cần quyết trước khi code

1. **Subdomain:** **chốt `manage.cins.vn`** (2026-08-22). Không dùng path `cins.vn/admin` làm Worker riêng. `cins.vn/admin/*` → 308 sang `manage.cins.vn/admin/*`.
2. **Chấp nhận đăng xuất toàn bộ người dùng một lần** khi đổi scope cookie, hay làm cơ chế xoá cookie cũ (§5.4)?
3. **API dùng chung**: nhân bản, service binding, hay tách theo mục đích (§3.3)?
4. Có gộp `ban-hang` (người bán, không phải nhân viên CINs) vào app quản lý, hay nó thuộc phía công khai?
