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
}

/**
 * CORE NAVIGATION (always visible for authenticated users)
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
 * To disable a link, set enabled: false
 * To remove a link permanently, delete or comment out the object
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
      description: "Construction progress tracking"
    },
    {
      id: 102,
      label: "102. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      description: "Team scheduling and availability"
    },
    {
      id: 103,
      label: "103. Close Day",
      href: "/close-day",
      enabled: true,
      description: "Daily closeout workflow"
    },
  ],

  ops: [
    {
      id: 201,
      label: "201. Progress",
      href: "/construction-progress",
      enabled: true,
      description: "Construction progress tracking"
    },
    {
      id: 202,
      label: "202. Smart Quote",
      href: "/smart-quote",
      enabled: true,
      description: "AI-powered quote generation"
    },
    {
      id: 202.1,
      label: "202a. SmartQuote v3",
      href: "/smartquote-v3",
      enabled: true,
      description: "Next-gen AI quote system"
    },
    {
      id: 203,
      label: "203. SmartInvoice",
      href: "/smart-invoice",
      enabled: true,
      description: "Intelligent invoice processing"
    },
    {
      id: 204,
      label: "204. Floor Planner",
      href: "/floor-planner",
      enabled: true,
      description: "Floor planning and layout tool"
    },
    {
      id: 205,
      label: "205. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      description: "Team scheduling and availability"
    },
    {
      id: 206,
      label: "206. Labour Scheduler",
      href: "/dashboard/labour-scheduler",
      enabled: true,
      description: "Advanced labour scheduling"
    },
    {
      id: 207,
      label: "207. Planning",
      href: "/planning",
      enabled: true,
      description: "Project planning dashboard"
    },
    {
      id: 208,
      label: "208. Close Day",
      href: "/close-day",
      enabled: true,
      description: "Daily closeout workflow"
    },
    {
      id: 209,
      label: "209. Settings",
      href: "/settings",
      enabled: true,
      description: "Application settings"
    },
  ],

  director: [
    {
      id: 301,
      label: "301. Progress",
      href: "/construction-progress",
      enabled: true,
      description: "Construction progress tracking"
    },
    {
      id: 302,
      label: "302. Smart Quote",
      href: "/smart-quote",
      enabled: true,
      description: "AI-powered quote generation"
    },
    {
      id: 302.1,
      label: "302a. SmartQuote v3",
      href: "/smartquote-v3",
      enabled: true,
      description: "Next-gen AI quote system"
    },
    {
      id: 303,
      label: "303. SmartInvoice",
      href: "/smart-invoice",
      enabled: true,
      description: "Intelligent invoice processing"
    },
    {
      id: 304,
      label: "304. Invoice Schedule",
      href: "/invoicing/schedule",
      enabled: true,
      description: "Invoice scheduling and tracking"
    },
    {
      id: 305,
      label: "305. Floor Planner",
      href: "/floor-planner",
      enabled: true,
      description: "Floor planning and layout tool"
    },
    {
      id: 306,
      label: "306. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      description: "Team scheduling and availability"
    },
    {
      id: 307,
      label: "307. Labour Scheduler",
      href: "/dashboard/labour-scheduler",
      enabled: true,
      description: "Advanced labour scheduling"
    },
    {
      id: 308,
      label: "308. Planning",
      href: "/planning",
      enabled: true,
      description: "Project planning dashboard"
    },
    {
      id: 309,
      label: "309. Close Day",
      href: "/close-day",
      enabled: true,
      description: "Daily closeout workflow"
    },
    {
      id: 310,
      label: "310. Admin Panel",
      href: "/admin-panel",
      enabled: true,
      description: "Administrative controls"
    },
    {
      id: 311,
      label: "311. Costing",
      href: "/admin/costing",
      enabled: true,
      description: "Cost analysis and management"
    },
    {
      id: 312,
      label: "312. Users",
      href: "/admin/user-management",
      enabled: true,
      description: "User management"
    },
    {
      id: 313,
      label: "313. Feature Flags",
      href: "/admin/feature-flags",
      enabled: true,
      description: "Toggle features on/off"
    },
    {
      id: 314,
      label: "314. Deleted Jobs",
      href: "/jobs/deleted",
      enabled: true,
      description: "View and restore deleted jobs"
    },
    {
      id: 315,
      label: "315. Settings",
      href: "/settings",
      enabled: true,
      description: "Application settings"
    },
  ],

  admin: [
    {
      id: 401,
      label: "401. Progress",
      href: "/construction-progress",
      enabled: true,
      description: "Construction progress tracking"
    },
    {
      id: 402,
      label: "402. Smart Quote",
      href: "/smart-quote",
      enabled: true,
      description: "AI-powered quote generation"
    },
    {
      id: 402.1,
      label: "402a. SmartQuote v3",
      href: "/smartquote-v3",
      enabled: true,
      description: "Next-gen AI quote system"
    },
    {
      id: 403,
      label: "403. SmartInvoice",
      href: "/smart-invoice",
      enabled: true,
      description: "Intelligent invoice processing"
    },
    {
      id: 404,
      label: "404. Floor Planner",
      href: "/floor-planner",
      enabled: true,
      description: "Floor planning and layout tool"
    },
    {
      id: 405,
      label: "405. Labour Calendar",
      href: "/labour-calendar",
      enabled: true,
      description: "Team scheduling and availability"
    },
    {
      id: 406,
      label: "406. Labour Scheduler",
      href: "/dashboard/labour-scheduler",
      enabled: true,
      description: "Advanced labour scheduling"
    },
    {
      id: 407,
      label: "407. Planning",
      href: "/planning",
      enabled: true,
      description: "Project planning dashboard"
    },
    {
      id: 408,
      label: "408. Close Day",
      href: "/close-day",
      enabled: true,
      description: "Daily closeout workflow"
    },
    {
      id: 409,
      label: "409. Admin Panel",
      href: "/admin-panel",
      enabled: true,
      description: "Administrative controls"
    },
    {
      id: 410,
      label: "410. Costing",
      href: "/admin/costing",
      enabled: true,
      description: "Cost analysis and management"
    },
    {
      id: 411,
      label: "411. Users",
      href: "/admin/user-management",
      enabled: true,
      description: "User management"
    },
    {
      id: 412,
      label: "412. Feature Flags",
      href: "/admin/feature-flags",
      enabled: true,
      description: "Toggle features on/off"
    },
    {
      id: 413,
      label: "413. Deleted Jobs",
      href: "/jobs/deleted",
      enabled: true,
      description: "View and restore deleted jobs"
    },
    {
      id: 414,
      label: "414. Settings",
      href: "/settings",
      enabled: true,
      description: "Application settings"
    },
  ],
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
