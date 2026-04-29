# CINs Web UI Kit

Click-thru recreation of the CINs marketing/discovery site.

## Screens included

| Screen | Notes |
|--------|-------|
| **Home (Trang chủ)** | Hero panel + industry cards |
| **Hướng nghiệp · Game** | Sidebar + department tags + role cards (mirrors `Screenshot 2026-04-26 112748.png` and `…112811.png`) |
| **Hướng nghiệp · Ngành học** | Field grid (mirrors `…112715.png`) |
| **Trường Đại học** | School directory with photo + crest + badge (mirrors `…112839.png`) |
| **Bài viết · Animator** | Article header + body + keyword panel (mirrors `…112923.png` and `…112943.png`) |

## Components

| File | Component(s) |
|------|--------------|
| `TopNav.jsx` | Sticky top navigation with logo, links, search |
| `Sidebar.jsx` | Tabbed sidebar for career/field browser |
| `HeroPanel.jsx` | White card with eyebrow + h1 + body + search field + illustration |
| `Cards.jsx` | `CareerCard`, `RoleCard`, `PromoCard` |
| `SchoolCard.jsx` | University tile (photo + crest + badge + locations) |
| `Article.jsx` | `ArticleHeader`, `KeywordPanel` |

## How to run

Open `index.html`. It loads React + Babel from CDN and pulls components individually.

## What's faked

- All navigation between screens is local React state (no router).
- School photos are gradient placeholders — real campus photography should replace `.cins-school-photo-{a..f}` backgrounds.
- The "search" field doesn't actually search anything — it's a focus/hover demo.
- Mascot illustrations are reused across role cards because we only extracted four mascot crops from the brand sheet PNG. Real product has a unique illustration per role.

## What's _not_ in this kit

We did not have access to a codebase or Figma file, only the seven screenshots. Things deliberately omitted because we couldn't see them:

- Mobile layout and responsive breakpoints
- Login / signup flows for the three user types (THPT students, schools, businesses)
- Article list / blog index page
- Footer
- Any logged-in dashboards (school panel, business panel, student profile)
