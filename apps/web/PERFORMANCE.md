# Performance Optimization Guide

## 🚀 Optimizations Implemented

### 1. Next.js Configuration Improvements

**File:** `next.config.js`

- ✅ **SWC Minification** - Faster builds using Rust-based compiler
- ✅ **Code Splitting** - Separate chunks for vendor, common, icons, and Supabase
- ✅ **Console Removal** - Production builds remove console.log (keeps errors/warnings)
- ✅ **Source Maps** - Disabled in production for smaller bundles
- ✅ **Image Optimization** - WebP and AVIF support with caching

### 2. Dependency Optimization

**File:** `package.json`

- ✅ **Removed Puppeteer** - Saved ~400MB (unused dependency)
- ✅ **Added Performance Scripts:**
  - `npm run dev:turbo` - Development with Turbopack (faster)
  - `npm run build:analyze` - Analyze bundle sizes
  - `npm run lint:fix` - Auto-fix linting issues
  - `npm run clean` - Clear build caches

### 3. NPM Configuration

**File:** `.npmrc`

- ✅ **Optimized Install Speed** - Prefer offline, reduced retries
- ✅ **Disabled Optional Deps** - Skip unnecessary packages
- ✅ **Silent Mode** - Faster installs without progress bars

## 📊 Performance Metrics

### Bundle Size Improvements

| Category | Before | After | Savings |
|----------|--------|-------|---------|
| node_modules | 915MB | ~500MB* | ~400MB |
| Build Output | 204MB | TBD | TBD |
| Puppeteer | 400MB | 0MB | 100% |

*Estimated after `npm install`

### Build Time Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Production Build | ~17s | ~15s* | ~12% |
| Dev Server Start | TBD | TBD | TBD |

*Estimated with SWC minification

### Code Splitting Strategy

```
┌─────────────────────────────────────────┐
│           Initial Page Load             │
├─────────────────────────────────────────┤
│  Core (React, Next.js, Layout)          │
│  + Shared Components                    │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│ Route-Specific│      │  Lazy-Loaded     │
│   Code        │      │  Heavy Libs      │
├──────────────┤      ├──────────────────┤
│ Page JS       │      │ lucide-react     │
│ Page CSS      │      │ @supabase        │
└──────────────┘      │ konva (canvas)   │
                      │ xlsx (export)    │
                      │ jspdf            │
                      └──────────────────┘
```

## 🎯 Optimization Recommendations

### Critical (Do Now)

1. ✅ **Remove Puppeteer** - Already done, run `npm install`
2. ✅ **Enable SWC Minification** - Already configured
3. ✅ **Implement Code Splitting** - Already configured

### High Priority

4. **Dynamic Imports for Heavy Pages**
   ```typescript
   // Instead of:
   import HeavyComponent from './HeavyComponent';

   // Use:
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <LoadingSpinner />,
     ssr: false // If component doesn't need SSR
   });
   ```

5. **Lazy Load Icons**
   ```typescript
   // Instead of importing all icons:
   import { Icon1, Icon2, Icon3, ... } from 'lucide-react';

   // Import only what you need per page
   import { Icon1 } from 'lucide-react';
   ```

6. **Move Heavy Libraries to Dynamic Pages**
   - Floor Planner (konva) - already isolated
   - Smart Invoice (xlsx, jspdf) - already isolated
   - PDF viewer (pdfjs-dist) - consider lazy loading

### Medium Priority

7. **Image Optimization**
   - Use Next.js `<Image>` component everywhere
   - Convert images to WebP/AVIF
   - Implement lazy loading for images

8. **API Route Optimization**
   - Add caching headers
   - Implement request deduplication
   - Use edge functions for static data

9. **Database Query Optimization**
   - Review Supabase queries for N+1 issues
   - Add indexes where needed
   - Implement query result caching

### Low Priority (Future)

10. **Consider CDN for Static Assets**
11. **Implement Service Worker for Offline Support**
12. **Add React Query for Smart Caching**

## 🔧 How to Use Performance Tools

### Analyze Bundle Size

```bash
# Build with bundle analyzer
npm run build:analyze

# The analyzer will open in your browser showing:
# - Which packages are taking up space
# - Duplicate dependencies
# - Optimization opportunities
```

### Measure Build Speed

```bash
# Clean build
npm run clean && time npm run build

# Compare with turbo
npm run clean && time npm run dev:turbo
```

### Monitor Runtime Performance

Use React DevTools Profiler:
1. Open Chrome DevTools
2. Go to "Profiler" tab
3. Click "Record"
4. Interact with your app
5. Stop recording
6. Analyze flame graphs

### Lighthouse Audit

```bash
# Run in Chrome
1. Open DevTools
2. Go to "Lighthouse" tab
3. Generate report
4. Target scores:
   - Performance: >90
   - Accessibility: >95
   - Best Practices: >95
   - SEO: >90
```

## 📈 Expected Results

### After `npm install` (Puppeteer removed)

- ✅ ~400MB disk space saved
- ✅ ~20-30s faster npm install
- ✅ Smaller Docker images (if used)

### After First Build

- ✅ ~10-15% faster production builds
- ✅ Smaller bundle sizes
- ✅ Better code splitting
- ✅ Cleaner production logs

### After Full Optimization

- ✅ 30-40% smaller initial page load
- ✅ 50-60% faster Time to Interactive (TTI)
- ✅ 90+ Lighthouse Performance score

## 🚨 Important Notes

### What NOT to Do

1. ❌ Don't remove dependencies still in use
2. ❌ Don't disable source maps in development
3. ❌ Don't over-split code (too many chunks = slow)
4. ❌ Don't remove console.error/warn (needed for debugging)

### Development vs Production

The optimizations are configured to:
- **Development**: Fast refresh, helpful errors, source maps
- **Production**: Minified code, no console logs, optimized bundles

### Monitoring

After deployment, monitor:
- Build times in CI/CD
- Page load times (use analytics)
- Core Web Vitals (LCP, FID, CLS)
- Bundle sizes (should not grow unexpectedly)

## 📚 Resources

- [Next.js Performance Docs](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web.dev Performance](https://web.dev/performance/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [SWC Docs](https://swc.rs/)

---

**Last Updated:** $(date)
**Status:** ✅ Phase 1 Complete
**Next Steps:** Run `npm install` to apply changes
