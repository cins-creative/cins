---
name: cins-standup
description: >
  Standup hoặc báo cáo tuần CINs: shipped / in progress / blockers / quyết định cần /
  next. Dùng khi /cins:standup, /cins:weekly, "hôm nay làm gì", status report nội bộ.
---

# CINs Standup / Weekly

## Chế độ

| Argument / tín hiệu | Mode |
|---|---|
| (trống) / hôm nay / standup | **daily** — cực ngắn |
| weekly / tuần | **weekly** — thêm rủi ro + quyết định cần |

## Output daily

```markdown
## Standup — YYYY-MM-DD

### Hôm qua / gần đây
- …

### Hôm nay
- …

### Blocker
- … (hoặc "không")

### Cần quyết định
- … (link OPEN trong CINS_DECISIONS nếu có)
```

## Output weekly

Thêm:

- **Status:** 🟢 / 🟡 / 🔴 (+ 1 câu)
- **Wins** (2–4)
- **Risks** (impact + mitigation)
- **Priorities tuần tới** (tối đa 3)

## Nguồn kéo (không bịa)

1. Git log / PR / branch gần đây nếu có trong workspace
2. `docs/CINS_DECISIONS.md` OPEN
3. Brainstorm mới trong `docs/ops/brainstorms/`
4. User paste notes

Thiếu data → hỏi 1 câu hoặc đánh dấu `TBD` — không invent KPI.
