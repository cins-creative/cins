# Setup Guide: Auto Model Selector for Cursor

**Goal:** Cursor tự động chọn model (Opus 5 / Grok 4.5 / Composer 2.5) dựa vào task type.

---

## 🔧 Installation (5 min)

### Step 1: Copy Rule File

```bash
cd your-cins-repo

# Create rules directory
mkdir -p .cursor/rules

# Copy rule file
cp AUTO_MODEL_SELECTOR.md .cursor/rules/auto-model-selector.md

# Verify
ls -la .cursor/rules/
# Should show: auto-model-selector.md ✓
```

### Step 2: Update CINS Instruction

Edit `docs/CINS_INSTRUCTION.md`:

```markdown
# Add this AFTER line 1 (router section)

## Rule 0: Auto Model Selection

**Reference:** `.cursor/rules/auto-model-selector.md`

Cursor auto-detects task type:
- PLANNING (design, architecture) → Opus 5
- IMPLEMENTATION + complex → Grok 4.5  
- IMPLEMENTATION + simple → Composer 2.5
- FIX/PATCH → depends on scope

Examples:
```
"Design analytics dashboard" → Opus 5 (planning)
"Based on plan, build API" → Grok 4.5 (implementation)
"Fix responsive CSS bug" → Composer 2.5 (simple fix)
```

---

### Step 3: Create Cost Tracking

```bash
# Create cost tracker
cat > docs/COSTS_TRACKER.md << 'EOF'
# Model Usage & Costs (Monthly)

## Template

| Date | Feature | Model | Input K | Output K | Cost | Notes |
|------|---------|-------|---------|----------|------|-------|
| | | | | | | |

## Summary

Opus 5:     $0.00
Grok 4.5:   $0.00
Composer 2.5: $0.00
─────────────────
TOTAL:      $0.00
EOF
```

---

## ✅ Testing (15 min)

### Test 1: Auto-Detect Planning

**Prompt to Cursor:**
```
"Help me design the analytics dashboard for CINS.
I need:
- Database schema with RLS
- API endpoints
- React components
- Implementation steps
- Edge cases

Don't write code, just plan."
```

**Expected:**
- ✅ Cursor detects: PLANNING
- ✅ Suggests: Opus 5
- ✅ Output: Plan document (NO CODE)
- ✅ Cost: ~$0.10-0.30

**Verify:**
```bash
# Check if plan was saved (if auto-save enabled)
cat docs/PLAN_analytics_dashboard.md
```

---

### Test 2: Auto-Detect Complex Implementation

**Prompt to Cursor:**
```
"Build analytics dashboard based on plan.

Reference plan:
docs/PLAN_analytics_dashboard.md (pasted below)

[PASTE PLAN CONTENT]

Implement Step 1-2:
- Create migration for analytics tables
- Build API endpoints for user/org stats
- Add RLS policies"
```

**Expected:**
- ✅ Cursor detects: IMPLEMENTATION + COMPLEX (multi-file)
- ✅ Suggests: Grok 4.5
- ✅ Output: Database migration + API code
- ✅ Cost: ~$0.30-0.60

---

### Test 3: Auto-Detect Simple Implementation

**Prompt to Cursor:**
```
"Build React component for analytics chart.

Based on plan Step 3:
- Component: AnalyticsChart
- Props: { data, timeRange }
- Library: Recharts
- Responsive: Tailwind"
```

**Expected:**
- ✅ Cursor detects: IMPLEMENTATION + SIMPLE (UI only)
- ✅ Suggests: Composer 2.5
- ✅ Output: React component code
- ✅ Cost: ~$0.08-0.15

---

### Test 4: Auto-Detect Bug Fix

**Prompt to Cursor:**
```
"Fix OG card caching issue.

Problem:
- Cache-Control header not set
- Stray Vary header causing issues

File: app/[slug]/opengraph-image.tsx

Fix:
- Add Cache-Control: public, max-age=3600
- Remove Vary header"
```

**Expected:**
- ✅ Cursor detects: FIX + MULTI-FILE
- ✅ Suggests: Grok 4.5
- ✅ Output: Fixed code
- ✅ Cost: ~$0.20-0.40

---

## 📊 Tracking Costs

### After Each Cursor Request

```bash
# Open docs/COSTS_TRACKER.md
# Add entry:

| 2026-07-31 | Analytics Plan | Opus 5 | 100 | 20 | $0.60 | Planning phase |
| 2026-08-01 | Analytics API | Grok 4.5 | 120 | 40 | $0.48 | Implementation |
| 2026-08-02 | Analytics UI | Composer 2.5 | 80 | 30 | $0.12 | UI component |
```

### Weekly Review

```bash
cat docs/COSTS_TRACKER.md

# Calculate totals:
# Week 1: Opus $0.60 + Grok $0.48 + Composer $0.12 = $1.20
# vs Pure Opus: would be $5.50 → Saved 78% ✓
```

---

## 🎯 Workflow Examples

### Example 1: Build Share-to-Socials Feature

**Phase 1: Planning (Opus 5)**

```bash
# Brief Cursor:
"
Plan the share-to-socials feature:
- Database schema (share preferences, tracking)
- API endpoints (POST /share, GET /shares)
- Frontend component (ShareModal)
- Integration with FB/X/LinkedIn/Zalo
- Implementation steps

Output: Plan only, NO CODE.
"

# Cost: $0.15-0.25
# Time: 15s
# Output: docs/PLAN_share_to_socials.md
```

**Phase 2: Backend Implementation (Grok 4.5)**

```bash
# Brief Cursor:
"
Build backend for share-to-socials.

Plan reference: docs/PLAN_share_to_socials.md (pasted below)
[PASTE PLAN]

Implement Step 1-2:
- Database migration
- API endpoint POST /api/share
- Integration logic (FB SDK)

Follow plan exactly."

# Auto-select: Grok 4.5 (complex, multi-file)
# Cost: $0.40-0.60
# Files: migration, API route, integration service
```

**Phase 3: Frontend Implementation (Composer 2.5)**

```bash
# Brief Cursor:
"
Build ShareModal component.

Based on plan Step 3:
- Component: ShareModal
- Props: { portfolioUrl, onShare }
- SDK: FB, X, LinkedIn SDKs
- State management: useState
- Form validation

Use Tailwind, follow design system."

# Auto-select: Composer 2.5 (simple, UI only)
# Cost: $0.10-0.15
# Files: one component file
```

**Total Cost: $0.65-1.00** (vs ~$3.50 if used Opus 5 entire time)

---

### Example 2: Fix Check-Then-Act Bug Pattern

**Single Brief (Bug spans 3 files)**

```bash
# Brief Cursor:
"
Fix check-then-act bug in:
- lib/co-so/don-hoc-phi.ts
- lib/journey/membership-milestone.ts  
- lib/journey/org-milestone-tag.ts

Pattern fix (from lib/shop/don-hang.ts):
- Move status check into UPDATE condition
- Use .select('id') to catch 0-row updates
- Check empty array on return

Apply pattern to all 3 files."

# Auto-select: Grok 4.5 (multi-file fix)
# Cost: $0.25-0.40
# Time: 20s
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "Cursor not switching models"

**Problem:** Cursor always uses default model (Sonnet).

**Solution:**
```bash
# Check 1: Rule file exists
ls -la .cursor/rules/auto-model-selector.md

# Check 2: CINS_INSTRUCTION.md references the rule
grep "auto-model-selector" docs/CINS_INSTRUCTION.md

# Check 3: Cursor has latest version
# In Cursor: Cmd/Ctrl + K → "Clear cache" → Restart

# Check 4: Prompt is clear enough
# Add keywords: "plan", "design", "build", "fix"
```

### Issue 2: "Wrong model selected"

**Problem:** Cursor picked Composer 2.5 but needs Grok 4.5.

**Solution:**
```bash
# Override explicitly:
"--model grok-4.5
Build this API endpoint..."

# Log issue for rule refinement:
echo "Wrong pick: [date] [task] [expected] [picked]" >> docs/RULE_FEEDBACK.md

# Update rule in auto-model-selector.md
# Add trigger keyword that was missing
```

### Issue 3: "Token costs are high"

**Problem:** Actual cost much higher than estimate.

**Likely cause:** Composer output was large (context expansion).

**Solution:**
```bash
# Check 1: Is thinking enabled?
# Opus 5 thinking = 2x output tokens
# Set: effort=standard (not high)

# Check 2: Context too large?
# Limit to relevant files only
# Instead of: "Analyze whole codebase"
# Use: "Analyze lib/co-so/ folder only"

# Check 3: Break into smaller tasks
# Instead of: Build entire feature (500K tokens)
# Use: Build schema + API + UI (3 separate requests)
```

---

## 📈 Optimization Checklist (Monthly)

```bash
□ Review docs/COSTS_TRACKER.md
□ Calculate: Actual vs Budget
□ Find patterns: Which task types cost more?
□ Refine triggers in auto-model-selector.md
□ Test 1 tricky feature manually
□ Measure accuracy: Correct picks / Total picks

Target: 95%+ correct auto-selection
```

---

## 🔄 Iteration Cycle

### Week 1: Baseline

```
Test 4 scenarios from Testing section above
Document initial accuracy (expected: 70-80%)
Adjust triggers based on failures
```

### Week 2-3: Refinement

```
Use in real development
Track in COSTS_TRACKER.md
Log failures in RULE_FEEDBACK.md
Update rule weekly
```

### Week 4: Optimization

```
Review full month data
Calculate ROI (cost vs Pure-Opus baseline)
Optimize top 3 wrong picks
Document final accuracy (target: 95%+)
```

---

## 📋 Quick Checklist

**Setup Complete?**
```bash
□ .cursor/rules/auto-model-selector.md exists
□ docs/CINS_INSTRUCTION.md updated
□ docs/COSTS_TRACKER.md created
□ Tested 4 scenarios above
□ Understanding: Planning → Opus 5, Build → Grok/Composer
```

**Ready to Use?**
```bash
□ Can detect planning task
□ Can detect complex implementation
□ Can detect simple implementation  
□ Can detect bug fix
□ Can track costs
□ Can override with --model flag if needed
```

---

## 🎓 Tips & Tricks

### Tip 1: Always Include Plan Reference

```
Good:
"Build analytics dashboard.
Based on docs/PLAN_analytics.md (pasted below):
..."

Bad:
"Build analytics dashboard.
Remember the plan we made earlier..."
→ Cursor has no context, picks wrong model
```

### Tip 2: Be Explicit About Scope

```
Good:
"Implement Step 1-2 (database + API only):
- No frontend changes"

Bad:
"Implement the feature"
→ Ambiguous, model guesses
```

### Tip 3: Batch Similar Tasks

```
Instead of:
1. Build API endpoint
2. Build UI component
3. Add error handling

Use:
"Build API + error handling (Grok 4.5)
Then: Build UI component (Composer 2.5)"
→ Clearer model selection
```

### Tip 4: Save Plans to Docs

```
After Opus 5 planning:
SAVE to: docs/PLAN_[feature].md

Not: Keep in chat only (lost after refresh)
```

---

## 📞 Support

**If rule doesn't work:**

1. Check rule file exists: `.cursor/rules/auto-model-selector.md`
2. Check CINS_INSTRUCTION.md references it
3. Clear Cursor cache (Cmd+K → "Clear cache")
4. Restart Cursor
5. Try explicit model: `--model opus-5`

**If costs are high:**

1. Check docs/COSTS_TRACKER.md for patterns
2. Reduce context (don't paste entire codebase)
3. Break into smaller tasks
4. Check thinking tokens (Opus 5: set effort=standard)

**If accuracy is low (<80%):**

1. Add more trigger keywords to rule
2. Test specific scenario manually
3. Document pattern in RULE_FEEDBACK.md
4. Update rule triggers weekly

---

## ✨ Success Metrics

After 2 weeks:

```
Metric                        Target      Formula
─────────────────────────────────────────────────────
Model selection accuracy      95%+        Correct picks / Total
Cost vs Pure-Opus baseline    70%+ saved  (Opus cost - Hybrid) / Opus
Features shipped              5+          Planning + Impl + Test
Cost per feature              <$2         Total cost / Features

Example after 2 weeks:
✓ Accuracy: 96% (24/25 correct)
✓ Savings: 75% vs Pure-Opus ($5.80 vs $23.20)
✓ Features: 5 (analytics, share, dashboard, fixes, mobile prep)
✓ Cost/feature: $1.16/feature
```

---

**Created:** July 31, 2026  
**For:** CINS Auto Model Selector  
**Status:** Ready to Deploy  
**Next Step:** Copy to repo and test first scenario
