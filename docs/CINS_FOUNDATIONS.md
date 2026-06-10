# CINS — FOUNDATIONS

> **File trong repo:** `docs/CINS_FOUNDATIONS.md`
> **Luật nền — đổi chậm.** Triết lý sản phẩm, quy tắc kiến trúc, naming, quy ước làm việc.
> Khi xung đột giữa các file: FOUNDATIONS thắng về *nguyên tắc*; SCHEMA.md thắng về *sự thật cấu trúc DB*.
> File này KHÔNG chứa danh sách bảng/cột chi tiết — xem SCHEMA.md (sinh từ DB).

---

## 1. Bản chất sản phẩm

CINS là creative hub cho ngành sáng tạo Việt Nam. Không phải job board, portfolio site, MXH viral, hay LMS.

Hai tầng core:
- **Journey** — blog cá nhân theo thời gian. Text / ảnh / video / link. Tích lũy suốt hành trình nghề nghiệp.
- **Gallery** — aggregated feed tối ưu visual. Tất cả tác phẩm public. Cửa ngõ vào Journey của người tạo.

**Journey là nơi tích lũy. Gallery là nơi khám phá.**

Kết nối giữa người có chuyên môn là giá trị cốt lõi (không phải thứ phải kìm hãm) — nhưng kết nối đi qua **entity và quan hệ thật** (tag / nghề / trường / kết bạn), không qua social graph kiểu follower hay feed thuật toán.

---

## 2. Triết lý sản phẩm

- **Engagement có context**: like/reaction tồn tại và hiển thị công khai (mặc định). Nhưng **KHÔNG feed thuật toán toàn cục, KHÔNG trending xuyên mạng, KHÔNG follower-user**. Discovery đi qua entity (tag/nghề/trường/Gallery) → ranking bị giới hạn trong context → viral tự triệt tiêu mà không cần cấm engagement.
- **Like là social proof thẩm mỹ**: "X người cũng thấy đẹp" = xác nhận sự đồng cảm, không phải vanity đua số. Hiển thị mặc định.
- **Open model**: interaction (tuyển dụng, kết nối) xảy ra ở nơi khác. CINS verify và lưu kết quả.
- **Verify là moat**: mọi quyết định thiết kế phải bảo vệ tính xác thực của timeline. Moat tồn tại *vì* có bên thứ hai phải đồng ý — bỏ bước đó để giảm tải là mất moat.
- **Chat phải có context**: mọi chat đều gắn với dự án / lớp / sự kiện / 1-1. Không có group chat tự do.
- **Milestone không bao giờ tự sinh từ counter**: phải có xác nhận chủ động từ người có thẩm quyền.
- **Verified milestone bất tử**: khi org đóng cửa, milestone đã verify không mất giá trị.
- **Quan hệ theo người = kết bạn (2 chiều)**: phục vụ danh bạ nghề + bạn chung + tag co-author. Không có "theo dõi người" 1 chiều.
- **Tag là infrastructure, không phải content**: `keyword` và `phan_mem` không cần prose — giá trị nằm ở người và tác phẩm gom dưới tag. AI gen `tom_tat` đủ.
- **Filter cá nhân ≠ tag toàn cục**: mỗi user/org tự tạo nhãn cục bộ ("Áo thun trơn", "BST hè") để *tự sắp xếp nội dung của chính mình*. Nhãn cá nhân KHÔNG kéo discovery xuyên người dùng (khác hẳn tag toàn cục) → không phá luật chống-viral. Xem quy tắc 29.
- **Verify rẻ là tính năng**: gánh nặng xác thực phải nhẹ đến mức bên có thẩm quyền không thấy phiền — user đẩy yêu cầu, org chỉ bấm duyệt (org-veto, không org-pull). Xem §V.

---

## 3. Tech Stack

- **Frontend**: Next.js App Router
- **Database**: Supabase (Postgres) + pgvector cho vector(6) + HNSW index — project `ospzzzxcomrmhqrnkoiw.supabase.co`
- **Storage**: Cloudflare Images (lưu cloudflare_id)
- **Video**: browser → Bunny Stream qua TUS; Cloudflare R2 lưu source. Không ffmpeg server-side, không xử lý video trên Vercel.
- **Realtime chat**: Supabase Realtime
- **Deploy**: Vercel (max 4.5MB request body)

---

## 4. Naming Convention

- Tiền tố tiếng Anh: `user_` / `org_` / `content_` / `article_` / `project_` / `verify_` / `social_` / `chat_` / `vector_` / `edu_`. Ngoại lệ: `linh_vuc` (bảng danh mục, không thuộc nhóm).
- Tên bảng/field tiếng Việt không dấu: `cot_moc`, `tac_pham`, `dong_gop`, `xac_nhan`, `ket_ban`.
- Timestamp: `tao_luc`, `cap_nhat_luc`, `xu_ly_luc` (không dùng `created_at`/`updated_at` trừ bảng mới từ migration v2/v3).
- Soft delete: `da_xoa BOOLEAN`.
- Trạng thái dùng `TEXT` với check value (giống `trang_thai_ket_ban`, co_author) thay vì enum cứng cho các quan hệ hay đổi; enum cho danh mục ổn định.

---

## 5. Quy tắc kiến trúc cốt lõi (29 + verify)

1. Mọi thứ trên **Journey user** = 1 dòng `content_cot_moc` — source of truth thống nhất. (Journey *org* đi qua `org_bai_dang` + `thoi_diem`, KHÔNG dùng `content_cot_moc`; xem §O và quy tắc 29.)
2. Milestone không bao giờ tự sinh từ counter — phải có xác nhận chủ động.
3. Verified milestone không xóa khi org đóng cửa — chỉ đổi UI badge.
4. Engagement và level chuyên môn tính realtime từ activity, không lưu field cố định. Like count tính realtime từ `social_reaction`.
5. Bài viết = Tag — không duplicate hệ thống tag và content.
6. `che_do_hien_thi` milestone: ẩn khi 1 trong 2 lớp (milestone hoặc nhóm) bảo ẩn. Giá trị `cong_dong` = ẩn khỏi Journey public của user (chỉ chính chủ thấy) + hiện trong feed cộng đồng — xem quy tắc 26–27.
7. `article_de_xuat` là cổng chặn — **chỉ áp dụng cho `nghe` và `nganh_dao_tao`**. `keyword`/`phan_mem` tạo thẳng `article_bai_viet`, AI gen `tom_tat` ngay.
8. `org_truong_nganh.id_nganh` FK → `article_bai_viet` (loại `nganh_dao_tao`).
9. Nhóm phân loại tách bảng riêng — `article_nhom` + `article_gan_nhom`. Không lưu nhom trong meta JSONB.
10. `article_bai_viet.id_linh_vuc` FK → `linh_vuc.id` — bắt buộc cho bài loại `nghe`.
11. `org_cau_hinh_mon` là nguồn duy nhất tính điểm — không đọc từ `edu_module_mon`, không hardcode frontend.
12. Timeline tuyển sinh: `tinh_trang` enum cho display, các field ngày cho logic chi tiết ở app layer.
13. **CINS giữ `vai_tro=owner` cho mọi org** (kể cả org user tự tạo). Trường ĐH chỉ được cấp `admin`. User tạo org → được cấp `admin`. (INSERT 2 dòng `user_thanh_vien_to_chuc`: CINS system user = owner, user = admin.)
14. `edu_to_hop_mon.cac_mon TEXT[]` là field cũ tham khảo — slot cụ thể dùng `edu_to_hop_mon_chi_tiet`.
15. `org_to_chuc.logo_id` là field cũ backward compat — dùng `avatar_id` cho code mới.
16. `org_cau_hinh_khoi.id_truong_nganh` nullable — NULL = fallback toàn trường; có giá trị = config per ngành. Calculator lookup theo ngành trước, fallback NULL sau.
17. `edu_mon_thi` phân biệt đề cụ thể — không gộp khi trường tách đề.
18. `org_tuyen_sinh_nam.so_thi_sinh` — điền sau kỳ thi; `ti_le_choi` tính app layer.
19. Tag co-author chỉ cho phép giữa người đã kết bạn (`user_ket_ban.trang_thai='accepted'`). Check app layer trước khi INSERT `content_tac_pham_tac_gia`.
20. Tag co-author cần consent: row `trang_thai=pending` → B nhận `social_thong_bao` → accept mới hiện trên Journey B. Owner row (`la_chu_so_huu=TRUE`) luôn `accepted`.
21. Journey người được tag: query `content_cot_moc` gốc (của A) qua join `tac_pham_thuoc_moc → tac_pham_tac_gia WHERE id_nguoi_dung=B AND trang_thai=accepted`. Không clone. `che_do_hien_thi=chi_minh` không đẩy sang Journey B dù đã accepted.
22. **Engagement có context**: KHÔNG feed thuật toán toàn cục / trending xuyên mạng. Discovery qua entity. Like hiển thị trong context entity, không phải nhiên liệu ranking toàn mạng.
23. **Quan hệ theo người = kết bạn 2 chiều** (`user_ket_ban`). Không follow-user. Bạn chung tính realtime (`bạn(A) ∩ bạn(B)`), không lưu field.
24. **Tạo org**: chỉ `truong_dai_hoc` cần CINS duyệt; 3 loại user tạo ngay (`co_so_dao_tao`, `studio`, `cong_dong`). Xem §O.
25. `keyword`/`phan_mem` không có trang prose. Trang detail chỉ render `tom_tat` (AI gen) + người + tác phẩm. Không vào navigation "Bài viết". `noi_dung=NULL` mãi mãi. **Trang detail mọi entity (`keyword`/`phan_mem`/`nghe`/`mon_hoc`/`truong`...) có 2 chế độ render trên cùng tập tagged-content: Lưới (visual) + Dòng thời gian (post-card).** Là *lens* (query) trên Journey cá nhân, KHÔNG kho mới, KHÔNG có chủ — Journey vẫn là source of truth (xem DECISIONS L13). Sort: mặc định mới nhất, thêm A–Z + engagement (user chọn — engagement-sort là tùy chọn thủ công trong context, không phải feed thuật toán, không vi phạm quy tắc 22). Chỉ kéo content public; hiện rõ tác giả (phễu connect); private không lộ. Tên hiển thị "Dòng thời gian", KHÔNG gọi "Journey" để tránh loãng khái niệm.
26. **Post cộng đồng = `content_cot_moc`** (không có bảng post riêng). Đăng bài vào cộng đồng = tạo cột mốc với `id_to_chuc`=cộng đồng + `che_do_hien_thi='cong_dong'`. Cộng đồng là **view tổng hợp cột mốc của thành viên** (như Gallery), không sở hữu nội dung. Comment/reaction/lưu trỏ cột mốc → bền. Đổi thẻ sang `public`/`theo_nhom` = "tốt nghiệp" thành milestone Journey, giữ comment, rời feed cộng đồng. Nhãn flair: `cong_dong_filter` + junction `cong_dong_filter_gan` (nối cột mốc). Mọi query Journey public PHẢI loại trừ `che_do_hien_thi='cong_dong'` — gom vào 1 helper.
27. `da_verify` không phải gatekeeping. Tag chưa verify vẫn tồn tại, vẫn dùng. `da_verify=true` chỉ ưu tiên top autocomplete.
28. AI gen `tom_tat` tag mới từ tên tag — không đợi đủ data. Regen khi `so_data_point` tăng đáng kể (track qua `vector_dong`).
29. **Filter cá nhân** = nhãn động do chủ sở hữu (user *hoặc* org) tự định nghĩa (`filter_nhan`), gắn polymorphic lên `content_cot_moc` (user) hoặc `org_bai_dang` (org) qua `filter_gan`. Cục bộ trong phạm vi 1 chủ sở hữu: KHÔNG tạo tag toàn cục (`article_*`), KHÔNG là kênh discovery xuyên người dùng, KHÔNG nghiệp vụ thương mại (giá/bán). Lọc áp cho **cả 2 view** Journey (timeline + grid). Verify quyền sở hữu trước mọi mutation.

**Khóa học (K1–K3) — trang khóa & gán tác phẩm, xem DECISIONS L14–L16:**
- K1. **Tác phẩm gán cấp khóa** (`content_cot_moc.id_khoa_hoc`), KHÔNG bắt chọn lớp. `id_lop_hoc` tự suy ra từ `user_hoc_vien_lop` để định tuyến verify; không có ghi danh → NULL, admin org duyệt.
- K2. **"Sản phẩm học viên" trên trang khóa = lens** (theo quy tắc 25 / L13): lọc `content_cot_moc WHERE id_khoa_hoc=X AND verified AND public`. Org không sở hữu — tác phẩm sống ở Journey học viên.
- K3. **Trang khóa ưu tiên mô hình liên tục** (`lien_tuc_theo_thang`, kiểu Sine Art). Cohort = biến thể render (đợt có `ngay_khai_giang` cố định). Giáo viên / lịch / sĩ số ở `org_lop_hoc` (per-lớp, không per-khóa); lộ trình bài ở `org_giao_trinh` (ORDER BY `thu_tu`, gating theo `visibility`); landing ở `org_khoa_hoc.noi_dung_blocks`.

**Verify (V1–V6) — luồng xác thực thống nhất, xem §V:**
- V1. Một luồng chung qua `verify_yeu_cau`: **user đẩy yêu cầu + bằng chứng, org bấm duyệt**. Không org-pull.
- V2. Im lặng = trạng thái **trung gian (tự khai, hiển thị xám, không badge)**, KHÔNG phải từ chối. Org chỉ can thiệp để bác cái sai.
- V3. Loại 1 (membership) duyệt → sinh `content_cot_moc` nguồn `sinh_tu_org_assign`. Loại 2 (tác phẩm) org accept/reject, **tách khỏi co-author**.
- V4. Badge danh tính = "Vị trí @ Org" verified; fallback `giai_doan`; **không bao giờ hiển thị tự khai như verified fact**.
- V5. Uy tín nghề = badge danh tính verified. **Không có lớp "verified hữu ích" riêng** ở MVP.
- V6. Người duyệt = `vai_tro IN ('admin','quan_ly_noi_dung','quan_ly_tuyen_sinh')` (admin duyệt tất ở MVP). Fallback khi org không trên nền tảng: `external_email` / `system_url` (weight thấp hơn, tính app layer).

---

## V. Luồng Verify thống nhất

Cùng một pattern cho mọi quan hệ với tổ chức (kể cả trường ĐH là trường hợp đầu tiên): **ai-đó gửi bằng chứng → bên có thẩm quyền bấm duyệt.** Schema gánh: `verify_yeu_cau` (flow pull) + `verify_xac_nhan` (kết quả, đa nguồn có weight).

### Loại 1 — Xác thực quan hệ tổ chức (gắn `user_thanh_vien_to_chuc`)

Yêu cầu về một dòng membership: vào làm / nghỉ / đổi vị trí.

| Hành động | Tác động field |
|---|---|
| Vào làm cty A | tạo dòng `{ vai_tro, tu_ngay, nam_bat_dau }`, trạng thái chờ duyệt |
| Đổi sang vị trí B | dòng mới (vai_tro/tu_ngay mới); dòng cũ set `den_ngay` |
| Nghỉ cty A | set `den_ngay` dòng đang mở |

Org admin duyệt → dòng thành verified → **tự sinh `content_cot_moc`** (`sinh_tu_org_assign`) trên Journey user (quy tắc 2). Verified rồi thì bất tử (quy tắc 3).

### Loại 2 — Xác thực tác phẩm/bài viết (gắn `content_tac_pham` / `content_cot_moc`)

User gửi: "tác phẩm này tôi làm khi học **khóa** Y @ org X" → org accept/reject. Gán **cấp khóa** (`content_cot_moc.id_khoa_hoc`); `id_lop_hoc` **tự suy ra** từ `user_hoc_vien_lop` của user nếu có (để định tuyến verify tới GV lớp đó), KHÔNG bắt học viên chọn lớp; không có ghi danh → NULL, admin org duyệt. Nối thêm `content_tac_pham_thuoc_moc`. Xem DECISIONS L14.

**Phân biệt với co-author**: co-author (`content_tac_pham_tac_gia`) = "ai cùng làm" (giữa người, cần kết bạn). Org-verify Loại 2 = "org xác nhận tác phẩm ra đời trong context của org". Hai mục đích khác nhau, chạy song song, không gộp.

### 3 luồng xác định danh tính nghề (degrade gracefully)

| Luồng | Nguồn | Độ tin | Hiển thị |
|---|---|---|---|
| 1. Tự khai | user (`giai_doan`, title text) | Thấp | Fallback `giai_doan`; title xám chưa duyệt |
| 2. Peer tag vị trí | user khác | Trung bình | **Phải neo vào tác phẩm cụ thể** ("trong dự án X, vai trò Y"), không cho title trôi nổi |
| 3. Org xác thực | org admin duyệt | Cao | Badge verified "Vị trí @ Org" |

**Giữ tươi**: user tự xác nhận "còn làm không" định kỳ (quý/6 tháng, KHÔNG hàng tháng — popup fatigue). Lưu ý: user tự confirm chỉ refresh trạng thái, KHÔNG *tạo* verified (verified phải qua org).

---

## O. Tổ chức & loại org

5 giá trị `loai_to_chuc_enum`. **User tạo ngay 3 loại** (CINS giữ owner, user cấp admin); `doanh_nghiep` đã **ẩn khỏi UI** (gộp vào `studio`); `truong_dai_hoc` cần CINS duyệt.

| Loại | Tạo bởi | Extension table | Tab đặc thù |
|---|---|---|---|
| `co_so_dao_tao` | User | `org_co_so_dao_tao` (1-1), `da_verify=false` | **Journey** · Khóa học · Lớp · Giáo trình · Học viên |
| `studio` | User | — (JSONB trên `org_to_chuc`) | **Journey** · Dự án · Tác phẩm |
| `cong_dong` | User | — | Thảo luận (xem dưới) · Sự kiện *(KHÔNG có Journey org)* |
| `doanh_nghiep` | (ẩn UI) | — | dùng chung template `studio` |
| `truong_dai_hoc` | CINS duyệt | `org_truong_dai_hoc` (1-1) | Tuyển sinh · Ngành · Cấu hình điểm |

- **Tab chung mọi loại**: Tổng quan · Bài đăng (`org_bai_dang`) · Sự kiện (`org_su_kien`) · Thành viên (`user_thanh_vien_to_chuc`) · Hình ảnh (`org_hinh_anh`).
- **Journey org (3 loại tổ chức thật)**: `truong_dai_hoc`, `co_so_dao_tao`, `studio` có Journey riêng = các dòng `org_bai_dang` (+ cột `thoi_diem` = ngày mốc lịch sử, KHÁC `tao_luc` = ngày đăng), render timeline/grid + filter cá nhân động (quy tắc 29). **KHÔNG tạo bảng `org_cot_moc`** — gộp vào `org_bai_dang`. Org journey **KHÔNG qua verify**: org tự kể về mình, khác hẳn milestone danh tính nghề của *người* (cái đó mới là moat verify).
- **Org vẫn là context verify cho member**: milestone *cá nhân* của member (verified "Vị trí @ Org") quy về `content_cot_moc` từng user — tách bạch với Journey-tự-kể của org.
- **`co_so_dao_tao` — trang khóa học** (xem K1–K3 + DECISIONS L14–L16): mỗi khóa (`org_khoa_hoc`) là một trang riêng `/co-so/[slug]/khoa-hoc/[khoa-slug]`. Khóa = bản mẫu ổn định (mô hình, học phí, thời lượng); **lớp** (`org_lop_hoc`) = lần mở khóa (giáo viên / lịch / sĩ số / hình thức — per-lớp); **giáo trình** (`org_giao_trinh`) = lộ trình bài có `thu_tu` + `so_buoi` + `visibility` (public xem thử / chi_hoc_vien khóa / private ẩn). Đăng ký = tạo `user_hoc_vien_lop` (gắn lớp khi cohort; khóa khi liên tục — `id_lop_hoc` nullable). Vẫn KHÔNG phải LMS: không nộp bài/chấm điểm trong CINS.
- **`cong_dong` = cộng đồng kiểu nhóm có thảo luận** (đã pivot từ "event hub"): member đăng bài đầy đủ. **Post = `content_cot_moc`** với `che_do_hien_thi='cong_dong'` (KHÔNG dùng `content_thao_luan` — đã bỏ, xem DECISIONS L12). Điểm khác Facebook là mỗi post kèm nghề + verified journey của người đăng. Filter kiểu flair: `cong_dong_filter` + junction `cong_dong_filter_gan` (nối cột mốc), seed 4 nhãn mặc định: Khoe tác phẩm · Hỏi đáp · Tuyển người · Tài nguyên (admin sửa được). Feed cộng đồng = cột mốc `id_to_chuc=X AND che_do_hien_thi='cong_dong'` → scoped vào 1 cộng đồng → không feed toàn cục → không vi phạm luật chống-viral. Vẫn KHÔNG group chat tự do (chat phải có context). Vai trò hợp lệ: `owner`/`admin`/`quan_ly_noi_dung`/`thanh_vien`. Layout: cột trái group identity card (avatar **vuông**, face pile, bản đồ nghề theo `giai_doan`, nhịp), cột phải feed mặc định Journey (mốc tháng) ↔ Lưới.

---

## 6. Quy ước làm việc

- Làm việc bằng **tiếng Việt**; English giữ cho technical terms, tên phần mềm, tên nghề.
- Field/bảng tiếng Việt không dấu với tiền tố tiếng Anh.
- **Step-by-step confirmation**: confirm từng bước; hỏi rõ trước khi commit hướng kỹ thuật có hệ quả lớn.
- "Khoan sửa" → defer, gom thay đổi lại sửa cuối.
- "Sao cũng được" → Claude tự quyết hợp lý, không hỏi lại.
- **Review 1 sample trước** rồi mới approve bulk.
- Push back với reasoning cụ thể khi quyết định có hệ quả kiến trúc; không over-engineer; không hỏi clarifying lặp lại.
- Câu trả lời ngắn gọn, không giải thích dài dòng.
- **Schema là source of truth**: luôn query `information_schema` trước khi generate SQL; không assume field từ instruction cũ.
- SQL safety: apostrophe trong HTML/SQL string → `&apos;`/`&#39;`; dollar-quoting `$noidung$...$noidung$` cho nội dung dài. `CROSS JOIN` trong Supabase có thể fail silently → dùng scalar subquery. File SQL dài → split nhiều parts tránh context overflow.
- Output path: `/mnt/user-data/outputs/`.

---

## 7. ENUM quan trọng (tham chiếu nhanh — sự thật ở SCHEMA.md)

```
vai_tro_to_chuc_enum     : owner / admin / quan_ly_tuyen_sinh / quan_ly_noi_dung / giao_vien / nhan_vien / hoc_vien / thanh_vien
loai_moc_enum            : hoc / lam_viec / du_an / su_kien / thanh_tuu / ca_nhan
nguon_goc_moc_enum       : tu_tao / sinh_tu_du_an / sinh_tu_su_kien / sinh_tu_org_assign / sinh_tu_hoc_vien_lop
che_do_hien_thi_moc_enum : feature / public / theo_nhom / chi_minh / cong_dong
loai_bai_viet_enum       : linh_vuc / nghe / keyword / phan_mem / mon_hoc / blog / event / nganh_dao_tao
loai_to_chuc_enum        : truong_dai_hoc / co_so_dao_tao / studio / doanh_nghiep / cong_dong   (doanh_nghiep ẩn UI)
giai_doan_enum           : moi_bat_dau / dang_hoc / dang_lam / tim_viec / freelance / dang_day
loai_phong_chat_enum     : 1_1 / 1_1_an_danh / 1_org / du_an / lop_hoc / su_kien
loai_mo_hinh_khoa_enum   : cohort_co_dinh / lien_tuc_theo_thang
visibility_giao_trinh_enum : public / chi_hoc_vien / private
trang_thai_ket_ban       : pending / accepted / blocked   (TEXT, không enum cứng)
filter_doi_tuong_enum    : cot_moc / org_bai_dang   (đối tượng được gắn filter cá nhân)
```

Các enum khác (tuyển sinh, phương thức xét tuyển, trạng thái bài đăng, trạng thái khóa/lớp/học viên…) — xem SCHEMA.md.

**`tinh_thanh`:** bảng riêng, không thuộc nhóm `article_`. Dùng cho địa lý (tỉnh/thành). Quan hệ: `org_to_chuc.id_tinh_thanh` FK → `tinh_thanh.id`.

---

## 8. `linh_vuc` — Danh mục lĩnh vực

Bảng riêng, không thuộc nhóm `article_` — cần quản lý UI (nhóm hiển thị, thứ tự, cover).

11 lĩnh vực hiện có, chia 3 nhóm: Sản xuất & Giải trí / Thiết kế thị giác / Thiết kế không gian & Sản phẩm.

Quan hệ: `article_bai_viet.id_linh_vuc` FK → `linh_vuc.id`. Bắt buộc cho loại `nghe`.

---

## 9. `article_bai_viet` — meta JSONB theo loại

```
nghe          : null
nganh_dao_tao : { "ma_nganh": TEXT, "khoi_thi": TEXT[], "thoi_gian_nam": INT }
phan_mem      : { "nha_phat_hanh": TEXT, "version": TEXT, "platform": TEXT[], "website": TEXT }
mon_hoc       : null  keyword: null  linh_vuc: null  blog: null  event: null
```

Video lưu riêng tại field `main_video TEXT`. Nhóm phân loại KHÔNG lưu trong meta — dùng `article_gan_nhom`.

---

## 10. `article_nhom` — Nhóm phân loại

| loai_nhom | Dùng cho | Slug pattern |
|---|---|---|
| bo_phan | nghe | nghe-{linh-vuc}-{ten-bo-phan} |
| ky_thuat | keyword, phan_mem, mon_hoc, nghe | kt-{ten-ky-thuat} |
| nhom_nganh | nganh_dao_tao | nn-{ten-nhom} |
| cap_do | keyword, phan_mem, mon_hoc | cd-{cap-do} |

Quy tắc gán nhóm cho bài `nghe`: ít nhất 1 `bo_phan` + 1–2 `ky_thuat`.

Phân nhóm tag `keyword`/`phan_mem` theo ngành nghề → defer (xem DECISIONS O6).

---

## 11. Module tính điểm (`org_cau_hinh_khoi` + `org_cau_hinh_mon`)

**Flow:**
```
Trường chọn template (edu_module_tinh_diem)
    → pre-fill org_cau_hinh_mon từ edu_module_mon (tham khảo)
    → trường điền môn thật (edu_mon_thi) + hệ số per ngành
    → lưu org_cau_hinh_khoi (id_truong_nganh) + org_cau_hinh_mon
```

**Lookup config (app / DB):**
```
1. org_cau_hinh_khoi WHERE id_to_chuc = X AND nam_ap_dung = Z AND id_truong_nganh = N
2. Nếu không có môn / không có dòng → fallback: id_truong_nganh IS NULL (khối chung trường, cùng năm Z)
```

**Công thức tính điểm (app layer):**
```
diem = Σ(nhap_i × he_so_i) / Σ(thang_diem_i × he_so_i) × quy_ve_thang
     + diem_uu_tien (nếu co_diem_uu_tien = true, ≤3đ với thang 30)
     + diem_thuong  (nếu co_diem_thuong = true, ≤10% thang)
```

**Lỗi thường gặp — năm mới trống trên UI:** chỉ có khối `id_truong_nganh IS NULL` → trả môn generic. Chi tiết seed: `CINS_IMPLEMENTATION.md` §8.

---

## 12. Admin — Phân quyền 2 lớp

**CINS admin (`/admin`)** — chỉ CINS internal: duyệt org (gồm duyệt đề xuất `truong_dai_hoc`, verify `co_so_dao_tao`), seed ngành, `edu_*`, analytics, **verify tag (`da_verify`)**.

**Org admin (inline trên trang org)** — staff org: cover/avatar, `org_bai_dang`, `org_hinh_anh`, `org_su_kien`, (trường) `org_tuyen_sinh_nam`, invite `user_thanh_vien_to_chuc`.

Check: `user_thanh_vien_to_chuc.vai_tro IN ('admin', 'quan_ly_noi_dung', 'quan_ly_tuyen_sinh')`.

---

## 13. Nhóm tương lai (không trong MVP)

- `payment_` (5 bảng) — khi org bán khóa học, sự kiện thu phí, subscription
- `api_` (4 bảng) — public API cho developer
- `ad_` (8 bảng) — sponsored content
- Video on demand + LMS đầy đủ — defer cùng payment phase
- Phân nhóm tag theo ngành nghề — defer (DECISIONS O6)
- `user_tien_do_video` — DROPPED, defer sang LMS/payment phase
