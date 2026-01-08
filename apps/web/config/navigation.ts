/**
 * Centralized Navigation Configuration
 *
 * HOW TO USE:
 * - To hide a link: Set enabled: false
 * - To remove a link: Comment out or delete the entire object
 * - Numbers in labels help you quickly identify which links to manage
 * - Items are grouped by role for easy organization
 */

import { UserRole } from "@/lib/roles";

export interface NavItem {
  id: number;
  label: string;
  href: string;
  enabled: boolean;
  description?: string;
  icon?: string;
  category?: string; // New field for grouping
}

/**
 * CORE NAVIGATION (always visible for authenticated users)
 * Category: "Main Hub" (Implied)
 */
export const CORE_NAV_ITEMS: NavItem[] = [
  {
    id: 1,
    label: "1. Dashboard",
    href: "/dashboard",
    enabled: true,
    description: "Main dashboard overview"
  },
  {
    id: 2,
    label: "2. Today",
    href: "/today",
    enabled: true,
    description: "Today's schedule and tasks"
  },
  {
    id: 3,
    label: "3. Jobs",
    href: "/jobs",
    enabled: true,
    description: "All jobs and projects"
  },
  {
    id: 4,
    label: "4. Clients",
    href: "/clients",
    enabled: true,
    description: "Client management"
  },
];

/**
 * ROLE-BASED NAVIGATION
 */
export const ROLE_BASED_NAV: Record<UserRole, NavItem[]> = {
  guest: [],
  installer: [],

  supervisor: [
    {
      id: 101,
      label: "101. Progress",
      href: "/construction-progress",
      enabled: true,
      category: "Execution & Delivery"
    },
    {
      id: 102,
      label: "102. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 103,
      label: "103. Close Day",
      href: "/close-day",
      enabled: true,
      category: "Execution & Delivery"
    },
  ],

  ops: [
    // Planning & Quoting
    {
      id: 202,
      label: "202. Smart Quote",
      href: "/smart-quote",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 202.1,
      label: "202a. SmartQuote v3",
      href: "/smartquote-v3",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 207,
      label: "207. Planning",
      href: "/planning",
      enabled: true,
      category: "Planning & Quoting"
    },

    // Scheduling & Resources
    {
      id: 204,
      label: "204. Floor Planner",
      href: "/floor-planner",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 205,
      label: "205. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 206,
      label: "206. Labour Scheduler",
      href: "/dashboard/labour-scheduler",
      enabled: true,
      category: "Scheduling & Resources"
    },

    // Execution & Delivery
    {
      id: 201,
      label: "201. Progress",
      href: "/construction-progress",
      enabled: true,
      category: "Execution & Delivery"
    },
    {
      id: 208,
      label: "208. Close Day",
      href: "/close-day",
      enabled: true,
      category: "Execution & Delivery"
    },

    // Administrative
    {
      id: 203,
      label: "203. SmartInvoice",
      href: "/smart-invoice",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 209,
      label: "209. Settings",
      href: "/settings",
      enabled: true,
      category: "Administrative"
    },
  ],

  director: [
    // Planning & Quoting
    {
      id: 308,
      label: "308. Planning",
      href: "/planning",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 302,
      label: "302. Smart Quote",
      href: "/smart-quote",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 302.1,
      label: "302a. SmartQuote v3",
      href: "/smartquote-v3",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 311,
      label: "311. Costing",
      href: "/admin/costing",
      enabled: true,
      category: "Planning & Quoting"
    },

    // Scheduling & Resources
    {
      id: 306,
      label: "306. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 307,
      label: "307. Labour Scheduler",
      href: "/dashboard/labour-scheduler",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 305,
      label: "305. Floor Planner",
      href: "/floor-planner",
      enabled: true,
      category: "Scheduling & Resources"
    },

    // Execution & Delivery
    {
      id: 301,
      label: "301. Progress",
      href: "/construction-progress",
      enabled: true,
      category: "Execution & Delivery"
    },
    {
      id: 309,
      label: "309. Close Day",
      href: "/close-day",
      enabled: true,
      category: "Execution & Delivery"
    },

    // Administrative
    {
      id: 303,
      label: "303. SmartInvoice",
      href: "/smart-invoice",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 304,
      label: "304. Invoice Schedule",
      href: "/invoicing/schedule",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 310,
      label: "310. Admin Panel",
      href: "/admin-panel",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 312,
      label: "312. Users",
      href: "/admin/user-management",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 315,
      label: "315. Settings",
      href: "/settings",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 313,
      label: "313. Feature Flags",
      href: "/admin/feature-flags",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 314,
      label: "314. Deleted Jobs",
      href: "/jobs/deleted",
      enabled: true,
      category: "Administrative"
    },
  ],

  admin: [
    // Inherits mostly same structure as Director but different IDs in original file.
    // Mapping Admin items to categories...
    {
      id: 407,
      label: "407. Planning",
      href: "/planning",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 402,
      label: "402. Smart Quote",
      href: "/smart-quote",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 402.1,
      label: "402a. SmartQuote v3",
      href: "/smartquote-v3",
      enabled: true,
      category: "Planning & Quoting"
    },
    {
      id: 410,
      label: "410. Costing",
      href: "/admin/costing",
      enabled: true,
      category: "Planning & Quoting"
    },

    {
      id: 405,
      label: "405. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 406,
      label: "406. Labour Scheduler",
      href: "/dashboard/labour-scheduler",
      enabled: true,
      category: "Scheduling & Resources"
    },
    {
      id: 404,
      label: "404. Floor Planner",
      href: "/floor-planner",
      enabled: true,
      category: "Scheduling & Resources"
    },

    {
      id: 401,
      label: "401. Progress",
      href: "/construction-progress",
      enabled: true,
      category: "Execution & Delivery"
    },
    {
      id: 408,
      label: "408. Close Day",
      href: "/close-day",
      enabled: true,
      category: "Execution & Delivery"
    },

    {
      id: 403,
      label: "403. SmartInvoice",
      href: "/smart-invoice",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 409,
      label: "409. Admin Panel",
      href: "/admin-panel",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 411,
      label: "411. Users",
      href: "/admin/user-management",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 414,
      label: "414. Settings",
      href: "/settings",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 412,
      label: "412. Feature Flags",
      href: "/admin/feature-flags",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 413,
      label: "413. Deleted Jobs",
      href: "/jobs/deleted",
      enabled: true,
      category: "Administrative"
    },
  ],

  // Managers have read-only access to most things, similar to Ops but restricted
  manager: [
    {
      id: 501,
      label: "501. Dashboard",
      href: "/dashboard",
      enabled: true,
      category: "Main Hub"
    },
    {
      id: 502,
      label: "502. Jobs",
      href: "/jobs",
      enabled: true,
      category: "Main Hub"
    },
    {
      id: 503,
      label: "503. Schedule",
      href: "/labour-calendar",
      enabled: true,
      category: "Scheduling & Resources"
    }
  ],

  // General Managers have full access similar to Directors
  general_manager: [
    {
      id: 601,
      label: "601. Dashboard",
      href: "/dashboard",
      enabled: true,
      category: "Main Hub"
    },
    {
      id: 602,
      label: "602. Admin Panel",
      href: "/admin-panel",
      enabled: true,
      category: "Administrative"
    },
    {
      id: 603,
      label: "603. Financials",
      href: "/admin/costing",
      enabled: true,
      category: "Planning & Quoting"
    }
  ]
};

/**
 * Helper function to get enabled nav items for a role
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  // Directors get everything - their own items plus admin items
  if (role === 'director') {
    const directorItems = ROLE_BASED_NAV.director || [];
    const adminItems = ROLE_BASED_NAV.admin || [];
    const allItems = [...directorItems, ...adminItems];
    return allItems.filter(item => item.enabled);
  }

  const items = ROLE_BASED_NAV[role] || [];
  return items.filter(item => item.enabled);
}

/**
 * Helper function to get all enabled core nav items
 */
export function getCoreNavItems(): NavItem[] {
  return CORE_NAV_ITEMS.filter(item => item.enabled);
}

/**
 * Helper to get nav item by ID (useful for debugging)
 */
export function getNavItemById(id: number): NavItem | undefined {
  // Check core items
  const coreItem = CORE_NAV_ITEMS.find(item => item.id === id);
  if (coreItem) return coreItem;

  // Check all role-based items
  for (const role of Object.keys(ROLE_BASED_NAV) as UserRole[]) {
    const item = ROLE_BASED_NAV[role].find(item => item.id === id);
    if (item) return item;
  }

  return undefined;
}

/**
 * QUICK DISABLE/ENABLE INSTRUCTIONS:
 *
 * To disable a link:
 * 1. Find the item by its number (e.g., "205. Labour Calendar")
 * 2. Set enabled: false
 *
 * Example:
 * {
 *   id: 205,
 *   label: "205. Labour Calendar",
 *   href: "/labour-calendar",
 *   enabled: false,  // ← Changed from true to false
 * }
 *
 * To permanently remove a link:
 * 1. Find the item by its number
 * 2. Comment out or delete the entire object
 *
 * Example:
 * // {
 * //   id: 205,
 * //   label: "205. Labour Calendar",
 * //   href: "/labour-calendar",
 * //   enabled: true,
 * // },
 */
