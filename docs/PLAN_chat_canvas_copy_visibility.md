# PLAN — Copy/paste canvas + Private / Public

> **Chốt user 2026-08-27:** (1) paste sang board phòng chat khác (member) · (2) copy theo asset / quét chọn nhóm · (3) chỉ **admin** (owner/admin) bật Public · (4) mặc định **Private** · (5) paste **không** gắn tin nhắn gốc; gom mọi asset paste vào **1 frame nhóm** tên **«Nội dung được sao chép»**.
>
> Canvas hiện **theo phòng chat** (1 board/phòng). Copy dùng lại `url` / `noi_dung` — **không** upload CDN mới.

## 0. SSOT (trước ALTER)

| Grain | SoT hiện tại | Trùng? | Quyết định |
|---|---|---|---|
| Board meta / trạng thái sửa | `chat_canvas.trang_thai` = `active` \| `khoa` \| `an` | — | **Giữ**. `khoa` = khóa chỉnh sửa, **không** = Private/Public copy. |
| Chính sách sao chép | **Chưa có** | Không | Thêm cột riêng trên `chat_canvas` (cùng grain board, khác nghĩa `trang_thai`). |
| Node media | `chat_canvas_node.url` (delivery URL) + `noi_dung` jsonb | — | Copy = clone row fields; **không** tạo CF asset mới. |
| Nhóm trên board | Node `loai='frame'` + con `layout.groupId` = id frame; tên nhóm = `frame.noiDung` | — | Paste tạo 1 frame mới, set tên cố định. |
| Quyền phòng | `chat_thanh_vien` + `assertRoomMember` / `assertCanvasWritable` | — | Paste chỉ vào board user **được ghi**. |

**ALTER:** `chat_canvas.che_do_sao_chep text NOT NULL DEFAULT 'private'` CHECK (`private` \| `public`).  
Không nhồi vào `trang_thai`. Không dual-write.

---

## 1. Mục tiêu

1. **Copy** asset đang chọn (một hoặc nhiều; gồm cả khi quét chọn / chọn cả nhóm frame+con) — toolbar + Ctrl/Cmd+C.
2. **Paste** vào canvas phòng khác (hoặc cùng phòng) nếu user có quyền ghi — Ctrl/Cmd+V.
3. Quản lý board: **Private** (không copy) · **Public** (copy được) — chỉ **owner/admin**.
4. Copy **tái dùng URL/data cũ** — không Direct Upload / không asset CDN mới.
5. Paste: **không** gắn `id_tin_nhan`; gom toàn bộ node paste vào **một frame** tên **«Nội dung được sao chép»**.

---

## 2. Database

```sql
ALTER TABLE public.chat_canvas
  ADD COLUMN IF NOT EXISTS che_do_sao_chep text NOT NULL DEFAULT 'private';
-- CHECK (che_do_sao_chep IN ('private', 'public')) — idempotent
```

- Default **private**.
- Đổi: `canManageGroupChat` (owner/admin) — khớp câu trả lời user «admin».
- Độc lập `khoa`.

---

## 3. API

| Method | Path | Việc |
|---|---|---|
| PATCH | `/api/chat/rooms/[roomId]/canvas` | `cheDoSaoChep?: 'private' \| 'public'` — chỉ owner/admin. |
| GET | cùng route | Trả `cheDoSaoChep`. |
| POST | `/api/chat/rooms/[roomId]/canvas/nodes/paste` | Paste batch + tạo frame nhóm. |

### Clipboard payload

```ts
type CanvasClipboardPayload = {
  v: 1;
  sourceCanvasId: string;
  sourceRoomId: string;
  copiedAt: string;
  nodes: Array<{
    /** Id tạm phía nguồn — chỉ để remap connector trong payload. */
    clientKey: string;
    loai: CanvasNodeLoai;
    url: string | null;
    noiDung: string | null;
    layout: CanvasNodeLayout; // groupId/from/to theo clientKey nguồn; paste sẽ bỏ group cũ
  }>;
};
```

**Copy selection:** nếu chọn frame → gồm frame + mọi con `groupId === frame.id`. Nếu chọn một phần nhóm → chỉ các node chọn (không ép cả nhóm trừ khi user chọn frame hoặc quét đủ). Connector chỉ giữ nếu cả `from` và `to` nằm trong tập copy.

### Paste server (chốt)

1. `assertCanvasWritable(dest)`.
2. Trần: ≤50 node/lần; tổng board ≤ `MAX_CANVAS_NODES` (kể cả frame mới).
3. **Luôn** `id_tin_nhan = null` (không paste tin gốc).
4. Tạo **1 frame** mới:
   - `loai: 'frame'`
   - `noiDung: 'Nội dung được sao chép'`
   - `layout`: bbox bao quanh các node paste (+ padding), offset (+40,+40) so với bbox nguồn.
5. Insert các node asset (không insert lại frame nguồn nếu có trong clipboard — **bỏ frame nguồn**, chỉ lấy nội dung con / asset; nếu selection chỉ có asset không frame thì vẫn tạo frame đích).
6. Mọi node paste (trừ frame đích vừa tạo): `layout.groupId = idFrameMoi`.
7. Remap connector `from`/`to` theo map `clientKey → id mới`; bỏ connector orphan.
8. `url` / `noi_dung` **giữ nguyên** — không upload CF.

### Copy gate

- Source `che_do_sao_chep === 'public'` mới cho copy.
- Private → disable + toast.
- Paste không cần đích Public.

---

## 4. Frontend

### Toolbar

1. Owner/admin: **Private | Public**.
2. **Copy** khi Public + có selection.
3. Paste: CINs clipboard → API paste; else ảnh OS như cũ.

### `CinsBoard`

- Ctrl/Cmd+C / V như trên.
- Selection bar: nút Copy cạnh gom nhóm (khi Public).

### Hằng tên nhóm paste

```ts
export const CANVAS_PASTE_GROUP_NAME = "Nội dung được sao chép";
```

---

## 5. Media delete hazard

Phase 1: trước `deleteCloudflareImage`, đếm `chat_canvas_node` cùng `url` (canvas-only). Chỉ xóa CF khi count = 0 sau delete.

---

## 6. Steps

| Step | Nội dung |
|---|---|
| **1** | Migration + types + GET/PATCH `cheDoSaoChep` |
| **2** | `POST .../nodes/paste` (frame nhóm + clear tin + remap) |
| **3** | Toolbar Private/Public + Copy; CinsBoard Ctrl+C/V |
| **4** | Refcount CF delete |
| **5** | DECISIONS + verify |

---

## 7. Edge Cases

| Tình huống | Xử lý |
|---|---|
| Copy 1 ảnh | Paste → frame «Nội dung được sao chép» + 1 ảnh con |
| Copy frame nguồn + con | Bỏ frame nguồn; paste con vào frame tên cố định mới |
| Copy lẫn connector | Remap; orphan bỏ |
| Private | Không copy |
| `khoa` đích | Không paste |
| Trùng URL nhiều board | Refcount §5 |

---

## 8. Security

- Public ≠ public internet — chỉ member phòng đọc board; Public = cho phép copy.
- Đổi chế độ: owner/admin only.
- Paste: auth + writable đích.

---

## 9. Quyết định đã chốt

| # | Chốt |
|---|---|
| 1 | Đích = board **phòng chat khác** (user là member) |
| 2 | Copy theo **asset** hoặc **quét/chọn nhóm** |
| 3 | Bật Public: **admin** (owner/admin phòng **nhóm**) |
| 4 | Default: **Private** (nhóm); chat **1-1** luôn **Public**, không UI |
| 5 | Paste: **không** `id_tin_nhan`; gom vào 1 group frame tên **«Nội dung được sao chép»** |

---

## 10. Verify

- [x] Migration `che_do_sao_chep` đã chạy CINs (`npm run migrate:chat-canvas-che-do-sao-chep`, 2026-08-27).
- [ ] Private → không copy.
- [ ] Public → copy selection / group → phòng khác → paste → 1 frame đúng tên + asset, cùng URL (không upload).
- [ ] Không có `id_tin_nhan` trên node paste.
- [ ] Xóa ảnh board A không gãy board B cùng URL.
- [ ] Chỉ admin đổi Private/Public; F5 giữ.
- [ ] Paste rồi F5 — vị trí trong frame không lệch (layout tương đối).
