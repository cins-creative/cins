# PLAN: Tối ưu tab Gallery World Journey (query chậm)

Ngày: 2026-08-11 · Scope: tab Gallery (`WorldJourneyFilterBar` → `/api/world-journey/gallery`)
Trạng thái: **Step 0–4 đã implement** (2026-08-11). Step 5 (schema derived media) chưa — chỉ khi đo vẫn chậm + xác nhận user.

## Kết luận đi trước

Tab Gallery chậm vì **hai tầng chồng nhau**:

1. **Client:** mỗi lần vào / refresh Gallery dễ kích **hai lần** `GET /api/world-journey/gallery`, đôi khi kèm `GET /api/world-journey/feed` thừa; `filterLoading` xóa hết lưới → cảm giác “đứng hình”.
2. **Server:** mỗi request dựng **pool 120–360 ô** (nhiều query + parse `noi_dung_blocks` + co-author), rồi mới `slice` trang 36 — cold cache vẫn trả tiền full pipeline.

Ưu tiên: **UX + dedupe client trước** (cảm nhận nhanh ngay), rồi **gầy pipeline server** (TTFB thật). Không ALTER schema ở phase đầu.

---

## File neo

| Vai trò | Path |
|---|---|
| Tab + searching UI | `components/cins/world-journey/WorldJourneyFeed.tsx` |
| Grid + scroll load | `components/journey/JourneyGalleryGridView.tsx` |
| API | `app/api/world-journey/gallery/route.ts` |
| Pipeline gallery | `lib/cins/worldJourneyGalleryFetch.ts` |
| Hằng số page/pool | `lib/cins/worldJourneyFeedConstants.ts` |
| SSR chỉ khi `?view=gallery` | `components/cins/home-v2/HomeWorldJourneyMain.tsx` |
| Cache client (đã có pattern timeline) | cùng `WorldJourneyFeed` — `timelineCacheRef` |
| Plan liên quan | `PLAN_client_cache.md` (C1), `PLAN_login_perf.md` (N2) |

---

## Hiện trạng (đo bằng đọc code)

### Client — `WorldJourneyFeed`

```
click tab Gallery (hoặc tap lại tab đang active → refreshNonce)
  ├─ handleSurfaceView: có cache timeline cho journey/shop; **không** cache gallery
  ├─ effect [surfaceView, activeFilter, …]  → setFilterLoading(true) nếu không phải timeline cache
  │     → Promise.all( feed? + gallery )     ← khi gallery: vẫn có thể gọi feed nếu không phải video
  └─ effect [surfaceView] “switchedToGallery”
        → fetch gallery lần 2
```

Khi `filterLoading`:

- Thay toàn bộ lưới bằng `WorldJourneyFilterSearching` (visual + tiêu đề).
- Copy phụ `<p>Đang query lại…</p>` đã **gỡ** (2026-08-11) — giữ visual + `<b>` ngắn.

SSR: `includeGallery` chỉ true khi URL `?view=gallery`. Vào trang chủ mặc định (journey) → `galleryItems=[]` → lần đầu bấm Gallery **bắt buộc** cold fetch.

### Server — `buildWorldJourneyGalleryPool`

Mỗi lần miss `unstable_cache` (~20s revalidate):

1. Song song: friends, following users, following orgs, cộng đồng member.
2. Song song: feature rows + public rows (`POOL_LIMIT` 120 / wide 360) + cộng đồng + showcase studio + org bài đăng.
3. Load authors + meta cộng đồng.
4. Map từng row → parse blocks (`resolvePostGridEntry`) → lọc “có media”.
5. Sort theo `sortAt`, cap pool.
6. `attachSourceAuthorsToWjItems` (co-author credits thêm query).
7. Filter chip/source **in-memory** → slice page 36 → optional world-boost.

Bottleneck chính: **đọc/parse nhiều bài không lên trang đầu**, và **filter media sau khi đã kéo `noi_dung_blocks`**.

---

## Mục tiêu

| Metric | Mục tiêu (dev/staging) |
|---|---|
| Click Gallery lần 2 (đã từng mở trong session) | Hiện lưới **ngay** từ RAM; refresh nền tùy chọn |
| Click Gallery lần 1 (cold) | Không blank toàn màn; skeleton/ô cũ; 1 request gallery duy nhất |
| `GET /gallery` cold (filter=all) | Giảm TTFB rõ vs hiện tại (ưu tiên cắt pool + cắt co-author khỏi critical path) |
| Đổi filter trên Gallery | 1 request; giữ lưới cũ mờ / overlay nhẹ — không thay bằng empty searching nếu đã có rows |

---

## Database

- **Phase 1–2:** không bảng mới, không ALTER.
- **Phase 3 (chỉ nếu đo vẫn chậm — hỏi user trước):** cột derived kiểu `has_grid_media` / `media_kind` trên `content_tac_pham` (hoặc RPC SQL lọc cover/video) để filter ở DB thay vì parse JSON blocks. Ghi DECISIONS + inventory ALTER theo DEV_RULES.

---

## API

Giữ `GET /api/world-journey/gallery?offset&limit&filter&source`.

Đề xuất hành vi mới (không đổi contract JSON nếu có thể):

| Thay đổi | Chi tiết |
|---|---|
| Lean first page | Dựng đủ để trả `limit` (+ buffer nhỏ), không mặc định 360 khi chưa cần |
| Filter sớm hơn | Ưu tiên row có `cover_id` / loại media biết trước; parse blocks chỉ khi thiếu cover |
| Co-author lazy | Trang đầu có thể bỏ / trì hoãn `attachSourceAuthors` (stack góc không chặn paint) |
| Dedup cache key | Giữ `unstable_cache` theo viewer; cân nhắc tách key “lean” vs “wide/filter” rõ ràng |
| Không đổi auth | Vẫn 401 khi chưa đăng nhập |

---

## Frontend

| Thay đổi | Chi tiết |
|---|---|
| `galleryCacheRef` | Giống `timelineCacheRef`: snapshot `{ items, hasMore, nextOffset }` theo key `(filter, source)` hoặc ít nhất key mặc định |
| Một effect fetch gallery | Gộp / bỏ effect “switchedToGallery” trùng với effect filter+surface |
| Không fetch feed khi surface=gallery | Chỉ `/gallery` |
| `filterLoading` | Nếu đã có `galleryRows.length > 0` → **không** unmount grid; overlay/`aria-busy` nhẹ. Searching full-page chỉ khi chưa có ô |
| Prefetch (optional) | Idle / hover tab Gallery khi đang journey: `fetch` + seed cache |
| Searching copy | Chỉ visual + 1 dòng ngắn (đã bỏ `<p>` phụ) |

---

## Steps (một session / bước)

| Bước | Việc | Rủi ro | Kỳ vọng |
|---|---|---|---|
| **0** | Xóa copy phụ searching Gallery | Thấp | Done 2026-08-11 |
| **1** | Client: cache gallery + dedupe fetch + không gọi feed khi ở Gallery + giữ lưới khi revalidate | Thấp–TB | **Done** — `galleryCacheRef` + bỏ effect double-fetch |
| **2** | Server: lean pool trang đầu (giảm limit / early-exit khi đủ ô) + defer co-author | TB | **Done** — lean 80, skip co-author; wide 240 + co-author |
| **3** | Filter path: wide pool chỉ khi filter/source ≠ all; tránh rebuild wide khi không cần | Thấp | **Done** — giữ `galleryPageNeedsWidePool` + cache key v4 |
| **4** | Prefetch gallery khi idle trên journey | Thấp | **Done** — `requestIdleCallback` + inflight dedupe |
| **5** | (Optional) Đo EXPLAIN / thêm derived media flag — **chỉ sau xác nhận user** | Cao (schema) | Chưa |

Build brief sau này: paste plan + “chỉ Step N”.

---

## Edge cases

- Tap lại tab Gallery đang active (`reloadFromTop`): vẫn refresh; nên dùng overlay, không empty searching nếu đã có ô.
- `filter=video` / tab Video: pipeline `buildWorldJourneyVideoPool` (scan 900) — **không gộp** vào Step 1–2 Gallery; plan riêng nếu cần.
- World boost: giữ thứ tự sau filter; không để boost kéo thêm full pool nếu đã lean-page.
- Race: giữ `filterQueryEpochRef` — response cũ không ghi đè cache mới.
- Logout: không persist gallery sang localStorage; RAM theo session tab (khớp DEV_RULES §10).
- SSR `?view=gallery`: seed `galleryCacheRef` từ props lần đầu (như skipInitial cho journey).

---

## Security / performance rules

- Không cache persistent verified-moat lệch sự thật; gallery WJ là public/feature pool — RAM TTL ngắn OK.
- Service role giữ trong server fetch; API vẫn qua session.
- Không thêm `unstable_cache` layer mới trừ khi đo thiếu; ưu tiên gầy query hơn cache dày.
- Skeleton / giữ lưới > spinner trắng (`CINS_DEV_RULES` §5).

---

## Verify (sau từng bước implement)

1. Network: click Gallery 1 lần → **đúng 1** `gallery`, **0** `feed`.
2. Click Journey → Gallery lại → không chờ API mới hiện lưới (cache hit).
3. Tap refresh trên Gallery: lưới không biến mất hoàn toàn trong lúc chờ.
4. Filter «Tất cả» cold: so TTFB trước/sau Step 2.
5. Empty thật (không ô): vẫn empty state đúng, không kẹt searching.
6. Video tab / shop / journey: không regress fetch.

---

## Không làm trong plan này

- Đổi design token / layout lưới.
- Gộp Gallery với Journey personal gallery API.
- TanStack Query toàn feed (có thể phase sau; pattern `timelineCacheRef` đủ cho Step 1).
- Tự ALTER DB.
