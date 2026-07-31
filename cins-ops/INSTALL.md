# Cài đặt cins-ops

## Claude Code (local marketplace)

Từ thư mục repo **CINs Creative** (`C:\Users\TheTrung\Projects\CINs Creative`):

```bash
claude plugin marketplace add .
claude plugin install cins-ops@cins-creative-plugins
```

Hoặc trỏ path tuyệt đối:

```bash
claude plugin marketplace add "C:/Users/TheTrung/Projects/CINs Creative"
claude plugin install cins-ops@cins-creative-plugins
```

Một số bản CLI nhận plugin path trực tiếp:

```bash
claude plugins add "./cins-ops"
```

Sau khi cài: skills tự kích hoạt khi khớp mô tả; gõ `/cins` hoặc `/brainstorm` để thấy command.

## Cursor (agents skills)

Canonical source nằm trong `cins-ops/skills/`. Để Cursor discover:

**Cách A — junction (Windows, khuyến nghị):**

```powershell
cd "C:\Users\TheTrung\Projects\CINs Creative"
foreach ($s in @('cins-context','cins-brainstorming','cins-decide','cins-standup','ops-cadence','cins-recall')) {
  $src = Join-Path $PWD "cins-ops\skills\$s"
  $dst = Join-Path $PWD ".agents\skills\$s"
  if (-not (Test-Path $dst)) { cmd /c mklink /J "$dst" "$src" }
}
```

**Cách B:** copy thư mục skill vào `.agents/skills/` (nhớ sync khi sửa plugin).

Trong chat Cursor có thể gọi: "chạy brainstorm CINs về …" — skill `cins-brainstorming` sẽ apply; hoặc paste nội dung `commands/brainstorm.md`.

## Cowork

Add local plugin folder `cins-ops` (cùng schema Anthropic). Không cần connector.

## Verify

1. Mở chat trong repo CINs Creative  
2. `/cins:brainstorm` thử topic nhỏ  
3. Thấy file mới dưới `docs/ops/brainstorms/` khi wrap session  
