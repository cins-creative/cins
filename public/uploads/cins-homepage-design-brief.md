# CINs Homepage — Design Brief
*Dành cho Claude hoặc designer build lại trang chủ Phase 2*

---

## 1. Bối cảnh

**CINs (cins.vn)** là nền tảng hướng nghiệp và kết nối ngành sáng tạo thị giác tại Việt Nam. Phase 1 đã xây xong thư viện thông tin (120+ vị trí nghề, 38 trường ĐH, ngành học, keyword chuyên ngành). Phase 2 bắt đầu — trang chủ mới cần phản ánh việc platform đang mở tính năng cho user tạo tài khoản và đăng nội dung.

**Stack:** Next.js 14 App Router + Supabase + Tailwind. File này là brief cho HTML/React prototype, không phải production code.

---

## 2. Target user chính

**Học sinh THPT (15–18 tuổi)** — đây là primary audience của trang chủ Phase 2.

### Tâm lý thực tế:
- Chưa biết mình thích ngành gì, cảm thấy lạc lõng khi bạn bè "có vẻ đã biết"
- Bị ảnh hưởng bởi bố mẹ muốn học ngành "ổn định" (Kinh tế, Kỹ thuật)
- Hoài nghi: *"Học vẽ/game/phim ra có sống được không?"*
- Dễ bị thu hút bởi visual đẹp, mascot/character, quiz tương tác
- Không đọc dài — scan trước, đọc sau

### Secondary audience (không phải focus của trang chủ, nhưng cần thấy cửa vào):
- Sinh viên đại học năm 1–3 muốn tạo portfolio
- Cơ sở đào tạo muốn đăng ký trường
- Doanh nghiệp/studio muốn tuyển dụng

---

## 3. Mục tiêu của trang chủ

**Primary goal:** Khiến HS THPT tạo tài khoản miễn phí (signup)

**Secondary goals:**
1. Giải toả hoài nghi "học sáng tạo ra có việc không" → dẫn vào trang nghề
2. Giới thiệu lộ trình từ "chưa biết" → portfolio → cơ hội
3. Show social proof: có cộng đồng thật, trường thật, employer thật

**Không phải mục tiêu:** Giải thích đầy đủ tất cả tính năng, liệt kê mọi thứ CINs có

---

## 4. Copywriting principles

### Ngôn ngữ đúng tone:
- Nói **nỗi lo** của HS THPT, không nói tính năng platform
- Dùng **câu hỏi**, không dùng khẳng định một chiều
- **Normalize** sự "chưa biết": đây là điều bình thường, không phải yếu kém
- Tránh corporate speak: không dùng "khám phá hành trình", "kết nối tương lai", "nền tảng toàn diện"

### Headline options (chọn 1 hoặc viết lại theo hướng này):
- *"Thích vẽ, chơi game, hay quay phim — nhưng chưa biết làm nghề gì?"*
- *"Học sáng tạo ra sống được không? Câu trả lời ở đây."*
- *"Chưa biết học gì là bình thường. CINs giúp bạn tìm ra."*
- *"Bố mẹ muốn học Kinh tế. Bạn muốn học Game. Ai đúng?"*

### Sub-headline:
Ngắn, 1–2 câu, giải thích CINs là gì mà không dùng jargon. Ví dụ:
> *"CINs tổng hợp 120+ vị trí nghề trong ngành sáng tạo thị giác — Game, Phim, Hoạt hình, Thiết kế — để bạn hiểu rõ trước khi chọn ngành."*

### Single primary CTA:
**"Khám phá ngay — miễn phí"** hoặc **"Tìm nghề phù hợp với mình"**
Chỉ 1 CTA chính xuyên suốt trang. Secondary CTA là ghost/text link.

---

## 5. Design system

### Colors
```
--cins-blue:        #1F74C9   (primary — buttons, links, headlines)
--cins-blue-dark:   #1656A0   (hover state)
--cins-blue-soft:   #E7F0FB   (backgrounds, pills)
--cins-yellow:      #FDE859   (accent — highlight, CTA on dark bg)
--cins-yellow-soft: #FFF8C9
--cins-mint:        #6EFEC0   (accent)
--cins-mint-soft:   #D9FBED
--cins-orange:      #FFB85C   (accent)
--cins-orange-soft: #FFE6C9
--cins-violet:      #BB89F8   (accent)
--cins-violet-soft: #ECDDFE
--bg-page:          #F4F5F8   (page background — lavender grey)
--surface:          #FFFFFF
--border:           #E4E6EB
--ink-primary:      rgba(0,0,0,.85)
--ink-body:         rgba(0,0,0,.60)
--ink-muted:        rgba(0,0,0,.38)
```

### Typography
- **Font chính:** Be Vietnam Pro (Google Fonts)
- **Font display:** Anton (chỉ dùng cho số lớn hoặc event title)
- Headline: weight 800, letter-spacing -0.5px
- Body: weight 400–500
- Button: weight 700
- Eyebrow/label: weight 600, lowercase, letter-spacing 0.3px
- Không dùng weight 600 cho body text

### Spacing & Radius
- Border radius: 6px (small), 10px (default), 14px (card), 20px (large card), 999px (pill)
- Section padding: 40–48px vertical
- Card padding: 20–24px
- Tất cả corners đều rounded — không có góc nhọn

### Shadows
```
--shadow-xs: 0 1px 2px rgba(15,23,42,.04)
--shadow-sm: 0 2px 6px rgba(15,23,42,.06)
--shadow-md: 0 6px 16px rgba(15,23,42,.08)
--shadow-pop: 0 6px 0 rgba(31,116,201,.20)   ← dùng cho primary buttons
```

### Buttons
- **Primary:** bg `#1F74C9`, text white, border-radius pill, shadow-pop, font-weight 700
- **Primary on dark bg:** bg `#FDE859` (yellow), text `#1F74C9`, shadow `0 6px 0 rgba(0,0,0,.18)`
- **Ghost:** border 1.5px `#1F74C9`, text `#1F74C9`, transparent bg
- **Text link:** color `#1F74C9`, no border, font-weight 600

### Mascots
4 nhân vật — dùng cho visual hero và phân loại bộ phận:
- **Artist** (màu vàng `#FDE859`) — Vẽ · Concept · Illustration
- **Technical Artist** (màu tím `#BB89F8`) — Code · Tools · Pipeline
- **Manager** (màu cam `#FFB85C`) — Producer · Lead · Strategy
- **Supporter** (màu mint `#6EFEC0`) — Coordinator · QA · Ops

Files: `assets/mascot-artist.png`, `mascot-technical-artist.png`, `mascot-manager.png`, `mascot-supporter.png`

---

## 6. Cấu trúc trang — thứ tự sections

### Section 1 — Hero Banner (full width)
- Background: dark gradient `#001F4D → #0D4A9E → #1F74C9`
- Layout: 2 cột — copy bên trái, visual bên phải
- **Trái:** eyebrow pill + headline lớn (nói nỗi lo) + sub + CTA vàng + trust pills
- **Phải:** hoặc (A) mascot picker tương tác, hoặc (B) mini cards preview nghề rotate
- Trust pills (glassmorphism): "120+ vị trí nghề" · "38 trường ĐH" · "Miễn phí"

### Section 2 — Quiz nhanh
- Tiêu đề: *"Bạn thích làm gì nhất?"*
- Chips chọn sở thích (Vẽ & thiết kế / Xem phim / Chơi game / Chụp ảnh / Lập trình / Âm nhạc)
- Kết quả tức thì: hiện gợi ý 3–5 nghề phù hợp
- CTA trong result: "Xem chi tiết nghề →" dẫn sang trang hướng nghiệp
- **Quan trọng:** Quiz phải có next step rõ ràng sau khi cho kết quả

### Section 3 — Danh sách trường đại học
- Tiêu đề: "38 trường đào tạo ngành sáng tạo thị giác"
- Filter bar: Tất cả / Công lập / Dân lập / Quốc tế / TP.HCM / Hà Nội
- Grid 6 cột, mỗi card: cover màu + logo placeholder + tên + mã trường + loại trường
- Nút "Xem tất cả 38 trường →" cuối grid

### Section 4 — Cơ sở đào tạo nổi bật (featured schools)
- 3 trường highlight dạng card ngang full width
- Mỗi card: cover ảnh/màu bên trái (fixed width ~280px) + body text giữa + stat + CTA phải
- Body: tên trường + mô tả ngắn + tags ngành
- **Thêm section cơ sở ngắn hạn** (Arena, MAAC, Telos…) — tab riêng hoặc sub-section
  - Lý do: HS THPT có thể không muốn học ĐH 4 năm, cần thấy option này

### Section 5 — Khám phá theo lĩnh vực
- 5–6 lĩnh vực: Game / Hoạt hình & VFX / Thiết kế số / Điện ảnh / Thời trang / Kiến trúc
- Mỗi card: illustration + tên lĩnh vực + số nghề
- Click → dẫn sang trang hướng nghiệp filter theo lĩnh vực

### Section 6 — Lộ trình 4 bước
- Bước 1: Khám phá nghề nghiệp ← highlight (đây là bước user đang ở)
- Bước 2: Chọn ngành & trường học
- Bước 3: Tạo portfolio cá nhân
- Bước 4: Kết nối cơ hội thực tế
- Layout ngang, có mũi tên giữa các bước

### Section 7 — Promo / Sự kiện (nếu có)
- Chỉ hiện khi có event thật (CINs FEST, Portfolio Awards, v.v.)
- Đặt ở đây — sau khi user đã hiểu CINs là gì, không phải ngay sau hero
- Slider 2–3 slides nếu cần

### Section 8 — Audience strip (3 đối tượng)
- HS THPT / Cơ sở đào tạo / Doanh nghiệp
- Mỗi card: value proposition riêng + CTA riêng
- Đặt gần cuối để không distract user chính (HS THPT)

### Section 9 — CTA đóng
- Background `#E7F0FB` (blue-soft) hoặc dark blue
- Headline ngắn, emotional: *"Bắt đầu hành trình của bạn — hoàn toàn miễn phí"*
- 1 button lớn: "Đăng ký ngay →"
- Note nhỏ: "Không cần thẻ tín dụng"

### Footer
- Logo + tagline
- 4 cột link: Khám phá / Cộng đồng / Cơ sở đào tạo / Liên hệ
- Copyright + "Made with ♥ in Vietnam"

---

## 7. Components tương tác cần có

| Component | Mô tả |
|---|---|
| Quiz chips | Click toggle on/off, kết quả cập nhật realtime |
| University filter | Filter bar lọc grid theo loại/thành phố |
| Promo slider | Auto-play + manual dots navigation |
| Mascot picker | Click chọn 1 trong 4 mascot, highlight active |
| Hero mini-cards | 4–5 cards preview nghề, hover slide effect |
| Trust pills | Glassmorphism trên dark background |

---

## 8. Những thứ KHÔNG làm

- ❌ Không để hero headline là tên/tagline platform ("Khám phá ngành sáng tạo tại Việt Nam")
- ❌ Không có quá 2 CTA cùng visual weight trên cùng một viewport
- ❌ Không đặt Promo banner ngay sau hero (user chưa hiểu CINs là gì)
- ❌ Không dùng quiz mà không có next step sau kết quả
- ❌ Không dùng màu gradient phức tạp cho card body (chỉ dùng cho hero và promo)
- ❌ Không có góc nhọn ở bất kỳ đâu
- ❌ Không dùng font-weight 600 cho body text
- ❌ Không emoji trong UI (dùng SVG icon hoặc CSS shape)

---

## 9. Assets có sẵn

```
assets/
  logo-cins.png
  mascot-artist.png
  mascot-manager.png
  mascot-supporter.png
  mascot-technical-artist.png
  career-illustration-1.png   (Phim & Điện ảnh)
  career-illustration-2.png   (Game)
  career-illustration-3.png   (Hoạt hình)
  career-illustration-4.png   (Kiến trúc & Nội thất)
  illustration-gamepad.png    (Game hero)
  promo-game-card.png         (Promo banner art)
  pattern-blob.png
  pattern-circle.png
  pattern-pill.png
  pattern-roundsquare.png

fonts/
  BeVietnamPro-Regular/Medium/SemiBold/Bold/ExtraBold.ttf
  Anton-Regular.ttf
```

---

## 10. Data mẫu cần render

### Universities (12 trường mẫu)
```js
[
  { code:'KTS', name:'ĐH Kiến trúc TP.HCM', type:'cong-lap', city:'hcm' },
  { code:'MTS', name:'ĐH Mỹ thuật TP.HCM', type:'cong-lap', city:'hcm' },
  { code:'VLU', name:'ĐH Văn Lang', type:'dan-lap', city:'hcm' },
  { code:'HSU', name:'ĐH Hoa Sen', type:'dan-lap', city:'hcm' },
  { code:'DKC', name:'ĐH Công nghệ TP.HCM', type:'dan-lap', city:'hcm' },
  { code:'RMT', name:'RMIT University Vietnam', type:'quoc-te', city:'hcm' },
  { code:'UAH', name:'ĐH Kiến trúc Hà Nội', type:'cong-lap', city:'hn' },
  { code:'MTHN', name:'ĐH Mỹ thuật Hà Nội', type:'cong-lap', city:'hn' },
  { code:'FPT', name:'ĐH FPT', type:'dan-lap', city:'hcm' },
  { code:'UEF', name:'ĐH Kinh tế Tài chính', type:'dan-lap', city:'hcm' },
  { code:'SKDK', name:'ĐH Sân khấu – Điện ảnh HN', type:'cong-lap', city:'hn' },
  { code:'DHB', name:'ĐH Quốc tế Hồng Bàng', type:'dan-lap', city:'hcm' },
]
```

### Quiz mapping
```js
{
  'Vẽ & thiết kế': ['UI/UX Designer','Graphic Designer','Illustrator','Concept Artist'],
  'Xem phim':      ['Director','Video Editor','Cinematographer','Storyboard Artist'],
  'Chơi game':     ['Game Designer','Concept Artist','3D Animator','Level Designer'],
  'Chụp ảnh':      ['Photographer','Art Director','Visual Designer'],
  'Lập trình':     ['Technical Artist','Creative Technologist','WebGL Developer'],
  'Âm nhạc':       ['Sound Designer','Music Composer','Audio Engineer'],
}
```

### Fields (lĩnh vực)
```js
[
  { name:'Phim & Điện ảnh', count:'24 nghề', img:'career-illustration-1.png' },
  { name:'Game', count:'32 nghề', img:'career-illustration-2.png' },
  { name:'Hoạt hình & VFX', count:'18 nghề', img:'career-illustration-3.png' },
  { name:'Kiến trúc & Nội thất', count:'12 nghề', img:'career-illustration-4.png' },
  { name:'Thiết kế số', count:'28 nghề', img:'career-illustration-1.png' },
]
```

---

## 11. Định dạng output mong muốn

- **Single HTML file** tự chứa (không cần server)
- React via CDN (unpkg) hoặc vanilla JS đều được
- CSS trong `<style>` tag cùng file
- Font load từ Google Fonts CDN
- Assets reference bằng relative path `assets/...`
- Có thể mở trực tiếp bằng `open index.html` trong browser

---

*Brief version 1.0 — CINs Phase 2 Homepage — April 2026*
