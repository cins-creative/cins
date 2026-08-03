# PLAN — Module trang chủ theo VAI TRÒ (Phase 4)

> Trạng thái: **BUILT** (2026-08-03) — Phase 4 catalog + capability gate. Nối tiếp `docs/PLAN_home_custom_modules.md`.
> Phạm vi: mở rộng catalog từ 12 → ~26 khối, thêm trục **vai trò vận hành** bên cạnh trục **giai đoạn**.
> Chốt treo: `cho_ban_duyet` giữ gom (a); `duyet_thanh_vien` chưa tách riêng.

---

## 0. Vấn đề

Catalog hiện tại chỉ có **1 trục**: `giai_doan` → persona `hoc | lam | day`. Trục này trả lời *"bạn đang ở đâu trong hành trình"* → sinh ra khối **khám phá / gợi ý**.

Nhưng phần lớn *việc thật* của người dùng CINs không nằm ở trục đó. Chúng nằm ở **trục vai trò vận hành**: chủ shop có đơn chờ xác nhận, admin sự kiện có quầy chờ duyệt, studio có ứng viên mới, org staff có yêu cầu gắn thẻ chờ duyệt. Một người có thể vừa `dang_hoc` vừa bán hàng vừa là staff của một org — persona không mô tả được.

Hệ quả hiện tại: các việc này **chỉ tồn tại sau 2–3 cú click** (vào `/ban-hang/don`, `/studio/[slug]/quan-ly/tuyen-dung`, overlay chat tab Mua bán). Trang chủ không phản ánh.

**Mục tiêu:** trang chủ trở thành nơi thấy được *việc cần xử lý hôm nay*, tuỳ vai trò, mà **không** ép ai cũng phải thấy.

---

## 1. Xác nhận fact (đã khảo sát repo)

### 1.1 Chat có nhiều loại hơn trí nhớ ban đầu

`lib/chat/types.ts`:

| Type | Giá trị |
|---|---|
| `ChatThreadGroup` | `ban_be` · `nguoi_la` · `to_chuc` |
| `ChatThreadView` (tab UI) | `ban_be` · `nguoi_la` · **`to_chuc`** · **`mua_ban`** |
| `ChatMuaBanSub` | `mua_hang` (tôi là người mua) · `khach_hang` (tôi là người bán) |

- Loader gộp: `listAllChatThreads` (`lib/chat/org-message.ts`) → `GET /api/chat/threads` → `{ threads, totalUnread }`.
- Badge theo tab **tính client-side** trong `CinsChatOverlay.tsx` (`tabUnread`), không có hàm server.
- Provider `CinsChatProvider` đã giữ sẵn snapshot threads ở client.

→ **Kết luận quan trọng:** module chat trên trang chủ **không cần query mới**. Đọc từ `useCinsChat()` = 0 request phát sinh. Đây là điểm khác với ghi chú "đắt" ở nhóm D của plan cũ (ghi chú đó giả định fetch riêng).

### 1.2 Các domain vận hành đã có dữ liệu

| Domain | Bảng | Loader có sẵn | Đếm pending |
|---|---|---|---|
| Đơn hàng | `shop_don_hang`, `shop_don_hang_dong` | `listDonHangForUser(userId, "seller"\|"buyer")` — `lib/shop/don-hang.ts` | ❌ (client tự đếm trong `ShopTopbarButton`) |
| Quầy sự kiện | `shop_quay_su_kien` | `listQuayCuaToi`, `listQuaySuKien`, `duyetQuay` — `lib/shop/quay.ts` | ✅ `countPendingQuay` — `lib/shop/quay-notify.ts` |
| Tuyển dụng | `org_tuyen_dung`, `org_tuyen_dung_ung_tuyen` | `listStudioJobApplicants`, `fetchStudioJobs` | ❌ |
| Verify / gắn thẻ org | `verify_yeu_cau`, `verify_xac_nhan` | `listOrgMilestoneTagRequests`, `listOrgMembershipMilestoneRequests`, `loadChoBanDuyet` | ✅ `countPendingOrgMilestoneTagVerifies` |
| Inbox org (staff) | `chat_*` + `user_thanh_vien_to_chuc` | `listOrgInboxThreadsForStaff` | ✅ `unreadCount` trong `/api/org/[orgId]/inbox/threads` |
| Kết bạn | `user_ket_ban` | `listPendingReceived` — `lib/social/ket-ban.ts` | ✅ |
| Sự kiện RSVP | `org_dang_ky_su_kien` | `loadUserSuKienPhanHoiMap`, `demDangKySeThamGia` | ✅ |

Trạng thái quan trọng:
- Đơn: `nhap → cho_xac_nhan → da_nhan_tien → cho_lay_hang → dang_giao → da_giao_tai_su_kien → hoan_thanh | hoan_tra | huy`
- Quầy: `cho_xu_ly | da_duyet | tu_choi`
- Ứng viên: `moi | dang_xem | phu_hop | tu_choi | da_nhan` (**chưa có mutation đổi trạng thái trong repo**)
- Verify: `cho_xu_ly | da_duyet | tu_choi`

---

## 2. Phân tích nhu cầu thật theo nhóm đối tượng

Nguyên tắc chọn khối: chỉ đưa lên trang chủ khi trả lời được **"có việc gì cần tôi hôm nay?"** hoặc **"trạng thái thứ tôi đang chờ ra sao?"**. Nội dung chỉ để "xem cho vui" thì để feed, không chiếm sidebar.

| # | Nhóm | Câu hỏi thật mỗi ngày | Khối đề xuất |
|---|---|---|---|
| 1 | Học viên (`hoc`) | Học gì tiếp? Sự kiện nào sắp tới? | Đã phủ (nhóm A) |
| 2 | Đi làm / freelance (`lam`) | Có việc nào hợp? Ai cùng ngành? | Đã phủ (nhóm A) |
| 3 | **Đang tìm việc** (`tim_viec`) | **Hồ sơ tôi nộp tới đâu rồi?** | `ung_tuyen_cua_toi` ← **thiếu hẳn, đây là lỗ hổng lớn nhất hiện tại** |
| 4 | Giảng dạy (`day`) | Ai chờ tôi duyệt? Học viên thế nào? | Đã phủ (nhóm A) |
| 5 | **Chủ shop** | **Đơn nào chờ tôi xác nhận?** Quầy tôi xin duyệt chưa? Khách nhắn gì? | `don_can_xu_ly`, `quay_cua_toi`, `tin_nhan_mua_ban` |
| 6 | **Người mua** | Đơn tôi đặt đang ở đâu? | `don_mua_cua_toi` |
| 7 | **Org staff / admin** | Ai xin gắn thẻ vào org? Ai xin làm thành viên? Inbox org còn chưa trả lời? | `org_cho_duyet`, `org_inbox` |
| 8 | **Admin sự kiện** | Sự kiện sắp tới có bao nhiêu người tham gia? Shop nào xin quầy chờ tôi duyệt? | `quan_ly_su_kien` |
| 9 | **Studio tuyển dụng** | Có ứng viên mới không? | `ung_vien_moi` |
| 10 | Mọi người | Ai nhắn tôi? Ai mời kết bạn? Tôi lưu gì? | `tin_nhan_ban_be`, `loi_moi_ket_ban`, `da_luu`, `to_chuc_cua_ban`, `se_tham_gia` |
| 11 | **Học viên đang học** | Nhóm chat lớp đâu để vào học nhanh? | `tin_nhan_to_chuc` |

**Nhận xét thiết kế:** nhóm 5–9 là *hàng đợi công việc* (queue), khác bản chất với nhóm 1–2 là *gợi ý khám phá*. Queue cần: số đếm nổi bật, 3 dòng mới nhất, link tới trang xử lý đầy đủ. Không cần ảnh lớn, không cần infinite.

---

## 3. Catalog mới — Nhóm E

Ký hiệu: **Cap** = capability yêu cầu (xem §4). Tất cả đều `hideable: true` trừ khi ghi rõ.

### E1 — Mua bán (group `ban_hang`)

| ModuleId | Nhãn | Nguồn | Cap | Query mới? |
|---|---|---|---|---|
| `don_can_xu_ly` | Đơn chờ xử lý | `listDonHangForUser(id,"seller")` lọc `cho_xac_nhan`, `cho_lay_hang` | `co_shop` | Nên thêm loader riêng có `limit` + `count` thay vì lấy all rồi lọc |
| `don_mua_cua_toi` | Đơn tôi đặt | `listDonHangForUser(id,"buyer")` lọc chưa `hoan_thanh` | `da_mua_hang` | Như trên |
| `quay_cua_toi` | Quầy sự kiện của tôi | `listQuayCuaToi` | `co_shop` | Không |

**`quay_cua_toi` nghĩa là gì:** CINs cho chủ shop **xin một chỗ bán hàng (quầy / booth) tại sự kiện** của tổ chức — hàm `xinLamQuay()` ghi vào `shop_quay_su_kien` với `trang_thai='cho_xu_ly'`, kèm bằng chứng (`bang_chung`). Admin sự kiện `duyetQuay()` → `da_duyet` hoặc `tu_choi` (có `ly_do_tu_choi`); chủ shop có thể `rutQuay()`. Khối này là **phía người xin**: liệt kê các đơn xin quầy của tôi đang `cho_xu_ly` / `da_duyet` (`listQuayCuaToi` lọc đúng 2 trạng thái này) để biết "sự kiện nào tôi đã được duyệt bán, cái nào còn chờ". Phía **người duyệt** là khối `quan_ly_su_kien` ở E2.

### E2 — Tổ chức / vận hành (group `to_chuc`)

| ModuleId | Nhãn | Nguồn | Cap | Query mới? |
|---|---|---|---|---|
| `cho_ban_duyet` *(đã có)* | Chờ bạn duyệt | `verify_yeu_cau` `cho_xu_ly` của mọi org quản lý — **không phân biệt loại** | `org_staff` | — |
| `duyet_thanh_vien` | Duyệt thành viên | `listOrgMembershipMilestoneRequests` | `org_staff` | Cần tách khỏi `cho_ban_duyet` — **xem §11 câu treo #1** |
| `org_inbox` | Hộp thư tổ chức | `listOrgInboxThreadsForStaff` | `org_staff` | Không (cần bọc multi-org) |
| `quan_ly_su_kien` | Quản lý sự kiện | `org_su_kien` sắp tới của org quản lý + stats từ `loadSuKienQuanLy` | `su_kien_admin` | **Có** — cần loader gộp đa-sự-kiện (xem dưới) |
| `ung_vien_moi` | Ứng viên mới | `listStudioJobApplicants` lọc `moi` | `studio_tuyen_dung` | Cần hàm gộp theo nhiều tin của org |
| `to_chuc_cua_ban` | Tổ chức của bạn | `lib/journey/user-orgs-fetch.ts` | `org_thanh_vien` | Không |

**`quan_ly_su_kien` — chi tiết (khối user yêu cầu bổ sung):**

Hiện repo **chỉ có loader theo từng sự kiện**: `loadSuKienQuanLy(actorId, orgId, suKienId)` → `SuKienQuanLyStats` gồm `soSeThamGia`, `soQuanTam`, `soChoDuyetNoiDung` (quầy `cho_xu_ly`), `soDaDuyetNoiDung`, `slotToiDa`. Trang chủ cần góc nhìn ngược lại: **"mọi sự kiện tôi đang quản lý"**.

Cần hàm mới `loadSuKienQuanLyTongQuan(viewerId, limit = 3)`:
1. `listManagedOrgIds(viewerId)` (đã có trong `fetches.ts`);
2. `org_su_kien` của các org đó, `bat_dau >= now()`, sort tăng dần, limit 3;
3. gộp đếm cho các sự kiện đó: `org_dang_ky_su_kien` (theo `loai_phan_hoi`) + `shop_quay_su_kien` (theo `trang_thai`) — **2 query gộp, không N+1**.

Mỗi dòng hiển thị: tên sự kiện · ngày · **N sẽ tham gia** (`/slotToiDa` nếu có) · badge **N quầy chờ duyệt**. Bấm badge → thẳng trang quản lý sự kiện đó.

Gộp duyệt quầy vào đây thay vì tách khối riêng vì cả hai đều là **cùng một đối tượng công việc: sự kiện tôi tổ chức** — tách ra sẽ buộc admin nhìn 2 card cho cùng 1 sự kiện. Đây là ngoại lệ có chủ đích của quyết định "tách" (A).

### E3 — Cá nhân / kết nối (group `ket_noi`)

| ModuleId | Nhãn | Nguồn | Cap | Query mới? |
|---|---|---|---|---|
| `ung_tuyen_cua_toi` | Ứng tuyển của tôi | `org_tuyen_dung_ung_tuyen` where `id_nguoi_dung = viewer` | — | **Có** — hiện chỉ có chiều admin |
| `tin_nhan_ban_be` | Tin nhắn bạn bè | `useCinsChat()` lọc `ChatThreadGroup='ban_be'` | — | **Không** (0 request) |
| `tin_nhan_to_chuc` | Tin nhắn tổ chức | `useCinsChat()` lọc view `to_chuc` + `groupToChucThreads` | `dang_hoc_khoa` \|\| `org_thanh_vien` | **Không** |
| `tin_nhan_mua_ban` | Tin nhắn mua bán | `useCinsChat()` lọc `isMuaHang` / `isKhachHang` | `co_shop` \|\| `da_mua_hang` | **Không** |
| `loi_moi_ket_ban` | Lời mời kết bạn | `listPendingReceived` | — | Không |
| `se_tham_gia` | Sự kiện sẽ tham gia | `org_dang_ky_su_kien` `loai_phan_hoi='se_tham_gia'` | — | Nhẹ |
| `da_luu` | Đã lưu | `social_luu` | — | Cần 1 query gộp |

**Quyết định (2026-08-03):** tách 3 khối chat riêng thay vì 1 khối có prop `view`. Lý do user nêu: ba nhóm này **phục vụ ba hành vi khác nhau**, không phải ba tab của cùng một việc — người chỉ chat bạn bè thì chỉ cần bạn bè; chủ shop cần *đơn hàng một bên, chat người mua một bên*; học viên cần nhóm chat tổ chức luôn hiện để vào học nhanh. Vì thế mỗi khối còn kèm **capability riêng** (cột Cap) — người không bán hàng không bao giờ thấy khối mua bán. Hệ quả tốt: `home_layout` **giữ nguyên shape** `ModuleId[]`, không cần multi-instance → bỏ Đợt 4. Hệ quả cần lưu ý: 3 card cấu trúc gần giống nhau, phải phân biệt bằng icon + màu accent, và mỗi khối tối đa 3 dòng.

---

## 4. Capability — trục thứ hai

**Nguyên tắc user chốt (2026-08-03):** *"nhóm đối tượng nào có chức năng mới hiển thị"* — không ai thấy khối của vai trò mình không có. Capability không phải tuỳ chọn trang trí, nó là **điều kiện tồn tại** của khối trong catalog.

```ts
// lib/cins/home-adaptive/capabilities.ts (mới)
export type HomeCapability =
  | "co_shop"            // sở hữu ≥1 shop_cua_hang
  | "da_mua_hang"        // có ≥1 shop_don_hang vai người mua
  | "dang_hoc_khoa"      // user_hoc_vien_lop trạng thái da_dang_ky | dang_hoc
  | "org_thanh_vien"     // user_thanh_vien_to_chuc active bất kỳ
  | "org_staff"          // vai_tro nhóm quản lý (owner/admin/quan_ly_*/giao_vien)
  | "su_kien_admin"      // org quản lý có org_su_kien sắp tới
  | "studio_tuyen_dung"  // org quản lý có org_tuyen_dung dang_mo
  | "da_ung_tuyen";      // có ≥1 org_tuyen_dung_ung_tuyen
```

### Bảng gating đầy đủ

| Khối | Chỉ hiện khi |
|---|---|
| `don_can_xu_ly`, `quay_cua_toi` | `co_shop` |
| `don_mua_cua_toi` | `da_mua_hang` |
| `tin_nhan_mua_ban` | `co_shop` \|\| `da_mua_hang` |
| `tin_nhan_to_chuc` | `dang_hoc_khoa` \|\| `org_thanh_vien` |
| `tin_nhan_ban_be` | luôn (ai cũng có bạn bè) |
| `quan_ly_su_kien` | `su_kien_admin` |
| `ung_vien_moi` | `studio_tuyen_dung` |
| `cho_ban_duyet`, `org_inbox` | `org_staff` |
| `to_chuc_cua_ban` | `org_thanh_vien` |
| `ung_tuyen_cua_toi` | `da_ung_tuyen` |
| `loi_moi_ket_ban`, `se_tham_gia`, `da_luu` | luôn |

**Ghi chú `dang_hoc_khoa`:** bảng ghi danh là **`user_hoc_vien_lop`** (`id_nguoi_dung`, `id_khoa_hoc`, `trang_thai ∈ {da_dang_ky, dang_hoc}`) — xác nhận qua `loadHocVienCuaBan` trong `fetches.ts`. Đây chính là điều kiện "học viên đã đăng ký học thì mới thấy nhóm chat tổ chức".

- 1 hàm `loadHomeCapabilities(viewerId)` bọc `react.cache`, gộp các query `select('id', { head: true, count: 'exact' })` — rẻ, chạy song song, **1 lần / request**.
- Dùng ở 2 nơi: (a) lọc catalog panel «Thêm khối»; (b) resolve default layout cho người chưa tuỳ chỉnh.
- Người dùng đã bỏ capability (đóng shop) → khối vẫn trong `home_layout` nhưng render `null` như mọi module hiện nay. **Không tự xoá khỏi prefs** (tránh mất cấu hình khi tạm thời không có dữ liệu).

`ModuleMeta` thêm field:

```ts
requires?: readonly HomeCapability[];  // AND — thiếu 1 cái là ẩn khỏi catalog
```

---

## 5. Thay đổi kiến trúc cần cân nhắc

| Vấn đề | Hiện tại | Đề xuất |
|---|---|---|
| Số module | 12, flat union `ModuleId` | ~27 — vẫn flat, nhưng `MODULE_ORDER` per persona không đủ; default layout cần `resolveDefaultLayout(persona, capabilities)` |
| Group panel | `goi_y \| hoc \| lam \| day \| cong_cu` | thêm `ban_hang`, `to_chuc`, `ket_noi` |
| Panel «Thêm khối» | Lưới 2 cột, gom nhóm | > 16 khối → **bắt buộc thêm ô tìm kiếm** + thu gọn nhóm; capability gating giúp đa số user chỉ thấy 12–16 |
| Nhiều instance cùng module | Không hỗ trợ | **Không cần nữa** — đã chốt tách 3 ModuleId chat riêng. `home_layout` giữ `ModuleId[]` |
| Preview trong catalog | `/api/home/module-previews` batch | Giữ nguyên; thêm case cho module mới trong `loadModulePreview` (giữ limit 3) |
| Chi phí render | Module server component chạy song song | Queue module nên **chỉ query count + 3 dòng**, không join nặng |

---

## 6. Database

**Không cần bảng mới.** Tất cả nguồn đã tồn tại.

Có thể cần **index** nếu query mới chậm (đo trước, đừng thêm mù):
- `org_tuyen_dung_ung_tuyen (id_nguoi_dung, tao_luc DESC)` — cho `ung_tuyen_cua_toi`
- `shop_don_hang (id_nguoi_mua, trang_thai)` — cho `don_mua_cua_toi`

→ Mọi `CREATE INDEX` vẫn phải báo cáo trước theo `CINS_DEV_RULES.md` §1.

---

## 7. API

Không thêm endpoint mới cho module (server component tự query). Chỉ mở rộng:

- `lib/cins/home-adaptive/module-preview.ts` — thêm case cho ModuleId mới, giữ `LIMIT = 3`.
- `lib/cins/home-adaptive/module-preview-types.ts` — thêm payload variant.
- `app/api/home/module-previews/route.ts` — nâng `MAX_IDS` từ 12 → 24.
- `lib/cins/home-adaptive/layout-prefs.ts` — `isModuleId` bổ sung id mới + validate shape mới nếu làm instance.

---

## 8. Các bước (chia đợt theo chi phí, dừng được giữa chừng)

### Đợt 0 — Nền (bắt buộc trước mọi đợt)
1. `capabilities.ts` + `requires` trong `ModuleMeta` + gate catalog.
2. Ô tìm kiếm trong panel «Thêm khối» (catalog sắp vượt 16 khối).

### Đợt 1 — Rẻ nhất, dữ liệu sẵn, không query mới
3. `to_chuc_cua_ban`, `loi_moi_ket_ban`, `se_tham_gia`, `quay_cua_toi`.
4. `tin_nhan_ban_be`, `tin_nhan_to_chuc`, `tin_nhan_mua_ban` (đọc `useCinsChat`).

### Đợt 2 — Queue vận hành (giá trị cao nhất)
5. `don_can_xu_ly` + `don_mua_cua_toi` (loader có limit/count, không lọc client).
6. `quan_ly_su_kien` (cần `loadSuKienQuanLyTongQuan` — xem §E2).
7. `duyet_thanh_vien` (sau khi chốt câu treo #1).

### Đợt 3 — Cần query mới
8. `ung_tuyen_cua_toi` — **giá trị cao nhất**, phải viết query chiều user.
9. `ung_vien_moi` (studio).
10. `org_inbox` multi-org.
11. `da_luu` (query gộp bookmark).

---

## 9. Edge cases

- Người vừa là buyer vừa seller vừa org staff → catalog dài. Panel «Thêm khối» đã gom nhóm; thêm ô tìm kiếm khi > 16 khối.
- Capability mất tạm thời (org gỡ quyền) → module render `null`, prefs giữ nguyên.
- Queue rỗng → hiện empty-state có ích ("Không có đơn chờ xử lý") thay vì ẩn hẳn, vì "rỗng" chính là thông tin người dùng cần.
- `cho_ban_duyet` (không cho ẩn) và `org_cho_duyet` chồng nhau về ý nghĩa → cần quyết định gộp hay tách (câu treo #1).
- Số đếm phải nhất quán với badge ở nơi khác (topbar shop, overlay chat) — nếu lệch sẽ mất niềm tin.

---

## 10. Security

- Mọi loader queue phải check quyền **ở backend**, không dựa vào capability client: `quan_ly_su_kien` chỉ trả sự kiện + quầy của org viewer thực sự quản lý (tái dùng `canViewerManageSuKien`); `ung_vien_moi` chỉ trả ứng viên của tin thuộc org viewer quản lý (`user_thanh_vien_to_chuc.vai_tro`).
- `ung_tuyen_cua_toi` chỉ đọc row `id_nguoi_dung = auth.uid()`.
- Không lộ PII ứng viên (email/SĐT) trong preview sidebar — chỉ tên + trạng thái.
- `/api/home/module-previews` đã gate session; giữ nguyên và không nhận `viewerId` từ client.

---

## 11. Quyết định & câu treo

### Đã chốt (2026-08-03)

| # | Nội dung | Chốt |
|---|---|---|
| A | Gộp hay tách queue duyệt | **Tách** — mỗi loại một khối |
| B | Khối chat trên trang chủ | **Tách 3 khối** theo tab: bạn bè / tổ chức / mua bán |
| C | Multi-instance `home_layout` | **Bỏ** — không cần nữa nhờ (B) |
| D | Quản lý sự kiện | **Một khối `quan_ly_su_kien`** gộp số người tham gia + duyệt quầy shop (cùng một đối tượng công việc) |
| E | Nguyên tắc hiển thị | **Có chức năng mới thấy khối** — capability là điều kiện tồn tại, không phải tuỳ chọn |

### Còn treo

1. **`cho_ban_duyet` xử lý sao khi đã chốt "tách"? — có phát hiện chặn.**

   **Fact (đã tra code):** `verify_yeu_cau` **không có cột phân loại**. Cả hai luồng đều insert cùng shape (`nguoi_yeu_cau`, `id_cot_moc`, `id_to_chuc`, `noi_dung` JSON, `trang_thai`). Phân biệt chỉ bằng cách **parse JSON `noi_dung`** — `parseMembershipMilestonePayload()` trả `null` nếu không phải membership.

   **Hệ quả:** không thể `.eq()` để lọc/limit từng loại ở tầng SQL. Muốn 2 khối, mỗi khối 3 dòng, phải over-fetch rồi phân loại trong JS — mất tính xác định của `limit` (fetch 20 vẫn có thể ra 0 dòng loại A).

   Ba hướng:
   - **(a) Giữ `cho_ban_duyet` gom cả hai** — rẻ, đúng khả năng DB hiện tại; ngoại lệ có lý do của quyết định "tách". *Đề xuất chọn cái này.*
   - **(b) Thêm cột `loai` vào `verify_yeu_cau`** + backfill từ `noi_dung` → tách sạch, nhưng là **ALTER bảng live** → phải theo gate `CINS_DEV_RULES.md` §1 (báo cáo + xác nhận + ghi inventory `CINS_DECISIONS.md`).
   - **(c) Tách nhưng over-fetch** — không khuyến nghị: chi phí query tăng, số dòng hiển thị không ổn định.
2. **Khối nào không cho ẩn?** Hiện chỉ `cho_ban_duyet`. Khi tách ra 4–5 queue, nếu tất cả đều non-hideable thì cột trái bị chiếm cứng. Đề xuất: **chỉ khối chạm nghĩa vụ với người khác** (duyệt verify, duyệt quầy) là non-hideable; đơn hàng / ứng viên cho ẩn.
3. Empty-state queue: ẩn khối hay hiện "không có việc"? (nghiêng về hiện — xem §9).
4. Đợt build đầu tiên (chưa chốt).
