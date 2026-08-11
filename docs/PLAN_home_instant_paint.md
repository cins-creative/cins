# PLAN: Trang chủ — thấy nội dung feed ngay (instant paint)

Ngày: 12/08/2026 · Dựa trên scan `app/page.tsx` + `HomeWorldJourneyMain` + `WorldJourneyFeed` + `PLAN_login_perf` / `PLAN_client_cache` / `CINS_DEV_RULES` §8–§10  
Trạng thái: **Chưa implement** — chỉ plan.

Xuất phát từ: *«header / feed trang chủ nên lưu localhost để vừa vào là thấy nội dung, không bị cảm giác load»*.

---

## Kết luận đi trước

**Không dùng localStorage (cũng không IndexedDB ở phase đầu) để “cứu” cảm giác load.**

Cảm giác load khi vừa vào `/` (F5 / mở tab / soft-nav lại trang chủ) đến từ **server chặn paint feed**, không phải từ thiếu snapshot client. Cache RAM trong phiên đã có; khoảng trống còn lại là **lần vào nguội / RSC render**.

| Ý tưởng | Quyết định | Vì sao |
|---|---|---|
| localStorage snapshot feed | **Không làm** | §10: chuyển trang mượt = RAM; feed có `da_verify` / `da_xoa` — persist như sự thật = phá moat. Payload lớn + sync main thread. Paint từ LS cần JS hydrate — thường **sau** HTML SSR. |
| IndexedDB stale-while-revalidate | **Chỉ phase cuối, sau đo** | §10 cho phép data lớn SWR, nhưng chỉ khi bước server vẫn chậm. Key theo user + clear logout + UI “đang cập nhật”. |
| Tách feed khỏi `Promise.all` 7 nhánh | **Làm trước** | Đúng §8; feed không chờ layout/capabilities/promos/linhVuc. |
| SSR dùng cùng `unstable_cache` ranked như API | **Làm sau tách stream** | `PLAN_login_perf` N3 / bước 5 — vẫn đúng: RSC path chỉ `cache()` React (1 request), API path có TTL 20s. |
| bfcache khi Back | **Đo rồi quyết** | `force-dynamic` → thường `Cache-Control: no-store` → Chrome chặn bfcache. |

---

## Hiện trạng (đã kiểm chứng code)

### Đã có (không làm lại)

| Việc | Neo | Ghi chú |
|---|---|---|
| Shell + Suspense skeleton ngoài | `app/page.tsx` + `HomeWorldJourneySkeleton` | `PLAN_login_perf` bước 1 |
| `app/loading.tsx` | tồn tại | Segment fallback |
| Gallery SSR chỉ khi `?view=gallery\|video` | `HomeWorldJourneyMain` props | `PLAN_login_perf` bước 2 / `PLAN_wj_gallery_perf` |
| Module sidebar stream từng khối | `renderHomeModules` + `Suspense` / module | Comment: “feed hiện ngay, từng khối stream sau” — **chỉ đúng cho module, không đúng cho feed** |
| Cache RAM đổi tab trong phiên | `timelineCacheRef` / `galleryCacheRef` trong `WorldJourneyFeed` | Peek-revalidate khi đổi surface |
| Skip fetch filter lần đầu (SSR seed) | `skipInitialFilterFetchRef` | `PLAN_client_cache` đã loại nghi vấn “mất SSR seed” |
| Ranked feed API có `unstable_cache` 20s | `fetchWorldJourneyFeedRankedForApi` · `WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC = 20` | Chỉ path API |

### Còn đúng là nút thắt

```
getCurrentSessionAndProfile (page)     → TTFB document
  └─ Suspense → HomeWorldJourneySkeleton
       └─ HomeWorldJourneyMain
            └─ Promise.all([
                 fetchOwnerBySlug,
                 listLinhVucForHub,
                 fetchWorldJourneyFeedPageCached,   ← feed
                 loadFeedInlinePromos,
                 gallery? (chỉ khi view),
                 loadHomeLayoutRaw,
                 loadHomeCapabilities,
               ])
                 └─ mới mount WorldJourneyFeed + milestones
```

**Nhánh chậm nhất trong 7 quyết định lúc user thấy bài đầu.** Feed đã xong sớm vẫn đứng chờ layout / capabilities / linhVuc / promos / owner.

`fetchWorldJourneyFeedPageCached` (SSR) gọi `fetchWorldJourneyFeedRankedCached` = `cache(buildWorldJourneyFeedRanked)` — **chỉ dedupe trong một RSC request**, không TTL qua request. Mỗi F5 nguội = rebuild ranked pool.

`wj-feed-header` chỉ tồn tại **sau** khi Main resolve — không phải chỗ gắn cache.

---

## File neo

| Vai trò | Path |
|---|---|
| Entry + Suspense ngoài | `app/page.tsx` |
| Orchestrator (Promise.all) | `components/cins/home-v2/HomeWorldJourneyMain.tsx` |
| Client feed | `components/cins/world-journey/WorldJourneyFeed.tsx` |
| Client wrapper layout edit | `components/cins/home-v2/HomeWorldJourneyClient.tsx` |
| Skeleton ngoài | `components/cins/home-v2/HomeWorldJourney.skeleton.tsx` |
| Pipeline feed | `lib/cins/worldJourneyFeedFetch.ts` |
| Hằng TTL ranked | `lib/cins/worldJourneyFeedConstants.ts` |
| Module stream | `components/cins/home-adaptive/HomeModuleColumn.tsx` |
| Luật | `docs/CINS_DEV_RULES.md` §8 (streaming), §10 (persist) |
| Plan liên quan | `docs/PLAN_login_perf.md` (bước 3–5 còn treo một phần), `docs/PLAN_client_cache.md` (đã loại localStorage feed) |

---

# Database

Không đổi schema / RLS / cột. Chỉ đổi *khi nào* gọi fetch đã có.

---

# API

Không endpoint mới ở phase 1–3.

- Path SSR trang chủ: tái dùng / nối `unstable_cache` ranked đã có trên path API (cùng key `world-journey-feed-ranked` + `viewerId`, `revalidate: 20`).
- Invalidate: giữ cơ chế hiện có (TTL ngắn). Không tự thêm tag cascade trừ khi đã có pattern invalidate bài đăng → feed (nếu chưa có: chấp nhận stale ≤20s; ghi rõ trong Edge).

---

# Frontend

## Mục tiêu UX

1. Sau shell: **cột giữa có bài (hoặc skeleton khớp layout) sớm nhất có thể** — không chờ sidebar module / capabilities.
2. Đổi tab trong phiên: giữ hành vi hiện tại (RAM cache).
3. F5 lần 2 trong cửa sổ TTL: server phục vụ ranked đã cache → paint nhanh hơn, không cần snapshot browser.
4. Back/forward: nếu bfcache mở được → restore tức thì không RSC lại.

## Không làm trên UI

- Không nhồi feed vào localStorage / sessionStorage.
- Không đổi visual language header / tab bar.
- Không gộp plan + build gallery/video trong session này.

---

# Steps (mỗi bước = một session implement)

## Bước 0 — Đo baseline (bắt buộc trước khi code)

DevTools → Network (Disable cache) + Performance, user đã login, F5 `/`:

| Metric | Cách lấy |
|---|---|
| TTFB document `/` | Timing document |
| Thời gian skeleton ngoài sống | Từ first paint skeleton → first paint có thẻ bài / `wj-feed-header` |
| Thời gian từng nhánh Main | Log tạm `console.time` quanh 7 await trong `HomeWorldJourneyMain` (xóa sau đo) |
| Soft-nav `/` từ trang khác | So với F5 |
| Back từ `/p/...` về `/` | Application → Back/forward cache: restored hay blocked (lý do) |

**Ngưỡng quyết định:**

- Skeleton feed < ~400ms trên mạng ấm → có thể chỉ polish skeleton + bfcache; không mở IndexedDB.
- Skeleton / wait > ~1s và nhánh không-feed chiếm phần lớn → ưu tiên Bước 1.
- Ranked rebuild > ~800ms khi miss cache → Bước 2 đáng làm ngay sau Bước 1.

Ghi số vào cuối file này (mục “Nhật ký đo”) trước khi merge code.

## Bước 1 — Tách feed khỏi cổng `Promise.all` (đòn bẩy chính)

**Ý:** Page / Main không `await` hết rồi mới render `WorldJourneyFeed`. Feed + identity tối thiểu stream riêng; phần còn lại Suspense độc lập.

Hướng cấu trúc (khớp §8, không bắt buộc đúng tên file):

```
app/page.tsx
  CinsShell
    Suspense fallback=HomeWorldJourneySkeleton
      HomeWorldJourneyShell (session đã có từ page hoặc tự lấy)
        ├─ Suspense fallback=feed skeleton (khớp cột giữa)
        │    HomeWorldJourneyFeedServer   ← owner tối thiểu + feedPage (+ gallery nếu view)
        └─ (layout/capabilities có thể fetch trong boundary sidebar hoặc feed client nhận layout sau)
```

Chi tiết thiết kế cần chốt khi implement (một trong hai, ưu tiên ít đụng props):

**Phương án A (khuyến nghị):** Tách async SC:

1. `HomeWorldJourneyFeedBlock` — `fetchOwnerBySlug` (hoặc chỉ dùng session profile nếu đủ sidebar) + `fetchWorldJourneyFeedPageCached` (+ gallery/video/shop theo `searchParams`). Render `HomeWorldJourneyClient` / `WorldJourneyFeed` với `milestones` thật; `moduleNodes` vẫn là element chưa resolve như hiện tại.
2. Layout + capabilities: fetch **trong** boundary riêng hoặc trong cùng FeedBlock nhưng **sau** khi đã bắt đầu render feed — **không** để chúng nằm cùng `Promise.all` với feed.

Nếu `HomeWorldJourneyClient` bắt buộc `layoutLeft/Right/…` đồng bộ: tách provider layout thành Suspense con (skeleton cột trái/phải giữ `HomeAsideSkeleton`), feed giữa không chờ.

**Phương án B (nhẹ hơn, nếu A quá lớn):** Trong `HomeWorldJourneyMain`, bỏ `Promise.all` phẳng — `await` feed (+ owner) trước, `return` JSX; các promise layout/capabilities/linhVuc/promos truyền xuống child async qua Suspense. Cùng ý §8, ít file mới hơn.

**Ràng buộc:**

- Không đổi logic `buildWorldJourneyFeedRanked` / filter / RLS.
- Giữ `skipInitialFilterFetchRef` / SSR seed.
- `?view=gallery|video|shop` vẫn SSR đúng surface.
- Edit layout (`?tuy-chinh=1`) không regress.

**Kỳ vọng:** Thời gian “thấy bài đầu” ≈ max(session, owner?, feed) thay vì max(cả 7).

**Rủi ro:** Thấp–TB — đụng wiring home-adaptive (layout props). Test kỹ edit mode + soft refresh sau lưu layout.

## Bước 2 — SSR trang chủ dùng `unstable_cache` ranked như API

**Ý:** `fetchWorldJourneyFeedPageCached` (mode RSC) gọi cùng lớp cache với `fetchWorldJourneyFeedRankedForApi` (key + `revalidate: 20`), vẫn bọc `cache()` React để dedupe trong request.

- Không invent TTL mới — dùng `WORLD_JOURNEY_FEED_RANK_REVALIDATE_SEC`.
- Wide pool (`ranked-wide`) cùng pattern nếu SSR/shop cần.
- Ghi chú stale ≤20s chấp nhận được cho trang chủ (feed ranking), không phải moat verify badge như sự thật offline.

**Kỳ vọng:** F5 lần 2 trong 20s rẻ rõ; lần đầu sau deploy / hết hạn vẫn đúng chi phí cũ nhưng Bước 1 đã che cảm nhận.

**Rủi ro:** TB — §8 nói “không tự thêm cache trừ yêu cầu riêng”; đây là **nối cache đã có** (`PLAN_login_perf` bước 5). Cần xác nhận không double-build khác key.

**Không làm trong bước này:** client IndexedDB; đổi page size; prefetch gallery.

## Bước 3 — bfcache / Cache-Control document

**Ý:** Đo Bước 0 — nếu Back bị block vì `no-store`:

1. Xác định header thực tế response `/` (CF Workers / OpenNext).
2. Đánh giá có thể nới `Cache-Control` cho document HTML **mà vẫn** `force-dynamic` data đúng user không (thường khó với personal feed).
3. Nếu không nới được: chấp nhận; dựa Bước 1–2. Không hack localStorage để giả bfcache.

**Rủi ro:** TB nếu đụng header CDN — chỉ làm khi đo chứng minh Back là pain chính.

## Bước 4 — Skeleton cột giữa content-aware (rẻ, song song được)

`HomeWorldJourneySkeleton` hiện 2 card thô, lệch nhịp header + composer + bài thật → cảm giác “đang chờ” nặng hơn latency thật.

- Match: chiều cao gần `wj-feed-header`, ô composer, 1–2 `j-milestone` (avatar tròn, media aspect).
- Token §4 / §8 — không peach, không layout shift lớn khi swap.

**Rủi ro:** Thấp. Có thể làm cùng session Bước 1 nếu diff nhỏ; không thay thế Bước 1.

## Bước 5 — (Chỉ nếu còn chậm sau 1–2) IndexedDB SWR snapshot

**Điều kiện mở:** Sau Bước 1–2, skeleton/wait feed vẫn > ~800ms trên mạng ấm theo số đo lại.

**Thiết kế tối thiểu:**

| Hạng mục | Quy tắc |
|---|---|
| Store | IndexedDB (không localStorage) |
| Key | theo `viewerProfileId` + surface mặc định `journey` |
| Payload | trang đầu milestones đã serialize (cùng shape props), `savedAt` |
| TTL | ngắn (vd 60–120s) — chỉ cầu nối paint |
| UI | hiện snapshot + `aria-busy` / class revalidating; **thay ngay** khi RSC/hydration props về |
| Moat | không tin `da_verify` từ snapshot như sự thật; nếu hiển thị badge từ cache phải kèm trạng thái cập nhật hoặc bỏ badge trong snapshot |
| Logout | xóa store (`clearAllClientCaches` / registry §10) |
| Filter | chỉ default filter/source; không cache mọi tổ hợp (đã loại trong `PLAN_client_cache`) |

**Rủi ro:** TB — phức tạp + dễ lệch với SSR seed. Mặc định **không làm** trong sprint này.

---

# Edge cases

| Case | Xử lý |
|---|---|
| Guest `/` | Không đụng — `GuestHomePage` riêng |
| `giai_doan === null` | Giữ `redirect("/onboarding")` trước feed |
| `?view=gallery\|video\|shop` | FeedBlock SSR đúng surface; không blank rồi fetch |
| User đăng bài rồi F5 trong TTL ranked | Stale ≤20s OK; compose pin RAM + first-impression session vẫn áp |
| Org thu hồi verify trong cửa sổ cache | TTL ngắn; không persist client dài; không phục vụ moat từ IDB như sự thật |
| Đổi account trên cùng máy | Clear cache ranked theo user (TTL + key viewerId); IDB nếu có phải clear logout |
| Edit layout | Feed không chờ layout; cột sidebar skeleton đến khi layout+modules sẵn |
| Soft-nav trong SPA | Module RAM / RSC payload — Bước 1 vẫn giúp vì Main không còn cổng 7 nhánh |

---

# Security

- Không đưa session/token vào storage.
- Không persist feed dài hạn như nguồn sự thật (§10 moat + `da_xoa`).
- `unstable_cache` key **bắt buộc** có `viewerId` — không cache chung một ranked cho mọi user.
- Service role trong pipeline feed: giữ nguyên; không lộ sang client thêm field.

---

# Thứ tự & phạm vi session

| Bước | Việc | Rủi ro | Phụ thuộc |
|---|---|---|---|
| 0 | Đo baseline + bfcache | — | Trước mọi PR |
| 1 | Tách stream feed khỏi Promise.all | Thấp–TB | 0 |
| 2 | SSR = `unstable_cache` ranked như API | TB | 1 khuyến nghị trước (để cảm nhận rõ) |
| 3 | bfcache / headers (nếu đo cần) | TB | 0 |
| 4 | Skeleton cột giữa | Thấp | song song 1 |
| 5 | IndexedDB SWR | TB | chỉ khi 1–2 chưa đủ |

Mỗi bước một session / PR (`DEV_RULES` §1). Không gộp 1+2+5.

## Không đụng tới

- Logic query Supabase ranked / filter / visibility.
- localStorage feed (đã loại).
- TanStack Query / SWR library mới.
- Auth OAuth / middleware `getUser` (thuộc `PLAN_login_perf` bước 6–7).
- Pipeline gallery nặng (đã có `PLAN_wj_gallery_perf`).
- Đổi TTL 20s trừ khi đo chứng minh cần.

---

# Verify (sau mỗi bước)

1. F5 `/` (Disable cache): ghi lại TTFB + thời điểm thấy bài đầu — so baseline.
2. Soft-nav từ `/cua-hang` → `/`: feed không đứng skeleton lâu hơn baseline sau Bước 1.
3. `?view=gallery` / `video` / `shop`: nội dung đúng, không regress blank.
4. Đăng xuất / đăng nhập user khác: không thấy bài user trước (đặc biệt nếu làm Bước 5).
5. Slow 3G: shell + skeleton khớp; feed stream trước sidebar module.
6. (Bước 2) F5 hai lần trong 20s: lần 2 nhanh hơn rõ trên log ranked / Network.
7. (Bước 3) Back về `/`: DevTools bfcache status.

---

# Nhật ký đo

_(Điền trước khi implement)_

| Lần đo | Máy / mạng | TTFB `/` | Skeleton → bài đầu | Nhánh chậm nhất (Main) | bfcache Back | Ghi chú |
|---|---|---|---|---|---|---|
| | | | | | | |

---

# Liên kết plan cũ

- `PLAN_login_perf.md`: bước 1–2 đã ship; bước 3 (tách Suspense) **mới làm một phần** (modules); plan này hoàn thiện phần **feed không chờ Promise.all** + bước 5 cache ranked SSR.
- `PLAN_client_cache.md`: đã **loại** cache client theo tổ hợp filter feed và khẳng định localStorage không đúng — plan này giữ nguyên quyết định đó.
