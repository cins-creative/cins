# Rive architecture notes — hướng build editor animation CINS

> Nghiên cứu từ tài liệu công khai `rive.app/docs` + runtime MIT (`rive-runtime`, `rive-rs`).  
> **Không** sao chép editor Rive (closed-source). Mục tiêu: hiểu nguyên lý để tự thiết kế editor riêng.  
> Ngày: 2026-07-14 · Nguồn research: `_research/rive-runtime`, `_research/rive-rs`

---

## 0. Bối cảnh CINS

CINS **đã playback** `.riv` qua `@rive-app/react-canvas` + WASM self-host (`lib/cins/rive-runtime.ts`).  
Bước tiếp theo nếu làm editor: **author** scene/timeline/SM rồi export format riêng (hoặc sau này emit `.riv` nếu cần tương thích).  
Runtime Rive = **player**. Editor = **author** graph mà player hiểu.

Desktop moodboard (Tauri) có sẵn pattern Rive lite — tham chiếu **riêng**, không merge code vào website: [`CINS_WIDGET.md`](./CINS_WIDGET.md).

---

## 1. Mô hình dữ liệu lõi (học từ Rive)

### 1.1 Ba lớp tách biệt

| Lớp | Vai trò | Rive gọi là |
|-----|---------|-------------|
| **Scene graph** | Cây đối tượng có transform, shape, draw order | Artboard → Component/Node/Shape… |
| **Timelines** | Keyframe theo thời gian ghi lên property | LinearAnimation → KeyedObject → KeyedProperty → KeyFrame |
| **Orchestration** | Chọn timeline nào chạy, khi nào chuyển | StateMachine (layers, states, transitions, inputs) |

Tất cả đi vào **một file xuất** (Rive: `.riv` binary). Runtime chỉ deserialize → advance → apply → draw.

### 1.2 Artboard = root scene

Theo docs + runtime:

- Mỗi file ≥ 1 artboard; artboard = kích thước scene, fill, origin, layout root.
- Hierarchy: object phẳng trong bảng `m_Objects[]` (index = id); quan hệ cây qua `parentId`.
- Artboard index 0; resolve parent ở `onAddedDirty` rồi `addChild`.

**Cho CINS editor:** một artboard MVP là đủ. Stage + hierarchy tree + inspector properties.

### 1.3 Animation = id + property key + keyframes

Rive **không** animate bằng string path kiểu `"Group/Icon.x"`. Binding ổn định:

```
LinearAnimation
  └─ KeyedObject (objectId → Core trong artboard)
       └─ KeyedProperty (propertyKey số nguyên → setter schema)
            └─ KeyFrame[] (time + value + interpolation)
```

Schema nguồn: `dev/defs/*.json` → codegen (`include/rive/generated/`).  
Ví dụ: Node `x` = property key `13` (ổn định across runtimes).

Timeline UI (docs): one-shot / loop / ping-pong; duration; speed; snap keys; key trên property khi đổi stage/inspector.

**Cho CINS:** schema property typed + `nodeId` + `propKey` + keyframes. Dễ serialize, dễ undo, không gãy khi rename.

### 1.4 Component hierarchy (rút gọn)

```
Core
 └─ Component (name, parentId)
     └─ Node (x, y, scale, rotation, …)
         └─ Shape / Group / Image / Text / …
Artboard : container root
```

Editor author: tạo node, đổi prop, ghi key.  
Runtime play: `LinearAnimation::apply(time, mix)` ghi prop → dirt graph cập nhật world matrix/path → draw.

---

## 2. State machine — hoạt động thế nào / CINS có cần không

### 2.1 Mô hình conceptual (docs)

- **State** ≈ một (hoặc blend nhiều) timeline đang chạy.
- **Transition** = path + conditions + duration/exit time + actions.
- **Layer** = SM song song (ví dụ hover + click độc lập).
- **Inputs / ViewModel:** bool, number, trigger (và data-binding hiện đại hơn qua View Models).
- States đặc biệt: Entry, Exit, Any (nhảy từ bất kỳ đâu).

Điều kiện transition: source (property/event) + operator + comparison. Nhiều condition trên 1 path = AND; nhiều path = OR.

### 2.2 Vòng advance mỗi frame (runtime)

Nguồn: `StateMachineInstance::advance` / `advanceAndApply`  
(`_research/rive-runtime/src/animation/state_machine_instance.cpp`)

```
mỗi frame (dt):
  1. advance SM (listeners, binds, mỗi layer):
       - currentState.advance(dt)          // chạy linear animation
       - apply() với mix (blend khi đang transition)
       - while updateState():              // đánh giá conditions
           chọn transition → đổi state
  2. artboard.advanceInternal(dt)          // dirt / layout / transforms
  3. artboard.updatePass()                 // giải phụ thuộc
  4. draw(renderer)                        // walk drawables → Renderer
```

Docs C++ rendering loop:

1. **Advance** — `sm->advanceAndApply(dt)`
2. **Record** — `sm->draw(&renderer)` ghi lệnh vẽ
3. **Submit** — backend flush GPU

Nên dùng fixed-timestep accumulator để playback deterministic.

### 2.3 CINS có cần SM không?

| Use case CINS | Cần SM? |
|---------------|---------|
| Logo / brand loop một clip | **Không** — linear timeline đủ |
| Button idle → hover → pressed | **Có (mỏng)** — 1 layer, 2–3 state, bool/trigger |
| Character locomotion / blend 1D health | Sau MVP |
| ViewModel / data-binding phức tạp | Sau MVP |

**Khuyến nghị:** MVP có **clip linear + play API**. Phase 2 thêm **SM 1 layer** (idle/hover/click) vì đó là điểm khác biệt sản phẩm interactive — nhưng đừng copy full Rive graph editor ngay.

---

## 3. Ranh giới “mô tả cảnh” vs “renderer”

### 3.1 Interface trừu tượng (MIT runtime)

`include/rive/renderer.hpp` — class `Renderer`:

- `save` / `restore` / `transform`
- `drawPath` / `clipPath`
- `drawImage` / `drawImageMesh`
- `modulateOpacity`

Đi kèm `Factory` tạo `RenderPath`, `RenderPaint`, `RenderImage`, gradient, buffer lúc import.

**Ý nghĩa kiến trúc:** scene graph + animation **không biết** Skia / Canvas2D / WebGL / Vello. Chỉ emit lệnh vẽ.

### 3.2 Hàm ý cho CINS

| Layer CINS | Công nghệ gợi ý |
|------------|-----------------|
| Document model + SM | TypeScript thuần (Zustand/XState optional) |
| Preview trong editor | Canvas2D hoặc PixiJS / skia-canvas |
| Playback trên web product | Có thể **tiếp tục dùng Rive runtime** cho `.riv`, **hoặc** player riêng cho format CINS |
| Không tự viết | GPU vector renderer kiểu Rive Renderer |

**Đừng** gắn model document vào Pixi sprite tree. Model là JSON/schema; renderer chỉ là adapter.

---

## 4. Định dạng `.riv` — học gì, thiết kế format CINS ra sao

### 4.1 `.riv` là gì (docs format)

Binary little-endian, tối ưu load + version:

```
Header: "RIVE" + major/minor + fileId + ToC (property backing types)
Body: stream objects
  object = coreTypeKey + [propertyKey + value]* + 0 terminator
```

- Major version không tương thích chéo (hiện runtime hiểu major 7).
- Minor: skip property/object lạ nhờ ToC → forward compatible.
- Context: object kế tiếp thuộc “latest” Artboard / LinearAnimation (ImportStack).
- Hierarchy phức tạp hơn: `parentId` = index trong artboard.

Export `.riv` = “Publish for runtime” từ editor (paid). Runtime MIT đọc được; **editor tạo `.riv` không mã nguồn mở**.

### 4.2 Gợi ý format CINS (MVP) — `.cinsanim` JSON

Học nguyên lý, **không** clone wire format:

```json
{
  "format": "cinsanim",
  "version": 1,
  "artboard": {
    "width": 400,
    "height": 400,
    "nodes": [
      {
        "id": "n1",
        "parentId": null,
        "type": "group",
        "name": "root",
        "x": 0, "y": 0, "rotation": 0, "scaleX": 1, "scaleY": 1, "opacity": 1
      },
      {
        "id": "n2",
        "parentId": "n1",
        "type": "rect",
        "name": "card",
        "x": 40, "y": 40, "width": 120, "height": 80,
        "fill": "#1a1a1a"
      }
    ]
  },
  "animations": [
    {
      "id": "idle",
      "duration": 1.0,
      "loop": "loop",
      "tracks": [
        {
          "nodeId": "n2",
          "property": "x",
          "keys": [
            { "t": 0, "v": 40, "ease": "linear" },
            { "t": 1, "v": 200, "ease": "cubic", "bezier": [0.42, 0, 0.58, 1] }
          ]
        }
      ]
    }
  ],
  "stateMachine": null
}
```

Phase 2 thêm:

```json
"stateMachine": {
  "inputs": [{ "name": "hover", "type": "bool", "default": false }],
  "layers": [{
    "states": [
      { "id": "idle", "animationId": "idle" },
      { "id": "hover", "animationId": "hoverAnim" }
    ],
    "transitions": [
      { "from": "idle", "to": "hover", "when": { "input": "hover", "eq": true }, "duration": 0.15 }
    ]
  }]
}
```

**Nguyên tắc lấy từ `.riv`:** version field; skip unknown keys; ổn định id; animation trỏ id+property; SM nằm trên clips.

Binary version sau khi JSON ổn định — không cần sớm.

---

## 5. Data binding (Rive) — ghi nhận, cắt khỏi MVP

Docs: View Models + instances + bindings nối data ↔ scene (health, colors, swap image…).

Hữu ích cho product interactive sâu. **MVP CINS:** expose vài input/trigger API từ SM/simple props là đủ. Không build ViewModel graph editor.

---

## 6. Điều Rive làm mà CINS KHÔNG cần ở MVP

| Feature Rive | Cắt? | Lý do |
|--------------|------|-------|
| Editor UI / pen / boolean ops đầy đủ | Cắt | Closed; scope lớn |
| Bones, IK, meshes, joysticks | Cắt | Character-heavy |
| Constraints phức tạp | Cắt | Có thể add sau |
| Layout flex-like + scrolling | Cắt | Dùng CSS/layout app nếu cần UI |
| Blend 1D / additive blend states | Cắt | Single clip states đủ |
| Multi-layer SM + Any/Exit phức tạp | Cắt mỏng | 1 layer |
| ViewModel / converters / lists | Cắt | |
| Scripting (Luau) + WGSL | Cắt | |
| Audio events / text runs / fonts full | Cắt hoặc tối thiểu | |
| Tự viết GPU vector renderer | Cắt | Dùng Canvas/Pixi |
| Tương thích export `.riv` | Cắt Phase 1 | Format riêng; vẫn **play** `.riv` người khác bằng runtime MIT |

**Giữ / học:** artboard + hierarchy; keyed properties; linear timeline; SM mỏng; renderer boundary; versioned file.

---

## 7. Author vs play (ranh giới sản phẩm)

| Editor phải **AUTHOR** | Runtime chỉ **PLAY** |
|------------------------|----------------------|
| Cây node + parentId + typed props | Deserialize |
| Tracks keyframe | Sample + set props |
| (Optional) SM conditions/inputs | Evaluate transitions |
| Assets, draw order | Apply + dirt + draw |
| Serialize versioned format | Skip unknown safely |
| Undo, selection, gizmos | Instance clone playback |

Runtime Rive **không** chứa UX editor — chỉ interpret graph đã bake.

`rive-rs` = FFI wrapper C++ + Vello backend; hữu ích để học API play, **không** phải kernel editor.

---

## 8. Lộ trình lát mỏng nhất — editor animation CINS

### Slice 0 — đã có
- Upload / embed / play `.riv` trên CINS (runtime npm/WASM).

### Slice 1 — “timeline toy” (1–2 tuần kỹ thuật)
1. Document JSON (`cinsanim` v1): artboard + groups/rects + 1 animation.
2. Editor canvas: chọn node, kéo move, set key tại playhead.
3. Scrub timeline + play loop (lerp/cubic).
4. Save/load JSON (Supabase/R2 giống asset Rive hiện tại).

**Done khi:** tạo rect, animate `x`/`opacity`, reload file vẫn chạy.

### Slice 2 — player product
1. `<CinsAnimPlayer src={...} />` advance/draw trên Canvas.
2. Embed trong post/journey như Rive embed hiện tại.
3. (Optional) convert preview → GIF/MP4 sau.

### Slice 3 — interactivity mỏng
1. SM 1 layer: idle ↔ hover; input bool + pointer listener.
2. Public API: `setInput('hover', true)`.

### Slice 4 — mở rộng có chọn lọc
- Image nodes, text đơn giản, more easing.
- Nhiều artboard / nested component **chỉ khi** product cần.
- Export `.riv` **chỉ nếu** bắt buộc ecosystem Rive (khó: phải implement writer schema đầy đủ).

### Chọn engine render (khuyến nghị)

| Option | Khi nào |
|--------|---------|
| **Canvas2D** | MVP nhanh nhất, đủ rect/image/path đơn giản |
| **PixiJS** | Nhiều sprite, effects, performance mid |
| **Tiếp tục Rive runtime** | Chỉ playback file designer export từ Rive — không phải editor CINS |

Cho editor CINS tự build: **Canvas2D trước**, abstract `drawFrame(scene)`, sau mới đổi Pixi nếu cần.

---

## 9. Bản đồ nguồn đã dùng

### Docs (Firecrawl map + scrape)
- Map: `https://rive.app/docs` (~400 URL)
- Trọng tâm: state-machine, transitions, states, artboards, timeline, keys, data-binding overview, `.riv` format, rendering loop, external renderer, choose renderer, exporting for runtime, getting-started

### Runtime (clone depth 1)
- `_research/rive-runtime` — C++ core + GPU renderer  
  - Parse: `src/file.cpp` (`readRuntimeObject`, `ImportStack`)  
  - SM: `src/animation/state_machine_instance.cpp`  
  - Renderer: `include/rive/renderer.hpp`  
  - Schema: `dev/defs/*.json`
- `_research/rive-rs` — Rust bindings + Vello (submodule C++)

### Giấy phép
- Runtimes: **MIT** — học nguyên lý / đọc code thoải mái; copy đoạn code vào CINS → giữ notice MIT.  
- Editor Rive: **không** OSS — không scrape khu vực login, không reverse UI.

---

## 10. Kết luận một câu

Rive = **(1) scene typed + (2) keyed timelines + (3) state machine driver** sau abstract **Renderer**.  
CINS MVP = JSON scene + timeline editor + Canvas player; SM và format binary đến sau; **không** clone editor Rive, **không** viết lại GPU renderer.

---

*Bước tiếp theo (khi bạn sẵn sàng): chốt Slice 1 thành spec kỹ thuật (schema TypeScript + UI panes + storage path trên CINS) và implement prototype.*
