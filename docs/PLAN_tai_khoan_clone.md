# PLAN — Tài khoản clone artist (coldstart seeding có xin phép)

> **Phase:** PLANNING (Opus 5) — **chưa code**.
> **Ngày:** 2026-08-01 · **Trang đích:** `/admin/tai-khoan-ai`
> **Liên quan:** [`cursor_brief_seed_autopilot_handoff.md`](./cursor_brief_seed_autopilot_handoff.md) · [`CINS_DEV_RULES.md`](./CINS_DEV_RULES.md) · [`CINS_DECISIONS.md`](./CINS_DECISIONS.md)

## Quyết định đã chốt (2026-08-01)

| # | Quyết định | Chi tiết |
|---|---|---|
| 1 | **Bàn giao = gộp nội dung vào user thật** | Supersede đổi `auth_user_id` — xem [`PLAN_ban_giao_gop_user.md`](./PLAN_ban_giao_gop_user.md) |
| 2 | **Mật khẩu = vault mã hóa** | AES-256-GCM, xem lại được từ admin UI — §2.2 |
| 3 | **KPI áp cho toàn bộ roster** | Cả tài khoản clone lẫn 10 nick AI — §5 |
| 4 | **Quyền giữ nguyên** | `admin` + `super_admin` cho mọi thao tác; curator **không** vào tab Clone — §7 |

---

## 0. Bối cảnh & khác biệt với nick AI hiện tại

CINs đang coldstart. Hướng mới: xin phép **artist thật** cho reup tác phẩm từ FB / Behance / Vimeo / web cá nhân → đội ngũ up **thủ công** vào một tài khoản "clone" đứng tên artist đó. Khi artist muốn tự quản trị, admin **bàn giao** tài khoản đó cho tài khoản họ đăng ký.

Đây là loại tài khoản **khác hẳn** 10 nick AI đang có:

| | Nick AI (đang chạy) | Tài khoản clone (mới) |
|---|---|---|
| Nội dung | Autopilot scrape + AI caption | Đội ngũ up tay |
| Danh tính | Nhân vật hư cấu (wibu) | Mirror artist thật, **có xin phép** |
| Nguồn | `auto_nguon` watchlist | Danh sách URL portfolio của artist |
| Hạn mức | `auto_han_muc.han_muc` (worker tự tăng) | KPI đếm từ bài thật đã đăng |
| Đích cuối | Giữ nick seeding lâu dài | **Bàn giao rồi biến mất** |

**Quyết định nền:** tái dùng bảng `auto_tai_khoan` + thêm cột `loai` (`ai` \| `clone`), **không** tạo bảng roster mới. Lý do: KPI phải bao cả hai loại ("tất cả các tài khoản"), `auto_han_muc` đã đúng shape (per-account per-day), và admin UI đã có sẵn. Đổi lại phải **filter `loai='ai'`** ở các hàm autopilot, nếu không AI sẽ tự đăng bài vào tài khoản clone.

---

## 1. Database

> **⚠️ Luật 6 (INSTRUCTION):** đây là ALTER trên bảng đã có (`auto_tai_khoan`, `auto_han_muc`) → **phải được user xác nhận + ghi DECISIONS trước khi chạy migration**. Toàn bộ đều là `ADD COLUMN IF NOT EXISTS` (additive, không đổi nghĩa cột cũ, không drop).

### 1.1 `auto_tai_khoan` — thêm cột

| Cột | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `loai` | `text` CHECK in (`ai`,`clone`) | `'ai'` | Phân loại roster |
| `ten_that` | `text` | null | Tên artist thật (đối chiếu) |
| `lien_ket_nguon` | `text[]` | `'{}'` | **Yêu cầu 3** — URL portfolio: FB, Behance, Vimeo, ArtStation, web cá nhân |
| `lien_he` | `text` | null | Kênh liên hệ artist (FB/email) — nội bộ, không public |
| `trang_thai_xin_phep` | `text` CHECK in (`chua_lien_he`,`dang_cho`,`dong_y`,`tu_choi`) | `'chua_lien_he'` | Quy trình xin phép |
| `bang_chung_dong_y` | `text` | null | URL/CF image id ảnh chụp xác nhận đồng ý — **bằng chứng bản quyền** |
| `kpi_ngay` | `integer` CHECK 0–50 | null | Override KPI/ngày; null = để hệ thống phân bổ |
| `tam_dung` | `boolean` | `false` | Cho nghỉ khỏi phân bổ KPI mà không xóa |
| `trang_thai_ban_giao` | `text` CHECK in (`dang_van_hanh`,`cho_ban_giao`,`da_ban_giao`) | `'dang_van_hanh'` | **Yêu cầu 2** |
| `id_nguoi_dung_dich` | `uuid` → `user_nguoi_dung(id)` ON DELETE SET NULL | null | Tài khoản thật đã **gán** (chưa apply) |
| `mat_khau_ma_hoa` | `text` | null | Vault mật khẩu AES-256-GCM (`iv:tag:ciphertext` base64) — xem §2.2 |
| `mat_khau_doi_luc` | `timestamptz` | null | Lần cuối đặt lại mật khẩu |

Index: `(loai, tam_dung)` cho query phân bổ KPI.

Cột `mat_khau_ma_hoa` áp cho **cả nick AI** (10 nick hiện có cũng cần đội ngũ đăng nhập được) — điền dần qua thao tác «Đặt lại mật khẩu», không backfill được vì mật khẩu cũ không lưu ở đâu.

### 1.2 `auto_han_muc` — thêm cột KPI (tách khỏi hạn mức autopilot)

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `kpi_muc_tieu` | `integer` | Số bài **được phân bổ** cho tài khoản này trong ngày. `NULL` = chưa phân bổ, `0` = hôm nay nghỉ |
| `kpi_phan_bo_luc` | `timestamptz` | Dấu **freeze** — đã phân bổ thì không tính lại khi refresh |

Giữ nguyên `han_muc` / `so_da_dang` cho autopilot AI. **Không trộn hai nghĩa.**

### 1.3 Bảng mới `auto_ban_giao` — audit log bàn giao

Bàn giao là thao tác **phá hủy, không hoàn tác** → bắt buộc có log tồn tại sau khi row clone biến mất.

```
id uuid PK
slug_clone        text NOT NULL      -- slug tại thời điểm bàn giao
id_nguoi_dung     uuid               -- profile được giữ lại (chính là clone profile)
email_dich        text               -- email tài khoản thật nhận bàn giao
id_nguoi_dich     uuid
so_cot_moc        integer            -- snapshot số bài tại thời điểm bàn giao
thuc_hien_boi     uuid → user_nguoi_dung(id)
chi_tiet          jsonb              -- snapshot đầy đủ trước khi đổi
tao_luc           timestamptz default now()
```

RLS: `REVOKE ALL FROM anon, authenticated` + `GRANT ALL TO service_role` (theo pattern `migration_autopilot_giai_doan_1.sql` L168–188).

### 1.3b Bảng mới `auto_nhat_ky_mat_khau` — audit xem mật khẩu

```
id uuid PK · id_tai_khoan uuid → auto_tai_khoan(id) ON DELETE CASCADE
hanh_dong text CHECK in ('xem','dat_lai','tao_moi')
thuc_hien_boi uuid → user_nguoi_dung(id)
tao_luc timestamptz default now()
```

Cùng chính sách RLS như trên. Chỉ ghi **metadata**, tuyệt đối không ghi giá trị mật khẩu.

### 1.4 Cấu hình KPI tổng — `auto_kpi_cau_hinh` (singleton)

```
id smallint PK default 1 CHECK (id = 1)
muc_tieu_ngay      integer default 20    -- yêu cầu 4: "1 ngày phải up 20 bài"
bai_moi_luot       integer default 1     -- mỗi tài khoản khi được chọn up mấy bài
ap_dung_loai       text[] default '{clone}'
cap_nhat_boi       uuid
cap_nhat_luc       timestamptz
```

### 1.5 RPC `ban_giao_tai_khoan_clone()` — SQL function

Supabase JS **không có transaction**. Bàn giao gồm nhiều bước phải all-or-nothing → bắt buộc là Postgres function `SECURITY DEFINER`, `REVOKE EXECUTE FROM anon, authenticated`. Chi tiết luồng ở §3.2.

---

## 2. Yêu cầu 1 — Tạo tài khoản clone + mật khẩu

### 2.1 Luồng tạo

Repo hiện **chưa có** chỗ nào gọi `auth.admin.createUser` (10 nick cũ tạo tay qua UI đăng ký). Đây là cơ chế mới.

```
Admin nhập: slug · tên hiển thị · tên thật · giai_doan · lien_ket_nguon[] · trạng thái xin phép
   ↓
1. Validate slug (regex `^[a-z0-9][a-z0-9_-]{1,62}$`, chưa tồn tại trong user_nguoi_dung)
2. Sinh mật khẩu ngẫu nhiên 16 ký tự (crypto.randomBytes, không Math.random)
3. auth.admin.createUser({ email: `${slug}@cins.vn`, password, email_confirm: true })
   → email_confirm=true để không gửi mail tới hộp thư không tồn tại
4. Trigger handle_new_user() tự tạo row user_nguoi_dung
5. UPDATE user_nguoi_dung SET slug, ten_hien_thi, giai_doan  (service role)
   → PHẢI set giai_doan, nếu null thì login bị ép sang /onboarding (app/onboarding/page.tsx L43)
6. INSERT auto_tai_khoan { loai:'clone', dang_bat:false, tuong_tac_bat:false, ... }
   → dang_bat=false để autopilot KHÔNG bao giờ chọn tài khoản này
7. Trả mật khẩu về UI (1 lần)
```

**Rollback:** bước 5/6 lỗi → phải `auth.admin.deleteUser` để không để lại auth user mồ côi.

### 2.2 Vault mật khẩu (đã chốt — phương án B)

Mật khẩu được mã hóa **AES-256-GCM** ở tầng ứng dụng (Node `crypto`, không cần pgcrypto), lưu ở `auto_tai_khoan.mat_khau_ma_hoa` dạng `base64(iv) : base64(authTag) : base64(ciphertext)`.

```
Key: env CINS_CLONE_PASSWORD_KEY = 32 byte hex (sinh bằng: openssl rand -hex 32)
Thiếu env → chức năng tạo/hiện mật khẩu tắt hẳn, KHÔNG fallback lưu plaintext.
Lib: lib/admin/mat-khau-vault.ts — maHoa() / giaiMa(), không export key ra ngoài.
```

**Vì sao chấp nhận được** (khác với `CINS_DEV_RULES` §6 thông thường): đây là tài khoản do CINs sở hữu và vận hành, không chứa dữ liệu cá nhân người thật, không gắn thanh toán, và **bị xóa hẳn khi bàn giao**. Mật khẩu này là credential vận hành nội bộ chứ không phải mật khẩu của người dùng cuối. Phải ghi rõ đánh đổi này vào `CINS_DECISIONS.md`.

**Ràng buộc bắt buộc khi implement:**
- Endpoint riêng `POST …/action { action: "hien_mat_khau", id }` — **không bao giờ** trả `mat_khau_ma_hoa` hay plaintext trong API list roster.
- Mỗi lần hiện → INSERT `auto_nhat_ky_mat_khau` (id tài khoản, ai xem, thời điểm). Bảng nhỏ, service-role only.
- **Không** log plaintext ra console / Sentry / response error (DEV_RULES §2).
- UI: hiện trong modal, mặc định che, nút Copy, **tự ẩn sau 15 giây**. Không render trong bảng.
- Khi bàn giao → row `auto_tai_khoan` bị xóa nên vault đi theo. Không cần dọn riêng.
- Rotate key: nếu đổi `CINS_CLONE_PASSWORD_KEY` thì mọi bản mã cũ vô dụng → phải đặt lại mật khẩu toàn bộ. Ghi cảnh báo này vào `.env.example`.

**Thao tác «Đặt lại mật khẩu»:** sinh mật khẩu mới → `auth.admin.updateUserById(authId, { password })` → ghi đè vault → hiện modal. Dùng cho cả 10 nick AI cũ để đưa chúng vào vault.

---

## 3. Yêu cầu 2 — Gán & bàn giao sang tài khoản thật

### 3.1 Chiến lược — **đã đổi 2026-08-01 tối: C (gộp nội dung → user thật)**

> **Supersede B.** Chi tiết đầy đủ: [`PLAN_ban_giao_gop_user.md`](./PLAN_ban_giao_gop_user.md).

| | **B (cũ)** đổi `auth_user_id` | **C (mới)** gộp moc → user thật |
|---|---|---|
| Đích đã có bài | Chặn | **Cho phép** |
| Slug / permalink bài seeding | Giữ slug clone | Đổi sang slug user thật |
| Profile còn lại | Clone (artist login vào đây) | User thật; **xóa** clone |

§3.2–3.3 bên dưới mô tả **luồng B (cũ)** — giữ để audit. Implementation mới theo plan gộp.

### 3.2 Luồng 2 bước (đúng như mô tả "gán" rồi "apply")

**Bước Gán** (không phá hủy, có thể hủy):
```
Admin tìm tài khoản thật theo email / slug
  → chạy kiểm tra "tài khoản đích có trống không"
  → UPDATE auto_tai_khoan SET id_nguoi_dung_dich, trang_thai_ban_giao='cho_ban_giao'
  → UI hiện banner: "Đã gán cho <email>. Sẽ chuyển N bài. [Apply] [Hủy gán]"
```

Kiểm tra "trống" (chặn nếu bất kỳ cái nào > 0):
`content_cot_moc` · `content_tac_pham` · `shop_cua_hang` · `user_thanh_vien_to_chuc` · `user_quyen_he_thong` (không được là admin/curator) · `org_to_chuc.nguoi_tao`.
Nếu không trống → **từ chối**, báo rõ vướng ở đâu. Không tự động fallback sang chiến lược A.

**Bước Apply** (RPC transaction, không hoàn tác):
```
1. Khóa & đọc lại: C = clone profile, T = target profile. Re-check T trống (TOCTOU).
2. INSERT auto_ban_giao (snapshot đầy đủ trước khi đổi)
3. authT := T.auth_user_id ; authC := C.auth_user_id
4. DELETE FROM user_nguoi_dung WHERE id = T.id
      → giải phóng slug + auth link. FK nào còn tham chiếu T sẽ raise → transaction rollback (fail-safe, đúng ý muốn)
5. UPDATE user_nguoi_dung SET auth_user_id = authT WHERE id = C.id
6. DELETE FROM auto_tai_khoan WHERE id = <clone row>   → "biến mất" khỏi roster
   (auto_han_muc CASCADE theo; auto_ban_giao giữ lịch sử)
COMMIT
7. Ngoài transaction (Admin API, không rollback được): auth.admin.deleteUser(authC)
   → xóa tài khoản đăng nhập giả @cins.vn. Chạy SAU commit; lỗi thì chỉ log + hiện cảnh báo dọn tay.
```

Kết quả: artist đăng nhập bằng Google/email của họ → vào thẳng profile có sẵn toàn bộ nội dung, **giữ nguyên slug và mọi permalink đã share**.

### 3.3 Sau bàn giao

- Gửi thông báo in-app + hướng dẫn artist đổi slug / tên / avatar nếu muốn.
- Nếu muốn ép artist tự khai lại hồ sơ: set `giai_doan = NULL` ở bước 5 → lần login đầu bị đưa vào `/onboarding`. Mặc định plan này **giữ nguyên** `giai_doan` — xem §11 câu treo 1.
- Nhãn `tham-khao` (filter riêng của bài seed): tài khoản clone đăng tác phẩm **của chính artist** nên **không** gắn nhãn này ngay từ đầu — xem §11 câu treo 2.

---

## 4. Yêu cầu 3 — Danh sách URL portfolio

- Lưu ở `auto_tai_khoan.lien_ket_nguon text[]`.
- Validate backend: mỗi phần tử `^https://`, ≤ 500 ký tự, tối đa 12 URL, dedupe.
- UI: textarea "mỗi dòng 1 URL" khi sửa; khi xem thì render chip có icon nền tảng (Lucide) suy từ hostname — `facebook.com` · `behance.net` · `vimeo.com` · `artstation.com` · `pixiv.net` · còn lại = "Web". Mở tab mới, `rel="noopener noreferrer"`.
- Cột trong bảng roster: hiện 2 chip đầu + "+N" để không vỡ layout.

---

## 5. Yêu cầu 4 — KPI theo ngày

> **Phạm vi đã chốt: toàn bộ roster** — cả tài khoản clone (up tay) lẫn 10 nick AI (Autopilot đăng). `auto_kpi_cau_hinh.ap_dung_loai` mặc định `'{ai,clone}'`.

Việc gộp hai loại vào cùng một mục tiêu là hợp lý vì cách đếm giống hệt nhau: cả hai đều tạo row `content_cot_moc`. Khác biệt duy nhất là **ai làm cho nó xong** — nick AI do cron, clone do người. Với nick AI cần lưu ý `kpi_muc_tieu` (KPI vận hành) độc lập với `han_muc` (rate-limit chống lộ bot, 3 bài/ngày): nếu đặt `kpi_muc_tieu > han_muc` thì nick AI sẽ **không bao giờ** đạt KPI. Thuật toán phân bổ phải **clamp `kpi_muc_tieu <= han_muc_ngay`** cho tài khoản `loai='ai'`.

### 5.1 Nguồn sự thật cho "đã up"

Điểm mấu chốt: đội ngũ up **thủ công qua UI**, không qua API autopilot → `auto_han_muc.so_da_dang` (do worker tăng) **không** phản ánh gì cả với tài khoản clone. Đếm từ `content_cot_moc` cho **cả hai loại** để có một nguồn sự thật duy nhất.

Schema thật đã xác nhận: `content_cot_moc` **không có** `da_xoa` (xóa là xóa cứng) và có `tao_luc timestamptz`, `thoi_diem date`, `che_do_hien_thi che_do_hien_thi_moc_enum`.

```
1 query duy nhất cho toàn bộ roster (KHÔNG N+1):
  select id_nguoi_dung, count(*)
  from content_cot_moc
  where id_nguoi_dung = any($ids)
    and tao_luc >= $dauNgayVn and tao_luc < $dauNgayMaiVn
    and che_do_hien_thi in ('public','feature')
  group by id_nguoi_dung
```

- Dùng **`tao_luc`** chứ không phải `thoi_diem`: bài reup thường back-date `thoi_diem` về ngày artist vẽ gốc; KPI đo **việc làm hôm nay**.
- Chỉ đếm bài công khai → nháp `chi_minh` không tính là "up xong". Khớp yêu cầu "phải up xong mới được báo hoàn thành".
- Xóa bài → số đếm tự giảm, badge tự đỏ lại. Đúng ý.
- Biên ngày = 00:00 giờ VN: `${ngayVn()}T00:00:00+07:00`. Tái dùng `ngayVn()` ở `lib/autopilot/ngay-vn.ts`.

### 5.2 Thuật toán phân bổ

Input: `muc_tieu_ngay` (20), `bai_moi_luot` (1), roster `loai in ap_dung_loai` đang bật & `tam_dung=false` (N ≈ 30 clone + 10 nick AI).

```
1. Trừ trước các tài khoản có kpi_ngay override → conLai = muc_tieu - tổng override
2. soTaiKhoanCan = ceil(conLai / bai_moi_luot)
3. Sắp pool: **loai=clone trước**, rồi loai=ai; trong mỗi nhóm: (ngày phân bổ gần nhất ASC, nulls first) → slug
4. Nếu soTaiKhoanCan <= N:
      lấy soTaiKhoanCan cái đầu (ưu tiên clone; AI chỉ khi hết slot clone), mỗi cái kpi = bai_moi_luot
   Ngược lại (mục tiêu > số tài khoản):
      chia đều floor(conLai/N); phần dư rải đầu list (= clone)
5. Clamp: tài khoản loai='ai' → kpi_muc_tieu = min(kpi_muc_tieu, han_muc_ngay)
   Phần bị cắt được rải tiếp cho tài khoản clone
6. Tài khoản không được chọn → ghi kpi_muc_tieu = 0 (hôm nay nghỉ)
7. INSERT/UPSERT auto_han_muc(...)
```

**Ưu tiên (2026-08-01):** KPI ngày ưu tiên nick **clone** (artist xin phép / up tay). Nick AI fake cũ chỉ nhận phần còn lại sau khi đã phủ clone.

**Freeze:** đã có `kpi_phan_bo_luc` cho ngày đó → **không tính lại**, dù refresh bao nhiêu lần. Có nút «Phân bổ lại hôm nay» (super_admin) để ép tính lại khi đổi cấu hình giữa ngày.

**Khi nào chạy:** lazy — lần đầu mở trang trong ngày thì phân bổ luôn. Không cần cron. (Cron 00:05 VN là tùy chọn về sau nếu muốn thông báo sáng.)

### 5.3 UI

Thanh tổng quan đầu tab:
```
Hôm nay · 13/20 bài  ·  8/20 tài khoản hoàn thành  ·  [Phân bổ lại]
[progress bar]
```

Cột **KPI hôm nay** trong bảng roster — badge:

| Trạng thái | Hiển thị | Token màu |
|---|---|---|
| Đủ (`đếm >= mục tiêu`) | `3/3` ✓ | `--success` (#1FB36B) |
| Thiếu (`0 < mục tiêu`) | `1/3` | `--danger` (#E5484D) |
| Hôm nay nghỉ (`mục tiêu = 0`) | `—` | `--ink-muted` |

Dùng token có sẵn trong `app/cins-design-tokens.css` (L67–69), **không** hardcode hex (DEV_RULES §4).

Thêm filter «Chỉ hiện chưa xong hôm nay» + sort mặc định đưa tài khoản đỏ lên đầu.

### 5.4 Nợ kỹ thuật phải xử lý cùng lúc

`lietKeNick()` hiện gọi `layHanMucHomNay()` **trong vòng lặp** từng nick (`lib/admin/autopilot.ts` L443–448) → 10 nick còn chịu được, 30–40 tài khoản thì thành 40 round-trip mỗi lần load. Phải gom thành 1 query `auto_han_muc` theo `ngay` + `in(ids)` rồi map trong JS (DEV_RULES §5: tránh N+1).

---

## 6. Ảnh hưởng tới Autopilot hiện có (không được bỏ sót)

| Chỗ | Sửa gì | Vì sao |
|---|---|---|
| `chuanBiDang()` L1193–1198 | thêm `.eq("loai","ai")` | Nếu không, AI sẽ soạn bài và đăng vào tài khoản clone |
| `chonNick()` L286 | pool chỉ nhận `loai='ai'` | Như trên |
| `layAutopilotOverview()` L337–341 | đếm tách `nickAi` / `nickClone` | Số liệu tổng quan đang trộn |
| `dongBoNick()` L484 | upsert phải **không** ghi đè `loai` của row clone | `onConflict:"slug"` hiện ghi đè cả row |
| `chayDang()` L1406 | đã lọc `dang_bat` — clone luôn `false` nên an toàn, vẫn nên thêm assert | Phòng vệ 2 lớp |
| CLI `tools/autopilot/lib/nick-seed.mjs` | cùng filter | Cron GitHub Actions dùng đường này |

---

## 7. Phân quyền — **đã chốt: giữ nguyên gate hiện tại**

Mọi thao tác dùng chung gate sẵn có `canManageUsers(role)` = `admin` + `super_admin`. **Curator không vào được** tab Clone — không nới gate của `/admin/tai-khoan-ai`, tránh mở cả pipeline AI cho curator.

| Hành động | Quyền |
|---|---|
| Xem tab Clone + KPI · tạo tài khoản · sửa URL nguồn / KPI | `admin`, `super_admin` |
| Hiện mật khẩu · đặt lại mật khẩu | `admin`, `super_admin` — **+ ghi audit mỗi lần** |
| Gán tài khoản đích | `admin`, `super_admin` |
| Apply bàn giao (phá hủy) | `admin`, `super_admin` |

**Biện pháp bù cho việc không giới hạn `super_admin`** ở hai thao tác nhạy cảm nhất — vì gate role không còn phân tầng, phải bù bằng ma sát thao tác và truy vết:

1. Apply bàn giao: modal bắt **gõ đúng slug clone** mới cho bấm, kèm hiện rõ "sẽ chuyển N bài, xóa tài khoản @slug, không hoàn tác".
2. Mọi lần hiện mật khẩu / đặt lại / apply đều ghi audit (`auto_nhat_ky_mat_khau`, `auto_ban_giao`) kèm `thuc_hien_boi`.
3. Nếu về sau muốn siết, chỗ duy nhất cần đổi là guard trong route handler — không ảnh hưởng schema.

> Nhắc lại `CINS_DEV_RULES` §6: "2FA cho tài khoản admin CINS". Vì admin giờ xem được vault mật khẩu, nên bật 2FA cho các tài khoản admin (`user_nguoi_dung.bao_mat_2_lop_bat` đã có sẵn từ `migration_user_bao_mat_2_lop.sql`).

---

## 8. Các bước triển khai (chia phase — một phase một brief)

| Phase | Nội dung | File chính | Model đề xuất |
|---|---|---|---|
| **1. Schema** | Migration additive + RPC bàn giao + runner npm script | `supabase/sql/migration_tai_khoan_clone.sql`, `scripts/run-*.mjs` | Grok 4.5 (Medium) |
| **2. Backend clone** | Tạo tài khoản (service role), vault mật khẩu AES-GCM + audit, đặt lại mật khẩu, sửa metadata, filter `loai='ai'` cho autopilot | `lib/admin/tai-khoan-clone.ts`, `lib/admin/mat-khau-vault.ts`, `lib/admin/autopilot.ts`, `app/api/admin/autopilot/action/route.ts`, `.env.example` | Grok 4.5 (Medium) |
| **3. Backend KPI** | Cấu hình, thuật toán phân bổ, đếm `content_cot_moc` 1 query, fix N+1 | `lib/admin/kpi-seeding.ts` | Grok 4.5 (Medium) |
| **4. UI tab Clone** | Bảng roster, form tạo, modal mật khẩu, chip URL, badge KPI | `components/admin/AdminTaiKhoanAiScreen.tsx` + `tai-khoan-ai.css` | Composer 2.5 (Low) nếu tách được component riêng, ngược lại Grok |
| **5. Bàn giao** | UI gán + preview kiểm tra trống + modal apply + audit | Cùng trên + API | Grok 4.5 (**High** — thao tác phá hủy) |
| **6. Docs** | Cập nhật IMPLEMENTATION + DECISIONS + brief handoff | `docs/` | — |

Phase 5 nên làm **cuối cùng** và test trên 1 cặp tài khoản nháp trước.

---

## 9. Edge case & rủi ro

**Tạo tài khoản**
- Slug đã tồn tại / email `@cins.vn` đã tồn tại trong `auth.users` → 409, không tạo nửa vời.
- Trigger `handle_new_user()` chạy async → có thể phải retry đọc row `user_nguoi_dung` vài lần (pattern race đã thấy ở `app/onboarding/page.tsx` L37–40).
- Tạo auth thành công nhưng update profile lỗi → **bắt buộc rollback** `deleteUser`.

**Bàn giao**
- Tài khoản đích không trống → chặn, hiện rõ vướng bảng nào.
- Tài khoản đích chính là clone khác → chặn.
- Tài khoản đích là admin/curator → chặn.
- TOCTOU: giữa lúc Gán và lúc Apply, artist đăng bài vào tài khoản trống → **re-check ngay trong transaction**, không tin snapshot lúc gán.
- Đội ngũ đang đăng nhập tài khoản clone khi apply → JWT cũ còn hiệu lực tới khi hết hạn; `deleteUser(authC)` khiến refresh fail. Chấp nhận được; có thể gọi `auth.admin.signOut` trước.
- `deleteUser(authC)` lỗi sau commit → auth user mồ côi, không hại (profile đã trỏ chỗ khác) nhưng phải log + hiện cảnh báo dọn tay.
- Artist đổi ý sau bàn giao → **không hoàn tác được**. Chỉ có `auto_ban_giao` để truy vết.

**KPI**
- Đổi `muc_tieu_ngay` giữa ngày → không tự phân bổ lại (freeze); phải bấm «Phân bổ lại».
- Tài khoản mới tạo giữa ngày → chưa có row `auto_han_muc` → hiện "—" tới hôm sau, hoặc cấp bù nếu bấm phân bổ lại.
- Múi giờ: mọi mốc phải qua `ngayVn()`, tuyệt đối không `new Date().toISOString().slice(0,10)`.
- Bài đăng lúc 23:59 VN → tính ngày hôm đó; xem lại lúc 00:01 thì badge reset. Đúng thiết kế.
- Tài khoản clone up bài nhưng để `chi_minh` → không tính. Cần nói rõ với đội ngũ trong tooltip.

**Bản quyền / pháp lý**
- `trang_thai_xin_phep != 'dong_y'` mà đã có bài đăng → UI cảnh báo vàng. Cân nhắc chặn cứng.
- Nên lưu `bang_chung_dong_y` trước khi up bài đầu tiên.

---

## 10. Security checklist (DEV_RULES §6)

- [ ] Mọi endpoint mới check role ở **backend** (`getCurrentUserSystemRole` + `canManageUsers`), không chỉ ẩn UI.
- [ ] Mật khẩu: không log, không trả trong API list, không lưu plaintext (chỉ ciphertext AES-GCM). Sinh bằng `crypto.randomBytes`.
- [ ] Endpoint hiện mật khẩu: POST theo id, rate-limit, audit log `auto_nhat_ky_mat_khau`.
- [ ] `CINS_CLONE_PASSWORD_KEY` vào `.env.example` (giá trị rỗng) + ghi cảnh báo rotate key làm hỏng toàn bộ vault.
- [ ] `lien_ket_nguon`, `lien_he`, `ten_that` là **dữ liệu nội bộ** — không được lọt ra API public nào.
- [ ] RPC bàn giao: `SECURITY DEFINER` + `REVOKE EXECUTE FROM anon, authenticated`.
- [ ] Bảng mới: RLS enable + revoke anon/authenticated + grant service_role (theo pattern có sẵn).
- [ ] Migration idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).
- [ ] Không `select('*')`; list có `.range()` + `count`.

---

## 11. Câu treo còn lại (không chặn Phase 1–4, chốt trước Phase 5)

1. **Sau bàn giao có ép artist qua `/onboarding` không?** (reset `giai_doan = NULL`)
   *Đề xuất: **không** — giữ nguyên hồ sơ để artist đăng nhập là dùng được ngay, muốn sửa thì tự vào cài đặt. Ép onboarding dễ làm artist bỏ giữa chừng ngay lần đầu chạm sản phẩm.*
2. **Bài của tài khoản clone có gắn nhãn `tham-khao` không?**
   *Đề xuất: **không**. Nhãn này sinh ra cho nick AI reup nội dung người khác. Tài khoản clone đăng tác phẩm **của chính artist đó** và đã xin phép, nên phải là nội dung hạng nhất trên feed. Chỉ đúng khi đội ngũ up qua UI thường; nếu sau này dùng `/api/noi-bo/tac-pham/dang` cho clone thì phải thêm cờ tắt nhãn.*
3. **Có cho tài khoản clone xuất hiện ở Gallery / World Timeline như user thường không?** — mặc định là có (vì `che_do_hien_thi='public'`), cần xác nhận đây là mong muốn khi coldstart.

---

## 12. Cập nhật tài liệu sau khi build

| File | Mục |
|---|---|
| `CINS_DECISIONS.md` | LOG mục mới "Tài khoản clone artist" + inventory ALTER (`auto_tai_khoan`, `auto_han_muc`) + chốt chiến lược bàn giao |
| `CINS_IMPLEMENTATION.md` | API `/api/admin/autopilot/action` action mới · lib mới · file SQL · env `CINS_CLONE_PASSWORD_KEY` (nếu chọn B) |
| `cursor_brief_seed_autopilot_handoff.md` | Mục mới: roster clone tách khỏi 10 nick AI |
| `cursor_map_admin.md` | Tab Clone + KPI trên `/admin/tai-khoan-ai` |
| `CINS_INSTRUCTION.md` | Dòng "Thay đổi lớn gần đây" |
