# PLAN — Tutorial sidebar lần đầu cho nhóm mua bán (wibu)

> **Trạng thái:** BUILT (2026-08-15)
> **Nối tiếp:** [`PLAN_home_preset_bo_khoi.md`](./PLAN_home_preset_bo_khoi.md) (preset — BUILT) · onboarding bước 3 chips intent
> **Phạm vi v1:** user mới chọn **Mua đồ** hoặc **Bán hàng** lúc onboarding. Không đụng luồng học / việc / dạy.
> **Không trong phạm vi:** thư viện tour, khối mới, ALTER DB, đổi guest home, A/B preset admin.

---

## 0. Vấn đề

User wibu vào CINs để **mua / bán merch** (preorder, figure, shop bạn bè). Onboarding vẫn hỏi đúng nhu cầu ở bước 3, nhưng lần đầu vào trang chủ họ thấy bộ **Khám phá ngành** vì:

1. Bộ nền lấy theo `giai_doan` (hay chọn «Đang học») — thắng intent mua/bán.
2. Chip «Mua đồ» map sang `nguoi_mua` (cần `da_mua_hang`) chứ không phải bộ **Mua sắm** (`mua_hang_su_kien`).
3. Khối shop bị `filterLayoutByCapabilities` ẩn → sidebar trông như bộ khám phá ngành.
4. Panel «Thêm khối» mở sẵn tab `presets[0]` = Khám phá ngành. User không biết mình vừa chọn mua/bán.

Đây vẫn là **vấn đề nhận thức** (cùng gốc `PLAN_home_preset_bo_khoi`): công cụ đã có, lần đầu không đưa họ vào đúng bộ.

**Giải pháp v1:** với đúng cohort này — sidebar trống có CTA → mở overlay preset → dropdown **Mua sắm / Chủ shop** → bấm «Dùng bộ này» là hết tutorial.

---

## 1. Ai vào tutorial (cắt scope)

| Onboarding bước 3 | v1 |
|---|---|
| **Mua đồ** và/hoặc **Bán hàng** | Tutorial. Không auto-apply layout. |
| Dạy học / Vận hành / bỏ qua hết chip | **Giữ như hiện tại** (`buildOnboardingHomeLayout` theo giai đoạn). Không tutorial. |
| User cũ đã có `home_layout` | Không đụng. |

Intent mua + bán cùng lúc: pre-select **Chủ shop** (bán là vai nặng hơn), vẫn cho đổi sang Mua sắm trong overlay.

---

## 2. Map intent → preset (đổi 1 dòng)

| Chip | Hiện tại | v1 |
|---|---|---|
| Mua đồ | `nguoi_mua` (Đơn tôi đặt — cần đã mua) | **`mua_hang_su_kien` (Mua sắm)** |
| Bán hàng | `chu_shop` | `chu_shop` (giữ) |

`nguoi_mua` vẫn trong catalog «Thêm khối» cho người đã mua. Không xóa preset.

Bộ **Mua sắm** (đã có):

| Cột | Khối | Hiện ngay với user mới? |
|---|---|---|
| L | `hang_feature` | Có — không gắn capability |
| L | `don_mua_cua_toi` | Không — cần `da_mua_hang` |
| R | `gio_hang_cua_ban` | Có — không gắn capability |
| R | `tin_nhan_mua_ban` | Không — cần `co_shop` \| `da_mua_hang` |

Lần đầu buyer **nhìn thấy**: Hàng feature + Giỏ hàng. Đúng việc wibu làm trên home. Hai khối còn lại tự hiện sau đơn đầu / chat shop.

Bộ **Chủ shop**: hầu hết khối cần `co_shop`. **Đã chốt:** không nhồi khối đơn/kho trống. Một thông báo trên cột: *«Bạn chưa hề mở shop»* + nút **Mở shop** → mở cài đặt tài khoản, mục **Bán hàng** (toggle «Bật chức năng bán hàng»). Xem §5.1.

---

## 3. Database

**Không ALTER.** `user_nguoi_dung.home_layout` jsonb thêm field ứng dụng:

```jsonc
{
  "v": 2,
  "left": [],
  "right": [],
  "hidden": [],
  "tutorial": "pending",   // "pending" | "done" | "skipped"
  "intent_hint": ["mua_do"], // chip bước 3 — chỉ để pre-select dropdown
  "preset": { "da_ap": [], "at": "…" },
  "at": "…"
}
```

Phân biệt với `{}` (nghĩa hiện tại = layout mặc định theo giai đoạn, **không** trống).

- Submit onboarding cohort mua/bán: ghi `left/right: []` + `tutorial: "pending"` + `intent_hint`. **Không** gọi `buildOnboardingHomeLayout`.
- Parse: whitelist `tutorial`, `intent_hint` (cùng `parseOnboardingIntents`). Bỏ giá trị lạ.
- `tutorial` **không** tham gia resolve cột — giống `preset.da_ap` (breadcrumb). Cột trống vì `left/right` rỗng, không vì cờ.

---

## 4. API

Không endpoint mới. Tái `PUT /api/user/home-layout`.

| Việc | Cách |
|---|---|
| Apply «Dùng bộ này» | PUT layout + `preset.da_ap` + `tutorial: "done"` |
| Bỏ qua / đóng overlay lần đầu | PUT `tutorial: "skipped"` + apply fallback **Mua sắm** (buyer default cohort này — không Khám phá ngành) |
| Validate | `tutorial` ∈ whitelist; `intent_hint` ≤ 4 id đã biết |

---

## 5. Frontend

Một nhịp, không tour đa bước, không dependency mới.

```
Lần đầu `/` (tutorial=pending, left+right rỗng)
  → 2 cột: thẻ CTA «Chọn bộ khối mua sắm / bán hàng» (không cột trắng)
  → bấm CTA (hoặc tự mở overlay 1 lần)
  → AddModuleOverlay
       dropdown mặc định = Mua sắm | Chủ shop theo intent_hint
       không hiện Khám phá ngành là tab đầu
  → «Dùng bộ này» → ghi layout, tutorial=done, thoát edit
```

**Kết thúc tutorial = bấm «Dùng bộ này»** (ghi layout), không phải chọn item dropdown.

Copy CTA / hint overlay: một câu. Không coachmark trùng header «Chọn bộ khối theo nhu cầu».

**Edit mode** đã desktop-only (`PLAN_home_custom_modules`: `?tuy-chinh=1` trên mobile bị bỏ). Overlay «Thêm khối» là panel ~1120px — mở được trên phone nhưng preset preview 3 cột không dùng được, và user **không vào lại** được edit trên máy này. Tutorial overlay trên mobile = dạy công cụ họ không có. Xem §5.2.

Sau onboarding giữ redirect `/{slug}?welcome=1`. Tutorial gắn **lần đầu mở `/`**, không gắn Journey. **Đã chốt** — không đổi redirect v1.

Pre-select dropdown: `activeTab` lần đầu = preset từ `intent_hint`, **không** `ctx.presets[0]` (đang là Khám phá ngành khi `dang_hoc`).

Danh sách dropdown tutorial: **Mua sắm** + **Chủ shop** trên cùng. Bộ khác vẫn trong list (không khoá), chỉ không dẫn đầu. Chip Dạy học / Vận hành **giữ trên form** — không thu hẹp onboarding; chỉ nhánh mua/bán vào tutorial. **Đã chốt.**

### 5.1. Seller chưa mở shop — thông báo + Mở shop

Sau «Dùng bộ này» = Chủ shop, nếu viewer **không** có `co_shop` (`ban_hang_bat !== true`):

- **Không** render `don_can_xu_ly` / `quan_ly_kho` / `tin_nhan_mua_ban` (vẫn ẩn vì thiếu cap — tránh card rỗng / 403).
- Thay bằng **một thẻ thông báo** trên cột (cùng chỗ CTA trống, hoặc slot đầu cột trái):

  > Bạn chưa hề mở shop.
  > [ Mở shop ]

- Bấm **Mở shop** → mở `UserAccountSettingsModal` **đúng mục `ban-hang`** (Cài đặt → Bán hàng). Không đi `/open-shop` (form dựng hộ) và không đi `/seller/store` (setup sau khi đã bật bán).

Hiện modal **không** nhận `initialSection` (luôn `journey-display`). Cần thêm:

| Chỗ | Việc |
|---|---|
| `UserAccountSettingsModal` | Prop `initialSection?: "ban-hang" \| …`; khi `open` đổi → set section |
| `UserAccountMenu` | Lắng nghe event `cins:open-account-settings` `{ section: "ban-hang" }` → `setSettingsOpen(true)` |
| Thẻ thông báo sidebar | `dispatchEvent` event đó — không import modal vào board |

Khi user bật bán hàng xong (`cins:ban-hang-changed`), thẻ thông báo biến; khối Chủ shop hiện qua resolve cap như user cũ.

### 5.2. Lần đầu trên mobile / compact (`<992px`)

Fact layout trang chủ:

| Viewport | Cột trái | Cột phải | Edit / Thêm khối |
|---|---|---|---|
| ≥1200px | Cột | Cột | Có |
| 992–1199 | Cột | Drawer mép phải | Không (param bị bỏ) |
| **<992px (phone)** | Drawer mép trái | Drawer mép phải | Không |

Phone: hai sidebar **không mất**, thành drawer (nút mép / swipe). User mới gần như không mở. CTA trống trong cột = **không ai thấy**. Để `tutorial: pending` chờ desktop = trang chủ phone trống + drawer trống cho đến khi họ ngồi máy tính.

**Không** mở `AddModuleOverlay` trên phone v1.

**Hướng đề xuất — auto-apply + banner trên feed**

```
Onboarding xong, lần đầu `/` trên <992px, tutorial=pending
  → không CTA cột, không overlay
  → tự apply preset từ intent_hint (Mua sắm | Chủ shop)
  → tutorial=done (cùng skip/done trên mọi máy)
  → Buyer: layout đã ghi; Hàng feature / giỏ nằm trong drawer
  → Seller chưa mở shop: banner **trên feed** (chrome họ đang nhìn)
       «Bạn chưa hề mở shop»  [ Mở shop ]
       → cùng event cài đặt Bán hàng
```

Cùng nick sau đó mở desktop: layout đã có, không chạy tutorial lần 2.

Tablet 992–1199: cột trái còn. Chạy nhánh desktop **trên cột trái** (CTA / thẻ chưa mở shop). Khối phải (giỏ, tin nhắn) vẫn drawer — chấp nhận.

**Không làm v1:** rail `hang_feature` nhúng trên feed phone (để buyer thấy hàng ngay). Đúng việc wibu, nhưng thêm surface — tách bước sau nếu CTA drawer không đủ.

**Không làm v1:** ép mở drawer trái lần đầu. User tưởng bug / overlay che feed.

---

## 6. Implementation steps

| Bước | Việc | File chính |
|---|---|---|
| **1** | Parse `tutorial` / `intent_hint`. Onboarding: cohort mua/bán → layout rỗng + pending, **không** `buildOnboardingHomeLayout`. Map `mua_do` → `mua_hang_su_kien`. | `layout-prefs.ts` · `presets.ts` · `actions.ts` (`submitOnboarding`) |
| **2** | Cột rỗng + CTA; mở overlay; `activeTab` theo hint; apply → `tutorial: done`. Skip → Mua sắm + `skipped`. | `HomeLayoutBoard.tsx` · `HomeEditableColumn` · CSS `world-journey-feed.css` |
| **3** | Deep-link cài đặt Bán hàng. Thẻ «chưa mở shop» trên cột (desktop/tablet) **và banner trên feed** khi `<992px`. Phone: auto-apply, không overlay. | `UserAccountSettingsModal` · `UserAccountMenu` · thẻ/banner · matchMedia 992 |

Thứ tự: 1 trước (không CTA thì onboarding vẫn đổ Khám phá ngành). 2 là UX. 3 có thể cùng 2 nếu CTA dùng 1 component.

---

## 7. Edge cases

- **F5 giữa tutorial:** `tutorial: pending` + `left: []` trên DB → CTA lại. Không localStorage làm nguồn sự thật (máy dùng chung — DEV_RULES §10). Có thể hint client «đã mở overlay» để không auto-mở lần 2 trong cùng tab.
- **Bỏ qua overlay:** fallback Mua sắm, không để trống mãi.
- **Đóng overlay không bấm Dùng bộ này:** coi như skip (cùng fallback). Không kẹt pending.
- **Mua + bán:** pre-select Chủ shop; apply 1 bộ (replace). Muốn cả hai: lần sau «Thêm khối» — không stack trong tutorial (tránh tràn 8 khối).
- **Chưa có `co_shop`:** thẻ «Bạn chưa hề mở shop» + Mở shop → cài đặt Bán hàng. Không 403 module shop.
- **Chưa có `da_mua_hang`:** buyer vẫn thấy `hang_feature` + `gio_hang`.
- **User cũ / không phải cohort:** không chạy. `{}` vẫn = default giai đoạn.
- **«Khôi phục mặc định» sau tutorial:** về default `giai_doan` hiện tại (có thể lại Khám phá ngành). Chấp nhận v1; không gắn tutorial lần 2.
- **Capability filter sau apply:** giữ nguyên luật layout ≠ quyền. Khối thiếu cap ẩn. Buyer Mua sắm vẫn còn 2 khối nhìn thấy.
- **Phone `<992px`:** không overlay, auto-apply; seller banner trên feed. Xoay ngang / resize vượt 992 khi đang pending: chuyển nhánh desktop (CTA cột) — một lần, không double-apply.
- **Onboard phone, lần sau desktop:** `tutorial` đã `done`, layout đã là Mua sắm/Chủ shop — không hỏi lại.
- **Onboard desktop, lần sau phone:** layout đã apply; seller banner trên feed vẫn hiện nếu `!co_shop` (không phụ thuộc tutorial).

---

## 8. Security

- Tutorial/hint là jsonb user gửi lên lúc PUT → untrusted, whitelist.
- Preset không cấp `co_shop` / `da_mua_hang`. Module tự guard server.
- Không thư viện tour (không script bên thứ ba, không spotlight DOM injection).

---

## 9. Đã chốt (2026-08-15)

1. **Seller chưa mở shop:** một thông báo *«Bạn chưa hề mở shop»*; bấm **Mở shop** → cài đặt tài khoản, mục Bán hàng. Không render khối shop thiếu cap.
2. **Redirect sau onboarding:** giữ Journey `?welcome=1`. Tutorial lần đầu mở `/`.
3. **Chip Dạy / Vận hành:** giữ trên form. Chỉ mua/bán vào tutorial.

### Chờ chốt — phone

4. **Lần đầu `<992px`:** auto-apply preset + banner seller trên feed; **không** mở overlay Thêm khối. **Đã chốt + built.**

---

## 10. Verify

- Nick mới, bước 3 = Mua đồ, bước 2 = Đang học: `/` lần đầu = CTA trống, overlay tab **Mua sắm** (không Khám phá ngành). Dùng bộ này → Hàng feature + Giỏ hiện; `home_layout.tutorial === "done"`.
- Cùng nick, Bán hàng, chưa bật bán: overlay tab **Chủ shop** → thẻ «Bạn chưa hề mở shop»; **Mở shop** mở cài đặt mục Bán hàng (không `/open-shop`). Bật bán xong → thẻ biến, khối đơn/kho hiện.
- Bỏ qua overlay: layout = Mua sắm, `tutorial === "skipped"`.
- Nick mới chỉ chọn Đang học, không chip mua/bán: **không** CTA trống; layout như hiện tại (Khám phá ngành).
- PUT `tutorial: "hack"` → bỏ / 400, không crash parse.
- Phone `<992px`, Mua đồ: không overlay; `home_layout` = Mua sắm, `tutorial === "done"`. Cùng nick desktop sau đó: sidebar Mua sắm, không CTA trống.
- Phone, Bán hàng, chưa shop: banner trên feed «Bạn chưa hề mở shop»; Mở shop → cài đặt Bán hàng. Không ẩn sau feed.
