# PLAN: Cache phía client & giảm query lặp khi chuyển trang

Ngày: 05/08/2026 · Dựa trên scan `app/` + `components/` + `lib/`
Trạng thái: **Đã implement bước 1–9** (2026-08-05, Grok 4.5). Bản v2 kiểm chứng giữ nguyên.

## Nhật ký ship (2026-08-05)

| Bước | Đã làm |
|---|---|
| 1 A1 | `lib/chat/chat-prefetch.ts` — TTL RAM 45s + inflight dedup; fan-out tin nhắn phòng chỉ 1 lần/phiên |
| 2 B0 | `lib/client-cache.ts` — primitive + `clearAllClientCaches`; gọi khi logout (`UserAccountMenu`, `OnboardingSignOut`) |
| 3 B1 | Cache `san-pham` / `bang-gia` / `nhom` trong `client-fetch-cache.ts`; `ShopKhoClient` peek-revalidate; prefetch tab Kho |
| 4 B2 | `lib/cong-dong/sidebar-live-client-cache.ts` + `CongDongPageClient` |
| 5 C1 | `WorldJourneyFeed` — không fetch gallery khi đang ở journey; fetch khi chuyển sang gallery |
| 6 B4 | `lib/to-chuc/khoa-hoc-client-cache.ts` — dedup tab Khoa học / Sản phẩm / badge |
| 7 A2 | `ChatIncomingCallHost` `POLL_MS` 5s → **30s** |
| 8 B3 | Cache `mat-hang` + `quay/sap-co-mat`; force-refresh khi lỗi giỏ / `GIO_CHUNG_CHANGED` |
| 9 C2 | `GET /api/ket-ban/status?ids=` + batch client 32ms trong `use-ket-ban-status.ts` |

---

Xuất phát từ câu hỏi: *"chuyển qua lại giữa các trang (shop, mua hàng...) có cách nào lưu lại để không phải query lại?"*

## Kết luận đi trước

**localStorage không phải công cụ đúng cho mục tiêu này**, và `CINS_DEV_RULES.md` §10 đã chốt: *"Chuyển trang mượt = RAM, KHÔNG phải localStorage"*.

App Router điều hướng kiểu SPA nên **JS không unload khi đổi route** — biến cấp module đã sống nguyên qua các lần chuyển trang. localStorage chỉ thêm giá trị khi F5 / mở tab mới, đổi lại phải trả: đọc/ghi đồng bộ chặn main thread, `JSON.parse` mỗi lần đọc, trần ~5MB, và rủi ro dữ liệu user cũ còn sót trên máy dùng chung.

**Kiểm chứng lại làm đổi trọng tâm:** phần lớn "trang chuyển qua lại" trên CINs **đã được xử lý rồi** (tab giữ mounted, SSR seed, cache client + server sẵn có). Chỗ thực sự lãng phí nằm ở **tầng poll chat toàn cục** — và nó không phải bài toán cache trang.

---

## Bảng kiểm chứng

| Nghi vấn ban đầu | Kết quả | Ghi chú |
|---|---|---|
| Poll chat threads trùng lặp | **Đúng, và tệ hơn dự đoán** | Mỗi chu kỳ toả ra tới 12 request, không phải 2 |
| Poll cuộc gọi đến 5s | **Đúng** | Chạy cho mọi user đăng nhập, mọi trang |
| Kho hàng fetch lại 3 endpoint | **Đúng** | `/ban-hang/*` là route riêng → thật sự remount |
| Cộng đồng `sidebar-live` | **Đúng** | Không SSR seed, không cache, API nặng vừa |
| Tab tổ chức fetch lại mỗi lần đổi tab | **Sai** | Tab giữ mounted — chỉ fetch lần đầu |
| Feed thế giới mất SSR seed | **Sai** | Có `skipInitialFilterFetchRef` |
| `/api/link/og` không có cache | **Sai hoàn toàn** | Có cache client Map **và** server 30 phút |

Ba mục cuối đã bị **loại khỏi plan**. Chi tiết ở phần "Đã kiểm tra và quyết định không làm".

---

## Hiện trạng: repo đã có 8 module cache client

| Module | Cơ chế | TTL | Phạm vi |
|---|---|---|---|
| `lib/shop/client-fetch-cache.ts` | RAM + localStorage | 20s – 30 phút | Shop (5 endpoint) |
| `lib/chat/chat-session-cache.ts` | sessionStorage | 10 phút | Threads + messages |
| `lib/social/notifications-session-cache.ts` | sessionStorage | 10 phút | Chuông thông báo |
| `lib/journey/journey-panel-local-cache.ts` | localStorage | 15 phút | Tab Journey |
| `lib/journey/milestone-detail-cache.ts` | Map RAM + inflight | — | Modal chi tiết bài |
| `lib/journey/post-page-cache.ts` · `post-local-cache.ts` · `user-preview-cache.ts` | hỗn hợp | — | Điều hướng bài tức thì |
| `lib/tag/suggest-index-client.ts` | sessionStorage | có | Gợi ý tag |
| `SidebarOrgFlyout` (`orgsCache`) | Promise cấp module | **không TTL** | `/api/me/organizations` |

`lib/shop/client-fetch-cache.ts` là bản tham chiếu tốt nhất: **TTL theo loại dữ liệu + inflight dedup + prefetch on hover + invalidate qua custom event**.

Vấn đề: 8 cách làm cho cùng một bài toán, không cái nào chia sẻ logic dedup hay guardrail xoá-khi-logout.

---

# Nhánh A — Tầng poll chat toàn cục (ưu tiên cao nhất)

Mọi trang sau đăng nhập bọc trong `CinsShell` → `CinsChatShellBridge`.

## A1 — `/api/chat/threads`: hai poller, không TTL, còn toả ra request phụ

Đây là phát hiện lớn nhất của lần kiểm chứng, và **tệ hơn nghi vấn ban đầu**.

Chuỗi thực tế:

```
CinsChatProvider      interval 120s + visibilitychange ─┐
CinsChatFloatingStack interval 120s + focus            ─┤→ prefetchChatData()
                                                         └→ prefetchChatThreads(viewerProfileId)
                                                              ├─ fetchChatThreadsSnapshot()   ← fetch /api/chat/threads, KHÔNG TTL, KHÔNG dedup
                                                              └─ Promise.all( tối đa 5 × prefetchRoomMessages )  ← 5 fetch nữa
```

Neo:

| Điểm | Path |
|---|---|
| Poller 1 | `components/cins/CinsChatProvider.tsx:479` |
| Poller 2 | `components/cins/CinsChatFloatingStack.tsx:1026` |
| Hàm dùng chung | `lib/chat/chat-prefetch.ts:32` |
| Fetch trần, không TTL | `lib/chat/chat-prefetch.ts:13–28` |
| Fan-out 5 phòng | `lib/chat/chat-prefetch.ts:11,44–46` |

`prefetchChatThreads` **ghi** `writeChatThreadsCache` nhưng **không bao giờ đọc TTL trước khi fetch** — sessionStorage ở đây chỉ dùng cho lần mở nguội, không hề chặn request định kỳ.

Hệ quả mỗi chu kỳ 120s: **2 × (1 + tối đa 5) = tối đa 12 request**, chưa kể `visibilitychange` và `focus` của hai component có thể nổ gần như đồng thời tạo thành cụm.

**Hướng sửa (rẻ, rủi ro thấp):** thêm TTL + inflight coalescing ngay trong `prefetchChatThreads` — đúng khuôn `fetchDonHangCached` ở `lib/shop/client-fetch-cache.ts:211–238`. Hai poller giữ nguyên, không đụng realtime, không đổi UI. Một hàm, vài chục dòng, cắt phần lớn lượng request.

Cân nhắc thêm: hạ `UNREAD_ROOM_PREFETCH_LIMIT` (hiện 5) hoặc chỉ prefetch tin nhắn phòng chưa đọc ở **lần đầu**, không phải mỗi chu kỳ.

## A2 — Poll cuộc gọi đến 5 giây

`components/cins/ChatIncomingCallHost.tsx:38,189–240`. Guard duy nhất là `if (!viewerProfileId || activeCall) return` — tức **chạy cho mọi user đăng nhập, trên mọi trang, liên tục**, chỉ dừng khi đang trong cuộc gọi.

Ước lượng: ~720 request/giờ/user. 100 user online ≈ **72.000 request/giờ**.

Comment dòng 188 ghi rõ đây là *"Poll dự phòng — Realtime đôi khi trễ / không đẩy khi không mở đúng phòng"*. Realtime là đường chính (`:156–186` qua `subscribeChatMessages`), poll chỉ là lưới an toàn — nhưng lưới đang quét ở 5 giây.

Hướng sửa, theo thứ tự ưu tiên:
1. Nới `POLL_MS` lên 30–60s. Giữ nguyên `tick()` khi tab visible trở lại (`:231–233`) để không tăng độ trễ ở trường hợp thường gặp nhất.
2. Tốt hơn: chỉ poll khi kênh realtime **báo mất kết nối** — `lib/chat/use-chat-realtime.ts` đã có logic resubscribe, cần phơi ra trạng thái connected.

**Cần user quyết:** độ trễ nhận cuộc gọi chấp nhận được khi realtime chết. Đây là đánh đổi UX, không phải quyết định kỹ thuật thuần.

---

# Nhánh B — Cache chuyển trang (phạm vi đã thu hẹp)

## B0 — Primitive dùng chung + xoá khi logout

Trích một helper để các mục sau dùng chung thay vì copy-paste ~80 dòng mỗi lần:

```ts
// lib/client-cache.ts (đề xuất)
createCachedResource<T>({
  key: string | ((args) => string),
  ttlMs: number,
  fetcher: (args) => Promise<T>,
  persist?: "none" | "session" | "local",  // mặc định "none"
  validate?: (raw: unknown) => T | null,   // bắt buộc khi persist ≠ none
})
// → { fetch, peek, prefetch, write, invalidate }
```

Gồm sẵn TTL, inflight coalescing, `peek()` cho stale-while-revalidate, và **registry để xoá toàn bộ khi logout**.

Guardrail logout là mục **bảo mật**, không phải tối ưu: `CINS_DEV_RULES.md` §10 yêu cầu xoá cache theo-user khi đăng xuất vì máy dùng chung phổ biến ở VN. Hiện `invalidateShopClientCaches()` có xoá localStorage địa chỉ nhận, nhưng **cần xác minh nó thực sự được gọi trong luồng đăng xuất**.

Module cũ **để nguyên**, di trú dần khi có dịp sửa vì lý do khác.

## B1 — Kho hàng (`/ban-hang/kho`) — đã xác nhận

`components/shop/ShopKhoClient.tsx:243–249` fetch song song 5 nguồn:

| Endpoint | Trạng thái | Đề xuất |
|---|---|---|
| `/api/user/ban-hang` | đã cache 45s | giữ |
| `/api/shop/cua-hang` | đã cache 30s | giữ |
| `/api/shop/san-pham` | **không cache** | TTL 60s, invalidate sau POST/PATCH/DELETE sản phẩm |
| `/api/shop/bang-gia` | **không cache** | TTL 120s, invalidate sau khi lưu giá |
| `/api/shop/nhom` | **không cache** | TTL 120s, invalidate sau khi sửa nhóm |

Đã xác nhận `/ban-hang/kho` và `/ban-hang/don` là **route riêng biệt** (`app/ban-hang/layout.tsx:6–11` giữ shell, `children` swap) → quay lại Kho **thật sự remount** `ShopKhoClient` và chạy lại `load()` (`:342–344`). Đây là ca "chuyển qua lại giữa các trang" đúng nghĩa mà câu hỏi gốc mô tả.

Áp thêm pattern peek-rồi-revalidate như `ShopDonClient.tsx:359–366`: có cache thì **không hiện loading**, render data cũ ngay rồi cập nhật ngầm.

`bang-gia` và `nhom` là dữ liệu người bán **chủ động sửa** → cache gần như miễn rủi ro.

Phạm vi: 1 file lib + `ShopKhoClient.tsx`. Rủi ro thấp.

## B2 — Cộng đồng `sidebar-live` — đã xác nhận

`components/cong-dong/CongDongPageClient.tsx:205–235` fetch `/api/cong-dong/[id]/sidebar-live` **vô điều kiện mỗi lần mount**, `cache: "no-store"`, không guard, không cache.

Đã xác nhận **không có SSR seed** cho phần này: `CongDongPageData` (`lib/cong-dong/types.ts:271–293`) chỉ seed org / posts / categories / linhVucs, **không** có `friendsInCommunity`, `memberPreview`, `careerMap`.

API nặng vừa: `loadSidebarLiveData` chạy song song ba nhánh, trong đó `loadGiaiDoanDistribution` nạp toàn bộ member ID rồi chia lô 200 user để đếm `giai_doan`.

Mỗi lần điều hướng làm remount (ví dụ `/cong-dong/[slug]` ↔ trang chi tiết sự kiện) đều trả lại toàn bộ chi phí này. TTL 60s theo key `congDongId`.

**Lưu ý:** route handler tự đặt `Cache-Control: no-store` và comment ghi "realtime, không cache" — cần xác nhận với user rằng face pile trễ tối đa 60s là chấp nhận được.

## B3 — Storefront shop công khai

`components/journey/JourneyShopStorefront.tsx:666–710` fetch `mat-hang` + `quay/sap-co-mat` mỗi lần xem shop.

Cache theo key `slug`, TTL 45s. **Ràng buộc bắt buộc:** payload `mat-hang` chứa số tồn kho, mà `/api/shop/gio-chung` PATCH sẽ từ chối với `STOCK_INSUFFICIENT`. Quy tắc:

- Được hiển thị catalog từ cache.
- **Bắt buộc force-refresh khi mở giỏ và trước khi checkout.**
- Lỗi stock từ server là nguồn sự thật cuối cùng, không bao giờ tin số trong cache.

Rủi ro trung bình → làm riêng một lượt, test kỹ ca hết hàng.

## B4 — Dedup `/api/co-so/[orgId]/khoa-hoc` (nhỏ)

Không phải bài toán chuyển trang (xem phần loại bỏ bên dưới), nhưng có một trùng lặp thật: trong **một phiên xem cùng một tổ chức**, endpoint này bị gọi tới ba lần độc lập:

| Nơi gọi | Mục đích | Neo |
|---|---|---|
| `CoSoTabKhoaHoc` | danh sách khoá học đầy đủ | `components/co-so/tabs/CoSoTabKhoaHoc.tsx:51–86` |
| `CoSoTabSanPham` | chỉ để dựng dropdown lọc | `components/co-so/tabs/CoSoTabSanPham.tsx:55–70` |
| `CoSoDetailView` | badge số đếm khi hover tab | `components/co-so/CoSoDetailView.tsx` (`khoaBadgeRequested`) |

Một cached resource key `co-so:khoa-hoc:${orgId}` TTL 120s gộp cả ba. Nhỏ, độc lập, rủi ro thấp — làm kèm khi nào tiện.

## Phân tầng dữ liệu — cái gì được cache

| Tầng | Dữ liệu | TTL |
|---|---|---|
| **Cache thoải mái** | bảng giá, nhóm phân loại, hồ sơ cửa hàng, cấu hình bán hàng, STK thanh toán, khoá học org, sự kiện org, đánh giá, `/api/meta/*` | 60s – 10 phút |
| **Cache ngắn + revalidate bắt buộc** | catalog storefront (`mat-hang`), danh sách sản phẩm kho, sidebar cộng đồng | 30–60s |
| **Chỉ stale-while-revalidate, TTL rất ngắn** | giỏ hàng, danh sách đơn, chuông thông báo, danh sách chat | 10–20s |
| **Không cache** | checkout, chi tiết đơn, khiếu nại, phí kỳ, `/api/auth/session-profile`, nội dung tin nhắn (realtime), màn admin | — |

## Không bao giờ persist xuống localStorage

Theo `CINS_DEV_RULES.md` §10:

- Bất kỳ dữ liệu nào liên quan `da_verify` / moat — org thu hồi verify mà client vẫn hiện badge cũ = **phá moat**.
- Mọi thứ chưa lọc `da_xoa`.
- Số tồn kho, giá, trạng thái đơn — dữ liệu tiền.
- Session/token (đã ở httpOnly cookie, §6).

---

# Nhánh C — Không phải cache, nhưng cùng mục tiêu giảm query

## C1 — Feed thế giới: bỏ fetch gallery khi không ở chế độ gallery

`components/cins/world-journey/WorldJourneyFeed.tsx:831–834` — mỗi lần đổi bộ lọc, feed **và** gallery được fetch song song **bất kể `surfaceView` đang là gì**. Người dùng ở chế độ journey vẫn trả tiền cho nguyên một pipeline gallery không hiển thị.

Đây **không phải bài toán cache** mà là fetch có điều kiện. Trùng đúng với `PLAN_login_perf.md` §N2 (trang chủ SSR cũng fetch gallery thừa) — nên cân nhắc làm chung một lượt với plan đó.

## C2 — Gộp micro-fetch theo lô

`lib/social/use-ket-ban-status.ts`, `components/journey/JourneyFollowButton.tsx`, `home-adaptive/OrgFollowButton.tsx` fetch **một lần cho mỗi nút** hiển thị. Trang feed 20 thẻ = 20 request riêng lẻ.

Cần endpoint nhận danh sách id, trả trạng thái theo lô → **thiết kế API mới**, tách hẳn khỏi nhánh B.

## C3 — Thống nhất 8 module cache

Di trú dần sang primitive B0. Không gấp, không làm thành session riêng.

---

## Đã kiểm tra và quyết định KHÔNG làm

Ghi lại để lần sau không ai đề xuất lại.

### Tab tổ chức công khai (`/co-so/[slug]`, `/studio/[slug]`)

Nghi vấn: fetch lại mỗi lần đổi tab. **Sai.**

Tab **không** dùng điều hướng Next. `lib/to-chuc/use-co-so-tab-nav.ts:63–86` đổi URL bằng `history.pushState`, và `components/co-so/CoSoDetailView.tsx:84–135,225–237` giữ tab đã xem trong `mountedTabs`, ẩn bằng `hidden={!isActive}` chứ không unmount.

Nghĩa là: fetch **lần đầu vào tab**, sau đó bấm qua lại **không tốn request nào**. Studio dùng cùng pattern (`components/to-chuc/StudioDetailView.tsx`).

Cache ở đây chỉ giúp khi F5 hoặc sang tổ chức khác — lợi ích nhỏ, không đáng. Phần duy nhất còn giá trị là dedup ba nơi gọi `khoa-hoc` → đã tách thành B4.

### `/api/link/og`

Nghi vấn: không có cache, gọi lại cho mỗi thẻ link. **Sai hoàn toàn.** Có cache ở **cả hai đầu**:

- Client: `components/cins/ChatLinkOgCard.tsx:14–20,155–163` (Map cấp module, versioned key `v7`); `components/cins/board/NodeCard.tsx:180,233–234` (Map riêng).
- Server: `app/api/link/og/route.ts:14–22,68–79` — Map trong bộ nhớ, TTL 30 phút, tối đa 200 entry, kèm `Cache-Control: private, max-age=3600`.

Khe hở duy nhất còn lại là `ChatExternalVideoBlock` fetch OG lấy tiêu đề video mà không qua cache client. Quá nhỏ, không đáng một mục.

### Feed thế giới mất SSR seed

Nghi vấn: lần đầu vào trang chủ client fetch lại dù đã có SSR. **Sai.** `WorldJourneyFeed.tsx:398–413,804–808` có `skipInitialFilterFetchRef` bỏ qua lần chạy đầu, và `:540–570` còn đồng bộ lại props SSR khi bộ lọc ở mặc định.

Phần thực sự lãng phí là fetch gallery thừa → đã tách thành C1.

### Cache theo tổ hợp bộ lọc feed

Cân nhắc rồi bỏ. Không gian tổ hợp `source × linhVuc` lớn, dữ liệu feed đổi liên tục, và bảng xếp hạng phía server đã có `unstable_cache` ở bản `...ForApi`. Cache client thêm ở đây rủi ro hiển thị bài cũ cao hơn lợi ích.

---

## Thứ tự đề xuất

| Bước | Việc | Nhánh | Rủi ro | Kỳ vọng |
|---|---|---|---|---|
| 1 | TTL + inflight dedup trong `prefetchChatThreads` | A1 | Thấp | Cắt phần lớn request toàn cục — **rẻ nhất, lợi nhất** |
| 2 | Primitive `lib/client-cache.ts` + registry xoá khi logout | B0 | Thấp | Nền cho các bước sau; bịt lỗ bảo mật §10 |
| 3 | Kho hàng: `san-pham` / `bang-gia` / `nhom` | B1 | Thấp | Bỏ 3 round-trip mỗi lần quay lại Kho |
| 4 | Cộng đồng `sidebar-live` | B2 | Thấp | Bỏ API nặng vừa mỗi lần remount |
| 5 | Bỏ fetch gallery khi không ở chế độ gallery | C1 | Thấp | Cắt một pipeline nặng khỏi đường mặc định |
| 6 | Dedup `khoa-hoc` ba nơi gọi | B4 | Thấp | Nhỏ, tiện tay |
| 7 | Nới poll cuộc gọi đến | A2 | **TB** — đụng UX cuộc gọi | Giảm tải lớn nhất, nhưng cần user quyết độ trễ |
| 8 | Storefront `mat-hang` | B3 | TB — dính tồn kho | Mượt luồng người mua |
| 9 | Gộp micro-fetch theo lô | C2 | TB — API mới | Bỏ N request/trang |

Đề xuất làm **1 → 2 → 3 → 4** trước: rủi ro thấp, không đụng auth, không đụng realtime, không đổi logic query Supabase.

Mỗi bước là **một session riêng**, không gộp (`CINS_DEV_RULES.md` §1).

## Cần đo trước và sau

Plan này dựa trên đọc code, **chưa có số thật**. Trước bước 1:

1. DevTools → Network, mở một trang bất kỳ sau đăng nhập, để yên 5 phút → đếm request tới `/api/chat/threads`, `/api/chat/rooms/*/messages`, `/api/chat/calls/incoming`. Đây là con số biện minh cho bước 1 và 7.
2. Vào `/ban-hang/kho` → `/ban-hang/don` → quay lại Kho, đếm request lặp.
3. Vào `/cong-dong/[slug]`, mở chi tiết sự kiện, quay lại, đếm `sidebar-live`.
4. Supabase Dashboard → Logs: số query/phút với N user online, trước và sau bước 1.

Không có nhóm 1 và 4 thì không biết bước 7 đáng đi tới đâu.

## Không đụng tới

- Logic query Supabase (cột select, filter, join, RLS) — chỉ đổi *khi nào* gọi, không đổi *gọi cái gì*.
- Cấu trúc data trả về cho client component.
- Realtime chat, presence, read cursors.
- Luồng auth / OAuth (`app/auth/callback/route.ts`).
- **Không thêm thư viện** (TanStack Query / SWR). `CINS_DEV_RULES.md` §5 có gợi ý, nhưng §1 cấm tự ý thêm dependency và pattern hiện tại đã bao phủ đủ. Chỉ tính đến khi số key cache vượt ~12.
- 8 module cache cũ — để nguyên, di trú dần (C3).
- Tab tổ chức, `/api/link/og`, SSR seed feed — đã kiểm tra, không cần sửa.
