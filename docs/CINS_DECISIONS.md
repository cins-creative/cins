# CINS — DECISIONS

> **File trong repo:** `docs/CINS_DECISIONS.md`
> **Decision log + câu hỏi treo.** File này chống quên: ghi *đã quyết gì, vì sao*, và *còn treo gì, đóng khi nào*.
> Quy tắc: mỗi câu treo phải có **điều kiện đóng** cụ thể, không để "[cần duyệt]" lửng lơ vô thời hạn.
> Khi một câu được chốt → chuyển từ phần OPEN xuống phần LOG kèm ngày.

---

## OPEN — câu hỏi đang treo

| # | Câu hỏi | Trạng thái tạm | Điều kiện đóng |
|---|---|---|---|
| O2 | Chat 1-1 có gate sau kết bạn không? | Chưa gate — giữ logic chat cũ | Khi có báo cáo spam/quấy rối từ user thật, hoặc trước khi mở chat cho user ngoài cohort Sine Art. |
| O3 | `studio` vs `doanh_nghiep` | ✅ **ĐÃ CHỐT — gộp** (xem L7). Còn lại: bao giờ `doanh_nghiep` cần tab/field riêng tách lại? | Khi có org doanh_nghiep yêu cầu tính năng studio không có. Hiện không. |
| O4 | Cap file video | 300MB (đang cân nhắc 500MB) | Khi đo được chi phí Bunny + hành vi upload thật của cohort đầu. Chốt 1 con số trước launch. |
| O5 | `verify_yeu_cau` Loại 2 — có cần vai trò `quan_ly_nhan_su` riêng để duyệt membership? | Không — admin duyệt tất (xem L9) | Khi có công ty lớn (>50 member) yêu cầu tách quyền duyệt nhân sự khỏi duyệt nội dung. |
| O6 | Phân nhóm tag `keyword`/`phan_mem` theo ngành nghề | Defer | Khi có đủ data tagging thật từ user (gợi ý ngưỡng: ≥200 tag active). |
| O8 | Bản đồ nghề cộng đồng — có cần thêm cấp bậc/chức danh (Junior/Senior/Lead) ngoài `giai_doan`? | ❌ Không — chỉ dùng `giai_doan` | Chức danh thay đổi liên tục + khó verify + mau cũ → bản đồ sẽ luôn sai. Chỉ làm khi có hệ chức danh chuẩn hoá gắn vào milestone công việc *đã verify*. Hiện không cần. |
| O9 | Reviews / đánh giá khóa học | **Defer** | Khi nhu cầu social proof vượt "tác phẩm verified + số học viên hoàn thành". Cân nhắc *pull external* (Google reviews) thay vì tự xây hệ sao. Phản vanity → thận trọng. |
| O10 | Gom nhiều khóa → "Chương trình học" (lộ trình 6–12 tháng, kiểu Keyframe CTH) | **Defer cứng** | Khi có org thật cần track dài hạn nhiều khóa nối tiếp. Sine Art không cần (dạy theo môn rời). |
| O11 | `org_giao_trinh.loai` (phân loại bài: bắt buộc / tùy chọn / project) | **Defer** | Khi org thật yêu cầu phân loại bài trong lộ trình; hiện `mo_ta_chi_tiet` + `thu_tu` + `so_buoi` đủ. |
| O12 | Học phí theo gói tháng (1/2/3/6) cho mô hình liên tục | **Defer** | `org_khoa_hoc.hoc_phi` đọc là giá/tháng ở MVP. Thêm bảng giá bundle khi có nhu cầu thật. |
| O15 | Tỉ lệ chèn bài org chưa-follow vào feed giữa + có nên chèn không? | **Tạm 1 org / 10 người, tối đa 1 bài/org, gắn nhãn "Gợi ý", không engagement-sort** (L21 #3) | Khi đo được feed thật: org-post có bị bỏ qua / báo phiền không. Có thể hạ về 0 (chỉ giữ kênh gợi ý + attribution) nếu chèn feed gây loãng. Chốt trước khi scale ngoài cohort đầu. |
| O16 | Dedupe phòng nhóm trùng tập thành viên | **Defer** — quản lý nhóm cơ bản + project workspace đã có (L25/L28) | Khi có báo cáo spam hoặc nhiều phòng trùng thành viên từ cohort thật. |
| O17 | Nhắc mốc chat (`chat_moc`) — tin system trong phòng khi tạo / tới lúc nhắc / đến hạn; tick client + `POST /api/chat/mocs/tick` | **Partial** — chưa push/email ngoài app | Mở rộng push/email khi có worker ổn định. |
| O18 | Report shop (báo cáo người bán) sau giao dịch P2P? | **Defer** — ưu tiên không làm phân xử tiền; nếu làm thì chỉ trust/safety (lừa đảo hàng loạt), không hoàn tiền | Khi có ≥ vài case lừa thật từ cohort, hoặc trước mở shop rộng ngoài circle quen. Không mở nếu báo cáo = kỳ vọng CINs hoàn tiền. |

> O7 (lớp "uy tín/hữu ích" cho `content_thao_luan`) → **đã đóng / không còn áp dụng** (xem L12): `content_thao_luan` đã bỏ, thảo luận giờ là comment trên cột mốc.

> O1 (giữ `user_theo_doi` hay bỏ?) → **đã đóng / chốt GIỮ + MỞ RỘNG** (xem L17): theo dõi gồm cả `nguoi_dung` (không chỉ tag/org), nội dung được theo dõi phân bổ lên Gallery.

> O14 (escape hatch admin gán quyền org) → **đã đóng** (xem **L22**, 2026-07-01): panel `/admin/to-chuc` + mật khẩu ủy quyền env, chỉ `super_admin` — không mở lại god-mode inline trên trang org (giữ L20).

> O13 (mô hình rank Gallery follow-feed / feed: chronological vs engagement-weighted?) → **đã đóng** (xem **L30**, 2026-07-14): World Timeline = hybrid điểm (không chronological thuần, không engagement-rank thuần). Gallery follow-feed vẫn thời gian thực + L29 editorial.

---

## LOG — quyết định đã chốt

### Shop UGC — bán hàng / preorder (không payment gateway) (2026-07-18)

- **L33 — Module `shop_*` opt-in cho user; CINs không trung gian tiền.**
  • **Ngách:** artist bán goods tại hội chợ (COFI, Hoyofes…) + shop online / đặt trước nhận tại circle.
  • **Không** dùng prefix `payment_` (FOUNDATIONS §13 = cổng thanh toán org sau này). Bảng `shop_*`.
  • **Opt-in:** `user_nguoi_dung.ban_hang_bat` mặc định false; bật trong cài đặt account + chấp nhận điều khoản (`ban_hang_dieu_khoan_luc`). Copy: CINs không liên quan chuyển tiền; quyền quyết định thuộc hai bên user.
  • **Catalog:** `shop_san_pham` + `shop_bien_the` (tồn kho). **Bảng giá đa ngữ cảnh:** `shop_bang_gia` + `shop_bang_gia_dong` (nhiều bảng / tiền tệ — event A ≠ event B / quốc gia).
  • **Post = kiosk:** `shop_post_hang` gắn biến thể + bảng giá (snapshot `gia_hien_thi`) lên `content_cot_moc`. Giỏ **theo post** (`shop_gio` unique buyer+cot_moc).
  • **Đơn cứng:** `shop_don_hang` / `shop_don_hang_dong` — `loai_don` = `mua_ngay` | `dat_truoc_nhan_su_kien`. Trạng thái: `nhap` → `cho_xac_nhan` → `da_nhan_tien` | `da_giao_tai_su_kien` (giữ enum `huy` legacy, **không** expose hủy trên UI/API). Chat DM `1_1` gửi card `ngu_canh.loai=don_hang`; seller xác nhận mới trừ kho. **Không hủy đơn trên CINs** — chuyển khoản P2P, mất tiền tự chịu; CINs không phân xử. Không soft-hold / không payment API.
  • **RSVP sự kiện** (`se_tham_gia`) **không** gate mua hàng. **Xin làm quầy:** `shop_quay_su_kien` + bằng chứng → owner sự kiện duyệt (vừa đủ, không scale sớm). Không nhồi vào `org_milestone_tag_v1`.
  • *Hệ quả file:* IMPLEMENTATION (SQL + API + UI `/ban-hang/*`); FOUNDATIONS §13 ghi chú shop≠payment; chat context `don_hang`.

### Cộng đồng — vai trò + cài đặt lên app topbar (2026-07-18)

- **L32 — Chrome quản trị cộng đồng đồng bộ trường/cơ sở (`CoSoAdminToolbar`).**
  • **Vai trò viewer** trên trang `/cong-dong/[slug]` luôn nằm trong `#app-topbar-page-slot` (`CongDongTopbarToolbar`), không còn nút “Bạn là … ▾” trong identity sidebar.
  • **Cài đặt / quản lý** (Settings2) cũng luôn trên topbar khi `canOpenManage` — bỏ `CongDongManageTriggerButton` khỏi cột trái.
  • **Màu cam priv** (`--cins-priv-*`): nút vai trò + nút cài đặt — cùng visual language với `tb-truong-admin` / admin trường·cơ sở. Không dùng brand blue cho chrome đặc quyền.
  • **Sidebar** (`CongDongRoleButton`) chỉ còn CTA tham gia / chờ duyệt / chia sẻ (khách); thành viên & CINs admin chỉ còn nút chia sẻ.
  • Menu portal (thông báo · quản lý · rời) gắn vào nút vai trò trên topbar — không đổi API membership.
  • *Vì sao:* identity card gọn = brand cộng đồng; quyền/vai trò là chrome trang (topbar), tránh lẫn CTA join với badge quản trị.

### Facebook OG cache-bust + short-link bất biến (2026-07-17)


- **Vấn đề:** publish lại PNG share card chỉ đổi `og:image`; Facebook vẫn cache metadata theo URL Journey/Portfolio cũ, phải vào Sharing Debugger để scrape lại.
- **Chốt:** mỗi lần chia sẻ card của chủ trang tạo row `content_share_link` với token mới + Cloudflare snapshot cụ thể; URL copy là `/s/[token]`. Route short trả HTTP 200 với `og:url` riêng để crawler đọc metadata, rồi soft-redirect người thật về URL canonical có `?s=token`.
- **Fallback:** nếu không tạo được short-link (khách xem hoặc API lỗi), copy URL canonical có nonce `?s=`; metadata giữ `s` trong identity trang nhưng không đưa token vào URL ảnh.
- **Không dùng:** hard 307/308 cho mọi request (crawler sẽ bỏ metadata short-link), token stateless chỉ encode slug/view (không đóng băng ảnh), hoặc tự động gọi Meta Graph API.
- **Vòng đời ảnh:** snapshot được short-link tham chiếu không bị prune khỏi Cloudflare Images. Bảng chỉ service role đọc/ghi; endpoint tạo kiểm tra chủ hồ sơ / admin org.

### Host production = cins.vn only · bỏ Vercel (2026-07-16)

- **Chốt:** Production site URL / OAuth / deploy chỉ **`https://cins.vn`** trên **Cloudflare Workers** (OpenNext). Không dùng Vercel; xóa Redirect URLs / Site URL `*.vercel.app` trên Supabase.
- **Vì sao:** Host lệch (Vercel vs `cins.vn` vs localhost) → cookie PKCE verifier không khớp lúc `/auth/callback` → lỗi «không tìm thấy mã xác minh PKCE».
- **Code/docs:** thông báo PKCE lấy origin request; gỡ fallback `VERCEL_URL` / copy Vercel trong notice env; `AGENTS.md` + `CINS_IMPLEMENTATION.md` §4/§6 auth.

### Auto thumbnail embed Gallery (2026-07-15)

- **Không screenshot iframe; resolve provider/OG + capture `.riv`.**
  • **Vấn đề:** bài embed không cover → Gallery hiện logo platform (Spline/…), kém discovery so với nền tảng lấy poster sẵn.
  • **Chốt:** (1) user `cover_id` luôn thắng; (2) gallery: YouTube sync + `config.thumbnailUrl` trước logo; (3) publish/edit: oEmbed (Vimeo/Sketchfab) / OG (Spline/PlayCanvas/…) → upload CF; (4) file `.riv` chụp canvas client lúc đăng; (5) **không** headless / đọc pixel iframe cross-origin.
  • *Hệ quả file:* IMPLEMENTATION § Media + Embed → Gallery thumbnail; không đổi FOUNDATIONS.

### Môn chuyên ngành trên đồ án trường (2026-07-14)

- **L31 — `mon_hoc` thuộc chương trình ngành trường; dual-write lens + filter đồ án.**
  • **Vấn đề:** tab đồ án trường chỉ lọc theo ngành → nhiều môn trong cùng ngành trộn chung. Cơ sở đã có 2 cấp (khóa → bài); trường thiếu cấp 2.
  • **Chốt mô hình:** môn chuyên ngành = entity `article_bai_viet` loại **`mon_hoc`** (không tạo tên nội bộ rời tag). Chương trình trường nối qua bảng **`org_truong_nganh_mon`** (`id_truong_nganh` → `id_mon_hoc`, `thu_tu`, unique cặp). Hub ngành (`article_lien_quan` + `cap_do` gồm `chuyen_nganh`) vẫn là gợi ý phổ quát — **không** phải source of truth filter đồ án.
  • **Gắn org (sinh viên):** form gắn chọn Ngành → Môn (bắt buộc nếu ngành đã cấu hình ≥1 môn; chưa có môn → vẫn gắn chỉ ngành). Payload `org_milestone_tag_v1`: `monHocId` / `monHocLabel`. Khi submit (+ lại lúc approve nếu thiếu): upsert `article_gan_cot_moc` (+ gắn `article_gan_tac_pham` nếu có tác phẩm) → lens trang môn thấy bài.
  • **Quản trị:** admin trường thêm/gỡ môn trong Sửa ngành; gõ tên mới → `createTag(mon_hoc)` (dedup exact alias) rồi gắn junction. Sinh viên không tạo môn lúc gắn đồ án.
  • **Filter UI:** Năm → Ngành → Môn trên tab đồ án; card hiện `Ngành · Môn · Năm`.
  • **Không nhầm** `edu_mon_thi` / `org_cau_hinh_mon` (môn *thi tuyển*).
  • *Hệ quả file:* IMPLEMENTATION (SQL + API + lib); UI `JourneyOrgAttachTrigger` · `TruongDoanToolbar` · `TruongNganhMonChuongTrinh`. Không đổi FOUNDATIONS (đã neo entity `mon_hoc` + quy tắc 25).

### Hệ thống điểm World Timeline + đóng O13 (2026-07-14)

- **L30 — Điểm feed World Timeline (`content_diem_feed`); đóng O13.**
  • **Chốt mô hình (đóng O13):** không chronological thuần, không engagement-rank thuần. Công thức = **base thời gian (decay) + verified weight + content quality + engagement log-scale + admin boost**. Điểm theo **bài**, không theo người / thâm niên.
  • **Phạm vi:** chỉ **World Feed Timeline** (trang chủ). **Không** áp entity lens, Gallery, Journey cá nhân, feed cộng đồng. `org_su_kien` chỉ L29 boost-old — **không** vào `content_diem_feed`.
  • **Thành phần (`FEED_SCORE`):** `diem_co_ban` 40 (đăng) / **100 khi admin đẩy**; `diem_noi_dung` 0–20 (+5 thumbnail · mô tả >50 ký tự · tag · embed sống); `diem_verify` 0|20 (Loại 2 `da_xac_nhan`, chỉ `cot_moc`); `diem_engagement` 0–20 = `min(20, round(8 * log10(n+1)))` với `n` = reaction×1 + comment×2 + lưu×3. `diem_hien_tai` = tổng × decay tuyến tính 7 ngày từ `bat_dau_luc` (không lưu cột — tính realtime).
  • **Pipeline rank:** pool (visibility) → sort `diem_hien_tai DESC` → **author echo** + **soft quota max 2/author** → merge transitional `withWorldBoostMilestones` (L29).
  • **Hooks:** publish → upsert điểm; reaction/comment/lưu → `engagement_can_tinh_lai=true`; verify approve → `diem_verify` theo config; sửa bài → recalc `diem_noi_dung`; admin đẩy ON → `diem_co_ban=BOOST_RESET_SCORE` + reset `bat_dau_luc` (giữ thành phần khác); OFF → khôi phục `BASE` + `bat_dau_luc=tao_luc` (giữ thành phần khác).
  • **Engagement recalc:** **lazy** khi load Timeline (`flushDirtyEngagementScores`, cap **40 dirty/request**) — **không** pg_cron ở tầng hiện tại (repo chưa có cron feed).
  • **Lộ trình scale (3 tầng, không làm sớm):** (1) WHERE `bat_dau_luc` cửa sổ decay + index — đủ ~100K DAU; (2) ~100K DAU: cột `diem_hien_tai` + pg_cron ~15 phút + `ORDER BY` index; (3) ~500K+ DAU: Redis top-N TTL ngắn + cursor pagination.
  • **Admin UI:** `/admin/noi-dung-dang` Grid + Listing — cột Điểm; nút **+** cạnh đẩy cộng `diem_uu_tien` (+10, trần 200, không hoàn lại, refresh `bat_dau_luc`); Dashboard; tab **Công thức**: Chỉnh sửa → Lưu phiên bản (lý do + lịch sử). Save trọng số không backfill hàng loạt. TTL/cap L29 vẫn code constants.
  • **Schema / code:** `content_diem_feed` · `content_feed_score_cau_hinh` · `content_feed_score_phien_ban` · migrations + `npm run migrate:feed-score-config` / `migrate:feed-score-phien-ban` · `lib/cins/feed-scoring*.ts` · `feed-scoring-config*.ts` · API `GET|PUT /api/admin/feed-score-config`.
  • *Hệ quả file:* FOUNDATIONS quy tắc 22; IMPLEMENTATION Engagement + phân bổ; đóng **O13**. L29 vẫn là lớp editorial (Gallery + cap rank + TTL boost).

### World editorial boost — đẩy nội dung sáng tạo (ẩn với user) (2026-07-14)

- **L29 — Admin highlight ẩn trên World (Timeline + Gallery); không đụng Journey cá nhân.**
  • **Mục đích:** định hướng MXH sang cộng đồng sáng tạo bằng *phân bổ editorial* — viewer không thấy badge / “Được chọn” / “Gợi ý”; chỉ thấy thứ tự khác. **Không** phải engagement-rank toàn cục (xem **L30** cho điểm Timeline). **Không** gộp với `che_do_hien_thi='feature'` (user tự chọn “Nổi bật”). **Không** chiếm đất `ad_` (nhãn trả phí sau).
  • **Phạm vi surface:** chỉ **World** (`WorldJourneyFeed` dòng thời gian + lưới `JourneyGalleryGridView` / `worldJourneyGalleryFetch`). Không apply lên Journey profile, entity lens, feed cộng đồng.
  • **Đối tượng boost:** mọi item **đã đủ điều kiện xuất hiện** trên World timeline / Gallery pool hiện tại (milestone user theo L18, `org_bai_dang`, showcase org, v.v. — cùng visibility gate sẵn có). Boost **không** nới visibility (không làm lộ `chi_minh` / `theo_nhom` / `cong_dong`).
  • **Ai:** `super_admin` + `admin` (cùng lớp `canManageUsers`). **`curator` không.** Toggle tắt = hết boost ngay.
  • **TTL:** chu kỳ **3 ngày**; hết hạn thì **tự gia hạn +3 ngày** khi vẫn `dang_bat=true`. Chỉ tắt thủ công mới dừng. Audit: ai bật/tắt, lần gia hạn gần nhất.
  • **Hai luồng quản lý (cùng nguồn truth):**
    1. **`/admin` — tab quản lý nội dung đăng (World):** dashboard số liệu nội dung mới + bộ lọc (loại đăng user/org, loại nội dung, đang boost / hết hạn sắp tới…) · **Grid** — toggle đẩy + điểm Timeline (L30) · **Listing** — bảng + điểm / còn lại.
    2. **Trên World feed** (Timeline và/hoặc Grid khi admin đang xem): toggle đẩy nhanh cùng API — chỉ hiện với `super_admin`/`admin`.
  • **Rank merge:** Timeline base sort theo **L30** (`diem_hien_tai`); bật đẩy → upsert `content_diem_feed` (base 100 + reset decay) + giữ merge `withWorldBoostMilestones` (cap `WORLD_BOOST_RANK_CAP=15`). Gallery vẫn thời gian thực + ưu tiên boost — **không** dùng `content_diem_feed`.
  • **Schema:** `content_world_boost` — `loai_doi_tuong` + `id_doi_tuong`, `dang_bat`, `bat_dau_luc`, `het_han_luc`, `gia_han_luc`, `cap_boi`, `tat_boi`. RLS/service-role theo gate admin. Lazy-renew khi đọc hết `het_han_luc`.
  • *Hệ quả file:* FOUNDATIONS quy tắc 22; IMPLEMENTATION World feed/gallery + `/admin` nav; `cursor_map_admin.md`. Điểm Timeline → **L30**.

### Workspace nhóm chat — project con + thẻ tài nguyên + mốc (2026-07-13)

- **L28 — Nhóm chat = phòng ban ổn định + project có vòng đời + tài nguyên/mốc làm việc.**
  • **Phòng project con:** `chat_phong.id_phong_cha` → nhóm gốc (`loai_phong='nhom'`). Chỉ **1 cấp** (trigger chặn lồng sâu). Owner/admin nhóm cha tạo; thành viên mặc định = toàn bộ thành viên cha (có thể subset ⊆ cha). Cap: `MAX_PROJECT_ROOMS_PER_PARENT` (20).
  • **Ẩn / lịch sử:** `chat_phong.trang_thai` = `active` | `an`. `an` = ẩn khỏi list/FAB, còn trong lịch sử nhóm cha để khôi phục. Gợi ý UI khi im ≥ `PROJECT_IDLE_DAYS_HINT` (45 ngày) — chưa auto-notify.
  • **Thẻ tài nguyên:** `chat_the_tai_nguyen` + `chat_the_gan` — nhãn **cục bộ theo phòng**, member tự tạo; gắn lên tin có ảnh/URL. **Không** reuse `filter_nhan` / Journey (quy tắc 29 vẫn đúng cho Journey; chat dùng primitive riêng cùng mental model).
  • **Mốc phòng:** `chat_moc` — timeline + tin nhắc trong phòng (tạo / nhắc trước / đến hạn qua `loai_tin=system`); owner/admin CRUD. Push/email ngoài app → **O17** còn mở.
  • **UI:** tab Project trong `ChatGroupManageModal`; list indent + pill `Project`; side panel thêm **Tài nguyên** / **Mốc**.
  • Migration: `migration_chat_project_workspace.sql`. Chi tiết → **FOUNDATIONS §C**, API → **IMPLEMENTATION**.
  • *Vì sao không `loai_phong='du_an'` ngay:* project vẫn scoped bạn bè trong nhóm cha; entity `du_an` để khi có object dự án trên CINs.

### Chế độ phòng cộng đồng — công khai / nội bộ / bí mật (2026-07-12)

- **L27 — `org_to_chuc.cau_hinh.che_do` = đúng 3 giá trị** (trục A, tách khỏi vai trò member):
  | Giá trị | Tìm thấy | Identity card | Feed | Vào nhóm |
  |---|---|---|---|---|
  | `cong_khai` | Có | Có + feed preview | Khách cũng xem | 1-click join |
  | `noi_bo` | Có | Có (không feed) | Chỉ member active | Xin tham gia (pending) hoặc invite |
  | `bi_mat` | Không | Chỉ member / invite token | Chỉ member | Chỉ invite |
- **Alias legacy:** `rieng_tu` (code cũ) đọc = `bi_mat` (hành vi listing/page trước đây đã là ẩn). Ghi mới dùng `bi_mat`.
- **Join gate suy từ chế độ** — không field riêng: open / request+invite / invite-only.
- **Request nội bộ:** `user_thanh_vien_to_chuc.trang_thai='pending'` → admin (`canManageMembers`) duyệt → `active`. Invite accept luôn `active`.
- **Trục B (vai trò)** giữ 4: `owner`/`admin`/`quan_ly_noi_dung`/`thanh_vien`. CTA join (`CongDongRoleButton` sidebar) trước khi member theo *chế độ phòng*; sau khi member badge vai trò + cài đặt trên **app topbar** (`CongDongTopbarToolbar`, L32) — cam priv.
- **Trục C (bài):** vẫn `che_do_hien_thi='cong_dong'` — không rò World Journey (L12/L21). Không thêm mức privacy kiểu Discord.
- *Vì sao 3 không 2:* `rieng_tu` cũ gộp “nội bộ discoverable” với “bí mật”; thiếu tầng tìm thấy được nhưng feed khóa — đúng nhu cầu nhóm nghề có cổng duyệt.

### Pivot MXH chuyên môn + đóng góp canonical (2026-07-10)

- **L26 — CINS chuyển định vị: mạng xã hội chuyên môn + tri thức canonical do cộng đồng đóng góp.**
  • **Ba tầng**: Portfolio/Journey (MXH + showcase) · Entity lens (khám phá) · Canonical (bài chính đã duyệt).
  • **Khác Behance**: có timeline, chat, follow, bình luận — hành vi MXH thật, không chỉ tham khảo.
  • **Đóng góp ≠ Wikipedia**: mỗi user soạn **bản riêng**; curator **promote** bản đủ chất lượng thành bài chính; bản không duyệt vẫn public (contributor có quyền ẩn); bình luận trên bản thảo được phép.
  • **Curator async**: thông báo khi có bản mới — không moderation hàng ngày. Giai đoạn đầu founder = curator; sau phân quyền qua admin.
  • **Đảo rule 25 cũ**: entity **có thể** có prose canonical (tab Nội dung); không còn `noi_dung=NULL` mãi mãi cho keyword/phan_mem.
  • **Curator thẩm định nội dung ≠ verify quan hệ** — giữ bất biến 2 trục (FOUNDATIONS §12).
  • **CINs = quy hoạch hạ tầng** domain (Game, Phim, sau Y tế/Khoa học); cộng đồng tự biến trong khung guardrail tối thiểu.
  • Triển khai theo session → `docs/cursor_brief_dong_gop_noi_dung.md`.

### Nhóm chat bạn bè (2026-07-10)

- **L25 — Mở nhóm chat scoped cho bạn bè; làm rõ "không group chat tự do".**
  • **Đảo/làm rõ nguyên tắc §2 cũ**: không còn cấm mọi dạng nhiều người — thay bằng **cấm inbox MXH tự do** (link join công khai, thêm người lạ, discovery không ràng buộc).
  • **`loai_phong='nhom'`** trên `chat_phong` + `ten_phong` tuỳ chọn; `loai_context='ban_be'`.
  • **Gate thành viên**: chỉ `user_ket_ban.trang_thai='accepted'`; tối thiểu 2 bạn được chọn (≥3 người gồm creator), tối đa 20.
  • **UI**: nút tạo nhóm trong overlay chat, tab Bạn bè; hiển thị tên người gửi trong bubble nhóm.
  • **Đã mở rộng (L28):** quản lý thành viên/vai trò/đổi tên/avatar/rời·xóa; project con + thẻ tài nguyên + mốc. Còn treo: dedupe (O16), push nhắc mốc (O17).
  • Migration: `migration_chat_nhom.sql`. Chi tiết luật → **FOUNDATIONS §C**.

### Chia sẻ profile Journey / Gallery (2026-07-06)

- **L24 — Modal chia sẻ trang cá nhân: 3 luồng + card export (phase 1).**
  • **Copy link**: URL Journey `/{slug}` — hoạt động ngay từ menu chính.
  • **Chia sẻ Journey**: thẻ giới thiệu hồ sơ — 4 layout MVP: **Hồ sơ** (dashboard) · **Glass** · **Hero** · **Tab**.
  • **Chia sẻ Gallery**: thẻ tác phẩm (name card mặt sau) — 3 layout MVP: Mosaic / Spotlight / Filmstrip; thumb lấy từ gallery panel cache khi có.
  • **Sau chọn layout**: Copy link (Journey hoặc Gallery tùy loại thẻ) + chia sẻ MXH (FB, X, LinkedIn, Zalo, WA, native share).
  • **Phase 2 (một phần)**: Copy ảnh PNG thẻ (`html-to-image`) + QR footer encode URL Journey/Gallery; clipboard hoặc fallback tải file.
  • **Phase 2 (còn lại)**: OG/Twitter card động khi paste URL (canvas preview trên MXH).
  • **Entry UI**: nút Chia sẻ sidebar owner + guest action row (`JourneyProfileShareTrigger`).
  • **Chưa làm**: chia sẻ view filter dropdown timeline (nút `j-dd-share` — brief riêng).

### Admin CINs vận hành trực tiếp trên trang org — L23 hẹp (2026-07-12)

- **L23 — Quyền admin CINs (trục 1: `super_admin`/`admin`) chỉ mở khoá vận hành trên trang `truong_dai_hoc`.** Siết lại bản L23 cũ (2026-07-03 mở mọi `loai_to_chuc`).
  • **Ai**: `super_admin` + `admin` (helper `getCurrentUserIsCinsAdmin`). `curator` KHÔNG. Membership org (trục 2) vẫn hoạt động song song.
  • **Phạm vi inline trên trang public**: **chỉ** `truong_dai_hoc` — inline-edit, cài đặt trang (kể cả đổi slug). **Không** mở khoá cơ sở đào tạo, studio/doanh_nghiệp, cộng đồng.
  • **Cơ sở / studio / cộng đồng**: chỉ owner/admin org (trục 2). Admin CINs can thiệp qua **`/admin`** (duyệt/verify/list) và **L22** (`/admin/to-chuc` + mật khẩu ủy quyền) — không god-mode toolbar trên trang public.
  • **"Quyền CINs" ≠ "quyền owner"**: trên trường ĐH, admin thao tác dưới danh nghĩa hệ thống, KHÔNG hiển thị như owner (badge toolbar = "Admin"/"Quản trị CINs"; `viewerVaiTro`/`viewerIsOwner` giữ nguyên `null`). Không giả mạo vai trò membership.
  • **Vẫn là user thường** trên mọi org: admin CINs KHÔNG bị coi là "org của mình" cho hành vi xã hội — vẫn theo dõi / nhắn tin / like như user bình thường. Chỉ **member org thật (trục 2)** mới bị khoá "theo dõi/nhắn tin chính mình" + thấy hộp thư org. Tín hiệu: `getOrgMemberStatus` (trục 2 thuần) vs `getOrgAdminStatus` (membership **hoặc** CINs trên `truong_dai_hoc`).
  • **Cơ chế**: `getOrgAdminStatus` / `isTruongOrgAdmin` short-circuit CINs **chỉ khi** `loai_to_chuc === 'truong_dai_hoc'`. Gate cơ sở / studio / cộng đồng / khóa học / sự kiện / bàn giao owner **không** gọi `getCurrentUserIsCinsAdmin`.
  • **Lý do siết**: tách rõ admin CINs (hạ tầng + trường ĐH do CINs quy hoạch) khỏi owner org user-created; tránh toolbar "Admin Đang sửa" lộ trên cơ sở/cộng đồng khi đăng nhập tài khoản CINs.
  • **Còn hiệu lực**: L22 (`/admin/to-chuc` + mật khẩu ủy quyền, chỉ super_admin) vẫn là kênh gán membership chính thức cho mọi loại org.
  • **RLS**: quyền thực thi qua service-role trong lib server-only (UI chỉ ẩn/hiện). Giữ nguyên nguyên tắc FOUNDATIONS §quyền.

### Admin CINs vận hành trực tiếp trên trang org — đảo L20 (2026-07-03) — ĐÃ SIẾT

> ⚠️ **ĐÃ SIẾT 2026-07-12:** bản dưới đây mở mọi `loai_to_chuc`. Hành vi hiện tại theo **L23 hẹp** (chỉ `truong_dai_hoc`) ở mục ngay trên.

- **L23 (bản 2026-07-03, lịch sử)** — Quyền admin CINs MỞ KHOÁ toàn quyền vận hành trên trang org công khai, mọi `loai_to_chuc`. Đảo ngược L20.
  • **Ai**: `super_admin` + `admin` (helper `getCurrentUserIsCinsAdmin`, gồm cả 2). `curator` KHÔNG. Membership org (trục 2) vẫn hoạt động song song.
  • **Phạm vi**: trường ĐH, cơ sở đào tạo, studio/doanh_nghiệp, cộng đồng. Toàn quyền: inline-edit nội dung, cài đặt trang (kể cả đổi slug), quản lý thành viên, bàn giao owner, quản lý khóa học / sự kiện.
  • **"Quyền CINs" ≠ "quyền owner"**: admin thao tác dưới danh nghĩa hệ thống, KHÔNG hiển thị như owner (badge toolbar = "Admin"/"Quản trị CINs"; `viewerVaiTro`/`viewerIsOwner` giữ nguyên `null`). Không giả mạo vai trò membership.
  • **Vẫn là user thường** (2026-07-03): admin CINs KHÔNG bị coi là "org của mình" cho các hành vi xã hội — vẫn theo dõi / nhắn tin / like org như user bình thường. Chỉ **member org thật (trục 2)** mới bị khoá "theo dõi/nhắn tin chính mình" + thấy hộp thư org. Tách tín hiệu: `getOrgMemberStatus` (trục 2 thuần, không tính admin CINs) đi cạnh `getOrgAdminStatus` (đã gồm override) — truyền `isOrgMember` xuống `TruongInlineEditProvider`; các sidebar (`CoSoSchoolSidebar`/`StudioSidebar`/`TruongSchoolSidebar`) dùng `isOrgMember` (không phải `canEdit`) để quyết định khoá nút theo dõi/nhắn tin và hiện hộp thư org, còn `canEdit` chỉ mở UI chỉnh sửa.
  • **Cơ chế**: re-add short-circuit `getCurrentUserIsCinsAdmin()` vào các gate đã gỡ ở L20 — `isTruongOrgAdmin`/`getOrgAdminStatus` (`org-admin.ts`), `isStudioOrgAdmin`/`assertCanManageMembers`/`transferStudioOwnership` (`studio-members.ts`), `isCoSoOrgAdmin` (`co-so-membership.ts`), `assertCanManageMembers`/`transferCoSoOwnership` (`co-so-members.ts`), `isCongDongAdmin` (`cong-dong/membership.ts`), `assertCanManageMembers`/`transferCongDongOwnership` (`cong-dong/members.ts`), `buildViewer` (`truong-settings.ts`/`co-so-settings.ts`), `canViewerManageKhoaHoc` (`khoa-hoc.ts`), `canViewerManageSuKien` (`su-kien.ts`). Cộng đồng thêm flag `isCinsAdmin` xuyên xuống `CongDongPageClient` + `CongDongRoleButton` để hiện menu quản trị dù chưa là member.
  • **Lý do đảo L20**: chủ dự án cần admin CINs can thiệp trực tiếp trên trang org (seed/cứu hộ/kiểm duyệt) mà không phải "đi vòng" qua `/admin` hay tự thêm mình vào membership. Đánh đổi: chấp nhận toolbar quản trị lộ trên trang org cho tài khoản admin — bù lại tách nhãn rõ "Admin/CINs" khác owner.
  • **Còn hiệu lực**: L22 (`/admin/to-chuc` + mật khẩu ủy quyền, chỉ super_admin) vẫn là kênh gán membership chính thức; L23 là quyền vận hành trực tiếp (không cần mật khẩu ủy quyền).
  • **RLS**: quyền thực thi qua service-role trong lib server-only (UI chỉ ẩn/hiện). Giữ nguyên nguyên tắc FOUNDATIONS §quyền.

### Phân quyền org từ admin — escape hatch trục 1 (2026-07-01)

- **L22 — Super admin gán membership org qua `/admin/to-chuc`; mật khẩu ủy quyền tách khỏi đăng nhập.**
  • **Phạm vi**: mọi `loai_to_chuc` (trường ĐH, cơ sở, studio, cộng đồng) — không inline-edit trên trang public (L20 giữ nguyên).
  • **Ai**: chỉ `super_admin` (`canGrantAdmin`) — `admin`/`curator` CINs không thấy nút / không gọi được API.
  • **Mật khẩu**: env `CINS_ORG_DELEGATION_PASSWORD` (server-only, timing-safe compare). Đăng nhập super admin **không đủ** — mọi mutation gán/đổi/gỡ/bàn giao owner cần `delegationPassword` đúng.
  • **UI**: `/admin/to-chuc` — cột **Chủ trang** (`user_thanh_vien_to_chuc.vai_tro=owner`) tách khỏi **Người tạo** (`org_to_chuc.nguoi_tao` metadata). Nút Shield → `AdminToChucMembersModal`.
  • **API** (service role): `GET/POST …/admin/to-chuc/[id]/members` · `PATCH/DELETE …/members/[membershipId]` · `POST …/transfer-owner`. Lib: `lib/admin/org-delegation.ts`, `lib/admin/org-members.ts`.
  • **Vai trò gán được**: staff org (`owner`, `admin`, `quan_ly_*`, `giao_vien`, `nhan_vien`) hoặc cộng đồng (`owner`, `admin`, `quan_ly_noi_dung`, `thanh_vien`) — một owner/org; bàn giao hạ owner cũ → `admin`.
  • **Đóng O14** — cứu hộ org bỏ hoang / seed trường chưa có staff không cần SQL tay.

### Phân bổ nội dung org ≠ phân bổ user (2026-06-30)

- **L21 — Org không "chen" vào trang chủ người lạ; reach hữu cơ qua 3 kênh, có rào chắn.**
  Bài *người* lan tỏa theo 3 lớp visibility (L18). Bài *org* (`org_bai_dang`, org tự kể — **không** verify) bất đối xứng: chỉ org **đã theo dõi** mới vào feed giữa đầy đủ. Org chưa theo dõi tiếp cận người lạ qua:
  1. **Gợi ý theo dõi org** (module `goi_y_theo_doi`): chấm điểm theo **bạn chung theo dõi org** (mạnh nhất) + **cùng tỉnh/thành** + **hợp `giai_doan`→`loai_to_chuc`** + **còn hoạt động** (có `org_bai_dang` gần đây). **Match theo ngành/nghề chỉ làm được với `truong_dai_hoc`** (`org_truong_nganh.id_nganh`); `co_so_dao_tao`/`studio` **chưa có** bảng nối org↔nghề → dùng tín hiệu còn lại.
  2. **Attribution tác phẩm verified member**: học viên hiện "học tại khóa X @ org", nhân viên studio hiện "làm tại dự án Z @ studio Y" (Verify Loại 2). User thấy tác phẩm đẹp → funnel sang trang org → follow. Kênh đẹp nhất (dùng moat verify, gần như 0 push).
  3. **Chèn feed tỉ lệ thấp** (xem O15): bài org *liên quan* (dùng lại bộ chấm điểm #1) chèn vào feed giữa với **hạn mức cứng** (~1 bài org / 10 bài người), **tối đa 1 bài/org/lần tải**, gắn nhãn **"Gợi ý"**, **không** xếp theo engagement. Né free-ads + giữ lằn ranh reach trả phí → `ad_` phase sau.
- **Cộng đồng (`cong_dong`) — bài KHÔNG rò ra feed; chỉ lan tỏa "căn phòng".**
  Bài `che_do_hien_thi='cong_dong'` giữ trong feed cộng đồng (đã loại trừ khỏi World Journey feed — quy tắc 26, L18). Lan tỏa cộng đồng = (a) gợi ý **"Tham gia cộng đồng X"** cho người hợp gu, (b) bài "tốt nghiệp" sang `public`/`theo_nhom` → chảy ra theo đường của *người*. Giữ tính phòng-riêng (chống spam).
- **Bất biến giữ nguyên**: số follower **ẩn** (L18); không engagement-rank toàn cục (quy tắc 22, L30 = hybrid theo bài trên Timeline); org reach hữu cơ **siết hơn** user `feature` (chừa đất `ad_`).
- *Thứ tự build*: gợi ý org (#1) → attribution studio (#2) → cộng đồng → chèn feed (#3, đụng luật feed, làm sau cùng).
- *Hệ quả file*: FOUNDATIONS quy tắc 22 (thêm bất đối xứng org); §13 (việc tương lai: bảng nối org↔nghề cho `co_so`/`studio`). Mở **O15**. IMPLEMENTATION: `lib/cins/home-adaptive/suggestions.ts` (gợi ý org), `lib/cins/worldJourneyFeedFetch.ts` (chèn tỉ lệ thấp — bước sau).

### Tách trục quyền: admin hệ thống ≠ sửa trang org (2026-06-30)

> ⚠️ **Lịch sử:** L20 → đảo bởi L23 (2026-07-03, mọi org) → **siết L23 hẹp (2026-07-12):** admin CINs chỉ mở khoá `truong_dai_hoc` trên trang public. Cơ sở/studio/cộng đồng lại theo L20 (membership thuần). Hành vi hiện tại: mục **L23 hẹp** ở trên.

- **L20 — Inline-edit / vận hành trang org = TRỤC 2 (membership) thuần; quyền admin hệ thống (trục 1) KHÔNG tự mở khoá.**
  • Bỏ short-circuit `getCurrentUserIsCinsAdmin()` ở: `getOrgAdminStatus` + `isTruongOrgAdmin` (`lib/truong/org-admin.ts`), `isStudioOrgAdmin` + `assertCanManageMembers` + `transferStudioOwnership` (`studio-members.ts`), `isCoSoOrgAdmin` (`co-so-membership.ts`), `assertCanManageMembers` + transfer (`co-so-members.ts`), transfer cộng đồng (`cong-dong/members.ts`), viewer settings (`truong-settings.ts` / `co-so-settings.ts`), `canViewerManageKhoaHoc` (`khoa-hoc.ts`), `canViewerManageSuKien` (`su-kien.ts`). Tất cả CHỈ còn dựa `user_thanh_vien_to_chuc.vai_tro`.
  • CINs admin (trục 1) can thiệp qua **trang `/admin`** — `app/api/admin/*` **giữ nguyên** gate `getCurrentUserIsCinsAdmin`. Admin KHÔNG "đi vào" trang org của người khác để inline-edit.
  • Lý do: 1 tài khoản (vd `CINs_Official` = super_admin `info.cins.vn@gmail.com`) vừa là admin vừa là user thường — không để god-mode toolbar lộ trên mọi trang.
  • Hệ quả: escape hatch gán membership → **L22** (`/admin/to-chuc`, không god-mode inline). Trước L22 xem **O14** (đã đóng).
  • Data: studio/cộng đồng/cơ sở legacy pattern cũ (system=owner + creator=admin) chuẩn hoá thủ công về creator=owner; `CINs_Official` gỡ khỏi mọi org không phải của mình.

### Trang chủ adaptive theo `giai_doan` (2026-06-28)

- **L19 — Trang chủ 3 cột: feed giữa chung, module hai bên theo persona.**
  • **Feed trung tâm** (`WorldJourneyFeed`) **không đổi theo `giai_doan`** — sort `tao_luc` desc; tab **Đang theo dõi** (milestone user + tag follow + `org_bai_dang` org follow) và **Khám phá** (bài `feature` từ tác giả chưa follow). Không inject tin tuyển dụng vào feed.
  • **Hai cột module** map từ `user_nguoi_dung.giai_doan` → persona `hoc` | `lam` | `day` (`lib/cins/home-adaptive/persona.ts`). `su_kien` + `goi_y_theo_doi` luôn có mọi persona.
  • **`tim_viec`** = modifier `seeking` trên cụm LÀM (banner Open-to-work + đẩy `co_hoi` lên đầu cột phải) — **không** dùng boolean `dang_tim_viec` riêng.
  • Module `co_hoi` + `scout_tai_nang` cần DB mới: `org_tuyen_dung`, `org_tuyen_dung_ung_tuyen`, `org_scout_luu` + 3 enum (`migration_org_tuyen_dung.sql`, runner `scripts/run-org-tuyen-dung-migration.mjs`).
  • Không hiển thị số follower công khai (giữ L18).

### World Journey feed — lọc theo `che_do_hien_thi` (2026-06-19)

- **L18 — Trang chủ World Journey feed phân tầng 3 lớp (+ chỉ mình).**
  • `feature` (Nổi bật): portfolio/khoe — **mọi viewer** thấy, kể cả không bạn bè, không theo dõi.
  • `public` (Công khai): chỉ **bạn bè** hoặc **người đang theo dõi** tác giả.
  • `theo_nhom` (Bạn bè): chỉ **bạn bè** (2 chiều).
  • `chi_minh`: chỉ chủ bài — không lên feed người khác.
  • `cong_dong`: không thuộc World Journey feed.
  Helper: `lib/cins/worldJourneyFeedVisibility.ts` · feed UI `WorldJourneyFeed.tsx` (posts từ API, không mock).
  *Khác* timeline Journey profile visitor (`milestone-viewer-access.ts`): ở profile, `public` vẫn mở cho visitor; feed trang chủ siết `public` hơn để tránh viral/loãng.

### Session theo dõi + phân bổ nội dung (2026-06-15)

> Đảo 2 quyết định nền v6 (L5, L6). **Không có thay đổi DB** — enum `loai_theo_doi_enum` đã sẵn `nguoi_dung`/`the`/`to_chuc`.

- **L17 — Mở theo dõi người (follow-user) + phân bổ nội dung lên Gallery. ĐẢO L6.**
  Theo dõi 1 chiều, không cần đồng ý, không pending — áp cho **người** (`loai_doi_tuong='nguoi_dung'`) và **org** (`'to_chuc'`); kết bạn 2 chiều vẫn giữ song song (danh bạ nghề + bạn chung + điều kiện co-author). Nội dung public của đối tượng được theo dõi đẩy lên Gallery của người theo dõi (follow-feed). Org chỉ theo dõi được, không kết bạn.
  *Vì sao*: L6 bỏ follow-user vì "vô nghĩa khi không feed" — nay thêm feed nên follow có nghĩa. Muốn tăng trưởng cần kênh **phân bổ nội dung**; entity-discovery một mình không đủ reach. Schema sẵn sàng (0 migration).

- **L18 — Bỏ khung "anti-engagement". ĐẢO/làm rõ L5.**
  Gỡ các cấm tuyệt đối trong triết lý: bỏ "KHÔNG follower-user" và "KHÔNG feed (toàn cục)". Phân bổ nội dung = động cơ tăng trưởng, không phải thứ phải kìm hãm. **Giữ lại đúng 1 mảnh phản-vanity: số follower không hiển thị công khai** (theo dõi là kênh nhận nội dung, không phải bảng điểm đua số). Verify vẫn là moat — phân bổ không thay thế nó.
  *Hệ quả file*: FOUNDATIONS §1, §2 (2 bullet), quy tắc 22 + 23. IMPLEMENTATION mục Engagement + Follow. O1 đóng, mở O13 (mô hình rank feed).

### Session org-journey + filter động (2026-06-07)

> Schema áp dụng sau khi chạy `migration_filter_dong.sql` → đối chiếu DB trực tiếp (67 → 69 bảng).

- **Org Journey — gộp vào `org_bai_dang` (KHÔNG tạo `org_cot_moc`).**
  Áp cho **3 loại tổ chức thật** (`truong_dai_hoc`, `co_so_dao_tao`, `studio`); `cong_dong` KHÔNG (đã có feed cột mốc riêng). Thêm cột `org_bai_dang.thoi_diem` (ngày mốc lịch sử, khác `tao_luc`). Org journey **KHÔNG verify** — org tự kể về mình, khác milestone danh tính nghề của *người*.
  *Vì sao*: tái dùng `content_cot_moc` đắt (NOT NULL `id_nguoi_dung` + audit query); gộp `org_bai_dang` + 1 cột sạch nhất, đúng nếp `org_su_kien`/`org_hinh_anh`.

- **Filter cá nhân động (`filter_nhan` + `filter_gan`) — primitive nền tảng cho user & org.**
  Nhãn do chủ sở hữu tự tạo/sửa/xóa, gắn polymorphic lên `content_cot_moc` (user) / `org_bai_dang` (org). **Phân biệt cứng với tag toàn cục** — cục bộ, KHÔNG discovery xuyên người (quy tắc 29 FOUNDATIONS). Lọc áp **cả 2 view** (timeline + grid). Slug nhãn bất biến sau khi tạo. `loai_bai_dang_org_enum` deprecate nhưng GIỮ (còn code dùng).
  **Khách trên Journey người khác:** được thấy và lọc theo nhãn của chủ (chỉ nhãn gắn ≥1 cột mốc họ được xem) — không phải tính năng owner-only. Provider filter phải mount cho mọi viewer (`JourneyProfileShellClient`). Chi tiết code: `CINS_IMPLEMENTATION.md` §6 Journey & auth.

### v9 — Trang khóa học + gán tác phẩm cấp khóa (2026-06-10)

- **L14 — Tác phẩm gán CẤP KHÓA, không cấp lớp.**
  Học viên **tự đăng** tác phẩm (quy tắc 1), tự gắn "làm khi học [khóa] @ [org]" → org xác nhận (Verify Loại 2). `content_cot_moc.id_khoa_hoc` = trường khai báo bắt buộc khi khai "học ở đây"; `id_lop_hoc` **tự suy ra** từ `user_hoc_vien_lop` của học viên (để định tuyến yêu cầu verify tới đúng GV lớp), **KHÔNG bắt học viên chọn lớp**. Không có ghi danh → `id_lop_hoc` NULL, admin org duyệt.
  *Vì sao*: giá trị nghề = "học khóa X @ org" (mã lớp là chi tiết nội bộ, ra ngoài không ai tra); hợp mô hình liên tục (ranh giới lớp mờ); đơn giản cho học viên. **0 schema mới** — cả `id_khoa_hoc` và `id_lop_hoc` đã có sẵn trên `content_cot_moc`.

- **L15 — Mục "Sản phẩm học viên" trên trang khóa = lens** (theo L13).
  Lọc `content_cot_moc WHERE id_khoa_hoc = X AND verified AND public`. Org không sở hữu nội dung; tác phẩm sống ở Journey học viên. Mạnh hơn site tham chiếu (Keyframe/Sine Art): tác phẩm **đã verify** + link hồ sơ nghề thật, không phải link YouTube rời hay gallery phẳng.

- **L16 — Trang khóa ưu tiên mô hình LIÊN TỤC** (`lien_tuc_theo_thang`).
  Seed partner Sine Art chạy liên tục (khai giảng hàng tuần, học phí theo tháng, "khung lớp" thường trực). Cohort (`cohort_co_dinh`, kiểu Keyframe) = **biến thể render**: thay khung lớp thường trực bằng đợt có `ngay_khai_giang` cố định + một giá. Cùng một bộ section.

- **Cột mới** (migration `migration_khoa_hoc_v2.sql`, thay file `migration_giao_trinh_thu_tu.sql` đứng riêng):
  `org_giao_trinh.thu_tu` (thứ tự bài, backfill theo `cap_nhat_luc`), `org_giao_trinh.so_buoi` (số buổi/bài), `org_lop_hoc.lich_hoc` (lịch lặp + giờ, text), `org_lop_hoc.giao_vien_text` (GV chưa có tài khoản CINS), `org_khoa_hoc.noi_dung_blocks` (landing content dạng block, né đẻ N bảng marketing — `mo_ta` text giữ làm tóm tắt ngắn).

- **Cấu trúc trang khóa** (`/co-so/[slug]/khoa-hoc/[khoa-slug]`): Hero + facts · Giới thiệu (`noi_dung_blocks`) · Lộ trình bài (`org_giao_trinh` ORDER BY `thu_tu`, gating theo `visibility`: `public` xem thử / `chi_hoc_vien` khóa / `private` ẩn) · Khung lớp & lịch học (`org_lop_hoc`) · Giảng viên · Sản phẩm học viên (lens, L15). **Giữ tối giản, KHÔNG bê từ site tham chiếu**: bỏ reviews (O9), khối marketing dày + FAQ, chương-trình-nhiều-khóa (O10).

### v8 — Trang entity = lens (2026-06-08)

- **L13 — Mỗi trang entity (`keyword`/`phan_mem`/`nghe`/`mon_hoc`/`truong`...) là aggregation view, KHÔNG kho mới, KHÔNG có chủ.**
  Là *lens* chạy trên Journey cá nhân: filter mọi tác phẩm public mà cộng đồng đã gắn entity đó (`*_gan → content` ORDER BY ngày). Tác phẩm vẫn sống ở Journey người tạo (source of truth, quy tắc 1) — 0 schema mới, không clone nội dung.
  2 chế độ render cùng tập content: **Lưới** (visual, đang có) + **Dòng thời gian** (post-card, tái dùng card feed cộng đồng + album layout). Sort: mặc định **mới nhất**, thêm **A–Z** + **engagement** (user chọn).
  *Vì sao engagement-sort không phá luật chống-viral*: đây là tùy chọn thủ công, scoped trong context một entity — không có feed thuật toán toàn cục, không trending xuyên mạng (giữ nguyên L5 + quy tắc 22). Mỗi entity là một "bảng xếp hạng mini" chỉ khi user chủ động bật, mặc định vẫn chronological.
  **Lộ nguồn + tác giả là tính năng, không phải rò rỉ**: trang entity là phễu giúp user connect — bài public distribute hết, hiện rõ ai gắn tag; bài private (`che_do_hien_thi` không-public, gồm `cong_dong`/`chi_minh`) KHÔNG lộ. Lens chỉ kéo content public — gom vào helper visibility chung với query Journey public.
  **Naming**: hiển thị "Dòng thời gian" / "Hoạt động", KHÔNG gọi "Journey" — Journey = timeline cá nhân có chủ; trang entity là aggregation không chủ, tránh loãng khái niệm.
  *Chi phí*: route trang tag đã có; chỉ thêm tab + sort. Cần index `(entity_id, created_at)` cho tag/nghề phổ biến; engagement-sort dựa like count realtime (quy tắc 4) — cân nhắc cache nếu chậm.

### v6 — Cộng đồng v2: post = cột mốc (2026-06-08)

- **L12 — Bỏ `content_thao_luan` / `_media` / `_filter_gan`. Post cộng đồng = `content_cot_moc`.**
  Đăng bài vào cộng đồng = tạo cột mốc Journey với `id_to_chuc`=cộng đồng + `che_do_hien_thi='cong_dong'` (giá trị enum mới: ẩn khỏi Journey public của user, chỉ chính chủ thấy + hiện trong feed cộng đồng). Cộng đồng là **view tổng hợp cột mốc của thành viên** (như Gallery), KHÔNG sở hữu nội dung. Comment/reaction/lưu trỏ thẳng `content_cot_moc` → bền. Đổi thẻ từ `cong_dong` sang `public`/`theo_nhom` = "tốt nghiệp" bài thành milestone Journey, giữ nguyên comment.
  Nhãn cộng đồng: bảng `cong_dong_filter` (rename từ `content_thao_luan_filter`) + junction `cong_dong_filter_gan` nối `content_cot_moc` (hướng B — junction riêng, không nhồi vào `article_gan_cot_moc` vì nhãn thuộc về từng cộng đồng, khác tag toàn hệ).
  *Vì sao đảo L7b*: một source of truth duy nhất (`content_cot_moc`, quy tắc 1); cộng đồng làm cầu nối thay vì kho riêng; lưu = lưu cột mốc gốc của tác giả; bỏ được 3 bảng. Đây là bản trung thành nhất với "Journey là gốc, mọi nơi khác là view".
  *Rủi ro phải canh*: (1) `content_cot_moc` phình volume → bắt buộc index `(id_to_chuc, che_do_hien_thi)`; (2) `che_do_hien_thi='cong_dong'` là trường hợp đặc biệt — mọi query Journey public phải loại trừ, gom vào 1 helper, không rải rác.

### v6 — Layout & cấu trúc cộng đồng (2026-06-08)

- **L7b (đã đảo) — `cong_dong` = cộng đồng có thảo luận, theo model FB Group + lớp verified.**
  Member đăng bài tự do; mỗi post hiển thị kèm nghề + verified journey của người đăng (điểm khác FB). Post lưu dưới dạng `content_cot_moc` (xem L12), KHÔNG dùng `content_thao_luan`. *Vì sao*: connection/đóng góp là nhu cầu thật; FB tối ưu cho cộng đồng nhưng thiếu xác thực — CINS bù đúng chỗ đó. Discussion scoped vào context → không feed toàn cục → vẫn giữ luật chống-viral.
- **Loại org user tạo ngay = 3:** `co_so_dao_tao` · `studio` · `cong_dong`. Chỉ `truong_dai_hoc` cần CINS duyệt (đề xuất → review → seed); `doanh_nghiep` ẩn UI (gộp vào studio, L7).
- **Nhãn cộng đồng mặc định = 4** (seed sẵn + admin sửa/xoá/thêm, tutorial sau khi tạo): Khoe tác phẩm (violet) · Hỏi đáp (blue) · Tuyển người (orange) · Tài nguyên (mint). Hardcode template trong code, không bảng template.
- **Vai trò hợp lệ trong cộng đồng = 4** (trong 8 giá trị `vai_tro_to_chuc_enum`): `owner` (CINS) · `admin` · `quan_ly_noi_dung` (mod) · `thanh_vien`. Ẩn các vai trò của trường/đào tạo/doanh nghiệp khi gán trong cộng đồng.
- **Layout cộng đồng đồng bộ trang profile**: cột trái = group identity card (cover + avatar **vuông bo** để phân biệt user tròn + face pile "bạn ở đây" + bản đồ nghề theo `giai_doan` + nhịp cộng đồng), cột phải = toolbar (chips nhãn + sort + toggle) + feed. Mặc định view **Journey** (mốc tháng, không rail chấm), switch **Lưới** (Gallery). KHÔNG layout kiểu FB (composer khối to + sidebar gợi ý).
- **Nút vai trò**: một nút đổi nhãn theo `vai_tro` (Tham gia cộng đồng / Đang là thành viên / Quản trị viên / Admin), gộp menu Thông báo (Tất cả/Nổi bật/Tắt) + Rời. Bỏ nút Thông báo riêng.
- **Nhịp cộng đồng** chỉ hiển thị milestone nghề *đã verify* + member mới, cập nhật chậm — KHÔNG realtime mọi tương tác (tránh engagement-bait).

### Session verify (2026-06-07)

- **L8 — Uy tín nghề = badge danh tính verified, KHÔNG có lớp "verified hữu ích" riêng ở MVP.**
  *Vì sao*: badge "Vị trí @ Org" cạnh tên đã cho biết thẩm quyền người nói; thêm lớp endorse/accepted-answer là over-engineer khi forum chưa có traffic.
- **L9 — Luồng verify thống nhất: user-push + org-veto.**
  *Vì sao*: org-pull chết vì org không có động lực. Đảo chiều: user đẩy yêu cầu + bằng chứng, org chỉ bấm duyệt. Im lặng = trạng thái trung gian (tự khai, xám). 2 loại yêu cầu: (1) membership → `user_thanh_vien_to_chuc` → duyệt → sinh `content_cot_moc` `sinh_tu_org_assign`; (2) tác phẩm → org accept/reject. Người duyệt = admin (MVP). Fallback: `external_email`/`system_url`. Chi tiết: FOUNDATIONS §V.
- **L10 — Trạng thái trung gian hiển thị "tự khai" (xám, không badge), sáng lên khi verified.**
  *Vì sao*: user thấy ngay (đỡ nản) + áp lực mềm để org duyệt. Luôn phân biệt rõ xám/sáng, không bao giờ hiển thị tự khai như verified fact.
- **L11 — Peer tag vị trí (luồng 2) phải neo vào tác phẩm cụ thể**, không cho tag title chung chung trôi nổi.
  *Vì sao*: title-endorse kiểu LinkedIn dễ thổi phồng, làm loãng moat.

### v7 (tag system)

- **L1 — `keyword`/`phan_mem` là infrastructure, không phải content.** Chỉ trang aggregation + `tom_tat` AI gen, không prose, không vào navigation "Bài viết", `noi_dung=NULL`.
- **L2 — Tag tự do, không chặn upfront.** User gõ tag mới → tạo thẳng `article_bai_viet`, AI gen `tom_tat` ngay. `article_de_xuat` chỉ còn cho `nghe`/`nganh_dao_tao`.
- **L3 — `da_verify BOOLEAN` không phải gatekeeping.** Verified tag lên top autocomplete; chưa verify vẫn dùng. Admin verify sau khi tag tự nổi lên.
- **L4 — Alias dedup tự động.** Exact lowercase → `article_alias` map tự động. AI fuzzy → suggest confirm.

### v6 (engagement + social graph + org)

- **L19 — Phân quyền hệ thống CINs (2026-06-30):** 4 vai trò: `super_admin` (chỉ email `info.cins.vn@gmail.com`, bất biến, không lưu DB), `admin`, `curator`, `thanh_vien`. Bảng `user_quyen_he_thong` lưu admin/curator + audit `cap_boi`. Chỉ super_admin cấp/thu quyền admin; admin cấp curator/thành viên. Vào `/admin`: super_admin + admin + curator; tab quản lý user: super_admin + admin. Migration: `migration_user_quyen_he_thong.sql`.
- **L5 — "Anti-engagement" → "Engagement có context".** Like/reaction công khai mặc định (social proof thẩm mỹ). Viral triệt tiêu bằng *kiến trúc* (không feed toàn cục) chứ không bằng cấm like.
- **L6 — Bỏ follow-user → kết bạn 2 chiều (`user_ket_ban`).** Follow-user vô nghĩa khi không feed. Kết bạn phục vụ: danh bạ nghề + bạn chung + điều kiện tag co-author. `user_theo_doi` thu hẹp còn follow tag/org (xem O1).
- **L7 — Gộp `studio` + `doanh_nghiep`.** Giữ enum value, ẩn `doanh_nghiep` khỏi UI. Org user tạo ngay còn 3 loại. *Vì sao*: hai loại gần như giống hệt (cùng `project_du_an`, cùng tab) — không đáng 2 nhãn riêng.

---

## Drift đã phát hiện & sửa

### 2026-06-10
- **Migration `migration_giao_trinh_thu_tu.sql` đứng riêng đã được gộp** vào `migration_khoa_hoc_v2.sql` (thêm `so_buoi`, `lich_hoc`, `giao_vien_text`, `noi_dung_blocks`). Dùng file v2, bỏ file lẻ.
- **FOUNDATIONS §V Loại 2 ví dụ "khi học lớp Y"** đổi thành "khi học khóa Y" cho khớp L14 (gán cấp khóa).

### 2026-06-08
- **L7b cũ + 4 bảng `content_thao_luan*` đã bị đảo** (L12): post cộng đồng chuyển sang `content_cot_moc`. Drop `content_thao_luan` / `_media` / `_filter_gan`; rename `content_thao_luan_filter` → `cong_dong_filter`; thêm `cong_dong_filter_gan` + enum value `cong_dong`. Migration: `migration_cong_dong_v2_cot_moc.sql`.
- **Demo bản đồ nghề từng ghi "Art Director / Lead"** — không có field nguồn trong schema. Sửa: bản đồ nghề chỉ dùng `giai_doan` (đang học/đang làm/freelance/đang dạy/tìm việc). Xem O8.

### 2026-06-07
- **4 bảng `content_thao_luan*` có trong DB nhưng instruction cũ ghi "TBD".** → đã chính thức hoá rồi sau đó đảo (xem trên).
- **Header instruction nói "62 bảng", memory nói "~53"; DB thật = 67 bảng logic.** Sau v6 cộng đồng v2: ~65 bảng (bỏ 3 thao_luan*, thêm cong_dong_filter_gan, rename 1). → đọc trực tiếp từ DB để khỏi lệch.
- *Bài học*: prose schema chép tay luôn drift. **Bỏ file `CINS_SCHEMA.md` (2026-06-30)** — cấu trúc đọc trực tiếp từ DB (Prisma/Supabase MCP · `information_schema`), không duy trì bản chép tay nữa.
