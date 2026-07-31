# PLAN: Giảm độ trễ vào phòng Meeting Realtime (Cloudflare RealtimeKit)

Ngày: 31/07/2026 · Dựa trên scan codebase (Phần A–D)  
Trạng thái: **Bước 0–6 đã implement** (2026-07-31). Còn Bước 7: đo lại trên thiết bị thật và điền bảng nghiệm thu.

## Bối cảnh đã xác định

Repo **không** tự viết lớp SFU REST Cloudflare Calls. PeerConnection / ICE / publish-subscribe track do SDK `@cloudflare/realtimekit` (nền Dyte). **Trickle ICE** và vòng `tracks/new` **ngoài phạm vi**.

Nguyên nhân chính (code app): chuỗi tuần tự vào phòng:

```
bấm gọi
  └─ await fetch(token)                    ← chặn mọi thứ phía sau
       └─ mount + dynamic import chunk
            └─ await initMeeting()
                 └─ await join()
                      └─ await enableAudio()
                           └─ await enableVideo()
                                └─ phase = "live"
```

Mục tiêu: song song hóa + chuẩn bị trước khi user bấm nút.

File neo:

| Vai trò | Path |
|---|---|
| UI join / media | `components/media/PhongHocMeeting.tsx` |
| Caller start | `components/cins/CinsChatOverlay.tsx`, `CinsChatFloatingStack.tsx` |
| Callee chuông | `components/cins/ChatIncomingCallHost.tsx` |
| Token API | `app/api/chat/rooms/[roomId]/phong-hoc/token/route.ts` |
| Provider | `lib/media/provider.ts`, `lib/media/cloudflare-realtimekit.ts` |

---

## Database

- **Không ALTER** ở Bước 0–2, 4–5, 7.
- **Bước 3.1** (tạo meeting sớm): dùng bảng hiện có `media_phong_hop` nếu đủ cột; nếu cần cột mới → **báo và chờ xác nhận** trước ALTER.
- **Bước 3.3** (token trong chuông): ưu tiên bảng/cột riêng + RLS chỉ callee đọc; **không** nhúng token vào `noi_dung` công khai nếu chưa chốt bảo mật. Schema mới → chờ xác nhận.

## API

| Bước | Thay đổi |
|---|---|
| 0 | `Server-Timing` (hoặc tương đương) trên `POST .../phong-hoc/token`: gate, ensure meeting, create participant |
| 3.1 | Tạo meeting khi tạo phòng chat (+ job backfill); giữ `ensureCloudflareMeetingForRoom` fallback |
| 3.3 | Phát hành authToken callee kèm tín hiệu chuông; TTL ngắn; fallback fetch `action:"join"` khi hết hạn |
| 6 | Có thể giãn poll `/api/chat/calls/incoming` nếu Realtime ổn |

## Frontend

| Bước | Thay đổi |
|---|---|
| 0 | `lib/media/call-trace.ts` + cắm mốc T0…T7 (không đổi logic) |
| 1 | `defaults` audio/video theo mode; bỏ `enableAudio`/`enableVideo` sau `join` |
| 2 | `initMedia()` warm (hover nút gọi / mở phòng); module `lib/media/media-warm.ts`; stop track khi rời |
| 3.2 | Prefetch dynamic chunk `PhongHocMeeting` khi mở chat |
| 4 | Mở `catch` rỗng → log + UI lỗi đọc được |
| 5 | Tách `joined` vs `connected`; timer chỉ từ `connected` |
| 6 | Kiểm tra subscribe Realtime lúc app start vs chỉ khi mở chat |

## Implementation steps (1 PR / bước)

### Bước 0 — Đo trước (BẮT BUỘC)

Chỉ thêm log. Helper `lib/media/call-trace.ts` (`performance.now()` + bảng cuối).

| Mốc | Vị trí |
|---|---|
| T0 | đầu `joinPhongHoc` — Overlay / FloatingStack |
| T0b | sau `await fetch(.../token)` |
| T0c | đầu body `PhongHocMeeting` |
| T1 | sau `getUserMedia` resolve |
| T2 | sau `await initMeeting` |
| T3 | sau `await meeting.join()` |
| T3b | sau `enableAudio` / `enableVideo` |
| T4 / T7 | `refreshRemote` lần đầu có remote track / `setHasRemoteVideo(true)` |

Server: log riêng gate / ensure meeting / participant + `Server-Timing`.

**3 kịch bản (không gộp), ≥5 lần mỗi loại**, cả phòng đã có / lần đầu `media_phong_hop`:

1. Caller: T0 → T7  
2. Callee: B nhận chuông → T7 của B  
3. Chuông: A bấm gọi → B thấy chuông  

**Cổng quyết định**

- \>50% thời gian ở **T0→T3** → làm Bước 1–5.  
- \>50% ở **T3→T7** → **DỪNG**, Phụ lục A (không làm 1–5 chỉ để gọt vài trăm ms).

### Bước 1 — Bỏ enable sau join

1. Ghi nguyên trạng `defaults` trong PR (`PhongHocMeeting` hiện: `{ audio: true, video: false }`).  
2. Video call: `{ audio: true, video: true }` (hoặc theo preview user). Audio-only: `{ audio: true, video: false }`.  
3. Xóa `await enableAudio` / `await enableVideo` khỏi đường vào phòng.  
4. Giữ toggle mic/cam lúc đang gọi.

**Nghiệm thu:** T3→T3b biến mất; T0→T7 giảm ≥ khoảng T3→T3b đo ở Bước 0.

### Bước 2 — `initMedia()` warm

- Module ngoài `PhongHocMeeting` (mount muộn).  
- Warm: hover/focus nút gọi (ưu tiên) hoặc mở phòng chat.  
- Truyền handler vào `initMeeting`; không `getUserMedia` đôi.  
- Stop track nếu không gọi (~30s / rời phòng).  
- Fallback luồng cũ nếu `initMedia` fail; test Safari/iOS gesture.

**Nghiệm thu:** T0c→T1 ≈ 0 lần gọi thứ 2+; không dialog quyền chen giữa bấm gọi (khi đã warm).

### Bước 3 — Token / chunk khỏi critical path

1. **3.1** Meeting CF sớm + backfill; fallback ensure tại chỗ. Gate ALTER nếu cần.  
2. **3.2** Prefetch chunk `PhongHocMeeting` khi mở chat.  
3. **3.3** Token callee trong tín hiệu chuông (TTL ngắn, RLS/bảng riêng ưu tiên); fallback fetch.

**Nghiệm thu:** T0→T0b giảm; callee bấm nghe → T2 ≈ 0 khi token còn hạn.

### Bước 4 — Mở catch rỗng

Log mã SDK + UI ("Không bật được camera") tại toggle / mọi `catch` media còn lại.

### Bước 5 — Ngữ nghĩa `live`

- `joined` = mình vào phòng; `connected` = có media remote (T7).  
- Timer chỉ từ `connected`.  
- Giữa chừng: avatar + “Đang chờ [tên] kết nối…”.

### Bước 6 — Đường chuông (chỉ nếu kịch bản 3 xấu)

Realtime subscribe từ app start? Nếu ổn → giãn poll (vd 5s). Nếu không ổn → sửa Realtime, không chỉ hạ chu kỳ poll.

### Bước 7 — Đo lại (cùng bộ đo Bước 0)

| Chỉ số | Trước (điền sau B0) | Mục tiêu |
|---|---|---|
| Caller T0→T7, phòng đã tồn tại | | ≤ 2.0s |
| Callee bấm nghe → T7 | | ≤ 1.5s |
| A bấm gọi → B thấy chuông | | ≤ 0.5s |

---

## Edge cases

- Preview / audio-only vs video: `defaults` theo mode, không hardcode cam luôn bật.  
- Strict Mode remount / ERR0002 leave debounce 500ms + retry 400ms — giữ ý thức khi đo.  
- Token nhúng chuông hết hạn → fallback fetch.  
- `initMedia` bị Safari chặn ngoài gesture → fallback.  
- Phòng chưa có `media_phong_hop` → ensure tại chỗ vẫn chạy.  
- User rời chat sau warm → phải stop track (đèn cam).

## Security

- Không lộ RealtimeKit authToken rộng hơn cần thiết (Bước 3.3).  
- Callee-only đọc token (RLS / bảng riêng) nếu lưu server-side.  
- TTL token ≤ thời gian đổ chuông + đệm.  
- Không đổi hạ tầng; không dual-SFU.  
- Mọi ALTER / bảng mới: chờ xác nhận user.

## Phụ lục A — Nếu >50% thời gian sau `join()`

1. `chrome://webrtc-internals`: SDP / ICE / candidate-pair (host vs TURN relay).  
2. Network: RTT `api.cluster.dyte.in` từ VN.  
3. Hạ `mediaConfiguration` / resolution lần đầu.  
4. Chỉ sau số liệu 1–3 mới bàn đổi hạ tầng.

## Ràng buộc thực thi

- **Một PR / bước**; PR description có số trước/sau.  
- Không gộp Bước 1–5.  
- Không sửa schema chưa được xác nhận.  
- Không đổi hạ tầng realtime trong plan này.  
- Giữ fallback: ensure meeting tại chỗ, fetch token khi nhúng hết hạn, `getUserMedia` cũ khi warm fail.  
- Bước 0 và 7 **cùng một bộ đo**.

## Thứ tự đề xuất khi user ra lệnh build

1. Bước 0 only → đo → cổng quyết định  
2. Nếu T0→T3 chiếm đa số: 1 → 2 → 3.2 → 4 → 5 (3.1 / 3.3 sau khi chốt DB/security) → 6 nếu cần → 7  
3. Nếu T3→T7 chiếm đa số: Phụ lục A, dừng 1–5
