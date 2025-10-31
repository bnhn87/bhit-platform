# Critical Fixes Checklist

## 🔴 Immediate Action Required

### 1. Security Vulnerabilities
- [ ] **Update xlsx package** - High severity prototype pollution vulnerability
  ```bash
  npm update xlsx
  # OR find alternative: csv-parse, papaparse, or @fast-csv/parse
  ```
- [ ] **Remove/Secure test-keys.ts** - Potential information disclosure
  ```bash
  rm web/pages/api/test-keys.ts
  # OR move to development-only access
  ```

### 2. TypeScript Errors (96 total)
- [ ] **Fix FloorPlanCanvas.tsx** - Missing properties (`_scaleReferenceBox`, `_placementDimensions`)
- [ ] **Fix WorkOrderImport.tsx** - PDF.js integration type issues
- [ ] **Fix LabourCalendar components** - Type mismatches in data aggregation
- [ ] **Fix API route types** - Database schema mismatches

### 3. Component Duplicates
- [ ] **Consolidate StatusPill** - Choose between `/components/StatusPill.tsx` vs `/components/jobs/StatusPill.tsx`
- [ ] **Resolve DrawingsTab** - Pick one implementation: `/components/drawings/` vs `/components/tabs/`
- [ ] **Remove backup files** - Clean up all `.bak` files

## 🟡 High Priority (This Week)

### 4. Database Schema Issues
- [ ] **Apply missing migrations** - Run `create-schema-now.sql` in Supabase
- [ ] **Verify table structure** - Ensure `generated_tasks` and `job_floorplans` exist
- [ ] **Update type definitions** - Match `types/database.ts` with actual schema

### 5. Authentication Standardization
- [ ] **Choose Supabase client pattern** - Standardize across all API routes
- [ ] **Update inconsistent endpoints** - 20+ endpoints using different patterns
- [ ] **Implement auth middleware** - Centralize authentication logic

### 6. Dependency Updates
- [ ] **Update framework packages**:
  ```bash
  npm update next @types/node @typescript-eslint/eslint-plugin @typescript-eslint/parser
  ```
- [ ] **Update utility packages**:
  ```bash
  npm update @google/genai openai immer tailwindcss
  ```

## 🟢 Quality Improvements (This Month)

### 7. Code Cleanup
- [ ] **Replace console statements** - 1,613 instances need proper logging
- [ ] **Fix ESLint warnings** - Import order, unused variables, missing dependencies
- [ ] **Address large components**:
  - [ ] Refactor `TasksTab.tsx` (2,115 lines)
  - [ ] Refactor `LabourTab.tsx` (1,456 lines)

### 8. API Consistency
- [ ] **Standardize error handling** - Choose throw vs return pattern
- [ ] **Add missing error handling** - 10+ endpoints need try/catch blocks
- [ ] **Consolidate job routes** - Resolve `/job` vs `/jobs` duplication

### 9. Import Organization
- [ ] **Add barrel exports** - Create `index.ts` files for component directories
- [ ] **Standardize prop interfaces** - Use consistent naming (`ComponentNameProps`)
- [ ] **Fix import paths** - Use `@/` alias consistently

## 📋 Verification Steps

After each fix, verify:
1. **TypeScript check passes**: `npm run typecheck`
2. **Linting passes**: `npm run lint`
3. **Build succeeds**: `npm run build`
4. **App runs correctly**: `npm run dev`

## 🎯 Success Criteria

✅ **Phase 1 Complete** when:
- [ ] No security vulnerabilities in `npm audit`
- [ ] Zero TypeScript errors
- [ ] No duplicate components
- [ ] Database schema matches application

✅ **Phase 2 Complete** when:
- [ ] All dependencies up-to-date
- [ ] Consistent authentication patterns
- [ ] ESLint warnings under 50
- [ ] Large components refactored

✅ **Phase 3 Complete** when:
- [ ] Console statements replaced with logging
- [ ] API error handling consistent
- [ ] Import organization standardized
- [ ] TODO comments under 1000

## 📞 Need Help?

If you encounter issues:
1. Check the main analysis: `PROJECT_SWEEP_SUMMARY.md`
2. Review specific area analyses in this folder
3. Use Claude Code `/help` for assistance
4. Create issue at: https://github.com/anthropics/claude-code/issues

---
**Remember:** Make incremental changes and test after each fix to avoid breaking the application.