---
name: cins-context
description: >
  Ngữ cảnh sản phẩm và quy ước làm việc CINs Creative. Dùng khi làm việc trong repo CINs,
  hỏi "CINs là gì", cần định vị sản phẩm, stack, Supabase project, hoặc trước mọi thao tác
  schema/ops. Không bịa brand facts — luôn trỏ về docs trong repo.
---

# CINs Creative — company / product context

## Đọc trước (source of truth trong repo)

Thứ tự ưu tiên khi xung đột:

1. **DB thật** (Supabase MCP / `information_schema`) — cấu trúc bảng/cột
2. [`docs/CINS_FOUNDATIONS.md`](../../../docs/CINS_FOUNDATIONS.md) — triết lý + quy tắc kiến trúc
3. [`docs/CINS_DECISIONS.md`](../../../docs/CINS_DECISIONS.md) — đã chốt / OPEN
4. [`docs/CINS_IMPLEMENTATION.md`](../../../docs/CINS_IMPLEMENTATION.md) — API, lib, env
5. [`docs/CINS_DEV_RULES.md`](../../../docs/CINS_DEV_RULES.md) — security / perf / UI
6. Router: [`docs/CINS_INSTRUCTION.md`](../../../docs/CINS_INSTRUCTION.md) · [`AGENTS.md`](../../../AGENTS.md)

## Bản chất sản phẩm (tóm tắt — không thay docs)

CINs là **mạng xã hội chuyên môn** cho ngành sáng tạo Việt Nam — không phải job board thuần, Behance một chiều, feed thuật toán toàn cục, hay LMS.

Ba tầng: **Portfolio / Journey** · **Entity lens** · **Canonical knowledge**. Verify quan hệ là moat; curator nội dung là trục riêng.

## Stack & boundary

| Mảng | Fact từ repo |
|---|---|
| App | Next.js App Router (frontend repo này) |
| DB | Supabase project **`ospzzzxcomrmhqrnkoiw`** |
| Deploy | Cloudflare Workers / OpenNext (xem IMPLEMENTATION) |
| Ngôn ngữ agent | Tiếng Việt cho hội thoại & copy user-facing; English cho term kỹ thuật |

**Cấm:** ghi Sine Art Supabase (`qfiumxtvnbvwdcxjnqzb` / v1 deprecated). Seed partner Sine Art ≠ project DB Sine Art.

Widget liên quan có thể ở repo `cins-widget` — xem `docs/CINS_WIDGET.md` nếu task chạm widget.

## Quy ước hội thoại (FOUNDATIONS)

- Quyết định lớn → confirm từng bước; hỏi cập nhật file docs trước khi ghi.
- "sao cũng được" = agent tự quyết trong phạm vi an toàn.
- "khoan sửa" = defer, không sửa code.
- Review 1 sample trước bulk.
- Trả lời ngắn; push back có reasoning.

## Ops artifact paths

| Loại | Path |
|---|---|
| Brainstorm writes | `docs/ops/brainstorms/YYYY-MM-DD-<slug>.md` |
| Ops decision notes | `docs/ops/decisions/` (nhẹ) hoặc merge `CINS_DECISIONS.md` sau confirm |
| Memory label | `[CINS]` + Preference / Decision / Procedure |

## Related plugin skills

- `cins-brainstorming` — brainstorm có cấu trúc
- `cins-decide` — chốt quyết định
- `cins-standup` — standup / weekly
- `ops-cadence` — nhịp day/week ops
- `cins-recall` — nhớ lại quyết định / context
