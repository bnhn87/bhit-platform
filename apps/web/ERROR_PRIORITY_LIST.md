# Error Priority List - TypeScript & Lint Issues

**Total:** 178 TypeScript errors + 25 Lint warnings = **203 total issues**

---

## 🔴 CRITICAL - RUNTIME BREAKING (16 errors) - **FIX IMMEDIATELY**

These will cause runtime failures or unexpected behavior:

### 1. Hoisting/TDZ Issues (10 errors)
**Impact:** Functions called before declaration - will crash at runtime
- `components/FeatureFlagAdmin.tsx:20` - loadFlags used before declaration ×2
- `components/labour/DailyCloseOut.tsx:67` - generateAutoSummary used before declaration ×2
- `components/labour/LabourDashboard.tsx:60` - loadLabourData used before declaration ×2
- `components/labour/ProjectDashboard.tsx:42` - loadProjectData used before declaration ×2
- `modules/smartquote/components/ProductCrossCheck.tsx:98` - processProductCrossCheck used before declaration ×2

**Fix:** Move function declarations above their usage OR convert to arrow functions

### 2. Missing Variables (3 errors)
**Impact:** ReferenceError at runtime
- `pages/job/[id]/index.tsx:218` - setLoadingUsers not found (should be _setLoadingUsers)
- `pages/job/[id]/index.tsx:227` - setUsers not found (should be _setUsers)
- `pages/job/[id]/index.tsx:229` - setLoadingUsers not found (should be _setLoadingUsers)

**Fix:** Use correct variable names with underscore prefix

### 3. Undefined Variables (2 errors)
**Impact:** ReferenceError at runtime
- `lib/pdfTaskGeneration.ts:137` - 'index' is not defined
- `lib/pdfTaskGeneration.ts:139` - 'index' is not defined

**Fix:** Define index variable or use correct variable name

### 4. Wrong Object Property (1 error)
**Impact:** API sync failures
- `pages/api/v2/sync/batch.ts:55` - 'update_id' doesn't exist, should be 'update'

**Fix:** Rename property to 'update'

---

## 🟠 HIGH PRIORITY - Type Safety (95 errors) - **FIX NEXT**

These indicate incorrect types that may cause bugs:

### 1. Property Does Not Exist (43 errors)
**Impact:** Accessing undefined properties causes undefined behavior
**Files with most issues:**
- `components/tabs/TasksTab.tsx` - 8 errors
- `components/LabourCalendarOverview.tsx` - 5 errors
- `components/floorplanner/WorkOrderImport.tsx` - 5 errors
- `components/tabs/LabourTab.tsx` - 4 errors
- Various other files - 21 errors

**Common issues:**
- Missing type definitions for database models
- PDF.js types not properly imported
- Missing optional properties

### 2. Type Not Assignable (32 errors)
**Impact:** Type mismatches may cause runtime errors
**Common patterns:**
- String assigned to union type
- Any type assigned to specific type
- Wrong function return types

### 3. Argument Type Mismatch (13 errors)
**Impact:** Functions called with wrong parameter types
**Common in:**
- Event handlers
- Callback functions
- Database queries

### 4. No Overload Matches (6 errors)
**Impact:** Functions called incorrectly
- Array reduce operations
- Performance API calls

### 5. Missing Required Properties (1 error)
**Impact:** Incomplete object creation
- `components/tabs/LabourTab.tsx:220` - JobData missing properties

---

## 🟡 MEDIUM PRIORITY - Null Safety (52 errors) - **FIX AFTER HIGH**

These need null/undefined checks:

### 1. Variable is 'unknown' (40 errors)
**Impact:** Need type guards before usage
**Files:**
- `components/tabs/TasksTab.tsx` - 7 errors
- `components/floorplanner/WorkOrderImport.tsx` - 6 errors
- `components/tabs/InvoiceScheduleTab.tsx` - 4 errors
- Various others - 23 errors

**Fix:** Add type guards: `if (typeof x === 'string')` or use type assertions

### 2. Possibly 'null' (5 errors)
**Impact:** Null pointer exceptions
**Fix:** Add null checks: `if (x !== null)`

### 3. Possibly 'undefined' (7 errors)
**Impact:** Undefined access errors
**Fix:** Add undefined checks: `if (x !== undefined)` or use optional chaining `x?.prop`

---

## 🟢 LOW PRIORITY - Code Quality (15 errors) - **FIX IF TIME**

These are style/best practice issues:

### 1. Unsafe Type Conversions (5 errors)
- Type assertions that may be incorrect
- **Fix:** Use proper type guards

### 2. Spread Type Issues (3 errors)
- Spreading non-object types
- **Fix:** Add type checks before spreading

### 3. Implicit 'any' Parameters (6 errors)
- Function parameters without types
- **Fix:** Add explicit type annotations

### 4. Expression Not Callable (1 error)
- Trying to call non-function
- **Fix:** Check type before calling

---

## 📋 LINT WARNINGS (25 warnings) - **QUICK WINS**

These are easy fixes with high impact:

### 1. Missing useEffect Dependencies (13 warnings)
**Impact:** Stale closures, bugs
**Files:** Multiple components
**Fix:** Add dependencies or use `useCallback`

### 2. Console Statements (5 warnings)
**Impact:** Production console noise
**Fix:** Remove or wrap in `if (process.env.NODE_ENV === 'development')`

### 3. Explicit 'any' Types (7 warnings)
**Impact:** Type safety holes
**Fix:** Replace with proper types

---

## 📊 SUMMARY BY FILE (Top 10 Worst Files)

1. **components/tabs/TasksTab.tsx** - 8 TS errors
2. **lib/validation.ts** - 13 TS errors (not analyzed in detail)
3. **pages/dashboard.tsx** - 8 TS errors
4. **modules/smartquote/services/exportService.ts** - 8 TS errors
5. **components/floorplanner/WorkOrderImport.tsx** - 8 TS errors
6. **modules/smartquote/components/InitialInput.tsx** - 7 TS errors
7. **lib/jobsFetch.ts** - 7 TS errors
8. **pages/job/[id]/index.tsx** - 6 TS errors (3 critical)
9. **pages/api/invoicing/export.ts** - 6 TS errors
10. **lib/storage.ts** - 6 TS errors

---

## 🎯 RECOMMENDED FIX ORDER

1. **Start Here:** Fix 16 CRITICAL errors (30 min)
2. **Then:** Fix top 3 problem files completely (TasksTab, pages/job/[id]/index, FeatureFlagAdmin) (45 min)
3. **Quick Wins:** Fix all 25 lint warnings (20 min)
4. **Type Safety:** Add proper types to most common issues (TS2339, TS2322) (1-2 hours)
5. **Polish:** Fix remaining null safety and quality issues (1-2 hours)

**Total estimated time to 0 errors:** 3-4 hours focused work

---

## 🚀 CURRENT STATUS

- ✅ App is running on http://localhost:3001
- ✅ Build compiles despite errors
- ✅ Most functionality works
- ⚠️ Type safety compromised
- ⚠️ Some features may have hidden bugs

**Recommendation:** Fix CRITICAL errors now, then proceed with testing. Fix others incrementally.
