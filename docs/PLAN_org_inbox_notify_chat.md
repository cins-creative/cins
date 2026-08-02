# PLAN — Hộp thư tổ chức trong chat overlay + notify admin org + identity tổ chức

> Trạng thái: **BUILDING (P1–P4 đã code)** — chờ verify runtime.
> Chốt: C1 (không ALTER) · hint mọi member active · coalesce 1 row/phòng · nút Tin nhắn → overlay filter «Của tôi» · `canAccessOrgInbox` / `ORG_ADMIN_ROLES` cho inbox.

---

## 0. Ba việc trong yêu cầu

| # | Việc | Trạng thái hiện tại |
|---|---|---|
| **A** | Có tin nhắn / thông báo tới org → **notify admin org** | ❌ Chưa. Tin nhắn org chỉ có badge trong modal hộp thư; verify/tag chờ duyệt **không** vào bell icon |
| **B** | Hộp thư org **vào chat overlay** thay vì trang/modal riêng, tab «Tổ chức» có 2 filter phụ | ❌ Hộp thư staff nằm ở modal `OrgInboxPanel` + trang `/co-so/[slug]/quan-ly/tin-nhan`, tách hoàn toàn khỏi overlay |
| **C** | Trả lời **dưới danh nghĩa tổ chức** + **hint nội bộ** ai là người trả lời thật | 🟡 Nửa vời — UI đã mask thành org, nhưng không có identity tường minh và không có hint |

---

## 1. Điểm khởi đầu (fact, không đoán)

### Chat
- Bảng: `chat_phong` (`loai_phong`: `1_1` · `1_1_an_danh` · `1_org` · `du_an` · `lop_hoc` · `su_kien` · `nhom`) · `chat_thanh_vien` · `chat_tin_nhan` · `chat_da_doc`.
- Phòng tư vấn user↔org: `loai_phong='1_org'`, `loai_context='org_student'`, `id_org_dai_dien=orgId`.
- Tab cấp 1 overlay: `ban_be` · `nguoi_la` · `to_chuc` · `mua_ban` (`lib/chat/types.ts` L363–375).
- **Đã có tiền lệ sub-filter trong tab**: `banBeFilter` (Tất cả / Nhóm) và sub-tab `mua_ban` (Mua hàng / Khách hàng) — `CinsChatOverlay.tsx` L1009–1039, L4035–4052. Việc thêm sub-filter cho «Tổ chức» đi đúng pattern sẵn có.
- Tab «Tổ chức» hiện chỉ gom **góc nhìn user/member**: hub CSĐT, tư vấn 1-1 (membership `thanh_vien`), phòng lớp — `listOrgThreadsForUser` (`lib/chat/org-message.ts` L1066–1407).
- Unread = watermark `chat_da_doc.id_tin_nhan_cuoi_doc`, **không** phải cột `da_doc` mỗi tin.
- Realtime chat **đã có** (`chat_tin_nhan` + `chat_da_doc`); hộp thư staff `OrgInboxPanel` **chưa** có realtime.

### Membership
- `user_thanh_vien_to_chuc`: `vai_tro` (`vai_tro_to_chuc_enum`: `owner` · `admin` · `giao_vien` · `nhan_vien` · `hoc_vien` · `thanh_vien` · `quan_ly_tuyen_sinh` · `quan_ly_noi_dung`), `trang_thai` (`active`/`left`/`pending`/`rejected`), `den_ngay`.
- `ORG_ADMIN_ROLES` = `owner` · `admin` · `quan_ly_noi_dung` · `quan_ly_tuyen_sinh` (`lib/truong/org-admin.ts` L4–9).
- ⚠️ **Bẫy naming:** `getOrgMemberStatus` thực chất **chỉ check admin org**, không phải member thường (L134–139). Đừng tin tên hàm.
- Đã có `fetchUserOrganizationsPage(userId)` trả **mọi** org active kèm `vaiTro` (`lib/journey/user-orgs-fetch.ts` L152–184) → đủ để tách «của tôi» / «tham gia» mà **không cần query mới**.

### Notification
- `social_thong_bao.nguoi_nhan` **luôn là `user_nguoi_dung.id`** — không có khái niệm "thông báo gửi cho org". Muốn notify org ⇒ **fan-out tới từng admin**.
- Tiền lệ fan-out chuẩn: `shop_quay_pending` — `listOrgSuKienAdminIds` + `syncShopQuayPendingAdminNotifications` (`lib/shop/quay-notify.ts` L85–101, L151–229). Đây là khuôn mẫu để copy.
- Insert generic: `insertSocialThongBao` (`lib/social/thong-bao-insert.ts`).
- UI: `JourneyNotifications.tsx` (bell trên topbar), 2 tab **Chưa xử lý** / **Lịch sử**; **không** realtime, chạy poll + event `cins:notifications-changed`.
- Chưa có email/web-push cho notification (chỉ OTP auth).

---

## 2. Phát hiện quyết định: phần "hint" **không cần migration**

`chat_tin_nhan.id_nguoi_gui` **đã lưu đúng staff thật** khi admin trả lời (`sendOrgMessageToStudent` → `sendRoomMessage(staffUserId)`). Việc "khách chỉ thấy tổ chức" hiện là **mask ở tầng UI**, không phải mất dữ liệu.

⇒ Tính năng *"người trong tổ chức thấy ai đã trả lời"* chỉ là **mở khoá hiển thị có kiểm quyền**, không phải thêm cột, không phải backfill. Dữ liệu lịch sử cũng tự nhiên có hint ngay.

**Bắt buộc:** việc lọc phải làm **server-side**. Không được trả tên staff về client rồi ẩn bằng CSS — đó là leak. Theo `CINS_DEV_RULES.md` §API: check quyền ở backend, không chỉ ẩn UI.

---

## 3. Thiết kế theo từng việc

### A. Notify admin org

**Nguồn sự kiện cần notify** (thống nhất một cơ chế, khác nhau ở `loai_doi_tuong`):

| Sự kiện | `loai_doi_tuong` đề xuất | `loai` | Đích |
|---|---|---|---|
| Tin nhắn mới từ user tới org (phòng `1_org`) | `org_tin_nhan_moi` | `thong_tin` | Admin org |
| Tag đồ án chờ duyệt | `org_tag_cho_duyet` | `hanh_dong` | Admin org (đang thiếu) |
| Verify membership chờ duyệt | `org_verify_cho_duyet` | `hanh_dong` | Admin org (đang thiếu) |

**Chống ngập thông báo** — đây là rủi ro lớn nhất của việc "mỗi tin nhắn một notify":
- **Coalesce theo phòng:** một phòng chỉ giữ **một** row `org_tin_nhan_moi` chưa đọc; tin mới → `UPDATE` `noi_dung`/`tao_luc` thay vì insert row mới. `id_doi_tuong` = `id_phong` làm khoá idempotent. Pattern `sync*` của shop quầy đã làm kiểu này.
- **Không notify** nếu admin đó vừa đọc phòng (`chat_da_doc` watermark mới hơn) hoặc đang mở đúng phòng đó.
- **Không notify** người gửi nếu người gửi cũng là admin org (tự nhắn thử — có comment ở `org-message.ts` L266).
- Debounce: nếu tin trước < ~1 phút và vẫn chưa đọc thì chỉ update, không bump lại badge.

**Fan-out:** dùng đúng set vai trò của việc quản trị hộp thư = `canAccessOrgInbox` (đang delegate `isCoSoOrgAdmin`/`isStudioOrgAdmin`/`isTruongOrgAdmin`) — **không** dùng `TEACHER_ROLES` (có `giao_vien`) để tránh lệch quyền so với người thực sự mở được hộp thư.

**UI:** thêm loại vào `loadNotificationFeed` + render trong `JourneyNotifications.tsx`; click → mở chat overlay đúng phòng (không điều hướng trang).

### B. Hộp thư org vào overlay — tab «Tổ chức» + 2 filter phụ

**Sub-filter** (đi theo pattern `banBeFilter` sẵn có, mặc định `all`):

| Filter | Nội dung | Ghi chú |
|---|---|---|
| **Tất cả** (mặc định) | Gộp cả hai nhóm dưới | Giữ hành vi hiện tại, không phá |
| **Tổ chức của tôi** | Org tôi là staff/admin → **thread inbox theo từng user nhắn tới** | Hiển thị **vai trò của tôi** trong org (badge cạnh tên org) |
| **Tổ chức tham gia** | Org tôi là học viên/thành viên → thread tư vấn, hub, phòng lớp | = gần đúng tab «Tổ chức» hôm nay |

**Vấn đề kiến trúc phải xử lý:** hai universe thread khác shape.

| | `ChatThread` (overlay) | `OrgInboxThread` (staff) |
|---|---|---|
| Đơn vị | 1 phòng | 1 **sinh viên** trong 1 org |
| Type | `lib/chat/types.ts` | `lib/chat/org-inbox-types.ts` L15–39 |
| Enrich | preview, unread, group | + `subject`, `status`, `pendingVerification`, `enrollments` |

**Hướng:** viết **adapter** `OrgInboxThread → ChatThread` (cùng `id_phong` nên map được 1-1), thêm field mở rộng `orgStaffContext?: { orgId, orgTen, myVaiTro, studentUserId, pendingVerification }`. Không tạo universe thứ ba, không sửa shape `ChatThread` cho mọi tab.

**Composer + gửi tin:** reuse `POST /api/chat/rooms/[roomId]/messages` — vì staff inbox và overlay **cùng bảng** `chat_tin_nhan`. Cần bổ sung: khi phòng là `1_org` và viewer là staff ⇒ đi nhánh quyền `canAccessOrgInbox` (hiện `listOrgThreadsForUser` lọc `vai_tro='thanh_vien'` nên staff không thấy thread — L1106–1112, phải nới có kiểm soát).

**Badge:** hiện badge hộp thư staff (`TruongMessageInbox`) **tách rời** `totalUnread` của overlay. Sau khi gộp phải cộng vào một chỗ, nếu không sẽ đếm đôi.

**Giữ hay bỏ chỗ cũ:** đề xuất **giữ** nút «Tin nhắn» ở sidebar org nhưng đổi hành vi thành *mở overlay ở filter «Tổ chức của tôi» + chọn org đó*, thay vì mở modal riêng. Trang `/co-so/[slug]/quan-ly/tin-nhan` giữ nguyên cho luồng quản lý sâu (CSĐT) — không xoá trong phase này.

### C. Identity tổ chức + hint nội bộ

**Hiển thị:**

| Người xem | Thấy gì trên tin staff trả lời |
|---|---|
| Khách / học viên | Avatar + tên **tổ chức**. Không thấy staff nào |
| Thành viên cùng org | Avatar + tên **tổ chức**, kèm **hint** phụ: «trả lời bởi {tên staff} · {vai trò}» |

**Cách lấy hint:** `id_nguoi_gui` (đã có) + join `user_nguoi_dung` + `user_thanh_vien_to_chuc.vai_tro`, **chỉ khi** server xác nhận viewer là member org đó. Không cần cột mới.

**Câu hỏi còn lại — có cần cột `id_to_chuc` trên `chat_tin_nhan` không?**

Hiện "as org" được **suy** từ ngữ cảnh (phòng `1_org` + người gửi là staff). Suy như vậy đúng ở phòng tư vấn, nhưng **hỏng** ở phòng nhóm/lớp — nơi một người có thể muốn nói với tư cách cá nhân *hoặc* tư cách org. Ba lựa chọn:

| | Cách | Ưu | Nhược |
|---|---|---|---|
| **C1** | **Suy từ ngữ cảnh**, không lưu gì | 0 migration, làm được ngay | Không phân biệt được cá nhân/org trong cùng phòng; lỡ đổi vai trò sau này thì lịch sử hiểu sai |
| **C2** | Lưu `ngu_canh.asOrg = { id }` (jsonb đã có) | 0 migration, tường minh từng tin | `ngu_canh` đang gánh nhiều thứ (card, `mentions`, `chuyenTiep`, `capNhat`, `moc`…); khó index, khó query thống kê |
| **C3** | **ALTER `chat_tin_nhan` thêm `id_to_chuc`** | Đồng nhất với `social_binh_luan.id_to_chuc` đã có; index được; query sạch | Sửa bảng đã có ⇒ theo `CINS_INSTRUCTION.md` luật 6 + DEV_RULES §1 **phải được bạn chấp thuận trước** và ghi DECISIONS |

**Đề xuất:** **C1 cho phase này** (đủ cho hộp thư tư vấn, không migration), và chỉ nâng lên **C3** khi mở tính năng "nói với tư cách org trong phòng nhóm/lớp". Ghi rõ lựa chọn vào DECISIONS để sau không cãi nhau.

**Ai được trả lời as-org:** tiền lệ comment (`canCommentAsOrgVaiTro`) chỉ cho `owner`/`admin`. Nhưng hộp thư tư vấn thực tế do `giao_vien`/`nhan_vien`/`quan_ly_tuyen_sinh` trả lời. ⇒ Với chat nên lấy set = `canAccessOrgInbox` (rộng hơn comment). Cần bạn xác nhận vì đây là lệch có chủ ý so với comment.

---

## 4. Các bước (mỗi phase một brief riêng)

| Phase | Nội dung | File chính | Migration |
|---|---|---|---|
| **P1** | Hint nội bộ + identity org tường minh trong phòng `1_org` | `lib/chat/org-message.ts`, `lib/chat/direct-message.ts` (select), `ChatMessageThreadItems.tsx` | **Không** |
| **P2** | Notify admin org khi có tin nhắn mới (coalesce theo phòng) + render trong bell | `lib/chat/org-message.ts` (hook sau khi user gửi), `lib/social/*-notify.ts` mới, `lib/social/notifications.ts`, `JourneyNotifications.tsx` | **Không** |
| **P3** | Sub-filter tab «Tổ chức» + adapter `OrgInboxThread → ChatThread` + badge gộp | `CinsChatOverlay.tsx`, `lib/chat/org-message.ts`, `lib/chat/types.ts`, lib membership mới | **Không** |
| **P4** | Chuyển nút «Tin nhắn» sidebar org → mở overlay; realtime cho luồng staff | `TruongMessageInbox.tsx`, `StudioSidebar.tsx`, `CinsChatProvider.tsx` | **Không** |
| **P5** *(tuỳ)* | Notify cho tag/verify chờ duyệt vào bell | `lib/social/org-milestone-tag-notify.ts`, verify libs | **Không** |
| **P6** *(chỉ khi cần)* | `id_to_chuc` trên `chat_tin_nhan` cho as-org trong phòng nhóm | migration + libs | **Có — cần bạn duyệt** |

Đề nghị làm **P1 trước** (nhỏ, không migration, thấy kết quả ngay), rồi P2.

---

## 5. Edge case / bẫy

1. **Ngập thông báo** — org đông user nhắn: bắt buộc coalesce theo phòng, không 1 notify/tin.
2. **Đếm đôi unread** — badge hộp thư staff hiện tách khỏi `totalUnread` overlay (P3 phải gộp).
3. **Leak danh tính staff** — hint phải lọc server-side; kiểm cả nhánh realtime (`mapRealtimeRow` client cũng nhận payload từ `chat_tin_nhan`) — nếu không, realtime sẽ lộ `id_nguoi_gui` cho khách.
4. **Staff cũng là học viên của org khác** — một user có nhiều membership; filter «của tôi» vs «tham gia» phải theo *từng org*, không theo user.
5. **Staff rời tổ chức** (`trang_thai='left'` / `den_ngay`) — tin cũ vẫn phải hiện đúng tên org; hint có nên còn hiện tên người đã rời? (đề xuất: còn, vì là log nội bộ).
6. **`vai_tro` đổi sau khi gửi** — hint hiển thị vai trò *hiện tại* hay *lúc gửi*? Không lưu snapshot ⇒ sẽ là hiện tại. Chấp nhận được, cần ghi chú.
7. **Nhiều staff trả lời cùng phòng** — với khách vẫn là một tiếng nói tổ chức; đảm bảo không nhảy avatar giữa các bubble.
8. **`getOrgMemberStatus` không phải member check** — dùng sai sẽ khiến học viên bị coi là admin. Cần helper member thật cho filter «tham gia».
9. **RLS** — code hiện dùng service role server-side cho inbox. Khi mở qua API overlay phải giữ nguyên mức kiểm quyền, không dựa RLS suy ra.
10. **Realtime `chat_tin_nhan` không filter phòng** (`use-chat-realtime.ts` L56–83) — thêm luồng staff vào overlay sẽ tăng lượng event; cần kiểm tra không vỡ hiệu năng khi org nhiều phòng.
11. **`cong_dong`** — comment-as-org chặn cộng đồng (`comment-as-org.ts` L103–108). Chat org có áp cùng luật? Cần chốt.
12. **Mobile** — overlay mobile chuyển list↔thread bằng `mobileShowThread`; thêm sub-filter phải không đẩy chiều cao list quá (đã có 4 tab cấp 1 + sub-tab).

## 6. Security (theo `CINS_DEV_RULES.md`)

- Hint staff: **chỉ** trả về khi server xác nhận viewer active member của đúng org đó. Mặc định là ẩn.
- Mọi API mới validate quyền backend (`canAccessOrgInbox`), không tin `orgId` client gửi.
- Notify fan-out chạy service role, chỉ insert cho admin id lấy từ DB — không nhận danh sách người nhận từ client.
- List thread staff phải phân trang/limit (hiện staff message limit 80, inbox chưa phân trang).

---

## 7. Cần bạn chốt trước khi build

1. **Identity as-org:** đi **C1** (suy từ ngữ cảnh, 0 migration) như đề xuất, hay muốn làm **C3** (ALTER `chat_tin_nhan` thêm `id_to_chuc`) ngay từ đầu cho sạch? *(C3 cần bạn duyệt ALTER theo luật 6.)*
2. **Ai được trả lời dưới danh nghĩa org trong chat:** set `canAccessOrgInbox` (gồm `quan_ly_tuyen_sinh`, và tuỳ loại org) — rộng hơn comment (chỉ owner/admin). Đồng ý lệch không?
3. **Hint hiện cho ai:** mọi member active của org, hay chỉ admin org?
4. **Notify tin nhắn:** coalesce 1 row/phòng (đề xuất) hay muốn từng tin một notify?
5. **Nút «Tin nhắn» ở sidebar org:** chuyển sang mở overlay (đề xuất), hay giữ modal hiện tại và overlay chỉ là đường vào thứ hai?
6. **Bắt đầu từ P1** (hint, nhỏ, không migration) hay bạn muốn P3 (gộp tab) trước?
