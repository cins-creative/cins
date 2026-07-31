# AUTO MODEL SELECTOR FOR CURSOR

**Purpose:** Giúp Cursor tự động chọn model phù hợp (Opus 5 / Grok 4.5 / Composer 2.5) dựa vào task type.

**Setup:** Copy file này vào `.cursor/rules/auto-model-selector.md` trong CINS repo.

---

## 🤖 AUTO-DETECTION LOGIC

### **PHASE 1: Detect Task Type**

Read the user's prompt and classify:

```
IF prompt contains ANY of these keywords:
  "plan", "design", "architecture", "schema", "structure"
  "how should we", "approach for", "strategy for"
  "think about", "edge cases", "considerations"
  "what if", "potential issues"
  
  → TASK TYPE = PLANNING
  → ROUTER → Opus 5
  
ELIF prompt contains ANY of these keywords:
  "build", "implement", "create", "add feature"
  "API endpoint", "database", "component"
  "migration", "auth logic", "integration"
  "make this work", "connect to", "wire up"
  
  → TASK TYPE = IMPLEMENTATION
  → ROUTER → Check complexity (next section)
  
ELIF prompt contains ANY of these keywords:
  "fix", "bug", "error", "broken"
  "responsive", "CSS", "template"
  "quick", "patch", "update"
  "tweak", "adjust", "improve"
  
  → TASK TYPE = FIX
  → ROUTER → Check scope (next section)
```

---

## 🎯 ROUTING DECISION TREE

### **If PLANNING Task:**

```
MODEL: claude-opus-5 (ALWAYS)

INSTRUCTION:
  1. DO NOT write code
  2. Output ONLY planning document:
     - Architecture decisions
     - Database schema (with RLS policy)
     - API endpoints (with validation rules)
     - Frontend components structure
     - Step-by-step implementation (numbered 1-N)
     - Edge cases & error handling
     - Security considerations
  3. Save output to: docs/PLAN_[feature-name].md
  4. Use this template (below)

COST ESTIMATE: $0.10-0.30 per plan
TIME: 15-20 seconds

AFTER PLANNING:
  → Ask user: "Plan saved to docs/PLAN_[name].md
     Next: Paste this plan + your implementation request 
     to brief Cursor for Phase 2 (Grok 4.5 build)"
```

**Planning Template:**

```markdown
# PLAN: [Feature Name]

## Database
- Tables: [list with types, relationships]
- Indexes: [if needed]
- RLS Policy: [exact policy per table]

## API Endpoints
- POST /api/... → [validation, auth, response]
- GET /api/... → [filters, pagination]
- PUT /api/... → [update logic]

## Frontend Components
- Component1: [purpose, props, states]
- Component2: [purpose, props, states]

## Implementation Steps
1. [Database migrations]
2. [API layer]
3. [Frontend component]
4. [Integration testing]
5. [Edge case handling]

## Edge Cases
- [Error case 1]
- [Error case 2]
- [Concurrent request handling]

## Security
- [Auth check]
- [Input validation]
- [RLS enforcement]
```

---

### **If IMPLEMENTATION Task:**

**Sub-check: Look at context + plan reference**

#### **Sub-check A: Plan-Driven Implementation**

```
IF prompt mentions "plan" OR "docs/PLAN_" reference:
  
  → COMPLEXITY CHECK:
      IF file count > 3 OR schema/API changes OR multi-table:
        MODEL: grok-4.5
        COST: $0.30-0.60
        
      ELIF file count ≤ 2 AND single-file component:
        MODEL: composer-2.5
        COST: $0.08-0.15
```

**Instruction for Grok 4.5 (Complex):**
```
1. Read plan from docs/PLAN_[feature].md (pasted above)
2. Implement EXACTLY per plan
3. Multi-file changes OK:
   - Database: migrations (SQL)
   - Backend: API endpoints (TypeScript/API routes)
   - Frontend: components (React)
4. Follow existing patterns:
   - Check lib/shop/don-hang.ts for patterns
   - Check CINS_FOUNDATIONS.md for naming
   - Use existing RLS patterns
5. After implementation:
   - List files changed
   - Highlight RLS policies (if DB changes)
   - Flag any deviations from plan

COST ESTIMATE: $0.40-0.70
TIME: 20-30 seconds
```

**Instruction for Composer 2.5 (Simple):**
```
1. Read plan from docs/PLAN_[feature].md
2. Implement ONLY the UI part:
   - React components
   - Form validation
   - Responsive design (Tailwind)
3. Follow design system:
   - Sine_Art_Design_System folder
   - Gradients: only #f8a668→#ee5b9f
   - Typography: Quicksand (body) + Be Vietnam Pro (display)
   - Icons: Feather only
4. Single file or tightly coupled component OK
5. API integration: just type the fetch calls, don't build API

COST ESTIMATE: $0.08-0.15
TIME: 10-15 seconds
```

#### **Sub-check B: Standalone Implementation (No Plan)**

```
IF no plan reference AND complexity is unclear:
  
  → ASK FIRST:
     "Do you have a plan from Opus 5?
      If not, recommend Phase 1 first (Opus 5 planning).
      
      If proceeding without plan:
      - Complexity (high/medium/low)?
      - File count to change? (1 / 2-3 / 4+)
      - Existing pattern to follow? (yes/no)"
      
  → Based on answers:
     HIGH or 4+ files → grok-4.5
     MEDIUM or 2-3 files → grok-4.5
     LOW or 1 file → composer-2.5
```

---

### **If FIX/PATCH Task:**

```
SCOPE CHECK:
  IF bug is in existing file AND fix is localized:
    MODEL: composer-2.5
    EXAMPLE: "CSS responsive fix", "email template update"
    COST: $0.05-0.12
    
  ELIF bug spans multiple files OR requires refactor:
    MODEL: grok-4.5
    EXAMPLE: "Fix check-then-act pattern in 3 files"
    COST: $0.20-0.40
    
  ELIF bug requires architectural rethink:
    ESCALATE: "This needs planning phase (Opus 5).
               Brief me with Opus 5 plan first."
    MODEL: claude-opus-5
```

**Instruction for Bug Fixes:**
```
1. Locate the bug (exact line/file)
2. Check CINS_FOUNDATIONS.md for pattern
3. Apply fix with minimal changes
4. List verification steps:
   - Test case 1: ...
   - Test case 2: ...
5. Flag if this pattern exists elsewhere
   ("This pattern may appear in X other places")

COST ESTIMATE: $0.05-0.40 (depends on scope)
TIME: 10-20 seconds
```

---

## 📋 PROMPT PATTERNS FOR CURSOR

### **Pattern 1: Planning (Optimal)**

```
@Cursor
"
PHASE 1 (Planning): Help me design analytics dashboard.

Required:
- Database schema (with RLS)
- API endpoints for user/org analytics
- Frontend components for charts
- Step-by-step build plan
- Edge cases for concurrent updates

🔍 Auto-detect: PLANNING → Opus 5
"
```

### **Pattern 2: Plan-Driven Build (Most Cost-Effective)**

```
@Cursor
"
PHASE 2 (Implementation): Build analytics dashboard

Plan reference:
docs/PLAN_analytics_dashboard.md (pasted below)
[paste plan content]

Implement Step 1-2 (Database + API):
- Create migration
- Implement endpoint
- Add RLS policy

🔍 Auto-detect: IMPLEMENTATION + Plan → Grok 4.5
"
```

### **Pattern 3: Simple Component Build**

```
@Cursor
"
PHASE 3 (UI Component): Build analytics chart component

Based on plan Step 3:
- Component name: AnalyticsChart
- Props: { data, timeRange, onFilter }
- Use: Recharts library
- Responsive: Tailwind grid

🔍 Auto-detect: IMPLEMENTATION + Simple → Composer 2.5
"
```

### **Pattern 4: Bug Fix**

```
@Cursor
"
BUG FIX: OG card caching issue

Problem:
- Facebook fetch times out at 25s
- Cache-Control header not set

File: app/[slug]/opengraph-image.tsx

Fix:
- Add Cache-Control: public, max-age=3600
- Remove stray Vary header
- Add proper caching strategy

🔍 Auto-detect: FIX + Multi-file → Grok 4.5
"
```

---

## ⚙️ CURSOR CONFIGURATION

Place this in `.cursor/rules/auto-model-selector.md`:

```yaml
# Model Selection Rule for Cursor

## Rules (executed in order)

rule_1_planning:
  trigger: |
    message contains "plan" OR "design" OR "architecture" 
    OR "edge cases" OR "approach"
  action: |
    Use model: claude-opus-5
    instructions: |
      Output planning document only (NO CODE)
      Follow PLAN template
      Save to docs/PLAN_[name].md
  cost_estimate: "$0.10-0.30"

rule_2_complex_implementation:
  trigger: |
    message contains "implement" OR "build" OR "create"
    AND (mentions "plan" OR has "docs/PLAN" reference)
    AND (file_count > 2 OR mentions schema/API/migration)
  action: |
    Use model: grok-4.5
    instructions: |
      Follow plan exactly
      Multi-file changes allowed
      Database + API + complex logic
  cost_estimate: "$0.30-0.60"

rule_3_simple_implementation:
  trigger: |
    message contains "build" OR "create"
    AND (mentions "component" OR "form" OR "UI")
    AND file_count ≤ 2
    AND (mentions "plan" OR context is clear)
  action: |
    Use model: composer-2.5
    instructions: |
      Follow plan's UI section
      Single/tightly-coupled component
      No backend changes
  cost_estimate: "$0.08-0.15"

rule_4_bug_fix_multi_file:
  trigger: |
    message contains "fix" OR "bug"
    AND mentions multiple files
  action: |
    Use model: grok-4.5
    instructions: |
      Fix bug across all files
      Check for pattern repetition
  cost_estimate: "$0.20-0.40"

rule_5_bug_fix_single_file:
  trigger: |
    message contains "fix" OR "bug"
    AND file_count ≤ 1
  action: |
    Use model: composer-2.5
    instructions: |
      Localized fix only
      Minimal changes
  cost_estimate: "$0.05-0.12"

rule_6_escalate:
  trigger: |
    message is ambiguous OR multiple file types 
    OR mentions "rethink" OR "refactor" without plan
  action: |
    Suggest: "Start with Phase 1 (Opus 5 planning)
              to clarify architecture first."
```

---

## 📊 COST TRACKING TEMPLATE

**Copy to `docs/COSTS_TRACKER.md`:**

```markdown
# Monthly Model Usage & Costs

## Week 1

| Date | Feature | Model | Input K | Output K | Cost | Saved vs Pure-Opus? |
|------|---------|-------|---------|----------|------|-------------------|
| 7/28 | Analytics Plan | Opus 5 | 100 | 20 | $0.60 | — |
| 7/29 | Analytics API | Grok 4.5 | 120 | 40 | $0.48 | Opus would: $1.25 |
| 7/30 | Analytics UI | Composer 2.5 | 80 | 30 | $0.12 | Opus would: $0.75 |
| | | SUBTOTAL | | | **$1.20** | **Saved $1.80** |

## Week 2

| Date | Feature | Model | Input K | Output K | Cost | Notes |
|------|---------|-------|---------|----------|------|-------|
| | | | | | | |

## Monthly Summary

```
Opus 5 (Planning):    $X.XX  (Y requests)
Grok 4.5 (Build):     $X.XX  (Y requests)
Composer 2.5 (UI):    $X.XX  (Y requests)
─────────────────────────────────────
TOTAL:                $X.XX

vs Pure Opus 5:       Would be $Y.YY → Saved Z%
vs Pure Grok:         Would be $Y.YY → Difference
Budget remaining:     $200 - $X.XX = $X.XX
```

---

## 🚀 HOW TO USE THIS RULE

### **Step 1: Setup**

```bash
cd CINS-repo
mkdir -p .cursor/rules
cp /path/to/AUTO_MODEL_SELECTOR.md .cursor/rules/
```

### **Step 2: Link in Main Cursor Config**

Add to `docs/CINS_INSTRUCTION.md` (top, after router):

```markdown
## Rule 0: Auto Model Selection

**Reference:** `.cursor/rules/auto-model-selector.md`

Cursor will auto-detect task type and suggest/use appropriate model.
User can override with explicit `--model [name]` if needed.
```

### **Step 3: Use in Prompts**

Just write naturally. Cursor will auto-detect:

```
"Let me design the payment pipeline with edge cases"
→ Cursor detects: PLANNING → Uses Opus 5 ✓

"Based on the plan, build the API endpoints"
→ Cursor detects: IMPLEMENTATION + complex → Uses Grok 4.5 ✓

"Add responsive CSS to the form"
→ Cursor detects: FIX + simple → Uses Composer 2.5 ✓
```

### **Step 4: Monitor Costs**

Update `docs/COSTS_TRACKER.md` after each request.

---

## ✅ VALIDATION CHECKLIST

After Cursor auto-selects model:

- [ ] Model matches task type (Planning/Build/Fix)
- [ ] Cost estimate is reasonable (<$1 per request)
- [ ] Output quality matches expectation
- [ ] Rule was applied correctly
- [ ] Token counts logged in COSTS_TRACKER.md

If any ❌, post feedback:
```
"Wrong model picked. Expected [X], got [Y].
 Adjust rule_N in auto-model-selector.md"
```

---

## 🔄 ITERATION

**Monthly Review:**

```
□ Check COSTS_TRACKER.md
□ Identify "wrong model picked" cases
□ Update triggers in auto-model-selector.md
□ Test with 1 new feature
□ Measure accuracy (correct picks / total picks %)
□ Target: 95%+ accuracy
```

**Example Update:**

```
OLD:
  trigger: message contains "fix"

NEW:
  trigger: |
    message contains "fix" OR "bug" OR "error"
    AND not contains "architecture"
```

---

## 📌 QUICK REFERENCE

| Task | Keyword | Model | Cost |
|------|---------|-------|------|
| **PLAN** | plan, design, architect | Opus 5 | $0.10-0.30 |
| **BUILD (Complex)** | build + plan ref + schema/API | Grok 4.5 | $0.30-0.60 |
| **BUILD (Simple)** | build + component + plan ref | Composer 2.5 | $0.08-0.15 |
| **FIX (Multi)** | fix + multiple files | Grok 4.5 | $0.20-0.40 |
| **FIX (Single)** | fix + single file | Composer 2.5 | $0.05-0.12 |

---

## ⚠️ IMPORTANT NOTES

1. **Opus 5 thinking overhead:** Opus 5 uses thinking tokens by default. Planning should use `effort=standard` to avoid 2x output tokens.

2. **Grok token efficiency:** Grok 4.5 outputs 4.2x fewer tokens than Opus 4.8 on same task — trust it for implementation.

3. **Composer limitations:** Composer 2.5 context = 200K (Grok = 500K). For tasks needing full repo context, use Grok.

4. **Cost tracking matters:** Log every request. Patterns emerge after 2 weeks.

5. **Plan quality = Build quality.** Invest time in planning. Sloppy plan → iteration → expensive build.

---

**Last Updated:** July 31, 2026
**For:** CINS Development (Tú)
**Next Review:** August 15, 2026
