# CINs Design System

> **Brand:** CINs — Visual Creative Industries connection platform
> **Tagline (working):** _Khám phá ngành sáng tạo thị giác tại Việt Nam_
> **Primary user:** Vietnamese high-school students (THPT) exploring careers in visual creative fields.

---

## What is CINs?

CINs là một **platform kết nối** trong lĩnh vực sáng tạo thị giác — bao gồm Phim, Game, Điện ảnh, Kiến trúc, Thời trang, Thiết kế.

Nền tảng phục vụ **3 nhóm đối tượng**:

1. **Học sinh THPT** — tìm thông tin nghề nghiệp & thông tin các trường đại học đào tạo ngành sáng tạo thị giác.
2. **Cơ sở đào tạo** (universities, training centers) — tìm học viên tiềm năng.
3. **Doanh nghiệp** (studios, agencies) — tìm ứng viên đã được định hướng nghề từ sớm.

CINs sits at the intersection of **education discovery** and **career mapping** for one of Vietnam's fastest-growing creative sectors.

---

## Sources used to build this system

This design system is reverse-engineered from the following materials supplied by the brand owner:

| File | What it shows |
|------|---------------|
| `uploads/Screenshot 2026-04-26 112035.png` | **Brand sheet** — logo, mascot palette, color tokens, fonts, pattern rules |
| `uploads/Screenshot 2026-04-26 112715.png` | Career discovery page — career grid, sidebar nav |
| `uploads/Screenshot 2026-04-26 112748.png` | Career detail page — Game industry overview |
| `uploads/Screenshot 2026-04-26 112811.png` | Sub-career listing — Game design roles, mascot illustrations |
| `uploads/Screenshot 2026-04-26 112839.png` | Universities directory — school cards |
| `uploads/Screenshot 2026-04-26 112923.png` | Article page — Animator profile with sidebar |
| `uploads/Screenshot 2026-04-26 112943.png` | Article body — content with iconography |

> Live site appears to be built in **Webflow** (per the "Made in Webflow" badge).
> No codebase or Figma file was provided. Visual recreation is based on screenshots + brand sheet only — values like exact spacing should be considered _good approximations_, not pixel-true.

---

## Index — files in this system

Quick map of what lives where (full tree below):

- **`README.md`** — this file. Brand overview, content + visual foundations.
- **`SKILL.md`** — entry point for using this folder as an Agent Skill in Claude Code.
- **`colors_and_type.css`** — the foundation: CSS vars + semantic type classes. Import first.
- **`assets/`** — raster brand assets (logo, 4 mascots, 4 pattern shapes, 4 career illustrations, gamepad illustration, promo card, brand sheet reference).
- **`preview/`** — small specimen cards rendered in the Design System tab (logo, colors, type, radii, shadows, spacing, components).
- **`ui_kits/web/`** — interactive recreation of the marketing/discovery website + per-component JSX (TopNav, Sidebar, HeroPanel, Cards, SchoolCard, Article).
- **`screenshots/`** — verification screenshots taken while building.

```
/
├── README.md                  ← you are here
├── SKILL.md                   ← Agent Skills entrypoint (Claude Code compatible)
├── colors_and_type.css        ← color + typography CSS tokens (use this as foundation)
│
├── assets/                    ← logos, mascots, illustrations, patterns
│   ├── logo-cins.png
│   ├── mascot-{artist|technical-artist|manager|supporter}.png
│   ├── pattern-{circle|pill|roundsquare|blob}.png
│   ├── career-illustration-{1..4}.png
│   ├── illustration-gamepad.png
│   ├── promo-game-card.png
│   └── brand-sheet-reference.png
│
├── preview/                   ← design-system-tab cards (small specimens)
│
└── ui_kits/
    └── web/                   ← CINs marketing/discovery website
        ├── README.md
        ├── index.html         ← interactive click-thru of the site
        └── *.jsx              ← per-component recreations
```

---

## Content fundamentals

### Language

- **Vietnamese-first.** All copy is in Vietnamese. Diacritics matter — use a font with full Vietnamese coverage (Be Vietnam Pro is mandatory).
- English loanwords are accepted and common for industry terms: _Animator, Game Designer, Keyframe, Color Theory, Frame rate, Digital Marketing, VFX, UX, UI._ Don't translate them.
- Mixed sentences are normal: _"Animator là người thổi hồn vào nhân vật…"_

### Tone of voice

- **Friendly, optimistic, encouraging** — the audience is teenagers picking their future. Speak like a slightly older cousin who works in the industry, not like a brochure.
- **Inclusive "bạn"** (you, casual) — never the formal _quý vị_ or _quý khách_.
- **Action verbs in nav and CTAs:** _Khám phá_ (Explore), _Tìm_ (Find), _Xem ngay_ (See now), _Góp ý_ (Suggest).
- **Curiosity-led headlines** — pose the role as a question or invitation:
  - _"Animator là ai?"_
  - _"Khám phá ngành học tại Việt Nam"_
  - _"Khám phá ngành công nghiệp Game"_
- **No hype words.** Avoid "revolutionary", "amazing", "thay đổi cuộc đời". The brand earns trust by being matter-of-fact about what each role actually does day-to-day.

### Casing

- **Sentence case everywhere.** Nav items, buttons, headings — never ALL CAPS, never Title Case For Every Word.
  - ✅ _"Trường Đại học"_  ❌ _"Trường Đại Học"_  ❌ _"TRƯỜNG ĐẠI HỌC"_
- Proper nouns and acronyms keep their case: _Game, VFX, UX, CINs._
- The brand mark **"CINs"** uses a lowercase _s_ — preserve this exact spelling.

### Microcopy patterns

| Surface | Example |
|---------|---------|
| Search placeholder | _"Nhập tên ngành học mà bạn quan tâm"_ |
| Empty / encourage feedback | _"Góp ý vị trí khác"_, _"Góp ý nội dung"_ |
| Section eyebrow | _"Khám phá"_, _"Lĩnh vực"_, _"Bộ phận"_ |
| Label/Tag | _"Mã ngành: 7210403"_, _"Mã trường: KTS"_, _"Công lập" / "Dân lập"_ |
| Article meta | _"May 14, 2025"_ — international format, English month names OK |

### Emoji & icons in copy

- **No emoji in body or UI copy.** The mascots carry the personality — copy stays clean.
- Unicode chevrons (`›`, `❯`) and arrow triangles (▸) appear as visual list markers between mascots and roles on the brand sheet — these are decorative only, not in running text.

---

## Visual foundations

### Colors

CINs uses **one strong primary** + **a quartet of mascot-tied accents**, each accent owned by one of the four character archetypes.

| Token | Hex | Used for |
|-------|-----|----------|
| `--cins-blue` | `#1F74C9` | Logo, page titles, links, primary CTA, brand-defining moments |

> **Logo placement rule:** the CINs logo must **only** be placed on a white background. Never on the lavender-grey page chrome, never on a brand-color tint, never on photography. If you need it on a non-white surface, give it a white card/box first.
| `--cins-yellow` | `#FDE859` | Artist mascot · highlight blocks · sun motifs |
| `--cins-mint` | `#6EFEC0` | Supporter mascot · success · refresh accents |
| `--cins-orange` | `#FFB85C` | Manager mascot · warmth · CTA badge |
| `--cins-violet` | `#BB89F8` | Technical Artist mascot · creativity · keyword tags |

Plus the soft `*-soft` tints for backgrounds, and a neutral ramp from `--neutral-0` to `--neutral-900`. Body text follows the brand sheet rule: **"Black 50%–60%"** — softened, never pure black. Encoded as `--ink-title` / `--ink-body`.

### Typography

| Family | Role |
|--------|------|
| **Anton** | Decorative display titles only. Heavy, condensed. Use sparingly — a poster headline, a one-word section label. |
| **Be Vietnam Pro** | Everything else. Titles, body, captions. Vietnamese-first by design. |

The brand sheet originally mentioned _Quicksand_ for body, but the actual screenshots use **Be Vietnam Pro** consistently — we follow the screenshots as ground truth.

Type scale lives in `colors_and_type.css`.

### Backgrounds

- **Lavender-grey base** (`#F4F5F8`) — the page chrome color across every screen.
- **White cards on top** with soft rounded corners and a 1px hairline border. No heavy shadows.
- **Confetti splat patterns** appear behind hero areas — abstract orange + yellow blobs at low opacity, never noisy. Treat them as accents anchored to one corner.
- No full-bleed photography in the marketing surface. University cards are the only place real photos appear (campus photography in a 16:9 frame at the top of each card).
- No gradients in body UI. Gradients are forbidden — the brand reads "flat illustrated", not "tech SaaS".

### Illustration style

- Hand-drawn, sketchy line illustrations on white with **muted halftone color washes** (yellow, orange, pink, mint splotches behind the line work).
- Mascots are little egg-shaped characters in the four accent colors, often paired with a tool of their trade (computer, gamepad, clapperboard).
- Use real PNG illustrations — **never substitute with emoji or hand-drawn SVG.** Placeholder boxes are preferred over fake illustrations.

### Shape language ("Pattern" rules from brand sheet)

The brand sheet explicitly names the allowed shapes:

> _"Hoạ tiết chủ đạo sẽ là bo góc, guidline hình ảnh không nên & hạn chế có góc nhọn. Giữ yếu tố này hoặc sáng tạo thêm để lên KV."_

Translation: **rounded corners are mandatory; avoid sharp corners.** The four sanctioned shape primitives are:

1. **Bo góc** — rounded square
2. **Hình tròn** — circle
3. **Hình bo góc** — pill / capsule
4. **Hình tự do bo góc** — free-form blob with rounded edges

This is the system: every container, every decorative blob, every sticker. No 90° corners anywhere visible.

### Borders & cards

- Cards: `1px solid var(--border)` + `border-radius: var(--radius-lg)` (20px) + `shadow-sm`.
- Active/selected states swap to `2px solid var(--cins-blue)` with no fill change — see the active "Nghề nghiệp" / "Ngành học" tabs.
- Buttons & inputs use the **pill** radius (`--radius-pill`) by default.

### Shadows

Soft and short — CINs is not a Material Design product.

```
--shadow-xs: 0 1px 2px rgba(15,23,42,.04);
--shadow-sm: 0 2px 6px rgba(15,23,42,.06);
--shadow-md: 0 6px 16px rgba(15,23,42,.08);
--shadow-pop: 0 8px 0 rgba(31,116,201,.18);  /* sticker-style flat lift */
```

`--shadow-pop` is the playful one — a flat colored offset shadow for the rare "look at this!" element (homepage promo cards, feature stickers). Use sparingly.

### Animation & interaction

- **Hover:** subtle — drop a card by 2px (`translateY(-2px)`), add `shadow-md`. Buttons darken 8% (use `--cins-blue-dark`).
- **Press:** scale 0.98 + remove the hover lift. No color change.
- **Easing:** `cubic-bezier(0.2, 0.7, 0.3, 1)` for everything — soft ease-out, ~180ms duration.
- **No bounces** on UI elements; bouncy easing is reserved for mascot reveals/onboarding moments.
- **No fade-only transitions** — always combine with a tiny translate to feel intentional.

### Layout

- 12-column grid, max content width **1200px**, gutter **24px**.
- **Sidebar + content** is the primary layout pattern (career browser, articles).
- **Sticky top nav** at 64px height — never scrolls away.
- Sections separated by ample whitespace (`--space-16` to `--space-20`), not dividers.

### Transparency & blur

- Almost never. CINs is opaque and confident.
- The one exception: the floating promo card on careers homepage uses a slight white-on-pattern composition, but it's still solid — the pattern just bleeds in from outside the card.

### Imagery vibe

- **Warm but clean.** Yellow-leaning rather than blue-leaning whites. Slight cream tint behind illustrations.
- **No grain, no film stock simulation.** Crisp digital line art.
- **No black-and-white.** Always at least one color accent visible.

---

## Iconography

See the dedicated **Iconography** section below; the short version: CINs **does not have a custom icon system** — it leans on **mascot illustrations** as its iconography.

For UI affordances (search, chevron, dropdown arrow), the website uses simple **outlined neutral icons** at ~16–20px. We substitute **Lucide** (CDN) as the closest match — same stroke weight (1.5–2px), rounded line caps, neutral grey color (`--neutral-500`).

### Iconography

- **Mascots are the primary "icons"** for content categories (Artist / Technical Artist / Manager / Supporter, plus per-role illustrations).
- **UI chrome icons** (search magnifier, chevron-down on dropdowns, arrow on links) are simple outlined glyphs at 16–20px. Stroke weight 1.5–2px. Color: `var(--neutral-500)` default, `var(--cins-blue)` on active.
- **No emoji, no unicode-as-icon.** If we need a glyph and there's no illustration for it, fall back to Lucide.
- **Bullet markers in articles** use a small filled blue triangle (▸) — see the Animator article screenshot.

**Substitution flag:** No icon font was provided. We use **Lucide via CDN** (`https://unpkg.com/lucide@latest`) for all chrome icons. If the CINs team has a custom icon set, please share it and we'll swap it in.

---

## Font substitution flag

The brand sheet specifies **Anton** and **Be Vietnam Pro** — both are available on Google Fonts and we load them directly. No substitution needed.

The brand sheet inconsistently names a third font (_"Quicksand"_ in one paragraph) but every screenshot uses Be Vietnam Pro for body. We follow the screenshots. If Quicksand should actually be used somewhere, please clarify.

---

## How to use this system

1. **Tokens** — import `colors_and_type.css` at the top of any page. All vars cascade from `:root`.
2. **Components** — pick from `ui_kits/web/` and adapt. Components are intentionally minimal-functionality (cosmetic only).
3. **Assets** — pull from `assets/`. Never redraw a mascot or illustration — placeholder if missing.
4. **New screens** — follow the layout rules above (sidebar + content, white cards on lavender-grey, rounded everything, soft shadows).

---

## Open questions / things to verify

- [ ] Confirm **Quicksand vs Be Vietnam Pro** for body — brand sheet contradicts screenshots.
- [ ] Source the **original mascot SVGs** (we extracted them from the brand sheet PNG, lossy).
- [ ] Confirm whether **CINs has a custom icon set** or relies on Lucide-style stock icons.
- [ ] Is there a **mobile design** anywhere? All screenshots are desktop. Need mobile reference to extend.
- [ ] Are **dark mode** mocks anywhere? Current system is light-only.
