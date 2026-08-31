# PLAN — UX/UI trình phát video (Reels + inline player)

Trạng thái: **đã làm đủ plan (kể cả double-tap / unmute hint / persist mute)**. Ngày scan: 2026-08-31.

## 0. Phạm vi đã scan

| Cụm | File | Dùng ở |
|---|---|---|
| **A. Reel viewer** (toàn màn hình, swipe dọc) | `components/cins/world-journey/WorldJourneyVideoFeed.tsx` (`ReelSlide`) | `view=video` + `#play=` |
| **B. Inline player** (phát tại chỗ) | `components/cins/world-journey/WorldJourneyVideoListingPlayer.tsx` + `wj-list-player.css` | listing Video, `JourneyCardVideo`, preview rail |
| **C. Vỏ / điều phối** | `WorldJourneyFeed.tsx` (`openVideoPlayer`, `closeVideoPlayer`, popstate), `lib/cins/worldJourneyVideoUrl.ts` | surface switch + URL |
| CSS | `app/world-journey-feed.css` §5107–6190 | cả A và B (B tái dùng class `.wj-reel-timeline`) |

SSOT ghi chú: state audio là **context** (`WorldJourneyFeedAudioContext`) — dùng lại, không thêm nguồn thứ hai. State `loop` hiện **không** có SoT (mỗi player một `useState`) — xem P2-1.

---

## 1. Bug đã đối chiếu (theo mức độ)

### P0 — chặn tính năng

| # | Lỗi | Bằng chứng | Hướng xử lý |
|---|---|---|---|
| 1 | **Không có đường thoát trong reel viewer.** Header (chứa tab surface) bị `hidden` khi đang phát; chỉ còn `Escape` (không có trên touch) hoặc back trình duyệt. | `WorldJourneyFeed.tsx` `<header … hidden={isVideoPlaying}>`; `.wj-reel-back` có CSS (§5312) nhưng **không component nào render** | Thêm nút icon back — mục §2 |
| 2 | **Back của `closeVideoPlayer` sai khi deep-link.** `replaceVideoPlayUrl` ghi `play` vào `history.state` mỗi lần swipe → sau 1 swipe, entry deep-link cũng có `state.play` → `closeVideoPlayer` gọi `history.back()` → **rời khỏi site**. | `worldJourneyVideoUrl.ts:56` + `WorldJourneyFeed.tsx:738` | Bỏ nhánh `history.back()`, dùng back **cấu trúc** — §2 |
| 3 | **Tap trên mobile không play/pause.** Coarse pointer chỉ bật/tắt chrome; nút play duy nhất là icon 36px trong timeline. | `ReelSlide` `onPointerUp` → `if (isCoarsePointer(e)) { …chrome…; return; }` | Tap = play/pause (chuẩn Reels); chrome hiện kèm theo pause. Giữ tap-để-ẩn-chrome chỉ khi đang phát **và** chrome đang mở |
| 4 | **Dải đáy ~54px là vùng chết cho swipe + tap.** `.wj-reel-timeline` phủ `left:0;right:0;bottom:0`, `pointer-events:auto` khi chrome mở, và nằm trong `ignoreSwipe` → swipe từ đáy lên không đổi clip, tap không play. | CSS §5744–5776; `ignoreSwipe` liệt kê `.wj-reel-timeline` | Chỉ `pointer-events:auto` cho **các control con**, không cho cả container; `ignoreSwipe` chỉ chặn khi target là `.wj-reel-timeline-scrub` / button |
| 5 | **Tab bẫy qua slide ẩn.** `.wj-reel-snap:not(.is-active)` chỉ `pointer-events:none`; nút like/comment/bookmark/share của **mọi** slide vẫn focus được bằng Tab. | CSS §5340–5353 | `inert` cho snap không active (fallback `tabIndex={-1}` cho rail + timeline) |
| 6 | **Nút tap không dùng được bằng bàn phím / screen reader.** `.wj-reel-tap` là `<button>` nhưng chỉ có `onPointerDown/Up`, không `onClick`. | `ReelSlide` JSX | Thêm `onClick` (bỏ qua khi vừa xử lý pointer) hoặc chuyển thành `div` + control thật hiển thị |

### P1 — sai layout / hiển thị

| # | Lỗi | Bằng chứng | Hướng xử lý |
|---|---|---|---|
| 7 | **Rail chồng timeline.** Rail `bottom: 52px` hardcode, timeline cao 54px (đo thực tế: rail 500→734, timeline top 732). `.wj-reel-meta` cũng `bottom: 52px`. | CSS §6154–6176; số đo user gửi | Đưa chiều cao timeline ra biến `--wj-reel-timeline-h` (đo bằng ResizeObserver hoặc chốt 56px) và dùng cho `bottom` của rail + meta |
| 8 | **"Đang tải thêm…" đè scrub bar.** `.wj-reel-loading` `bottom:16px; z-index:6` > timeline `z-index:4`. | CSS §6001 | Dời lên `bottom: calc(var(--wj-reel-timeline-h) + 12px)`, hoặc chuyển thành spinner mảnh ở đỉnh |
| 9 | **Magic `translateY(-50px)`** cho clip ngang trên mobile → video lệch khỏi tâm, lệch cả khi vào fullscreen. | CSS §6151 | Bỏ transform; căn giữa bằng `padding-bottom: var(--wj-reel-timeline-h)` trên `.wj-reel-video-box` |
| 10 | **Fullscreen chỉ bọc `article`** → rail (like/comment/share) biến mất; mobile landscape còn kèm lỗi #9. | `toggleElementFullscreen(slideRef)` với `slideRef = article.wj-reel-slide` | Fullscreen `.wj-reel-video-row` (gồm cả rail) hoặc thêm mute/like tối giản vào lớp fullscreen |
| 11 | **Timeline chật trên mobile.** 4 button 36px + text thời gian + padding → scrub còn ~166px trên viewport 432px; `.wj-reel-timeline-scrub` cao 24px (< 44px target). | CSS §5787, §5824; đo thực tế width 432 | Mobile: bỏ loop + fullscreen khỏi timeline (đưa vào rail / long-press), scrub full width **một dòng riêng**, tăng vùng chạm lên 44px (track vẫn 3px, hit area trong suốt) |
| 12 | **Mất progress khi chrome tự ẩn** (3.2s) — không còn tín hiệu tiến độ nào. | `revealChrome` timeout 3200 | Giữ 1 line progress 2px luôn hiện (opacity thấp), chrome đầy đủ mới ẩn |

### P2 — nhất quán / hành vi

| # | Lỗi | Bằng chứng | Hướng xử lý |
|---|---|---|---|
| 13 | **Trùng nút mute:** timeline có mute, rail có `.wj-reel-audio` (2 style khác nhau, cùng state). | `ReelSlide` §900 và §1049 | Giữ **một** — đề xuất: rail (chuẩn Reels), bỏ khỏi timeline mobile; desktop giữ trong timeline |
| 14 | **`loop` không có SoT:** reel giữ ở feed, inline player giữ local `useState` → đổi ở listing không mang sang viewer (khác với `muted` đã dùng context). | `VideoFeed` `loopOn` vs `ListingPlayer` `loopOn` | Nâng `loop` vào `WorldJourneyFeedAudioContext` (đổi tên → `FeedPlaybackContext`) hoặc bỏ toggle loop ở inline player |
| 15 | **Không reset `currentTime` khi rời/quay lại slide** → xem lại clip là tiếp giữa bài. | `pauseInactive()` không seek 0 | Seek 0 khi slide rời active (giữ nguyên nếu chỉ pause tại chỗ) |
| 16 | **Không có trạng thái buffering.** Không listen `waiting`/`stalled` → khung đứng nhưng UI hiện Pause (tức "đang phát"). | danh sách `addEventListener` trong `attach()` | Thêm `waiting`/`playing` → spinner giữa khung |
| 17 | **Tap đầu sau swipe bị bỏ.** `ignoreTapUntilRef = now + 500ms` cộng thêm delay `framedId` (`WORLD_JOURNEY_TAB_PAN_MS`). | `ReelSlide` §331–336 | Giảm còn ~200ms hoặc chỉ chặn khi pointer bắt đầu **trước** lúc snap |
| 18 | **Preload phát thật 2 clip kế 3s** → tới 3 stream đồng thời, tốn băng thông mobile. | `REEL_IFRAME_PRELOAD = 2`, `REEL_WARM_SECONDS = 3` | Giảm còn 1 clip khi `navigator.connection.saveData` / `effectiveType` ≤ 3g; hoặc warm 1s |
| 19 | **Inline player: dải đáy không mở được viewer.** Timeline `is-pinned` `stopPropagation` → click bottom 44px của mỗi thumbnail không mở reel; nút play trong đó lại phát tại chỗ → 2 ngữ nghĩa lẫn nhau. | `ListingPlayer` §544–548 + `wj-list-player-hit` | Khi có `onOpenViewer`: timeline chỉ còn progress + mute (bỏ play button), hoặc thu timeline lại còn line progress |
| 20 | **Video hết + loop off:** không seek 0, UI đứng ở `0:10 / 0:10`. | `onEnded` return sớm | `onEnded` khi loop off: seek 0, `setPaused(true)` |
| 21 | **Thiếu UX Reels cơ bản:** double-tap ±10s, hint "chạm để bật tiếng" lần đầu, chỉ số "clip X/N" cho screen reader. | — | Thêm ở Phase 3 |

### P3 — code health

| # | Vấn đề | Hướng xử lý |
|---|---|---|
| 22 | `formatReelTime`, `postStreamEvent`, `toggleElementFullscreen`, `listingIframeSrc`/`streamIframeSrc` **copy 2 bản** ở A và B | Tách `lib/journey/stream-player-ui.ts` |
| 23 | Nhãn tiếng Việt hardcode ("Phát video", "Tạm dừng", "Bật phát lại", "Điều khiển video") lẫn với `t("rail.unmute")` | Đưa hết qua `useT()` |
| 24 | CSS chết: `.wj-reel-pause-badge` (§5501), `.wj-reel-back` (§5312), `.wj-reel-sentinel` (§5997) không có JSX dùng | Dùng lại (`back`, `pause-badge`) hoặc xoá |

---

## 2. Nút back icon — thiết kế

**Yêu cầu:** icon-only, quay lại **trang trên thang cấu trúc**, không phải URL trước.

### Thang cấu trúc

```
journey / shop (timeline) ─┐
gallery ───────────────────┼──▶ video listing (view=video) ──▶ reel viewer (#play=…)
rail video ────────────────┘
```

Reel viewer mở được từ 4 nơi (`openVideoPlayer`, `openGeneralVideoPlayer`, `openVideoFromRail`, `openVideoFromMilestone`) → back phải về **surface lúc mở**, không phải luôn về listing.

### Thay đổi

1. `reelSession` thêm field `openedFrom: FeedSurfaceView` (gán bằng `surfaceViewRef.current` trong `openVideoPlayer`; deep-link → `"video"`).
2. `closeVideoPlayer` viết lại: **bỏ hẳn `history.back()`** → `setReelSession(null)` + `setSurfaceView(openedFrom)` + `history.replaceState({wjView: openedFrom}, "", feedViewHref(openedFrom))`. Cache surface đã có (`timelineCacheRef` / `galleryCacheRef`) nên quay về là tức thì, đúng đường P0-2.
3. `WorldJourneyVideoFeed` nhận `onClose` (đã có) → render nút:
   - `<button type="button" className="wj-reel-back" aria-label={t("reel.back")}><ArrowLeft size={26} strokeWidth={2.2}/></button>` — chỉ icon, đặt trong `.wj-video-feed-wrap` (không trong `.wj-reel-snap`, để không bị `pointer-events:none` và không nhân bản theo slide).
   - CSS `.wj-reel-back` đã có sẵn (44×44, top/left 12, z-index 8) — chỉ cần thêm `top: calc(12px + env(safe-area-inset-top))` cho mobile và drop-shadow để nổi trên clip sáng.
4. `Escape` dùng lại cùng handler (đã trỏ `onClose`).

Không đụng `pushVideoPlayUrl` (deep-link `?play=` vẫn hoạt động); chỉ ngừng tin `history.state.play` khi đóng.

---

## 3. Các bước triển khai (đề xuất tách phase)

| Phase | Nội dung | File | Model đề xuất |
|---|---|---|---|
| **1** | Back icon + back cấu trúc (§2) — P0-1, P0-2 | `WorldJourneyVideoFeed.tsx`, `WorldJourneyFeed.tsx`, CSS `.wj-reel-back` | Grok 4.5 / Medium |
| **2** | Pointer & a11y: P0-3, P0-4, P0-5, P0-6, P2-17 | `WorldJourneyVideoFeed.tsx` + CSS timeline | Grok 4.5 / Medium |
| **3** | Layout đáy: P1-7 → P1-12 (biến `--wj-reel-timeline-h`, bỏ `translateY(-50px)`, timeline mobile 2 dòng, progress line luôn hiện) | `app/world-journey-feed.css` (+ JSX timeline) | Composer 2.5 / Low–Medium |
| **4** | Trạng thái phát: P2-15, P2-16, P2-20, P2-13, P2-14 (loop SoT) | A + B + context | Grok 4.5 / Medium |
| **5** | Inline player: P2-19 + đồng bộ với A | `WorldJourneyVideoListingPlayer.tsx`, `wj-list-player.css` | Composer 2.5 / Low |
| **6** | Code health: P3-22, P3-23, P3-24; P2-18 (tiết kiệm băng thông) | lib mới + cả 2 player | Grok 4.5 / Medium |
| **7** | Nice-to-have: P2-21 (double-tap seek, unmute hint, "clip X/N") | A | Composer 2.5 / Low |

## 4. Verify (mỗi phase)

- Mobile 432px + desktop ≥1200px, clip **dọc** và **ngang**, và clip `videoProcessing`.
- 4 đường vào viewer: listing, gallery, rail (`lockPlaylist`), milestone timeline → back về đúng surface gốc.
- Deep-link `/?view=video#play=<id>` → swipe 2 clip → back: **phải** về listing, không rời site.
- Tab-order: chỉ slide active nhận focus.
- Fullscreen vào/ra: video căn giữa, rail còn dùng được.
- `prefers-reduced-motion`, safe-area iPhone (notch + home bar).

## 5. Câu cần chốt trước khi code

1. **Mute:** giữ ở rail hay ở timeline (P2-13 / §7)? Đề xuất: rail trên mobile, timeline trên desktop.
2. **Loop:** nâng lên context dùng chung, hay bỏ toggle ở inline player (P2-14)?
3. **Tap giữa khung:** play/pause (chuẩn Reels) hay giữ "hiện chrome" như hiện tại (P0-3)?
4. **Bình luận trong reel (N2):** mở sheet overlay trên reel, hay vẫn điều hướng sang trang bài?
5. **Clip dọc 9:16 trên desktop (N5):** pillarbox 6:7 là ý đồ, hay cho fill đúng 9:16?

---

## 6. Pass 2 — lỗi tìm thêm

### N1 (P0) — Hai nút mute: state đã đồng bộ, **nhãn bị đảo**

State không hề desync — cả hai đọc `useWorldJourneyFeedAudio()` (context chung). Vấn đề là **`aria-label` của rail bị lật**:

```tsx
// rail — SAI: đang muted lại mời "Tắt tiếng tất cả video"
aria-label={muted ? t("reel.muteAll") : t("reel.hearAll")}
// timeline — ĐÚNG: đang muted thì mời "Bật tiếng"
aria-label={muted ? t("rail.unmute") : t("rail.mute")}
```

Đúng như số đo bạn gửi: cả hai `aria-pressed="false"` (⇒ `muted === true`) nhưng rail đọc "Tắt tiếng tất cả video" còn timeline đọc "Bật tiếng". Đó là lý do hai nút *trông như* hai chức năng.

Xử lý:
1. Sửa nhãn rail thành `muted ? t("reel.hearAll") : t("reel.muteAll")`.
2. **Bỏ trùng lặp** (P2-13): giữ một nút mute. Đề xuất giữ rail (chuẩn Reels, 40px, cạnh like/share), bỏ khỏi timeline ở `max-width: 780px`; desktop giữ timeline, bỏ khỏi rail. Vừa gỡ trùng vừa nhường chỗ cho scrub (P1-11).
3. Thống nhất một cặp key i18n (`reel.muteAll` / `reel.hearAll`) cho **cả 3** player: `ReelSlide`, `WorldJourneyVideoListingPlayer:609`, `WorldJourneyVideoRail:714` (hiện dùng `rail.mute` / `rail.unmute`).

### N2 (P0) — Bình luận trong reel làm **rời trình xem**

`ReelSlide` truyền `href={sharePath}` cho `JourneyCommentLink` nhưng **không** truyền `onOpenComments`:

| Trạng thái viewer | Kết quả hiện tại |
|---|---|
| Đã đăng nhập | render `<a href>` thật → điều hướng cứng sang trang bài, **mất session reel** (còn vi phạm luật "internal navigation dùng `next/link`" — `cins-performance`) |
| Chưa đăng nhập | login prompt, sau khi vào lại **không mở gì** (không có `onOpenComments`) |

Xử lý: truyền `onOpenComments` mở **sheet overlay** trên reel (pattern đã có ở `WorldJourneyFeedTimeline:455`, `JourneyTimeline:639`, `CongDongPageClient:1400` — tái dùng, không dựng mới). Sheet phải pause video khi mở? → đề xuất **không** pause, chỉ hạ chrome.

### N3 (P1) — Rail rụng hành động khi thiếu `cotMocId`

`reactionTarget(item)` trả `null` ⇒ mất **cả** like + comment + bookmark, rail chỉ còn nút audio; không log, không placeholder. Xử lý: log dev-only + giữ layout (disabled state) thay vì biến mất.

### N4 (P1) — `useWorldJourneyFeedAudio` desync âm thầm

Hook có fallback `useState(true)` cục bộ khi **thiếu provider** → component render ngoài `WorldJourneyFeedAudioProvider` (portal, sheet, modal) sẽ có mute **riêng**, không ai biết. `muted` cũng không persist (mọi reload về muted). Xử lý: dev-warning khi thiếu provider; cân nhắc persist vào `localStorage` cùng chỗ với `loop` (P2-14).

### N5 (P2) — Clip dọc bị pillarbox trên desktop

`--reel-a: max(--wj-reel-aspect, --wj-reel-a-min)` với `a-min = 6/7` ⇒ clip 9:16 (0.5625) nhận khung 0.857 → **viền đen hai bên**. Có comment "Khung video không cao hơn 6:7" nên có thể là ý đồ → cần bạn chốt (câu 5).

### N6 (P2) — Caption không mở rộng được

`.wj-reel-caption` `-webkit-line-clamp: 3`, không có "xem thêm"; `.wj-reel-meta` là `pointer-events: none` và chỉ mở lại cho `a, button` → thẻ `<p>` không bấm được. Xử lý: caption thành `<button>` toggle clamp.

### N7 (P2) — Swipe ở đầu/cuối list im lặng

`goBy` trả `false` khi hết list: không bounce, không tín hiệu; spinner "Đang tải thêm…" lại bị timeline che (P1-8). Xử lý: rubber-band transform ngắn + đưa spinner ra khỏi vùng timeline.

### N8 (P3) — Thiếu shortcut

Chỉ có `j/k/↑/↓/PageUp/PageDown` + `Escape`. Thiếu `Space` (play/pause), `m` (mute), `f` (fullscreen) — trong khi `Space` đã hoạt động **nhưng chỉ khi** focus đang ở scrub bar.

---

## 7. Tính năng mới — icon xoay fullscreen nhanh cho clip ngang

**Điều kiện hiện:** `aspectMode === "landscape"` (H < W). Ẩn hoàn toàn với clip dọc.

Vì sao cần: trên mobile dọc, clip 16:9 chỉ chiếm một dải hẹp giữa màn hình (còn bị `translateY(-50px)` đẩy lệch — P1-9). Xoay ngang cho ảnh lớn gấp ~2.5×.

### Hành vi

1. Fullscreen **`.wj-reel-video-row`** (không phải `article`) → rail đi theo, giải quyết luôn P1-10.
2. `await screen.orientation.lock("landscape")` trong `try/catch` — API chưa dùng ở đâu trong repo, phải bọc feature-detect (`screen.orientation?.lock`).
3. Thoát fullscreen → `screen.orientation.unlock()`; hook vào listener `fullscreenchange` đã có sẵn trong `ReelSlide`.
4. **iOS Safari không có** `orientation.lock`, và fullscreen cho element non-`<video>` cũng không đáng tin. Fallback: chế độ `data-reel-rotated` — `position: fixed; inset: 0; transform: rotate(90deg)` với `width/height` đảo theo viewport. Đây là đường **duy nhất** chạy trên iPhone → cần test thật trên iPhone trước khi chốt.
5. **Khóa swipe dọc** khi đang xoay/fullscreen: trục swipe đã đổi 90° → `goBy` phải bị vô hiệu, nếu không user vuốt "xuống" lại nhảy clip ngẫu nhiên. Thêm cờ `rotatedRef` vào `ignoreSwipe` + handler `wheel`.

### UI

- Icon: `RotateCw` (lucide) — **không** dùng `Maximize2` vì đã là fullscreen thường. Cân nhắc `Fullscreen` nếu muốn nhẹ nghĩa "xoay".
- Vị trí: mobile → góc **trên-phải** khung video (đối xứng với back ở trên-trái, §2), 44×44, cùng lớp chrome (ẩn/hiện theo `is-chrome`). Desktop → không cần (đã có `Maximize2`), hoặc để trong timeline.
- `aria-label`: `t("reel.rotateFullscreen")` — **key mới**, phải thêm cả `vi` và `en` trong `lib/i18n/messages.ts`.

### Bổ sung vào bảng phase (§3)

| Phase | Nội dung | File |
|---|---|---|
| **1b** | N1 — sửa nhãn mute + gộp còn một nút + thống nhất i18n key | `WorldJourneyVideoFeed.tsx`, `WorldJourneyVideoListingPlayer.tsx`, `WorldJourneyVideoRail.tsx`, `messages.ts`, CSS |
| **2b** | N2 — comment sheet trong reel (tái dùng pattern timeline) | `WorldJourneyVideoFeed.tsx` (+ vỏ `WorldJourneyFeed.tsx`) |
| **3b** | **§7 — rotate fullscreen** (gộp cùng phase layout vì chung P1-9, P1-10) | `WorldJourneyVideoFeed.tsx`, CSS, `messages.ts` |
| **4b** | N3, N4, N6, N7 | rail / context / CSS |
| **7b** | N8 — shortcut `Space`/`m`/`f` | `WorldJourneyVideoFeed.tsx` |

### Verify thêm

- Clip ngang trên iPhone Safari (fallback rotate) **và** Android Chrome (`orientation.lock`).
- Xoay → vuốt dọc: **không** được đổi clip.
- Xoay → thoát bằng nút hệ thống / gesture: orientation phải unlock, UI về đúng trạng thái.
- Đổi clip ngang → dọc trong lúc đang fullscreen: icon phải mất, không kẹt trạng thái xoay.
