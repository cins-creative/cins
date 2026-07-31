# cins-ops

Plugin vận hành ngày-ngày cho **CINs Creative** — cấu trúc theo [Anthropic knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (skills + slash commands + optional MCP).

## Install (one-liner)

```bash
claude plugin marketplace add "C:/Users/TheTrung/Projects/CINs Creative" && claude plugin install cins-ops@cins-creative-plugins
```

Chi tiết / Cursor junction: [INSTALL.md](./INSTALL.md).

## Commands

| Slash (Claude Code) | Việc |
|---|---|
| `/cins:brainstorm` | Diverge → cluster → converge → lưu `docs/ops/brainstorms/` |
| `/cins:decide` | Chốt quyết định + hỏi confirm nơi ghi |
| `/cins:standup` | Standup daily hoặc weekly |
| `/cins:recall` | Nhớ lại DECISIONS / ops / Graphiti `[CINS]` |

> Prefix plugin có thể hiện là `/cins-ops:brainstorm` tùy phiên bản Claude — cùng file `commands/brainstorm.md`.

## Skills (auto)

| Skill | Vai trò |
|---|---|
| `cins-context` | Ngữ cảnh sản phẩm — đọc docs repo, không bịa |
| `cins-brainstorming` | Workflow brainstorm đầy đủ |
| `cins-decide` | Decision log |
| `cins-standup` | Standup daily/weekly |
| `ops-cadence` | Nhịp vận hành (bổ sung standup) |
| `cins-recall` | Tra cứu trí nhớ / docs |

## Artifacts

- Brainstorms: `../docs/ops/brainstorms/`
- Ops decisions nhẹ: `../docs/ops/decisions/`
- Product decisions: `../docs/CINS_DECISIONS.md` (sau confirm)

## Mẫu brainstorm

```
You: /cins:brainstorm O13 — có nên chuyển Gallery sang engagement-weighted không?
Claude: [Frame mode assumption-testing / strategy]
Claude: [Diverge vài hướng: giữ thời gian thực, hybrid, chỉ cohort…]
Claude: [Cluster → converge top 2 + riskiest assumption]
Claude: [Ghi docs/ops/brainstorms/2026-07-14-gallery-rank.md]
Claude: Muốn /cins:decide để đóng hoặc cập nhật điều kiện O13 không?
```
