# Hidden Pages and Components Report
**Date:** 2025-11-04
**Navbar Component:** `components/AppNav.tsx`

---

## 📊 Summary

The BHIT Work OS has **26+ pages/routes** that exist in the codebase but are **NOT linked in the main navigation bar**.

### Navigation Structure

**Navbar Shows (12 links):**
- **Core Links (always visible):** Dashboard, Today, Jobs, Clients
- **Role-based Links:** Progress, Smart Quote, SmartInvoice, Invoice Schedule, Admin Panel, Costing, Users, Settings

**Hidden/Unlinked (26+ pages):**
- 6 Development/Debug pages
- 5 Old/Legacy versions
- 4 Sub-pages (accessible from other pages)
- 3 Admin utilities
- 8 Other functional pages

---

## 🔍 HIDDEN PAGES BY CATEGORY

### 1. 🛠️ **Development & Debug Pages** (6 pages)

These are internal tools and debugging pages:

| Page | Path | Purpose |
|------|------|---------|
| **Debug Profile** | `/debug-profile` | User profile debugging |
| **Bootstrap** | `/dev/bootstrap` | Development setup |
| **Diagnostics** | `/dev/diag` | System diagnostics |
| **Core Testing** | `/dev/core-testing` | Core feature testing |
| **Guest Today** | `/today/guest` | Guest view for today page |
| **Login** | `/login` | Authentication page (not in nav by design) |

**Recommendation:** These should remain hidden or restricted to dev mode.

---

### 2. 📜 **Legacy/Old Versions** (5 pages)

Multiple versions of the same features exist:

| Current Version (in nav) | Old Version (hidden) | Path |
|--------------------------|---------------------|------|
| Smart Quote | Old Smart Quote | `/smartquote` |
| Smart Quote | Smart Quote v2 | `/smartquote-v2` |
| Smart Quote | Changed Smart Quote | `/changedsmartquote` |
| Floor Planner | Old Place & Plan | `/bhi-place-&-plan (1)/` |
| - | Home/Landing | `/` (index.tsx) |

**Recommendation:**
- Remove old versions if current ones are stable
- Or add "Legacy" label and keep for reference
- Fix home page redirect to dashboard

---

### 3. 📋 **Admin & Management** (3 pages)

Admin features not in navbar:

| Page | Path | Description |
|------|------|-------------|
| **Feature Flags** | `/admin/feature-flags` | Manage feature toggles |
| **Organization Settings** | `/settings/organization` | Company settings (sub-page) |
| **Deleted Jobs** | `/jobs/deleted` | View deleted jobs |

**Recommendation:**
- Add "Feature Flags" to Admin Panel dropdown
- "Deleted Jobs" could be a tab on Jobs page
- Organization Settings is probably accessible from Settings

---

### 4. 📅 **Labour & Planning** (3 pages)

Workforce management pages:

| Page | Path | Description |
|------|------|-------------|
| **Labour Calendar** | `/labour-calendar` | Full labour calendar view |
| **Labour Scheduler** | `/dashboard/labour-scheduler` | Schedule labour shifts |
| **Planning** | `/planning` | Project planning page |

**Recommendation:**
- Add "Labour" to supervisor/ops navbar
- Or integrate into Dashboard dropdown

---

### 5. 💰 **Financial & Operations** (3 pages)

Business operations:

| Page | Path | Description |
|------|------|-------------|
| **Close Day** | `/close-day` | Daily closeout workflow |
| **Close Day (Job)** | `/close-day/[jobId]` | Job-specific closeout |
| **Construction Metrics** | `/construction-metrics` | Metrics dashboard |

**Recommendation:**
- Add "Daily Closeout" for ops/supervisor
- Construction Metrics already shows as "Progress" in nav

---

### 6. 🔨 **Job Management** (7 sub-pages)

Job detail pages (accessed from Jobs list):

| Page | Path | Purpose |
|------|------|---------|
| **New Job** | `/job/new` | Create new job |
| **Job Overview** | `/job/[id]/` | Main job page |
| **Job Documents** | `/job/[id]/documents` | Upload/view documents |
| **Job Floorplan** | `/job/[id]/floorplan` | Floor planning |
| **Job Products** | `/job/[id]/products` | Product list |
| **Job Labour** | `/job/[id]/labour` | Labour tracking |
| **Job Targets** | `/job/[id]/targets` | Performance targets |

**Recommendation:**
- These are tabs/sub-pages - keep as is
- Maybe add "/job/new" as "New Job" button in Jobs page

---

### 7. 🔧 **Utilities** (1 page)

| Page | Path | Description |
|------|------|-------------|
| **Floor Planner** | `/floor-planner` | Standalone floor planner |

**Recommendation:**
- This seems to be a standalone version
- Could add to Tools dropdown for ops

---

## 💡 RECOMMENDATIONS

### Immediate Actions

#### 1. **Add Missing Important Pages to Navbar**

```typescript
// Add to EXTRAS_BY_ROLE in AppNav.tsx

supervisor: [
  { label: "Progress", href: "/construction-progress" },
  { label: "Labour Calendar", href: "/labour-calendar" },  // NEW
  { label: "Close Day", href: "/close-day" }  // NEW
],
ops: [
  { label: "Progress", href: "/construction-progress" },
  { label: "Smart Quote", href: "/smart-quote" },
  { label: "SmartInvoice", href: "/smart-invoice" },
  { label: "Labour Calendar", href: "/labour-calendar" },  // NEW
  { label: "Floor Planner", href: "/floor-planner" },  // NEW
  { label: "Close Day", href: "/close-day" },  // NEW
  { label: "Settings", href: "/settings" }
],
director: [
  // ... existing links ...
  { label: "Feature Flags", href: "/admin/feature-flags" },  // NEW
  { label: "Planning", href: "/planning" },  // NEW
  // ... rest ...
],
```

#### 2. **Clean Up Old/Legacy Pages**

Consider removing or archiving:
- `/smartquote.tsx` (use `/smart-quote`)
- `/smartquote-v2.tsx` (consolidated into `/smart-quote`?)
- `/changedsmartquote.tsx` (redundant)
- `/bhi-place-&-plan (1)/` (use current version)

#### 3. **Create Dropdowns for Related Pages**

Group related pages under dropdowns:

**"Admin" Dropdown:**
- Admin Panel
- Users
- Costing
- Feature Flags ⭐ NEW

**"Labour" Dropdown:**
- Labour Calendar ⭐ NEW
- Labour Scheduler ⭐ NEW
- Close Day ⭐ NEW

**"Tools" Dropdown:**
- Smart Quote
- SmartInvoice
- Floor Planner ⭐ NEW
- Planning ⭐ NEW

---

## 📋 COMPLETE LIST OF HIDDEN PAGES

### Functional Pages (Need Navbar Links)
1. ✅ `/labour-calendar` - Labour calendar view
2. ✅ `/dashboard/labour-scheduler` - Labour scheduling
3. ✅ `/planning` - Project planning
4. ✅ `/close-day` - Daily closeout
5. ✅ `/close-day/[jobId]` - Job closeout
6. ✅ `/construction-metrics` - Metrics (maybe already linked as Progress?)
7. ✅ `/floor-planner` - Floor planner tool
8. ✅ `/admin/feature-flags` - Feature management
9. ✅ `/jobs/deleted` - Deleted jobs view

### Sub-pages (Accessible from parent pages - OK to hide)
10. 🔗 `/job/new` - New job creation
11. 🔗 `/job/[id]/documents` - Job documents
12. 🔗 `/job/[id]/floorplan` - Job floorplan
13. 🔗 `/job/[id]/products` - Job products
14. 🔗 `/job/[id]/labour` - Job labour
15. 🔗 `/job/[id]/targets` - Job targets
16. 🔗 `/settings/organization` - Organization settings

### Legacy/Deprecated (Should remove or archive)
17. 🗑️ `/smartquote` - Old smart quote
18. 🗑️ `/smartquote-v2` - Smart quote v2
19. 🗑️ `/changedsmartquote` - Changed smart quote
20. 🗑️ `/bhi-place-&-plan (1)/` - Old place & plan
21. 🗑️ `/` (index.tsx) - Home page (should redirect)

### Development/Debug (Should hide in production)
22. 🔧 `/debug-profile` - Profile debugging
23. 🔧 `/dev/bootstrap` - Dev bootstrap
24. 🔧 `/dev/diag` - Diagnostics
25. 🔧 `/dev/core-testing` - Core testing
26. 🔧 `/today/guest` - Guest today view

### Special (Not in navbar by design)
27. 🔐 `/login` - Login page

---

## 🎯 PRIORITIZED ACTION PLAN

### Priority 1: Add to Navbar (8 pages)
1. Labour Calendar (`/labour-calendar`)
2. Daily Closeout (`/close-day`)
3. Floor Planner (`/floor-planner`)
4. Planning (`/planning`)
5. Feature Flags (`/admin/feature-flags`)
6. Deleted Jobs (`/jobs/deleted`)
7. Labour Scheduler (`/dashboard/labour-scheduler`)
8. Construction Metrics (verify it's not already linked as Progress)

### Priority 2: Clean Up Legacy (5 pages)
1. Remove or archive `/smartquote`
2. Remove or archive `/smartquote-v2`
3. Remove or archive `/changedsmartquote`
4. Remove or archive `/bhi-place-&-plan (1)/`
5. Fix home page redirect

### Priority 3: Organize Sub-pages (7 pages)
- Job sub-pages are fine as tabs
- Maybe add quick "New Job" button in Jobs list

### Priority 4: Hide Dev Tools in Production (5 pages)
- Add environment check to hide `/dev/*` and `/debug-*` routes in production

---

## 📝 IMPLEMENTATION NOTES

### To Add a Link to Navbar

Edit `components/AppNav.tsx`:

```typescript
// For ops users
ops: [
  { label: "Progress", href: "/construction-progress" },
  { label: "Smart Quote", href: "/smart-quote" },
  { label: "SmartInvoice", href: "/smart-invoice" },
  { label: "Floor Planner", href: "/floor-planner" },  // ⭐ ADD THIS
  { label: "Labour", href: "/labour-calendar" },  // ⭐ ADD THIS
  { label: "Close Day", href: "/close-day" },  // ⭐ ADD THIS
  { label: "Settings", href: "/settings" }
],
```

### To Remove a Legacy Page

```bash
# Delete the file
rm /home/user/bhit-platform/apps/web/pages/smartquote.tsx

# Commit
git add -A
git commit -m "chore: Remove legacy smartquote page"
```

### To Hide Dev Pages in Production

Add middleware check or update pages:

```typescript
// In dev pages
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DevPage() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.push('/dashboard');
    }
  }, []);

  // ... rest of page
}
```

---

## ✅ SUMMARY

**Total Pages:** ~90 pages
**In Navbar:** 12 links
**Hidden but Functional:** 9 pages ⭐ **Should be added**
**Sub-pages (OK hidden):** 7 pages
**Legacy (Remove):** 5 pages
**Dev/Debug (Hide in prod):** 5 pages

**Recommended to add to navbar:**
1. Labour Calendar
2. Daily Closeout
3. Floor Planner
4. Planning
5. Feature Flags
6. Deleted Jobs
7. Labour Scheduler
8. Construction Metrics (if not already as "Progress")

---

**Report Generated:** 2025-11-04
**Analyzed Component:** `components/AppNav.tsx`
