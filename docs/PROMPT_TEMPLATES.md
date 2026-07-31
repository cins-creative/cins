# Cursor Prompt Templates (Auto Model Selector)

**Usage:** Copy-paste these templates when briefing Cursor. Auto model selector will detect the task type.

---

## 📋 Template 1: PLANNING (Opus 5)

**When to use:** Start of a new feature, design decisions needed.

**Template:**

```markdown
PHASE 1: PLANNING
═══════════════════════════════════════════════════════

[Brief description of feature]

Design this feature, output ONLY plan (NO CODE):

Database:
- What tables do we need?
- What columns, types, relationships?
- What RLS policies?

API:
- What endpoints?
- What validation rules?
- What error cases?

Frontend:
- What components?
- What state management?
- What user flows?

Implementation:
- Step-by-step plan (1-5 steps)
- Order matters!

Edge Cases:
- What can go wrong?
- Concurrent requests?
- Invalid input handling?

Security:
- Auth required?
- Data isolation (RLS)?
- Input validation?
```

**Example (Real):**

```markdown
PHASE 1: PLANNING
═══════════════════════════════════════════════════════

Build a "Share Portfolio" feature for CINS.
When users share their portfolio, it creates a unique public link with an OG card preview.

Design this feature, output ONLY plan (NO CODE):

Database:
- Table: portfolio_shares
  - id (uuid)
  - user_id (fk → users)
  - portfolio_id (fk → portfolios)
  - url_slug (unique, e.g. "basakila")
  - og_image_url (text)
  - og_title (text)
  - created_at

RLS: Users can only see/edit their own shares

API:
- POST /api/shares → Create share
  - Input: { portfolio_id, og_title, og_image_url }
  - Validation: portfolio belongs to user
  - Output: { url, slug }
  
- GET /api/shares/[slug] → Get public share
  - No auth required
  - Output: { portfolio, metadata }

Frontend:
- Component: ShareModal
  - Props: { portfolioId, onSuccess }
  - Show: OG card preview, copy link button, share to socials

Implementation:
1. Run migration (create portfolio_shares table)
2. Build API endpoints
3. Build ShareModal component
4. Add social share buttons
5. Test OG card rendering

Edge Cases:
- Duplicate share URLs? Handle with UNIQUE constraint
- User deletes portfolio? Keep share, mark as archived
- OG preview timeout? Cache og_image_url

Security:
- Only authenticated users can create shares
- RLS: Can't access other users' shares
- Input: Validate portfolio_id ownership
```

**Expected Output:**
- 📄 Detailed plan (1-2 pages)
- 📝 No code, just architecture
- 💾 Will be saved to: `docs/PLAN_share_portfolio.md`

**Cost:** $0.10-0.30  
**Time:** 15-20s  
**Auto Model:** Opus 5 ✓

---

## 🏗️ Template 2: BUILD COMPLEX (Grok 4.5)

**When to use:** Implementing database + API after plan exists.

**Template:**

```markdown
PHASE 2: IMPLEMENTATION (Backend)
═══════════════════════════════════════════════════════

Based on plan docs/PLAN_[feature].md (pasted below):

[PASTE ENTIRE PLAN CONTENT]

───────────────────────────────────────────────────────

Implement Step [N]: [Description]

Required:
- Database migration (create table, add indexes, RLS)
- API endpoint (validation, auth, response)
- Error handling (edge cases from plan)

Follow patterns:
- Check lib/shop/don-hang.ts for transaction patterns
- Check CINS_FOUNDATIONS.md for naming conventions
- Use existing RLS patterns

Output:
- SQL migration file
- TypeScript API route
- Any service functions needed

NO frontend changes, backend only.
```

**Example (Real):**

```markdown
PHASE 2: IMPLEMENTATION (Backend)
═══════════════════════════════════════════════════════

Based on plan docs/PLAN_share_portfolio.md (pasted below):

[DATABASE section of plan]
[API section of plan]

───────────────────────────────────────────────────────

Implement Step 1-2: Database + API

Required:
- Migration: Create portfolio_shares table with RLS
- API: POST /api/portfolios/[id]/shares
  - Validate: user owns portfolio
  - Create share row
  - Return { url, slug }

Follow patterns:
- RLS pattern from portfolio table
- Error handling from don-hang.ts completeDonHang
- Input validation: check portfolio belongs to user

Output:
- SQL: migrations/[timestamp]_create_portfolio_shares.sql
- TS: app/api/portfolios/[id]/shares/route.ts
- TS: lib/portfolio/shares.ts (service functions)
```

**Expected Output:**
- 💾 Database migration (SQL)
- 🔌 API endpoint (TypeScript)
- 🛠️ Service functions (reusable logic)
- ✅ All with RLS policies

**Cost:** $0.30-0.60  
**Time:** 20-30s  
**Auto Model:** Grok 4.5 ✓

---

## 🎨 Template 3: BUILD SIMPLE (Composer 2.5)

**When to use:** Implementing UI/components after plan exists.

**Template:**

```markdown
PHASE 3: IMPLEMENTATION (Frontend)
═══════════════════════════════════════════════════════

Based on plan docs/PLAN_[feature].md (Step [N]):

[PASTE RELEVANT SECTION FROM PLAN]

───────────────────────────────────────────────────────

Build: [Component Name]

Specs:
- Purpose: [from plan]
- Props: { [list props] }
- State: [what state is needed]
- Behavior: [user interactions]

Design System:
- Use Sine_Art_Design_System folder
- Gradients: Only #f8a668→#ee5b9f (accent)
- Typography: Quicksand (body), Be Vietnam Pro (display)
- Icons: Feather only
- Responsive: Tailwind

Integration:
- API call: [endpoint from plan]
- Error handling: [from plan]
- Loading state: Show spinner

Output:
- Single React component file
- Fully responsive (mobile-first)
```

**Example (Real):**

```markdown
PHASE 3: IMPLEMENTATION (Frontend)
═══════════════════════════════════════════════════════

Based on plan docs/PLAN_share_portfolio.md (Step 4):

Frontend:
- Component: ShareModal
  - Props: { portfolioId, onSuccess }
  - Show: OG card preview, copy link button, share to socials

───────────────────────────────────────────────────────

Build: ShareModal Component

Specs:
- Purpose: Modal to create portfolio share + preview OG card
- Props: { portfolioId: string, onSuccess: () => void }
- State: { loading, ogImage, ogTitle, shareUrl }
- Behavior:
  - Show input fields for OG title + image
  - Live preview of OG card (1.91:1 aspect ratio)
  - API call on submit
  - Copy link button
  - Share to: Facebook, X, LinkedIn, Zalo

Design:
- Background: Dark (CINS theme)
- Card preview: Light background, proper fonts
- Buttons: Gradient #f8a668→#ee5b9f for primary
- Icons: Feather (facebook, twitter, linkedin, etc)
- Responsive: Mobile (full width), Desktop (modal)

Integration:
- API: POST /api/portfolios/[id]/shares
- Error: Toast notification
- Success: Close modal, call onSuccess()

Output:
- components/ShareModal.tsx (single file)
- Fully styled, fully responsive
```

**Expected Output:**
- 🎨 React component (single file)
- 📱 Fully responsive (Tailwind)
- 🎯 Works with design system

**Cost:** $0.08-0.15  
**Time:** 10-15s  
**Auto Model:** Composer 2.5 ✓

---

## 🐛 Template 4: BUG FIX (varies by scope)

### **Template 4A: Multi-File Bug (Grok 4.5)**

```markdown
BUG FIX: [Bug Name]
═══════════════════════════════════════════════════════

Problem:
- [What's broken]
- [How it manifests]
- [Impact]

Files affected:
- [file1.ts]
- [file2.ts]
- [file3.ts]

Root cause (if known):
- [Explanation]

Fix:
- [What needs to change]
- [Pattern to apply]

Verify:
- Test case 1: [scenario]
- Test case 2: [scenario]
- Check: [Pattern exists elsewhere?]
```

**Example (Real):**

```markdown
BUG FIX: Check-Then-Act Race Condition
═══════════════════════════════════════════════════════

Problem:
- SELECT status → if status ok → UPDATE row
- Race condition: between SELECT and UPDATE
- Result: Invalid state changes (e.g., double payment)

Files affected:
- lib/co-so/don-hoc-phi.ts
- lib/journey/membership-milestone.ts
- lib/journey/org-milestone-tag.ts

Root cause:
- Status check separate from UPDATE
- Concurrent requests can bypass check

Fix (pattern from lib/shop/don-hang.ts):
- Move status check INTO UPDATE WHERE clause
- Check .select("id") return to catch 0-row updates
- If array empty: status was wrong

Apply this pattern to all 3 files.

Verify:
- Test: Concurrent PUTs to same record
- Check: Any other check-then-act patterns?
```

**Cost:** $0.25-0.40  
**Auto Model:** Grok 4.5 ✓

---

### **Template 4B: Single-File Bug (Composer 2.5)**

```markdown
BUG FIX: [Bug Name]
═══════════════════════════════════════════════════════

File: [relative path]

Problem:
- [What's broken]
- [Line numbers if known]

Expected behavior:
- [What should happen]

Current behavior:
- [What's happening]

Fix:
- [Change X to Y]
- [Why this fixes it]

Test:
- How to verify the fix
```

**Example (Real):**

```markdown
BUG FIX: OG Image Cache Not Working
═══════════════════════════════════════════════════════

File: app/[slug]/opengraph-image.tsx

Problem:
- Facebook fetch times out (25s max)
- Cache-Control header not set
- Stray Vary header breaks caching

Expected:
- Image serves in <5s (cached by Facebook)
- OG card shows in FB feed

Current:
- Facebook fetch 25s timeout
- No image shown in posts

Fix:
- Add: Cache-Control: public, max-age=3600, s-maxage=3600
- Remove: Stray Vary header (Vary: rsc, next-router-state-tree)
- Add: Cloudflare cache rules for og-card endpoint

Test:
- cURL the endpoint, check Cache-Control header
- Post to Facebook, check image loads
```

**Cost:** $0.05-0.12  
**Auto Model:** Composer 2.5 ✓

---

## 🚀 Full Workflow Example (Real Feature)

**Feature: Analytics Dashboard**

### **Step 1: Brief Cursor with Planning Template**

```
PHASE 1: PLANNING
═══════════════════════════════════════════════════════

Build analytics dashboard for CINS showing user engagement + org stats.

Design this feature, output ONLY plan (NO CODE):

Database:
- New tables needed?
- How track events?
- RLS: User can only see own stats

API:
- GET /api/analytics/user
- GET /api/analytics/org/[id]
- What aggregations?

Frontend:
- Charts? (which library?)
- Filters? (time range, org, etc)
- Export? (CSV?)

Steps:
1. Create events table + RLS
2. Build API endpoints
3. Build AnalyticsDashboard component
4. Integrate charts (Recharts)
5. Add filters & exports

Edge Cases:
- No data yet (empty state)
- Permission denied (non-owner)
- Very old data (query slow)

Security:
- RLS prevents cross-org data leak
- Aggregation hides PII
```

**Cursor Response:**
```
✓ Detected: PLANNING (contains "design", "plan")
✓ Using: Opus 5
✓ Output: 1-2 page detailed plan
💾 Saved to: docs/PLAN_analytics_dashboard.md
💰 Cost: $0.18
⏱️ Time: 18s
```

---

### **Step 2: Brief Cursor with Backend Template**

```
PHASE 2: IMPLEMENTATION (Backend)
═══════════════════════════════════════════════════════

Based on plan docs/PLAN_analytics_dashboard.md:

[PASTE PLAN]

───────────────────────────────────────────────────────

Implement Step 1-2: Database + API

Create:
- Migration: events table with user_id, org_id, event_type, timestamp
- RLS: Users see only own events, orgs see only their orgs' events
- API: GET /api/analytics/user (return daily active users)
- API: GET /api/analytics/org/[id] (return org usage stats)

Follow patterns:
- Events RLS from CINS_FOUNDATIONS.md
- Aggregation query from existing stats

Errors:
- 403: User doesn't have org access
- 400: Invalid time range
```

**Cursor Response:**
```
✓ Detected: IMPLEMENTATION + COMPLEX (plan ref, API, RLS)
✓ Using: Grok 4.5
✓ Output: Migration + 2 API routes + RLS policy
💰 Cost: $0.48
⏱️ Time: 28s
```

---

### **Step 3: Brief Cursor with Frontend Template**

```
PHASE 3: IMPLEMENTATION (Frontend)
═══════════════════════════════════════════════════════

Based on plan Step 3-4:

Frontend:
- AnalyticsDashboard component
- Charts: Daily active users, org usage
- Filters: Time range (week/month/year)
- Export: CSV

───────────────────────────────────────────────────────

Build: AnalyticsDashboard Component

Props: { orgId?: string }
State: { timeRange, data, loading }

Layout:
- Header: Filters (time range, org select)
- Grid: 2 charts (users, usage)
- Footer: Export CSV button

Design:
- Use Recharts for line charts
- Gradient accent: #f8a668→#ee5b9f
- Responsive: Stack charts on mobile
- Loading: Skeleton placeholders

API:
- GET /api/analytics/user?range=[week|month|year]
- GET /api/analytics/org/[id]?range=...

Error:
- 403: Show "Access denied"
- No data: Show empty state
```

**Cursor Response:**
```
✓ Detected: IMPLEMENTATION + SIMPLE (UI, chart component)
✓ Using: Composer 2.5
✓ Output: AnalyticsDashboard.tsx component
💰 Cost: $0.12
⏱️ Time: 14s
```

---

### **Total for Feature:**

```
Phase 1 (Plan):      $0.18
Phase 2 (Backend):   $0.48
Phase 3 (Frontend):  $0.12
─────────────────────────
TOTAL:               $0.78 ✓

vs Pure Opus 5 would be: ~$4.50
SAVINGS: 83% 💚
```

---

## 💾 Copy-Paste Collection

**Save these in `.cursor/prompts/` for quick access:**

```bash
mkdir -p .cursor/prompts
cat > .cursor/prompts/plan-template.md << 'EOF'
[Copy Template 1 content here]
EOF

cat > .cursor/prompts/build-complex-template.md << 'EOF'
[Copy Template 2 content here]
EOF

cat > .cursor/prompts/build-simple-template.md << 'EOF'
[Copy Template 3 content here]
EOF
```

Then in Cursor, reference:
```
@Cursor
"Load .cursor/prompts/plan-template.md
Then fill in the template for analytics dashboard"
```

---

## 🎯 Quick Tips

### Tip 1: Always Paste Full Plan

```
✅ Good:
"Based on plan: docs/PLAN_[name].md

[ENTIRE PLAN PASTED HERE, not just link]

Implement Step 2..."

❌ Bad:
"Based on earlier plan...
Implement Step 2..."
→ Cursor has no context
```

### Tip 2: Be Specific About Scope

```
✅ Good:
"Implement database + API only
Step 1-2 from plan (no UI yet)"

❌ Bad:
"Implement the feature"
→ Ambiguous scope
```

### Tip 3: One Phase Per Brief

```
✅ Good:
Brief 1: PHASE 1 (Plan)
Brief 2: PHASE 2 (Backend)
Brief 3: PHASE 3 (Frontend)

❌ Bad:
"Plan + implement + test everything"
→ Context explosion, high cost
```

### Tip 4: Save Plans to Docs

```
After Opus 5 output:

1. Copy plan from chat
2. Save to: docs/PLAN_[feature].md
3. Commit to git
4. Reference in next brief

NOT: Keep only in chat (lost on refresh)
```

---

**Last Updated:** July 31, 2026  
**Status:** Ready to Use  
**Next Step:** Copy templates into your Cursor prompts folder
