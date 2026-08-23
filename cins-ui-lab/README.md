# CINs UI Lab

Sandbox **UI-only** tách khỏi web CINs chính (`app/`, `lib/`, `components/`) và khỏi `cins-creative/`.

Dùng để visual-fork + redesign dần. Khi ổn mới port về web chính theo yêu cầu riêng.

## Chạy

```bash
cd cins-ui-lab
npm install
npm run dev
```

Mở **http://localhost:3003**

## Ranh giới

| Được | Không được |
|---|---|
| Copy CSS / markup presentation | Import từ `@/` của web chính |
| Fixtures + `useState` | Supabase, API route thật, upload CF |
| Port 3003 | Sửa code web chính trong phase lab |

## Chrome lab

Thanh trên cùng (không có trên production):

- Nav các lát cắt (Home đã có; còn lại placeholder)
- Toggle **Guest / Logged-in**
- Select `giai_doan` → persona HỌC/LÀM/DẠY (khi logged-in)

## LOGIC_TOUCH

Mọi chỗ UI cần data/auth/API/permission thật được đánh dấu **3 lớp**:

1. Comment `// LOGIC_TOUCH: id` trong code
2. Registry [`LOGIC_TOUCHPOINTS.md`](./LOGIC_TOUCHPOINTS.md)
3. Index đầu mỗi page

Khi build UI phát hiện touchpoint mới → ghi registry + báo trong chat.

## Lát cắt

1. Scaffold + **Home** (đang có)
2. Gallery/feed
3. Journey/profile
4. Entity
5. Studio/portfolio
6. Chat
7. Login/onboarding (có stub interactive tối thiểu)
