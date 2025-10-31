# Quick Fixes Checklist

**Track your progress fixing the BHIT Platform issues**

## 🔴 Phase 1: Critical Fixes (1-2 days)

- [x] Install dependencies
- [ ] Fix ESLint error: Unescaped apostrophe in `useAccessibility.ts:105`
- [ ] Fix security: Update tar-fs (`npm audit fix`)
- [ ] Fix security: Update xlsx to 0.20.2+ (`npm install xlsx@latest`)
- [ ] Test xlsx changes thoroughly
- [ ] Fix SmartQuote TypeScript errors (35 errors)
  - [ ] Add missing properties to types (projectDuration, vanType, etc.)
  - [ ] Fix missing icon exports
  - [ ] Fix ProductsTable type mismatches
- [ ] Fix API TypeScript errors (8 errors)
  - [ ] Add banned_until to User type
  - [ ] Fix string | undefined type issues
  - [ ] Fix raw_user_meta_data → user_metadata

**Verify Phase 1:**
```bash
npm run typecheck  # Should pass with 0 errors
npm run lint       # Should have 0 errors
npm audit          # Should show 0 high/critical issues
```

## 🟡 Phase 2: High Priority (3-5 days)

- [ ] Auto-fix ESLint warnings (`npm run lint -- --fix`)
- [ ] Consolidate StatusPill component
  - [ ] Compare implementations
  - [ ] Choose one version
  - [ ] Update all imports
  - [ ] Delete duplicate
- [ ] Consolidate DrawingsTab component
  - [ ] Compare implementations
  - [ ] Choose one version
  - [ ] Update all imports
  - [ ] Delete duplicate
- [ ] Update critical dependencies
  - [ ] `npm update @supabase/supabase-js`
  - [ ] `npm update @google/genai`
  - [ ] `npm update next` (test carefully!)
  - [ ] `npm update @typescript-eslint/eslint-plugin @typescript-eslint/parser`
- [ ] Secure test-keys.ts
  - [ ] Add NODE_ENV check or authentication
  - [ ] OR delete if not needed

**Verify Phase 2:**
```bash
npm run build      # Should succeed
npm run dev        # Should start without errors
```

## 🟢 Phase 3: Quality Improvements (1-2 weeks)

- [ ] Fix import ordering warnings (~80)
- [ ] Replace `any` types with proper types (~60)
- [ ] Remove or rename unused variables (~40)
- [ ] Replace console statements with logger (~30)
- [ ] Remove unused imports (~25)
- [ ] Update remaining dependencies
  - [ ] TypeScript and type definitions
  - [ ] Utility packages (tailwindcss, immer, etc.)
- [ ] Replace deprecated packages
  - [ ] Replace @supabase/auth-helpers-nextjs with @supabase/ssr
  - [ ] Consider updating eslint to v9

**Target Metrics:**
- TypeScript Errors: 0 ✓
- ESLint Errors: 0 ✓
- ESLint Warnings: <50
- Security Issues: 0 ✓
- Outdated Packages: <5

---

## Quick Commands

```bash
# Check status
npm run typecheck
npm run lint
npm audit
npm outdated

# Fix issues
npm run lint -- --fix
npm audit fix
npm update [package-name]

# Test
npm run build
npm run dev
```

---

**Progress:** [ ] Phase 1 | [ ] Phase 2 | [ ] Phase 3
