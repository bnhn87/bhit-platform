# 🧭 Navigation Configuration Guide

**File:** `config/navigation.ts`

This file controls ALL links in the main navigation bar. Numbers in labels make it super easy to manage which links appear.

---

## 🎯 Quick Start

### To Remove a Link (Temporarily)

1. Open `config/navigation.ts`
2. Find the link by its number (e.g., "205. Labour Calendar")
3. Set `enabled: false`

```typescript
{
  id: 205,
  label: "205. Labour Calendar",
  href: "/labour-calendar",
  enabled: false,  // ← Changed to false - link won't show
}
```

### To Remove a Link (Permanently)

1. Find the link by its number
2. Delete or comment out the entire object

```typescript
// Removed: Labour Calendar
// {
//   id: 205,
//   label: "205. Labour Calendar",
//   href: "/labour-calendar",
//   enabled: true,
// },
```

### To Add a Link Back

1. Find the commented/disabled link
2. Set `enabled: true` or uncomment it

---

## 📋 Navigation Structure

### Core Links (IDs 1-4)
Always visible for all authenticated users:
- **1. Dashboard** - Main overview
- **2. Today** - Today's schedule
- **3. Jobs** - All jobs
- **4. Clients** - Client management

### Role-Based Links

#### Supervisor (IDs 101-103)
- **101. Progress** - Construction tracking
- **102. Labour Calendar** - Team scheduling
- **103. Close Day** - Daily closeout

#### Ops (IDs 201-209)
- **201. Progress** - Construction tracking
- **202. Smart Quote** - Quote generation
- **203. SmartInvoice** - Invoice processing
- **204. Floor Planner** - Floor layouts
- **205. Labour Calendar** - Team scheduling
- **206. Labour Scheduler** - Advanced scheduling
- **207. Planning** - Project planning
- **208. Close Day** - Daily closeout
- **209. Settings** - App settings

#### Director (IDs 301-315)
- **301. Progress** - Construction tracking
- **302. Smart Quote** - Quote generation
- **303. SmartInvoice** - Invoice processing
- **304. Invoice Schedule** - Invoice tracking
- **305. Floor Planner** - Floor layouts
- **306. Labour Calendar** - Team scheduling
- **307. Labour Scheduler** - Advanced scheduling
- **308. Planning** - Project planning
- **309. Close Day** - Daily closeout
- **310. Admin Panel** - Admin controls
- **311. Costing** - Cost management
- **312. Users** - User management
- **313. Feature Flags** - Feature toggles
- **314. Deleted Jobs** - Restore deleted jobs
- **315. Settings** - App settings

#### Admin (IDs 401-414)
- Same as Director, different IDs

---

## 💡 Common Tasks

### Remove Smart Quote for Ops Users

```typescript
ops: [
  // ... other items ...
  {
    id: 202,
    label: "202. Smart Quote",
    href: "/smart-quote",
    enabled: false,  // ← Disabled
  },
  // ... rest ...
],
```

### Remove Labour Calendar for All Roles

Find all instances (102, 205, 306, 405) and disable:

```typescript
// In supervisor:
{ id: 102, label: "102. Labour Calendar", href: "/labour-calendar", enabled: false },

// In ops:
{ id: 205, label: "205. Labour Calendar", href: "/labour-calendar", enabled: false },

// In director:
{ id: 306, label: "306. Labour Calendar", href: "/labour-calendar", enabled: false },

// In admin:
{ id: 405, label: "405. Labour Calendar", href: "/labour-calendar", enabled: false },
```

### Add a New Link

1. Choose an unused ID in the appropriate range:
   - Supervisor: 104+
   - Ops: 210+
   - Director: 316+
   - Admin: 415+

2. Add the new item:

```typescript
director: [
  // ... existing items ...
  {
    id: 316,
    label: "316. My New Page",
    href: "/my-new-page",
    enabled: true,
    description: "Description of what this page does"
  },
],
```

---

## 🔍 Helper Functions

### Get Nav Items in Code

```typescript
import { getCoreNavItems, getNavItemsForRole, getNavItemById } from '@/config/navigation';

// Get core links
const coreLinks = getCoreNavItems(); // Returns only enabled items

// Get links for a specific role
const opsLinks = getNavItemsForRole('ops'); // Returns only enabled items

// Find a specific link by ID
const item = getNavItemById(205); // Returns NavItem or undefined
```

---

## 📊 ID Ranges Reference

| Role | ID Range | Usage |
|------|----------|-------|
| Core | 1-4 | Always visible links |
| Supervisor | 101-199 | Supervisor-only links |
| Ops | 201-299 | Ops-only links |
| Director | 301-399 | Director-only links |
| Admin | 401-499 | Admin-only links |

---

## 🚨 Important Notes

1. **Don't reuse IDs** - Each link needs a unique ID
2. **Numbers in labels** - Keep the numbers! They help you quickly find links
3. **Enabled flag** - Always use `enabled: true/false` for temporary toggles
4. **Comment for permanent removal** - Comment out the whole object to remove permanently
5. **Role duplication** - Some links appear in multiple roles with different IDs (e.g., "Progress" is 101, 201, 301, 401)

---

## 🎨 Label Format

Labels should follow this format:
```
"[ID]. [Display Name]"
```

Examples:
- ✅ "205. Labour Calendar"
- ✅ "102. Progress"
- ✅ "314. Deleted Jobs"
- ❌ "Labour Calendar" (missing number)
- ❌ "205 Labour Calendar" (missing dot and space)

---

## 🔄 Quick Reference Commands

### Disable link 205 (Labour Calendar for Ops)
1. Find `id: 205` in the ops section
2. Change `enabled: true` to `enabled: false`

### Remove link 313 (Feature Flags)
1. Find `id: 313` in the director section
2. Comment out or delete the entire object

### Find all instances of "Smart Quote"
1. Search for "Smart Quote" in `navigation.ts`
2. You'll find IDs: 202, 302, 402

---

## 📝 Example: Hiding Floor Planner for Everyone

```typescript
// In ops: (ID 204)
{
  id: 204,
  label: "204. Floor Planner",
  href: "/floor-planner",
  enabled: false,  // ← Disabled
},

// In director: (ID 305)
{
  id: 305,
  label: "305. Floor Planner",
  href: "/floor-planner",
  enabled: false,  // ← Disabled
},

// In admin: (ID 404)
{
  id: 404,
  label: "404. Floor Planner",
  href: "/floor-planner",
  enabled: false,  // ← Disabled
},
```

---

## 🎯 That's It!

Managing navigation is now as simple as:
1. Find the number
2. Set `enabled: false` or comment it out
3. Save the file
4. Refresh your browser

No need to touch the React component - all changes happen in this one config file!
